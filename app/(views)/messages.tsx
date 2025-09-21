import { connectPresence, getConversationsWithLastMessage, getOrCreateConversation, getUnreadCount, listAllowedUsers, sendPostMessage, startLastSeenHeartbeat, subscribeMessages } from '@/lib/chat'
import { UserProps } from '@/lib/database.module'
import { timeAgo } from '@/lib/date'
import { getBlockStatus, getUser } from '@/lib/db'
import { sendMessageNotification } from '@/lib/notification'
import { useUser } from '@clerk/clerk-expo'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Image, RefreshControl, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function MessagesScreen() {
  const { user } = useUser()
  const router = useRouter()
  const params = useLocalSearchParams<{ sharePostId?: string }>()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<UserProps[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [conversations, setConversations] = useState<any[]>([])
  const [unreads, setUnreads] = useState<Record<number, number>>({})
  const [query, setQuery] = useState('')
  const [me, setMe] = useState<UserProps | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const subsRef = useRef<Record<number, { unsubscribe: () => void }>>({})
  const [blockedMap, setBlockedMap] = useState<Record<string, boolean>>({}) // key: other user id -> isBlocked

  const sharePostId = useMemo(() => {
    const idStr = params.sharePostId
    if (!idStr) return null
    return Number.isNaN(Number(idStr)) ? null : Number(idStr)
  }, [params.sharePostId])

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return contacts
    return contacts.filter(c => c.username?.toLowerCase().includes(q) || c.fullname?.toLowerCase().includes(q))
  }, [contacts, query])

  const load = useCallback(async () => {
    if (!user?.username) return
    const profile = await getUser(user.username)
    setMe(profile)
    const meId = profile?.id ? String(profile.id) : null
    if (!meId) return
    setLoading(true)
    try {
      const [allowed, convSummaries] = await Promise.all([
        listAllowedUsers(meId),
        getConversationsWithLastMessage(meId),
      ])
      setContacts(allowed)
      setConversations(convSummaries)
      // compute block statuses for participants (batch per conversation)
      try {
        // Use Clerk user.id for Authorization header expected by backend
        const authId = user?.id ? String(user.id) : null
        if (!authId) throw new Error('no-auth')
        const meUuid = meId
        const pairs = convSummaries.map(cs => ({
          convId: cs.conversation.id,
          otherId: String(String(cs.conversation.user1_id) === meUuid ? cs.conversation.user2_id : cs.conversation.user1_id)
        }))
        const uniqueOthers = Array.from(new Set(pairs.map(p => p.otherId)))
        const entries: Array<[string, boolean]> = []
        await Promise.all(uniqueOthers.map(async oid => {
          try {
            const st = await getBlockStatus(oid, authId)
            entries.push([oid, Boolean(st?.isBlocked)])
          } catch { entries.push([oid, false]) }
        }))
        setBlockedMap(Object.fromEntries(entries))
      } catch {}
      // preload unread counts
      const entries = await Promise.all(convSummaries.map(async (cs) => [cs.conversation.id, await getUnreadCount(cs.conversation.id, meId)] as const))
      setUnreads(Object.fromEntries(entries))
    } finally { setLoading(false) }
  }, [user?.username])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!me?.id) return
    const meId = String(me.id)
    const presence = connectPresence({ id: meId, username: me.username || meId, profile: (me as any)?.profile }, (list) => {
      setOnlineIds(new Set(list.map(u => String(u.id))))
    })
    const hb = startLastSeenHeartbeat(meId)
    return () => { presence.disconnect(); hb.stop() }
  }, [me?.id, me?.username])

  // Realtime: subscribe to messages for all listed conversations to keep previews/unreads live
  useEffect(() => {
    const meId = me?.id ? String(me.id) : null
    if (!meId) return
    // Cleanup previous subs
    Object.values(subsRef.current).forEach(s => { try { s.unsubscribe() } catch {} })
    subsRef.current = {}
    if (!conversations.length) return
    conversations.forEach(cs => {
      const convId = cs.conversation.id
      subsRef.current[convId] = subscribeMessages(convId, async (m) => {
        // Update last message preview and sort list
        setConversations(prev => {
          const idx = prev.findIndex(x => x.conversation.id === m.conversation_id)
          if (idx < 0) return prev
          const next = [...prev]
          const old = next[idx]
          // Replace lastMessage if newer or if it's the same message updated
          if (!old.lastMessage || new Date(m.created_at) >= new Date(old.lastMessage.created_at) || m.id === old.lastMessage.id) {
            next[idx] = { ...old, lastMessage: m }
          }
          // Re-sort by lastMessage time desc
          next.sort((a, b) => {
            const ta = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0
            const tb = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0
            return tb - ta
          })
          return next
        })
        // Optimistic bump: if it's an incoming unseen message, temporarily increment unread
        if (m.sender_id !== meId && m.seen !== true) {
          setUnreads(prev => ({ ...prev, [m.conversation_id]: (typeof prev[m.conversation_id] === 'number' ? prev[m.conversation_id] : 0) + 1 }))
        }
        // Refresh unread count accurately when message arrives or seen status changes
        try {
          const count = await getUnreadCount(m.conversation_id, meId)
          setUnreads(prev => ({ ...prev, [m.conversation_id]: count }))
        } catch {}
      })
    })
    return () => {
      Object.values(subsRef.current).forEach(s => { try { s.unsubscribe() } catch {} })
      subsRef.current = {}
    }
  }, [conversations.map(cs => cs.conversation.id).join(','), me?.id])

  const handleOpenConversation = useCallback(async (target: UserProps) => {
    const meId = me?.id ? String(me.id) : null
    if (!meId || !target?.id) return
    const conv = await getOrCreateConversation(meId, String(target.id))
    if (!conv) return
    // If share mode, send post then go to conversation
    if (sharePostId) {
      try {
        await sendPostMessage(conv.id, meId, sharePostId)
        // Notify target about shared post
        const senderFullname = me?.fullname || me?.username || 'User'
        sendMessageNotification({ userId: String(target.id), senderFullname, message: 'شارك منشورًا' })
      } catch {}
    }
    router.push({ pathname: '/conversation', params: { id: String(conv.id) } })
  }, [me?.id, sharePostId])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'bold', fontSize: 18, color: '#080808' }}>الرسائل</Text>
      </View>
      <View style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
        <TextInput
          placeholder='ابحث عن الأصدقاء'
          placeholderTextColor={'#999'}
          value={query}
          onChangeText={setQuery}
          style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'regular', color: '#000' }}
        />
      </View>
      {loading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      )}
      {!loading && !contacts.length && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
          <Text style={{ fontFamily: 'bold', color: '#111', marginBottom: 6 }}>لا توجد محادثات أو أصدقاء</Text>
          <Text style={{ fontFamily: 'regular', color: '#666', textAlign: 'center' }}>ابدأ محادثة من صفحة المستخدم أو تأكد من متابعة الأصدقاء.</Text>
        </View>
      )}
      {!loading && (
        <FlatList
          data={conversations}
          keyExtractor={(cs) => String(cs.conversation.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={async () => {
              setRefreshing(true)
              try { await load() } finally { setRefreshing(false) }
            }} />
          }
          ListHeaderComponent={() => {
            const onlineContacts = contacts.filter(c => onlineIds.has(String(c.id)))
            if (!onlineContacts.length) return null
            return (
              <View style={{ paddingVertical: 8 }}>
                <Text style={{ fontFamily: 'bold', color: '#111', marginLeft: 12, marginBottom: 6 }}>النشطون الآن</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
                  {onlineContacts.map((item) => (
                    <TouchableOpacity key={String(item.id)} onPress={() => handleOpenConversation(item)} style={{ width: 64, alignItems: 'center', marginHorizontal: 6 }}>
                      <View style={{ position: 'relative' }}>
                        {item.profile ? (
                          <Image source={{ uri: item.profile }} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#eee' }} />
                        ) : (
                          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#eee' }} />
                        )}
                        <View style={{ position: 'absolute', right: -2, bottom: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' }} />
                      </View>
                      <Text style={{ marginTop: 6, fontFamily: 'regular', fontSize: 11, color: '#222' }} numberOfLines={1}>{item.username}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )
          }}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f5f5f5' }} />}
          renderItem={({ item: cs }) => {
            const meId = me?.id ? String(me.id) : ''
            const otherId = String(cs.conversation.user1_id) === meId ? String(cs.conversation.user2_id) : String(cs.conversation.user1_id)
            const other = contacts.find(c => String(c.id) === otherId)
            const isBlocked = Boolean(blockedMap[otherId])
            const unreadFromDb = unreads[cs.conversation.id]
            const lm = cs.lastMessage
            const fromMe = lm && lm.sender_id === meId
            // Fallback: treat at least 1 unread when last partner message is unseen (or seen is undefined/null)
            const fallbackAnyUnread = (!!lm && !fromMe && lm.seen !== true)
            let unread = (typeof unreadFromDb === 'number') ? unreadFromDb : 0
            if (fallbackAnyUnread && unread === 0) unread = 1
            let preview = ''
            if (lm) {
              if (lm.message_type === 'text') preview = lm.content || ''
              else if (lm.message_type === 'image') preview = fromMe ? 'أنت: أرسلت صورة' : `${other?.username || ''}: أرسل صورة`
              else if (lm.message_type === 'post') preview = fromMe ? 'أنت: شاركت منشورًا' : `${other?.username || ''}: شارك منشورًا`
              if (fromMe && lm.message_type !== 'image' && lm.message_type !== 'post') preview = `أنت: ${preview}`
            } else {
              preview = other?.last_seen ? `آخر ظهور: ${timeAgo(new Date(other.last_seen as any))}` : 'ابدأ المحادثة'
            }
            if (unread > 1) preview = `+${unread} رسائل جديدة`
            const isBold = unread > 0
            return (
              <TouchableOpacity onPress={() => { if (!isBlocked) router.push({ pathname: '/conversation', params: { id: String(cs.conversation.id) } }) }} style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row-reverse', alignItems: 'center' }}>
                <View>
                  {(!isBlocked && other?.profile) ? (
                    <Image source={{ uri: other.profile }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' }} />
                  ) : (
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' }} />
                  )}
                  {onlineIds.has(otherId) && (
                    <View style={{ position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' }} />
                  )}
                </View>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ fontFamily: 'bold', fontSize: 14, color: '#080808', textAlign: "right" }} numberOfLines={1}>{isBlocked ? 'tribblebook user' : (other?.username || '...')}</Text>
                  <Text style={{ fontFamily: isBold ? 'bold' : 'regular', fontSize: 12, color: isBold ? '#0f172a' : '#666', textAlign: "right" }} numberOfLines={1}>
                    {preview || '...'}{lm && unread <= 1 ? ` · ${timeAgo(new Date(lm.created_at))}` : ''}
                  </Text>
                </View>
                {unread > 0 && (
                  <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: '#1D9BF0', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontFamily: 'bold', fontSize: 12 }}>{unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}
