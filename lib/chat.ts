import { UserProps } from '@/lib/database.module'
import { getFollowers, getFollowing } from '@/lib/db'
import { supabase } from '@/lib/supabase'
import * as SecureStore from 'expo-secure-store'
import { AppState } from 'react-native'

export type MessageType = 'text' | 'image' | 'post'

export interface Conversation {
  id: number
  user1_id: string
  user2_id: string
  created_at?: string
}

export interface Message {
  id: number
  conversation_id: number
  sender_id: string
  message_type: MessageType
  content?: string | null
  image_url?: string | null
  post_id?: number | null
  created_at: string
  seen?: boolean | null
}

export async function listConversations(currentUserId: string): Promise<Conversation[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false })
  if (error) { console.log('listConversations error:', error); return [] }
  return (data as Conversation[]) ?? []
}

export async function getOrCreateConversation(currentUserId: string, targetUserId: string): Promise<Conversation | null> {
  if (!supabase) return null
  // Try to find existing
  const { data: found, error: findErr } = await supabase
    .from('conversations')
    .select('*')
    .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${currentUserId})`)
    .limit(1)
    .maybeSingle()
  if (findErr && findErr.code !== 'PGRST116') { // ignore no rows
    console.log('getOrCreateConversation find error:', findErr)
  }
  if (found) return found as Conversation
  // Create
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user1_id: currentUserId, user2_id: targetUserId })
    .select('*')
    .single()
  if (error) { console.log('create conversation error:', error); return null }
  return data as Conversation
}

export async function fetchMessages(conversationId: number): Promise<Message[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) { console.log('fetchMessages error:', error); return [] }
  return (data as Message[]) ?? []
}

export async function getConversationById(id: number): Promise<Conversation | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .single()
  if (error) { console.log('getConversationById error:', error); return null }
  return data as Conversation
}

export type MessagesSubscription = { unsubscribe: () => void }

export function subscribeMessages(conversationId: number, onInserted: (m: Message) => void): MessagesSubscription {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase.channel(`messages-conv-${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
      const m = payload.new as Message
      onInserted(m)
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload: any) => {
      const m = payload.new as Message
      onInserted(m)
    })
    .subscribe((status: any) => {
      // console.log('messages channel status', status)
    })
  return { unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} } }
}

// Mark partner messages as seen when opening/reading the conversation
export async function markMessagesSeen(conversationId: number, currentUserId: string) {
  if (!supabase) return { count: 0 }
  const { data, error } = await supabase
    .from('messages')
    .update({ seen: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .eq('seen', false)
    .select('id')
  if (error) { console.log('markMessagesSeen error:', error); return { count: 0 } }
  return { count: Array.isArray(data) ? data.length : 0 }
}

// Touch and stream last_seen for online/last seen indicator
export async function touchLastSeen(currentUserId: string) {
  if (!supabase) return
  try { await supabase.from('users').update({ last_seen: new Date().toISOString() }).eq('id', currentUserId) } catch (e) { console.log('touchLastSeen error:', e) }
}

export function startLastSeenHeartbeat(currentUserId: string, intervalMs = 30000) {
  let stopped = false
  const tick = async () => { try { await touchLastSeen(currentUserId) } catch {} }
  tick()
  const id = setInterval(() => { if (!stopped) tick() }, intervalMs)
  const sub = AppState.addEventListener('change', (s) => { if (s === 'active') tick() })
  return { stop: () => { stopped = true; try { clearInterval(id as any) } catch {}; try { sub.remove() } catch {} } }
}

export function subscribeUserLastSeen(userId: string, onChange: (iso: string | null) => void) {
  if (!supabase) return { unsubscribe: () => {} }
  const channel = supabase
    .channel(`user-lastseen-${userId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` }, (payload: any) => {
      onChange(payload?.new?.last_seen ?? null)
    })
    .subscribe()
  return { unsubscribe: () => { try { supabase.removeChannel(channel) } catch {} } }
}

export async function sendTextMessage(conversationId: number, senderId: string, content: string) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, message_type: 'text', content })
    .select('*')
    .single()
  if (error) { console.log('sendTextMessage error', error); return null }
  return data as Message
}

export async function sendImageMessage(conversationId: number, senderId: string, imageUrl: string, caption?: string) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, message_type: 'image', image_url: imageUrl, content: caption ?? null })
    .select('*')
    .single()
  if (error) { console.log('sendImageMessage error', error); return null }
  return data as Message
}

export async function sendPostMessage(conversationId: number, senderId: string, postId: number, note?: string) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, message_type: 'post', post_id: postId, content: note ?? null })
    .select('*')
    .single()
  if (error) { console.log('sendPostMessage error', error); return null }
  return data as Message
}

// Presence, typing and online friends
type PresenceUser = { id: string; username?: string; profile?: string }

export function connectPresence(current: PresenceUser, onChange: (onlineUsers: PresenceUser[]) => void) {
  if (!supabase) return { disconnect: () => {} }
  const channel = supabase.channel('presence', { config: { presence: { key: current.id } } })
  channel
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, PresenceUser[]>
      const users = Object.values(state).flat()
      onChange(users)
    })
    .subscribe(async (status: any) => {
      if (status === 'SUBSCRIBED') {
        try { await channel.track(current) } catch {}
      }
    })
  return { disconnect: () => { try { supabase.removeChannel(channel) } catch {} } }
}

