import Post from '@/app/components/post'
import { SkeletonPost } from '@/app/components/Skeleton'
import { theme } from '@/assets/theme/styles'
import type { CommunityProps, PostProps, UserProps } from '@/lib/database.module'
import { getRecommendations, getTrendingPosts, search as searchApi } from '@/lib/db'
import { useUser } from '@clerk/clerk-expo'
import Entypo from '@expo/vector-icons/Entypo'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Image, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

type CommunityLite = {
    id: string
    name: string
    profile: string
    description: string
    member_count: number
    recent_members: Array<{ user_id: UserProps }>
}

export default function Page() {
    const { user } = useUser()
    const router = useRouter()

    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [users, setUsers] = useState<UserProps[]>([])
    const [communities, setCommunities] = useState<CommunityLite[]>([])
    const [trending, setTrending] = useState<PostProps[]>([])
    const [activePostId, setActivePostId] = useState<string | null>(null)

    // Search state
    const [q, setQ] = useState('')
    const [searching, setSearching] = useState(false)
    const [sUsers, setSUsers] = useState<UserProps[]>([])
    const [sCommunities, setSCommunities] = useState<CommunityProps[]>([])
        // We no longer search posts; trending stays visible regardless of query
        const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const uid = user?.id
            const [recs, trend] = await Promise.all([
                uid ? getRecommendations(uid) : Promise.resolve({ posts: [], users: [], communities: [] } as any),
                getTrendingPosts(),
            ])
            setUsers(Array.isArray(recs?.users) ? recs.users : [])
            setCommunities(Array.isArray(recs?.communities) ? recs.communities as CommunityLite[] : [])
            setTrending(Array.isArray(trend) ? trend : [])
        } finally {
            setLoading(false)
        }
    }, [user?.id])

    useEffect(() => {
        load()
    }, [load])

    const onRefresh = useCallback(async () => {
        setRefreshing(true)
        await load()
        setRefreshing(false)
    }, [load])

    const Header = useMemo(() => (
            <View style={styles.header}>
                <Text style={styles.headerTitle}>استكشف</Text>
                <View style={styles.searchBar}>
                    <TextInput
                        placeholder="ابحث عن أشخاص، مجتمعات أو منشورات"
                        placeholderTextColor="#888"
                        value={q}
                        onChangeText={setQ}
                        style={styles.searchInput}
                        returnKeyType="search"
                    />
                    <View style={styles.searchIconBox}>
                        <Entypo name="magnifying-glass" size={16} color={theme.colors.text.muted} />
                    </View>
                    {q.length > 0 ? (
                        <TouchableOpacity onPress={() => { setQ(''); setSUsers([]); setSCommunities([]); setSearching(false); }}>
                            <Text style={styles.clearBtn}>مسح</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        ), [q])

        // Debounced search
        useEffect(() => {
            const query = q.trim()
            if (searchTimer.current) {
                clearTimeout(searchTimer.current)
                searchTimer.current = null
            }
            if (query.length < 2) {
                setSearching(false)
                setSUsers([])
                setSCommunities([])
                return
            }
            setSearching(true)
            searchTimer.current = setTimeout(async () => {
                try {
                            const res = await searchApi(query)
                    setSUsers(Array.isArray(res?.users) ? res.users : [])
                    setSCommunities(Array.isArray(res?.communities) ? res.communities : [])
                } catch (e) {
                            setSUsers([]); setSCommunities([])
                } finally {
                    setSearching(false)
                }
            }, 350)
            return () => {
                if (searchTimer.current) clearTimeout(searchTimer.current)
            }
        }, [q])

            const isSearchActive = q.trim().length >= 2
        const ListHeader = useMemo(() => (
            <View>
                {/* Users */}
                <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>{isSearchActive ? 'المستخدمون' : 'أشخاص مقترحون'}</Text>
                </View>
                <View style={{ paddingHorizontal: 10 }}>
                    {isSearchActive ? (
                        searching ? (
                            <View style={{ gap: 10 }}>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <View key={`sk-suser-${i}`} style={styles.userRowSk} />
                                ))}
                            </View>
                        ) : sUsers.length === 0 ? (
                            <Text style={styles.emptyText}>لا يوجد نتائج</Text>
                        ) : (
                            sUsers.slice(0, 10).map((u) => (
                                <TouchableOpacity
                                    key={`suser-${u.username}`}
                                    style={styles.userRow}
                                    onPress={() => router.push(`/(views)/userprofile?username=${encodeURIComponent(u.username)}`)}
                                >
                                    <Image source={{ uri: u.profile }} style={styles.avatar} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.userFullname} numberOfLines={1}>{u.fullname}</Text>
                                        <Text style={styles.userUsername} numberOfLines={1}>@{u.username}</Text>
                                    </View>
                                    <Text style={styles.viewBtn}>عرض</Text>
                                </TouchableOpacity>
                            ))
                        )
                    ) : (
                        loading && users.length === 0 ? (
                            <View style={{ gap: 10 }}>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <View key={`sk-user-${i}`} style={styles.userRowSk} />
                                ))}
                            </View>
                        ) : users.length === 0 ? (
                            <Text style={styles.emptyText}>لا يوجد اقتراحات الآن</Text>
                        ) : (
                            users.slice(0, 10).map((u) => (
                                <TouchableOpacity
                                    key={u.username}
                                    style={styles.userRow}
                                    onPress={() => router.push(`/(views)/userprofile?username=${encodeURIComponent(u.username)}`)}
                                >
                                    <Image source={{ uri: u.profile }} style={styles.avatar} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.userFullname} numberOfLines={1}>{u.fullname}</Text>
                                        <Text style={styles.userUsername} numberOfLines={1}>@{u.username}</Text>
                                    </View>
                                    <Text style={styles.viewBtn}>عرض</Text>
                                </TouchableOpacity>
                            ))
                        )
                    )}
                </View>

                {/* Communities */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{isSearchActive ? 'المجتمعات' : 'مجتمعات مقترحة'}</Text>
                </View>
                <View style={{ paddingHorizontal: 10 }}>
                    {isSearchActive ? (
                        searching ? (
                            <View style={{ gap: 10 }}>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <View key={`sk-scomm-${i}`} style={styles.communityRowSk} />
                                ))}
                            </View>
                        ) : sCommunities.length === 0 ? (
                            <Text style={styles.emptyText}>لا يوجد نتائج</Text>
                        ) : (
                            sCommunities.slice(0, 10).map((c) => (
                                <TouchableOpacity
                                    key={`scomm-${c.id}`}
                                    style={styles.communityRow}
                                    onPress={() => router.push(`/(views)/community?id=${encodeURIComponent(String(c.id))}`)}
                                >
                                    <Image source={{ uri: c?.profile as any }} style={styles.communityAvatar} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.communityName} numberOfLines={1}>{c.name}</Text>
                                        {!!(c as any).description && (
                                            <Text style={styles.communityDesc} numberOfLines={1}>{(c as any).description}</Text>
                                        )}
                                    </View>
                                    <Text style={styles.viewBtn}>عرض</Text>
                                </TouchableOpacity>
                            ))
                        )
                    ) : (
                        loading && communities.length === 0 ? (
                            <View style={{ gap: 10 }}>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <View key={`sk-comm-${i}`} style={styles.communityRowSk} />
                                ))}
                            </View>
                        ) : communities.length === 0 ? (
                            <Text style={styles.emptyText}>لا يوجد اقتراحات الآن</Text>
                        ) : (
                            communities.slice(0, 10).map((c) => (
                                <TouchableOpacity
                                    key={c.id}
                                    style={styles.communityRow}
                                    onPress={() => router.push(`/(views)/community?id=${encodeURIComponent(String(c.id))}`)}
                                >
                                    <Image source={{ uri: c.profile }} style={styles.communityAvatar} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.communityName} numberOfLines={1}>{c.name}</Text>
                                        {!!c.description && (
                                            <Text style={styles.communityDesc} numberOfLines={1}>{c.description}</Text>
                                        )}
                                        <Text style={styles.communityMeta}>
                                            {c.member_count ?? c.recent_members?.length ?? 0} أعضاء
                                        </Text>
                                    </View>
                                    <Text style={styles.viewBtn}>عرض</Text>
                                </TouchableOpacity>
                            ))
                        )
                    )}
                </View>

                        {/* Posts section title - always trending */}
                <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>المنشورات الرائجة</Text>
                </View>
            </View>
        ), [isSearchActive, searching, loading, users, communities, sUsers, sCommunities, router])

    return (
        <View style={{ flex: 1, backgroundColor: '#fff' }}>
            {Header}
                            <FlatList
                                data={trending}
                keyExtractor={(item) => item.id!.toString()}
                onScrollBeginDrag={() => setActivePostId(null)}
                ListHeaderComponent={ListHeader}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        activeOpacity={0.95}
                        onPress={() => router.push(`/(views)/postPreview?id=${item.id}`)}
                    >
                        <Post
                            id={item.id}
                            title={item.title}
                            content={item.content}
                            created_at={new Date(typeof item.created_at === 'string' ? item.created_at.replace(/\.\d{6}/, '') : item.created_at!)}
                            images={item.images}
                            video={item.video}
                            links={item.links}
                            author={item.author}
                            community={item.community}
                            comment_count={item.comment_count}
                            reposted_post={item.reposted_post}
                            likes={item.likes}
                            isPlaying={activePostId === item.id!.toString()}
                            onPlay={() => setActivePostId(item.id!.toString())}
                        />
                    </TouchableOpacity>
                )}
                                ListEmptyComponent={loading ? (
                    <View style={{ paddingHorizontal: 10 }}>
                        {Array.from({ length: 3 }).map((_, i) => (
                            <SkeletonPost key={`sk-post-${i}`} />
                        ))}
                    </View>
                ) : (
                                    <Text style={[styles.emptyText, { paddingHorizontal: 10 }]}>لا توجد منشورات رائجة الآن</Text>
                )}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.surface,
        backgroundColor: theme.colors.background,
    },
    headerTitle: {
        fontSize: 18,
        color: theme.colors.primary,
        fontFamily: 'bold',
        textAlign: "right"
    },
    searchBar: {
        marginTop: 10,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.surface,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        textAlign: 'right',
        color: theme.colors.text.primary,
        fontFamily: 'regular',
        fontSize: 14,
    },
    searchIconBox: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#e9ecef',
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearBtn: {
        color: theme.colors.primary,
        fontFamily: 'bold',
        fontSize: 12,
    },
    sectionHeaderRow: {
        paddingHorizontal: 10,
        paddingTop: 16,
        paddingBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        color: theme.colors.text.primary,
        fontFamily: 'bold',
        textAlign: "right"
    },
    emptyText: {
        color: theme.colors.text.muted,
        fontSize: 13,
        fontFamily: 'regular',
    },
    userRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.surface,
    },
    userRowSk: {
        height: 48,
        borderRadius: 8,
        backgroundColor: theme.colors.surface,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ddd',
        marginLeft: 8,
    },
    userFullname: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontFamily: 'bold',
        textAlign: 'right',
    },
    userUsername: {
        color: theme.colors.text.muted,
        fontSize: 12,
        fontFamily: 'regular',
        textAlign: 'right',
    },
    viewBtn: {
        color: theme.colors.buttonSecondary.text,
        fontFamily: 'bold',
        fontSize: 12,
        backgroundColor: theme.colors.buttonSecondary.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 99,
    },
    communityRow: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.surface,
    },
    communityRowSk: {
        height: 56,
        borderRadius: 8,
        backgroundColor: theme.colors.surface,
    },
    communityAvatar: {
        width: 44,
        height: 44,
        borderRadius: 10,
        backgroundColor: '#ddd',
        marginLeft: 8,
    },
    communityName: {
        color: theme.colors.text.primary,
        fontSize: 14,
        fontFamily: 'bold',
        textAlign: 'right',
    },
    communityDesc: {
        color: theme.colors.text.secondary,
        fontSize: 12,
        fontFamily: 'regular',
        textAlign: 'right',
    },
    communityMeta: {
        color: theme.colors.text.muted,
        fontSize: 11,
        fontFamily: 'regular',
        textAlign: 'right',
        marginTop: 2,
    },
})
