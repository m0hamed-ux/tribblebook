import { connectPresence, getOrCreateConversation, listAllowedUsers, startLastSeenHeartbeat } from '@/lib/chat'
import { UserProps } from '@/lib/database.module'
import { getUser } from '@/lib/db'
import { useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Image, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function OnlineUsersScreen() {
  const { user } = useUser()
  const router = useRouter()
  const [meId, setMeId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<UserProps[]>([])
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.username) return
    setLoading(true)
    try {
      const me = await getUser(user.username)
      const id = me?.id ? String(me.id) : null
      setMeId(id)
      if (!id) return
      const allowed = await listAllowedUsers(id)
      setContacts(allowed)
    } finally { setLoading(false) }
  }, [user?.username])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!meId) return
    // include basic metadata so other clients can show username/avatar in presence if needed
    const meUser = contacts.find(c => String(c.id) === meId)
    const presence = connectPresence({ id: meId, username: meUser?.username, profile: meUser?.profile }, (list) => {
      setOnlineIds(new Set(list.map(u => String(u.id))))
    })
    const hb = startLastSeenHeartbeat(meId)
    return () => { presence.disconnect(); hb.stop() }
  }, [meId])

  const onlineContacts = useMemo(() => {
    const q = query.trim().toLowerCase()
    return contacts
      .filter(c => onlineIds.has(String(c.id)))
      .filter(c => !q || c.username?.toLowerCase().includes(q) || c.fullname?.toLowerCase().includes(q))
  }, [contacts, onlineIds, query])

  const openConversation = useCallback(async (u: UserProps) => {
    if (!meId || !u?.id) return
    const conv = await getOrCreateConversation(meId, String(u.id))
    if (conv) router.push({ pathname: '/conversation', params: { id: String(conv.id) } })
  }, [meId])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <View style={{ paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'bold', fontSize: 18, color: '#080808' }}>المتصلون الآن</Text>
      </View>
      <View style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
        <TextInput
          placeholder='ابحث عن صديق متصل'
          placeholderTextColor={'#999'}
          value={query}
          onChangeText={setQuery}
          style={{ borderWidth: 1, borderColor: '#eee', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'regular', color: '#000' }}
        />
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={onlineContacts}
          keyExtractor={(u) => String(u.id)}
          ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f5f5f5' }} />}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openConversation(item)} style={{ paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
              <View>
                {item.profile ? (
                  <Image source={{ uri: item.profile }} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' }} />
                ) : (
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' }} />
                )}
                <View style={{ position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' }} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontFamily: 'bold', fontSize: 14, color: '#080808' }} numberOfLines={1}>{item.username}</Text>
                <Text style={{ fontFamily: 'regular', fontSize: 12, color: '#64748b' }} numberOfLines={1}>ابدأ محادثة الآن</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#1D9BF0', borderRadius: 14 }}>
                <Text style={{ color: 'white', fontFamily: 'bold' }}>رسالة</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  )
}