export async function listAllowedUsers(currentUserId: string): Promise<UserProps[]> {
  try {
    const [followers, following] = await Promise.all([
      getFollowers(currentUserId),
      getFollowing(currentUserId),
    ])
    const followerMap = new Map((followers ?? []).filter(Boolean).map(u => [String(u!.id), u!]))
    const mutuals = (following ?? []).filter(u => u && followerMap.has(String(u.id))) as UserProps[]

    // Also include users with existing conversations
    const convs = await listConversations(currentUserId)
    const convUserIds = new Set<string>()
    convs.forEach(c => {
      if (String(c.user1_id) !== currentUserId) convUserIds.add(String(c.user1_id))
      if (String(c.user2_id) !== currentUserId) convUserIds.add(String(c.user2_id))
    })
    const mutualIds = new Set(mutuals.map(u => String(u.id)))
    const onlyConvIds = Array.from(convUserIds).filter(id => !mutualIds.has(id))
    let convUsers: UserProps[] = []
    if (onlyConvIds.length && supabase) {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, fullname, profile, last_seen')
        .in('id', onlyConvIds)
      if (!error && Array.isArray(data)) {
        convUsers = data.map((u: any) => ({ id: u.id, username: u.username, fullname: u.fullname, profile: u.profile, last_seen: u.last_seen })) as any
      }
    }

    // Unique by id
    const all = [...mutuals, ...convUsers]
    const uniqMap = new Map(all.map(u => [String(u.id), u]))
    const uniq = Array.from(uniqMap.values())

    // Enrich with last_seen from Supabase users for all ids
    try {
      if (supabase && uniq.length) {
        const ids = uniq.map(u => String(u.id))
        const { data: rows } = await supabase.from('users').select('id, last_seen').in('id', ids)
        const ls = new Map<string, string | null>((rows || []).map((r: any) => [String(r.id), r.last_seen]))
        return uniq.map(u => ({ ...u, last_seen: (ls.get(String(u.id)) ?? (u as any).last_seen) as any }))
      }
    } catch {}
    return uniq
  } catch (e) {
    console.log('listAllowedUsers error:', e)
    return []
  }
}

// Utility: simple Cloudinary uploader for chat images
import Constants from 'expo-constants'
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtspfuyuf/'
const CLOUDINARY_UPLOAD_PRESET = ((Constants.expoConfig?.extra as any)?.cloudinaryUploadPreset as string) || 'tribble_preset'

export async function uploadImageToCloudinary(uri: string): Promise<string | null> {
  try {
    const form = new FormData()
    // @ts-ignore RN FormData file
    form.append('file', { uri, name: 'upload.jpg', type: 'image/jpeg' })
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    const res = await fetch(`${CLOUDINARY_URL}image/upload`, { method: 'POST', body: form as any })
    if (!res.ok) return null
    const json = await res.json()
    return json.secure_url || json.url || null
  } catch (e) {
    console.log('Cloudinary upload error:', e)
    return null
  }
}

export async function getUserById(userId: string): Promise<UserProps | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('users')
    .select('id, username, fullname, profile, last_seen')
    .eq('id', userId)
    .single()
  if (error) { console.log('getUserById error:', error); return null }
  const u = data as any
  return { id: u.id, username: u.username, fullname: u.fullname, profile: u.profile, last_seen: u.last_seen } as any
}

// Local read tracking for unread calculations (client-side heuristic)
const VIEW_KEY = (id: number) => `conv_last_viewed_${id}`
export async function setLastViewed(conversationId: number, date: Date = new Date()) {
  try { await SecureStore.setItemAsync(VIEW_KEY(conversationId), String(date.toISOString())) } catch {}
}
export async function getLastViewed(conversationId: number): Promise<Date | null> {
  try {
    const v = await SecureStore.getItemAsync(VIEW_KEY(conversationId))
    return v ? new Date(v) : null
  } catch {
    return null
  }
}

export async function getUsersByIds(ids: string[]): Promise<UserProps[]> {
  if (!ids.length || !supabase) return []
  const { data, error } = await supabase
    .from('users')
    .select('id, username, fullname, profile, last_seen')
    .in('id', ids)
  if (error || !Array.isArray(data)) return []
  return data.map((u: any) => ({ id: u.id, username: u.username, fullname: u.fullname, profile: u.profile, last_seen: u.last_seen })) as any
}

export type ConversationSummary = {
  conversation: Conversation
  lastMessage: Message | null
}

export async function getConversationsWithLastMessage(currentUserId: string): Promise<ConversationSummary[]> {
  const convs = await listConversations(currentUserId)
  if (!convs.length || !supabase) return []
  const ids = convs.map(c => c.id)
  const { data: msgs, error } = await supabase
    .from('messages')
    .select('*')
    .in('conversation_id', ids)
    .order('created_at', { ascending: false })
  if (error) { console.log('getConversationsWithLastMessage messages error:', error); return convs.map(c => ({ conversation: c, lastMessage: null })) }
  const lastByConv = new Map<number, Message>()
  for (const m of (msgs as Message[])) {
    if (!lastByConv.has(m.conversation_id)) lastByConv.set(m.conversation_id, m)
  }
  const list = convs.map(c => ({ conversation: c, lastMessage: lastByConv.get(c.id) ?? null }))
  list.sort((a, b) => {
    const ta = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0
    const tb = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0
    return tb - ta
  })
  return list
}

export async function getUnreadCount(conversationId: number, currentUserId: string): Promise<number> {
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .eq('seen', false)
  if (error || typeof count !== 'number') return 0
  return count
}
