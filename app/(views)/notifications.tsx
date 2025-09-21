import { styles } from '@/assets/theme/styles'
import { FollowRequest, NotificationProps } from '@/lib/database.module'
import { timeAgo } from '@/lib/date'
import { acceptFollowRequest, cancelFollowRequest, getMyNotifications, getReceivedFollowRequests, getSentFollowRequests, markAllNotificationsRead, markNotificationRead, rejectFollowRequest } from '@/lib/db'
import { useAuth } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { ArrowBendUpLeft, At, BellSimple, BookmarkSimple, ChatCircle, Heart, UserPlus } from 'phosphor-react-native'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Image, RefreshControl, Text, TouchableOpacity, View } from 'react-native'

export default function NotificationsPage() {
  const router = useRouter()
  const { isLoaded, isSignedIn, userId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [items, setItems] = useState<NotificationProps[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [tab, setTab] = useState<'notifications' | 'requests'>('notifications')
  const [received, setReceived] = useState<FollowRequest[]>([])
  const [sent, setSent] = useState<FollowRequest[]>([])

  const canLoad = isLoaded && isSignedIn && !!userId

  const load = useCallback(async () => {
    if (!canLoad) {
      setLoading(false)
      setItems([])
      return
    }
    setLoading(true)
    try {
      const [list, rec, snt] = await Promise.all([
        getMyNotifications(userId!),
        getReceivedFollowRequests(userId!),
        getSentFollowRequests(userId!),
      ])
      setItems(list)
      setReceived(rec)
      setSent(snt)
    } finally {
      setLoading(false)
    }
  }, [canLoad, userId])

  const onRefresh = useCallback(async () => {
    if (!canLoad) return
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [canLoad, load])

  useEffect(() => {
    load()
  }, [load])

  const unreadCount = useMemo(() => items.filter(n => !n.is_read).length, [items])
  const pendingReceivedCount = useMemo(() => received.filter(r => r.status === 'pending').length, [received])
  const visibleItems = useMemo(() => filter === 'unread' ? items.filter(n => !n.is_read) : items, [filter, items])

  const handleMarkAll = useCallback(async () => {
    if (!userId) return
    const res = await markAllNotificationsRead(userId)
    if (res?.success) {
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    }
  }, [userId])

  const handlePressItem = useCallback(async (n: NotificationProps) => {
    if (!userId) return
    if (!n.is_read) {
      const res = await markNotificationRead(n.id, userId)
      if (res?.success) {
        setItems(prev => prev.map(it => it.id === n.id ? { ...it, is_read: true } : it))
      }
    }
    // Navigate to target (only post, user, community)
    try {
      const t = String(n.target_type).toLowerCase()
      if (t === 'post') {
        if (n.target_id != null) {
          // open post preview
          router.push({ pathname: '/postPreview', params: { id: String(n.target_id) } })
        }
      } else if (t === 'community') {
        if (n.target_id != null) {
          router.push({ pathname: '/community', params: { id: String(n.target_id) } })
        }
      } else if (t === 'user') {
        // We need username to open userprofile; best-effort use actor.username if relevant
        const username = n.actor?.username
        if (username) {
          router.push({ pathname: '/userprofile', params: { username } })
        }
      }
    } catch {}
  }, [userId])

  function TypeIcon({ type }: { type: NotificationProps['type'] }) {
    const size = 20
    switch (type) {
      case 'like':
        return <Heart size={size} weight="fill" color="#dc2626" />
      case 'comment':
        return <ChatCircle size={size} weight="fill" color="#2563eb" />
      case 'reply':
        return <ArrowBendUpLeft size={size} weight="fill" color="#2563eb" />
      case 'follow':
        return <UserPlus size={size} weight="fill" color="#16a34a" />
      case 'mention':
        return <At size={size} weight="bold" color="#7c3aed" />
      case 'save':
        return <BookmarkSimple size={size} weight="fill" color="#f59e0b" />
      default:
        return <BellSimple size={size} weight="fill" color="#0ea5e9" />
    }
  }

  const UnreadDot = ({ show }: { show: boolean }) => (
    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: show ? '#2563eb' : 'transparent' }} />
  )

  return (
    <View style={[styles.container, { paddingHorizontal: 0 }]}>      
      {/* Header */}
      <View style={{ paddingVertical: 12, paddingHorizontal: 10 }}>
        <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.title, { fontSize: 22 }]}>{tab === 'notifications' ? 'الإشعارات' : 'طلبات المتابعة'}</Text>
          {tab === 'notifications' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#3730a3', fontFamily: 'regular', fontSize: 12 }}>غير مقروء</Text>
                <View style={{ backgroundColor: '#3730a3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>{unreadCount}</Text>
                </View>
              </View>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={handleMarkAll}>
                  <Text style={{ color: '#2563eb', fontFamily: 'regular' }}>تحديد الكل كمقروء</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{ backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#3730a3', fontFamily: 'regular', fontSize: 12 }}>بانتظار الموافقة</Text>
              <View style={{ backgroundColor: '#3730a3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 }}>
                <Text style={{ color: '#fff', fontSize: 12 }}>{pendingReceivedCount}</Text>
              </View>
            </View>
          )}
        </View>
        {/* Tabs */}
        <View style={{ flexDirection: 'row-reverse', gap: 16, marginTop: 12 }}>
          <TouchableOpacity onPress={() => setTab('notifications')}>
            <Text style={{ color: tab === 'notifications' ? '#111' : '#666', fontFamily: tab === 'notifications' ? 'bold' as const : 'regular' as const, borderBottomWidth: tab === 'notifications' ? 2 : 0, borderBottomColor: '#111', paddingBottom: 4 }}>الإشعارات</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setTab('requests')}>
            <Text style={{ color: tab === 'requests' ? '#111' : '#666', fontFamily: tab === 'requests' ? 'bold' as const : 'regular' as const, borderBottomWidth: tab === 'requests' ? 2 : 0, borderBottomColor: '#111', paddingBottom: 4 }}>الطلبات</Text>
          </TouchableOpacity>
        </View>
        {tab === 'notifications' && (
          <View style={{ flexDirection: 'row-reverse', gap: 16, marginTop: 12 }}>
            <TouchableOpacity onPress={() => setFilter('all')}>
              <Text style={{ color: filter === 'all' ? '#111' : '#666', fontFamily: filter === 'all' ? 'bold' as const : 'regular' as const, borderBottomWidth: filter === 'all' ? 2 : 0, borderBottomColor: '#111', paddingBottom: 4 }}>الكل</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFilter('unread')}>
              <Text style={{ color: filter === 'unread' ? '#111' : '#666', fontFamily: filter === 'unread' ? 'bold' as const : 'regular' as const, borderBottomWidth: filter === 'unread' ? 2 : 0, borderBottomColor: '#111', paddingBottom: 4 }}>غير مقروء</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : tab === 'notifications' ? (
        <FlatList
          data={visibleItems}
          keyExtractor={(n) => String(n.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 0 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={() => (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontFamily: 'regular' }}>لا توجد إشعارات حالياً</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handlePressItem(item)}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: item.is_read ? '#fff' : '#f0f7ff', padding: 5 }}>
                {/* Unread dot */}
                <UnreadDot show={!item.is_read} />
                {/* Actor avatar */}
                <Image
                  source={{ uri: item.actor?.profile || 'https://i.pravatar.cc/100' }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ddd' }}
                />
                {/* Content */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
                    {/* <TypeIcon type={item.type} /> */}
                    <Text style={{ color: '#111', textAlign: 'right', fontFamily: item.is_read ? 'regular' as const : 'bold' as const }} numberOfLines={2}>
                      {item.message}
                    </Text>
                  </View>
                  <Text style={{ color: '#666', textAlign: 'right', fontSize: 12, marginTop: 6, fontFamily: 'light' }}>{timeAgo(new Date(item.created_at))}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={[...received, ...sent]}
          keyExtractor={(r) => `req-${r.id}`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 0 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListEmptyComponent={() => (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontFamily: 'regular' }}>لا توجد طلبات متابعة</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isIncoming = received.some(r => r.id === item.id)
            const other = isIncoming ? item.requester : item.target
            const pending = item.status === 'pending'
            return (
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 5 }}>
                <Image
                  source={{ uri: other?.profile || 'https://i.pravatar.cc/100' }}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#ddd' }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#111', textAlign: 'right', fontFamily: 'bold' }} numberOfLines={2}>
                    {isIncoming ? `${other?.fullname || other?.username} يريد متابعتك` : `طلبت متابعة ${other?.fullname || other?.username}`}
                  </Text>
                  <Text style={{ color: '#666', textAlign: 'right', fontSize: 12, marginTop: 6, fontFamily: 'light' }}>{new Date(item.created_at).toLocaleString()}</Text>
                </View>
                {pending ? (
                  isIncoming ? (
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        onPress={async () => {
                          if (!userId) return
                          const res = await acceptFollowRequest(item.id, userId)
                          if (res && res.success) {
                            setReceived(prev => prev.map(r => r.id === item.id ? { ...r, status: 'accepted' } : r))
                          }
                        }}
                        style={{ backgroundColor: '#16a34a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                      >
                        <Text style={{ color: '#fff' }}>قبول</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={async () => {
                          if (!userId) return
                          const res = await rejectFollowRequest(item.id, userId)
                          if (res && res.success) {
                            setReceived(prev => prev.map(r => r.id === item.id ? { ...r, status: 'rejected' } : r))
                          }
                        }}
                        style={{ backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                      >
                        <Text style={{ color: '#fff' }}>رفض</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={async () => {
                        if (!userId) return
                        const res = await cancelFollowRequest(item.id, userId)
                        if (res && res.success) {
                          setSent(prev => prev.filter(r => r.id !== item.id))
                        }
                      }}
                      style={{ backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                    >
                      <Text style={{ color: '#fff' }}>إلغاء</Text>
                    </TouchableOpacity>
                  )
                ) : (
                  <Text style={{ color: '#666' }}>{item.status === 'accepted' ? 'تم القبول' : 'تم الرفض'}</Text>
                )}
              </View>
            )
          }}
        />
      )}
    </View>
  )
}
