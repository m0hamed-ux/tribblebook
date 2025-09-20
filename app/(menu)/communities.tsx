import theme, { styles as appStyles } from '@/assets/theme/styles'
import { deleteCommunity, getMyCommunities } from '@/lib/db'
import { useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { ArrowRight, PencilSimple, Trash, UsersThree } from 'phosphor-react-native'
import React, { useEffect, useState } from 'react'
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function CommunitiesScreen() {
  const router = useRouter()
  const { user } = useUser()
  const [adminCommunities, setAdminCommunities] = useState<any[]>([])
  const [memberCommunities, setMemberCommunities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const data = await getMyCommunities(user.id)
      // Sanitize arrays to avoid null items or items without id
      const admins = Array.isArray(data.admin_communities)
        ? data.admin_communities.filter((x: any) => x && (x.id !== null && x.id !== undefined))
        : []
      const members = Array.isArray(data.member_communities)
        ? data.member_communities.filter((x: any) => x && (x.id !== null && x.id !== undefined))
        : []
      setAdminCommunities(admins)
      setMemberCommunities(members)
      setLoading(false)
    } catch (e) {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user?.id])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const onDelete = (id: string | number) => {
    if (!user?.id) return
    Alert.alert('حذف المجتمع', 'هل أنت متأكد من حذف المجتمع؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: async () => {
          const ok = await deleteCommunity(id, user.id)
          if (ok) onRefresh(); else Alert.alert('خطأ', 'تعذر حذف المجتمع')
        }
      }
    ])
  }

  const Section = ({ title, data, admin }: { title: string; data: any[]; admin?: boolean }) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      {(!data || data.filter(Boolean).length === 0) ? (
        <View style={{ padding: 12, alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 12 }}>
          <Text style={{ color: theme.colors.text.muted, fontFamily: 'regular' }}>لا توجد عناصر</Text>
        </View>
      ) : (
        <FlatList
          data={(data || []).filter((x) => x && (x.id !== null && x.id !== undefined))}
          keyExtractor={(item, index) => (item?.id !== null && item?.id !== undefined) ? String(item.id) : `idx-${index}`}
          renderItem={({ item }) => {
            if (!item) return null
            const id = item.id
            return (
              <View style={s.cardRow}>
                <Image source={{ uri: item.profile || 'https://placehold.co/64x64' }} style={s.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={s.title}>{item.name ?? '—'}</Text>
                  <Text style={s.meta}>{item.member_count?.[0]?.count ?? item.member_count ?? 0} عضو</Text>
                </View>
                {admin ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={s.iconBtn} onPress={() => id != null && router.push({ pathname: '/(menu)/editCommunity', params: { id, name: item.name, description: item.description, profile: item.profile } })}>
                      <PencilSimple size={18} color={theme.colors.text.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#fbe9e7' }]} onPress={() => id != null && onDelete(id)}>
                      <Trash size={18} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            )
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  )

  return (
    <View style={[appStyles.container, { paddingTop: 8 }]}>      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <ArrowRight size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={s.headerTitle}>المجتمعات</Text>
          <Text style={s.headerSubtitle}>إدارة وإنشاء مجتمعاتك</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      <View style={{ flex: 1 }}>
        <TouchableOpacity style={[appStyles.buttonPrimary, { alignSelf: 'flex-end', marginBottom: 10 }]} onPress={() => router.push('/(menu)/createCommunity')}>
          <Text style={{ color: '#fff', fontFamily: 'bold' }}>إنشاء مجتمع</Text>
        </TouchableOpacity>

        <Section title="أديرها" data={adminCommunities} admin />
        <Section title="عضو فيها" data={memberCommunities} />

        {(!loading && adminCommunities.length === 0 && memberCommunities.length === 0) && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
            <UsersThree size={48} color={theme.colors.primary} />
            <Text style={{ marginTop: 10, color: theme.colors.text.secondary, fontFamily: 'regular', textAlign: 'center' }}>
              لا توجد مجتمعات بعد — ابدأ بإنشاء مجتمع جديد
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    color: theme.colors.text.primary,
    fontFamily: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
    fontFamily: 'regular',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff000000',
  },
  sectionTitle: {
    color: theme.colors.text.secondary,
    fontFamily: 'bold',
    textAlign: 'right',
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    padding: 10,
    borderRadius: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  title: {
    color: theme.colors.text.primary,
    fontFamily: 'bold',
    fontSize: 16,
  },
  meta: {
    color: theme.colors.text.muted,
    fontFamily: 'regular',
    fontSize: 12,
    marginTop: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
  },
})
