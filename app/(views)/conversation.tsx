import { Conversation as Conv, Message, connectPresence, fetchMessages, getConversationById, getOrCreateConversation, getUserById, markMessagesSeen, sendImageMessage, sendTextMessage, startLastSeenHeartbeat, subscribeMessages, subscribeUserLastSeen, uploadImageToCloudinary } from '@/lib/chat'
import { UserProps } from '@/lib/database.module'
import { timeAgo, wasActiveWithin } from '@/lib/date'
import { getBlockStatus, getUser } from '@/lib/db'
import { sendMessageNotification } from '@/lib/notification'
import { useUser } from '@clerk/clerk-expo'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function ConversationScreen() {
  const { user } = useUser()
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string, username?: string }>()
  const [conv, setConv] = useState<Conv | null>(null)
  const [partner, setPartner] = useState<UserProps | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [text, setText] = useState('')
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [me, setMe] = useState<UserProps | null>(null)
  const [partnerLastSeen, setPartnerLastSeen] = useState<string | null>(null)
  const [blockInfo, setBlockInfo] = useState<{ userBlockedTarget: boolean; targetBlockedUser: boolean; isBlocked: boolean } | null>(null)
  // Ensure last_seen updates are monotonic and non-null to avoid flicker
  const updateLastSeen = useCallback((iso?: string | null) => {
    setPartnerLastSeen(prev => {
      if (!iso) return prev ?? null // don't overwrite with null
      const nextMs = new Date(iso).getTime()
      if (!Number.isFinite(nextMs)) return prev
      const prevMs = prev ? new Date(prev).getTime() : 0
      if (Number.isFinite(prevMs) && nextMs < prevMs) return prev
      return iso
    })
  }, [])
  const [sendingImage, setSendingImage] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const listRef = useRef<FlatList<Message>>(null)

  const conversationId = useMemo(() => params.id ? Number(params.id) : null, [params.id])
  const targetUsername = params.username

  const scrollToEnd = () => {
    try { listRef.current?.scrollToEnd({ animated: true }) } catch {}
  }

  // Auto-scroll when keyboard opens so input and last messages are visible
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setTimeout(scrollToEnd, 50))
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setTimeout(scrollToEnd, 50))
    return () => { try { showSub.remove() } catch {}; try { hideSub.remove() } catch {} }
  }, [])

  const ensureConversation = useCallback(async () => {
    if (!user?.username) return null
    // Resolve current app user (uuid) via backend
    const profile = await getUser(user.username)
    setMe(profile)
    const meId = profile?.id ? String(profile.id) : null
    if (!meId) return null
    if (conversationId) {
      const existing = await getConversationById(conversationId)
      return existing ?? null
    }
    if (!targetUsername) return null
    const target = await getUser(targetUsername)
    if (!target?.id) return null
    const c = await getOrCreateConversation(meId, String(target.id))
    if (!c) return null
    return c
  }, [conversationId, targetUsername, user?.username])

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const c = await ensureConversation()
        if (!c) return
        setConv(c)
        // partner fetch
        if (c) {
          const myId = me?.id ? String(me.id) : null
          const partnerId = myId ? (String(c.user1_id) === myId ? String(c.user2_id) : String(c.user1_id)) : null
          if (partnerId) {
            // Prefer direct lookup by id to avoid username mismatch
            const p = await getUserById(partnerId)
            setPartner(p ?? { id: partnerId, username: '', fullname: '', profile: '' } as any)
            updateLastSeen((p as any)?.last_seen ?? null)
            const authId = user?.id ? String(user.id) : null
            if (authId) {
              try {
                const st = await getBlockStatus(partnerId, authId)
                setBlockInfo(st ?? { userBlockedTarget: false, targetBlockedUser: false, isBlocked: false })
              } catch {}
            }
          }
        }
        const initial = await fetchMessages(c.id)
        setMessages(initial)
        setTimeout(scrollToEnd, 200)
        const sub = subscribeMessages(c.id, (m) => {
          setMessages(prev => {
            const idx = prev.findIndex(x => x.id === m.id)
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = m
              return next
            }
            return [...prev, m]
          })
          setTimeout(scrollToEnd, 50)
          // Fallback small refetch to catch missed events
          setTimeout(async () => {
            try {
              const fresh = await fetchMessages(c.id)
              setMessages(fresh)
            } catch {}
          }, 500)
        })
        // presence to determine if partner online + last_seen streaming
        let presenceCleanup = () => {}
        let heartbeatStop = () => {}
        let lastSeenUnsub = () => {}
        if (me?.id) {
          const meId = String(me.id)
          const presence = connectPresence({ id: meId, username: me.username || meId }, (list) => {
            const pid = String((String(c.user1_id) === meId ? c.user2_id : c.user1_id))
            setPartnerOnline(list.some(u => String(u.id) === pid))
          })
          presenceCleanup = presence.disconnect
          // heartbeat to keep my last_seen fresh
          const hb = startLastSeenHeartbeat(meId)
          heartbeatStop = hb.stop
          // subscribe to partner last_seen updates to render more accurate status when offline
          const pid = String((String(c.user1_id) === meId ? c.user2_id : c.user1_id))
          updateLastSeen((partner as any)?.last_seen ?? null)
          const ls = subscribeUserLastSeen(pid, (iso) => updateLastSeen(iso))
          lastSeenUnsub = ls.unsubscribe
        }
        return () => { sub.unsubscribe(); presenceCleanup(); heartbeatStop(); lastSeenUnsub() }
      } finally { setLoading(false) }
    })()
  }, [ensureConversation, me?.id, me?.username])

  // Fallback polling for partner last_seen (in case Realtime is disabled on users table)
  useEffect(() => {
    let timer: any
    (async () => {
      try {
        if (!conv || !me?.id) return
        const meId = String(me.id)
        const pid = String((String(conv.user1_id) === meId ? conv.user2_id : conv.user1_id))
        const tick = async () => {
          const u = await getUserById(pid)
          updateLastSeen((u as any)?.last_seen ?? null)
        }
        await tick()
        timer = setInterval(tick, 30000)
      } catch {}
    })()
    return () => { try { clearInterval(timer) } catch {} }
  }, [conv?.id, me?.id])

  const handleSend = useCallback(async () => {
    if (!conv || !me?.id) return
    const content = text.trim()
    if (!content) return
    setText('')
    const sent = await sendTextMessage(conv.id, String(me.id), content)
    if (sent) {
      setMessages(prev => [...prev, sent])
      setTimeout(scrollToEnd, 50)
      // Fire-and-forget push notification to partner
      try {
        const myId = String(me.id)
        const partnerId = String(String(conv.user1_id) === myId ? conv.user2_id : conv.user1_id)
        const senderFullname = me.fullname || me.username || 'User'
        sendMessageNotification({ userId: partnerId, senderFullname, message: content })
      } catch {}
    }
  }, [conv, text, me?.id])

  const handlePickImage = useCallback(async () => {
    if (!conv || !me?.id) return
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (res.canceled || !res.assets?.length) return
    const uri = res.assets[0].uri
    Alert.alert(
      'تأكيد إرسال الصورة',
      'هل تريد إرسال هذه الصورة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'إرسال',
          onPress: async () => {
            try {
              setSendingImage(true)
              const uploaded = await uploadImageToCloudinary(uri)
              if (uploaded) {
                const msg = await sendImageMessage(conv.id, String(me.id), uploaded)
                if (msg) {
                  setMessages(prev => [...prev, msg])
                  setTimeout(scrollToEnd, 50)
                  // Notify partner about the image message
                  try {
                    const myId = String(me.id)
                    const partnerId = String(String(conv.user1_id) === myId ? conv.user2_id : conv.user1_id)
                    const senderFullname = me.fullname || me.username || 'User'
                    sendMessageNotification({ userId: partnerId, senderFullname, message: 'أرسل صورة' })
                  } catch {}
                }
              }
            } finally {
              setSendingImage(false)
            }
          }
        }
      ]
    )
  }, [conv, me?.id])

  const lastMine = useMemo(() => {
    const own = messages.filter(m => m.sender_id === (me?.id ? String(me.id) : undefined))
    return own.length ? own[own.length - 1] : null
  }, [messages, me?.id])
  const lastPartner = useMemo(() => {
    const other = messages.filter(m => m.sender_id !== (me?.id ? String(me.id) : undefined))
    return other.length ? other[other.length - 1] : null
  }, [messages, me?.id])
  const isSeen = useMemo(() => {
    if (!lastMine) return false
    return Boolean(lastMine.seen)
  }, [lastMine])

  const partnerActive = useMemo(() => {
    return partnerOnline || wasActiveWithin(partnerLastSeen, 10 * 60 * 1000)
  }, [partnerOnline, partnerLastSeen])

  const isBlocked = Boolean(blockInfo?.isBlocked)
  const displayUsername = isBlocked ? 'tribblebook user' : (partner?.username || '...')

  // When messages or screen is focused, mark partner messages as seen
  useEffect(() => {
    (async () => {
      if (!conv || !me?.id) return
      try { await markMessagesSeen(conv.id, String(me.id)) } catch {}
    })()
  }, [conv?.id, messages.length, me?.id])

  const renderBubble = ({ item }: { item: Message }) => {
  const mine = item.sender_id === (me?.id ? String(me.id) : undefined)
    const alignStyle = { alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? '#1D9BF0' : '#f1f5f9' }
    const textColor = mine ? 'white' : '#0f172a'
    return (
      <TouchableOpacity style={{ maxWidth: '75%', marginVertical: 4, padding: 8, borderRadius: 10, ...alignStyle as any }} activeOpacity={0.8}
        onPress={() => {
          if (item.message_type === 'post' && item.post_id != null) {
            router.push({ pathname: '/postPreview', params: { id: String(item.post_id) } })
          }
        }}>
        {item.message_type === 'image' && (
          <TouchableOpacity activeOpacity={0.9} onPress={() => item.image_url && setPreviewImage(item.image_url)}>
            <Image source={{ uri: item.image_url || undefined }} style={{ width: 220, height: 280, borderRadius: 8, backgroundColor: '#e5e7eb' }} />
          </TouchableOpacity>
        )}
        {item.message_type === 'post' && (
          <View style={{ padding: 8, backgroundColor: mine ? 'rgba(255,255,255,0.15)' : '#e2e8f0', borderRadius: 8 }}>
            <Text style={{ color: textColor, fontFamily: 'bold' }}>مشاركة منشور</Text>
            {item.content ? <Text style={{ color: textColor, fontFamily: 'regular', marginTop: 2 }}>{item.content}</Text> : null}
            <Text style={{ color: textColor, fontFamily: 'regular', opacity: 0.8, marginTop: 4 }}>اضغط لفتح المنشور</Text>
          </View>
        )}
        {(item.message_type === 'text' || item.content) && (
          <Text style={{ color: textColor, fontFamily: 'regular' }}>{item.content}</Text>
        )}
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Text style={{ color: mine ? 'rgba(255,255,255,0.8)' : '#64748b', fontSize: 10 }}>
            {timeAgo(new Date(item.created_at))}
          </Text>
          {mine && lastMine && item.id === lastMine.id && (
            <Text style={{ color: mine ? 'rgba(255,255,255,0.9)' : '#64748b', fontSize: 10 }}>
              {lastMine.seen ? '✔✔ تمّت المشاهدة' : partnerOnline ? '✔✔ تم التسليم' : '✔ تم الإرسال'}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row-reverse', alignItems: 'center' }}>
        <TouchableOpacity style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }} onPress={() => (!isBlocked && partner?.username) ? router.push({ pathname: '/userprofile', params: { username: partner.username } }) : undefined}>
          <Image source={{ uri: isBlocked ? undefined : (partner?.profile || undefined) }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }} />
          <View>
            <Text style={{ fontFamily: 'bold', fontSize: 14, color: '#080808', textAlign: "right" }}>{displayUsername}</Text>
            <Text style={{ fontFamily: 'regular', fontSize: 11, color: '#666', textAlign: "right" }}>
              {partnerActive ? 'نشط الآن' : (partnerLastSeen ? `آخر ظهور: ${timeAgo(partnerLastSeen)}` : 'غير متاح')}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : !conv ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <Text style={{ fontFamily: 'bold', color: '#111', marginBottom: 6 }}>تعذر فتح المحادثة</Text>
          <Text style={{ fontFamily: 'regular', color: '#666', textAlign: 'center' }}>تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
          <FlatList
            ref={listRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 10 }}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderBubble}
            onContentSizeChange={scrollToEnd}
            keyboardShouldPersistTaps="handled"
            refreshing={refreshing}
            onRefresh={async () => {
              if (!conv) return
              setRefreshing(true)
              try {
                const fresh = await fetchMessages(conv.id)
                setMessages(fresh)
              } finally { setRefreshing(false) }
            }}
          />
          {isBlocked ? (
            <View style={{ backgroundColor: 'white', padding: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
              <Text style={{ textAlign: 'center', color: '#64748b', fontFamily: 'regular' }}>لا يمكنك مراسلة هذا المستخدم</Text>
            </View>
          ) : (
            <View style={{ backgroundColor: 'white', flexDirection: 'row-reverse', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: '#eee' }}>
              <TouchableOpacity onPress={handlePickImage} disabled={sendingImage} style={{ padding: 8, backgroundColor: '#f4f4f5', borderRadius: 8, opacity: sendingImage ? 0.6 : 1 }}>
                {sendingImage ? <ActivityIndicator size="small" color="#1D9BF0" /> : <Text style={{ fontFamily: 'bold', color: '#1D9BF0' }}>صورة</Text>}
              </TouchableOpacity>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder='اكتب رسالة...'
                placeholderTextColor={'#999'}
                style={{ flex: 1, borderWidth: 1, borderColor: '#eee', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, fontFamily: 'regular', color: '#000' }}
              />
              <TouchableOpacity onPress={handleSend} disabled={sendingImage} style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#1D9BF0', borderRadius: 20, opacity: sendingImage ? 0.7 : 1 }}>
                <Text style={{ color: 'white', fontFamily: 'bold' }}>إرسال</Text>
              </TouchableOpacity>
            </View>
          )}
        </KeyboardAvoidingView>
      )}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setPreviewImage(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' }}>
          {previewImage ? (
            <Image source={{ uri: previewImage }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          ) : null}
          <View style={{ position: 'absolute', top: 40, right: 20, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 }}>
            <Text style={{ color: '#fff', fontFamily: 'bold' }}>إغلاق</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  )
}
