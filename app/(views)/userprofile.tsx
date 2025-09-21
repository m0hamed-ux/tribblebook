import Post from '@/app/components/post';
import { SkeletonPost, SkeletonProfileHeader } from '@/app/components/Skeleton';
import Story from '@/app/components/story';
import { PostProps, StoryViewProps, UserProps } from '@/lib/database.module';
import { blockUser, cancelFollowRequest, createReport, followUser, getBlockStatus, getFollowers, getFollowing, getSentFollowRequests, getStories, getUser, getUserPosts, sendFollowRequest, sendNotification, unblockUser, unfollowUser } from '@/lib/db';
import { useUser } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlignBottomIcon, ArrowLeft, Article, List, LockKey, Repeat, SealCheck } from "phosphor-react-native";
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Modal, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';

export default function UserProfileScreen() {
    const { user } = useUser();
    const router = useRouter();
    const { username } = useLocalSearchParams<{ username: string }>();
    
    const [profile, setProfile] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<PostProps[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'saves'>('posts');
    const [activePostId, setActivePostId] = useState<string | null>(null);
    const [following, setFollowing] = useState(false);
    const [followers, setFollowers] = useState<any[]>([]);
    const [followingList, setFollowingList] = useState<any[]>([]);
    const [listModalVisible, setListModalVisible] = useState<null | 'followers' | 'following'>(null);
    const [loading, setLoading] = useState(true);
    const [followersCount, setFollowersCount] = useState<number>(0);
    const [followingCount, setFollowingCount] = useState<number>(0);
    // Follow request state (for private accounts)
    const [requestPending, setRequestPending] = useState<boolean>(false);
    const [requestId, setRequestId] = useState<string | number | null>(null);
    // Story integration
    const [storyGroups, setStoryGroups] = useState<Array<{ author: UserProps; stories: StoryViewProps[] }>>([]);
    const [profileStoryIndex, setProfileStoryIndex] = useState<number | null>(null);
    // Blocking state
    const [blockStatus, setBlockStatus] = useState<{ userBlockedTarget: boolean; targetBlockedUser: boolean; isBlocked: boolean } | null>(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);

    // Check if this is the current user's profile
    const isOwnProfile = user?.username === username;

    // Helper: get counts from profile object when lists aren't available
    const countFromProfile = (obj: any, base: 'followers' | 'following'): number => {
        if (!obj) return 0;
        // Try array length first
        const arr = obj?.[base];
        if (Array.isArray(arr)) return arr.length;
        // Try common numeric keys
        const candidates = [
            `${base}_count`,
            `${base}Count`,
            `total_${base}`,
            `${base}Total`,
            base, // if backend already stores a number under the same key
        ];
        for (const key of candidates) {
            const val = obj?.[key as any];
            if (typeof val === 'number' && Number.isFinite(val)) return val;
        }
        return 0;
    };

    const loadData = useCallback(async () => {
        if (!username) return;
        
        try {
            setLoading(true);
            const userProfile = await getUser(username);
            setProfile(userProfile);
            console.log('---------user: ', userProfile)
            // Initialize count fallbacks from profile object right away
            setFollowersCount(countFromProfile(userProfile, 'followers'));
            setFollowingCount(countFromProfile(userProfile, 'following'));
            // Determine following state robustly
            // 1) Try from target profile followers (if provided)
            let isFollowingLocal = false;
            try {
                isFollowingLocal = !!userProfile?.followers?.some((u: any) => {
                    const uname = (u?.username ?? u?.user_id?.username)?.toLowerCase();
                    return typeof uname === 'string' && uname === user?.username?.toLowerCase();
                });
            } catch {}
            // 2) Fallback: fetch my own following list and check if target exists there
            if (!isFollowingLocal && user?.username) {
                try {
                    const me = await getUser(user.username);
                    if (me?.id != null) {
                        const myFollowing = await getFollowing(me.id);
                        const targetId = userProfile?.id;
                        const targetUsername = userProfile?.username?.toLowerCase();
                        const matches = (u: any) => {
                            const uName = (u?.username ?? u?.user_id?.username)?.toLowerCase();
                            const uId = u?.id ?? u?.user_id?.id;
                            return (targetId != null && uId == targetId) || (targetUsername && uName === targetUsername);
                        };
                        isFollowingLocal = Array.isArray(myFollowing) && myFollowing.some(matches);
                    }
                } catch {}
            }
            setFollowing(isFollowingLocal);
            
            // Allow viewing if public, own profile, or private but current user follows
            const canView = isOwnProfile || !userProfile?.private || isFollowingLocal;

            // Detect existing pending follow request for this private profile (when not following and not own)
            if (!canView && userProfile?.private && user?.id) {
                try {
                    const sent = await getSentFollowRequests(user.id);
                    const match = Array.isArray(sent) ? sent.find((r: any) => String(r?.target_id) === String(userProfile.id) && r?.status === 'pending') : null;
                    if (match) {
                        setRequestPending(true);
                        setRequestId(match.id);
                    } else {
                        setRequestPending(false);
                        setRequestId(null);
                    }
                } catch {}
            } else {
                setRequestPending(false);
                setRequestId(null);
            }

            if (canView) {
                const posts = await getUserPosts(username);
                setUserPosts(posts);
                // Load lists when allowed
                if (userProfile?.id != null) {
                    const [f1, f2] = await Promise.all([
                        getFollowers(userProfile.id),
                        getFollowing(userProfile.id)
                    ]);
                    const followersArr = Array.isArray(f1) ? f1 : [];
                    setFollowers(followersArr);
                    setFollowingList(Array.isArray(f2) ? f2 : []);
                    // counts from arrays
                    setFollowersCount(followersArr.length);
                    setFollowingCount(Array.isArray(f2) ? f2.length : 0);

                    // Recompute following state using the fetched followers list (handles various shapes)
                    const currentUsername = user?.username;
                    if (currentUsername) {
                        const isFollowing = followersArr.some((u: any) => {
                            const uname = u?.username ?? u?.user_id?.username;
                            return typeof uname === 'string' && uname.toLowerCase() === currentUsername.toLowerCase();
                        });
                        setFollowing(isFollowing);
                    }
                } else {
                    setFollowers([]);
                    setFollowingList([]);
                }
            } else {
                setUserPosts([]);
                // Keep lists empty (we'll still show counts from profile in UI)
                setFollowers([]);
                setFollowingList([]);
                // Try to fetch counts only (without exposing lists) if backend allows
                if (userProfile?.id != null) {
                    try {
                        const [f1, f2] = await Promise.all([
                            getFollowers(userProfile.id),
                            getFollowing(userProfile.id)
                        ]);
                        if (Array.isArray(f1)) setFollowersCount(f1.length);
                        if (Array.isArray(f2)) setFollowingCount(f2.length);
                    } catch {}
                }
            }
            // Load stories groups to find this user's story index (visible to current user)
            if (user?.id) {
                try {
                    const groups = await getStories(user.id);
                    setStoryGroups(groups);
                    const idx = groups.findIndex(g => g?.author?.username?.toLowerCase() === String(username).toLowerCase());
                    setProfileStoryIndex(idx >= 0 ? idx : null);
                } catch {}
            } else {
                setStoryGroups([]);
                setProfileStoryIndex(null);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoading(false);
        }
    }, [username, isOwnProfile]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);

    // Fetch block status when viewing someone else's profile
    useEffect(() => {
        (async () => {
            try {
                if (!username || !user?.id) { setBlockStatus(null); return; }
                if (user?.username && user.username.toLowerCase() === String(username).toLowerCase()) { setBlockStatus({ userBlockedTarget: false, targetBlockedUser: false, isBlocked: false }); return; }
                const u = await getUser(username);
                if (u?.id && user?.id) {
                    const st = await getBlockStatus(u.id, user.id);
                    setBlockStatus(st ?? { userBlockedTarget: false, targetBlockedUser: false, isBlocked: false });
                } else {
                    setBlockStatus(null);
                }
            } catch {
                setBlockStatus(null);
            }
        })();
    }, [username, user?.id]);

    const handleFollow = useCallback(async () => {
        if (!profile?.username || !user?.id) return;
        const target = (profile.id ?? profile.username) as string | number;
        const userId = user.id as string;
        const optimisticNext = !following;

        // Private profile and not following yet -> send follow request instead of direct follow
        if (optimisticNext && profile?.private) {
            try {
                const res = await sendFollowRequest(target, userId);
                if (res && res.success) {
                    setRequestPending(true);
                    setRequestId(res.request?.id ?? null);
                    ToastAndroid.show('تم إرسال طلب المتابعة', ToastAndroid.SHORT);
                    // Notify target user about follow request (if not self)
                    if (profile?.id && String(profile.id) !== String(user.id)) {
                        const actorName = (user.fullName || user.username) as string;
                        try {
                            await sendNotification(user.id, {
                                recipientId: profile.id,
                                type: 'follow',
                                targetType: 'user',
                                targetId: profile.id,
                                title: 'طلب متابعة جديد',
                                body: ` أرسل لك طلب متابعة`,
                            });
                        } catch {}
                    }
                } else {
                    ToastAndroid.show('تعذر إرسال الطلب', ToastAndroid.SHORT);
                }
            } catch (e) {
                ToastAndroid.show('تعذر إرسال الطلب', ToastAndroid.SHORT);
            }
            return;
        }

        // Public (or already following -> unfollow)
        // optimistic UI updates
        setFollowing(optimisticNext);
        setFollowers(prev => {
            const exists = prev.some(u => u?.username === user?.username);
            if (optimisticNext && !exists) {
                return [{ username: user?.username, fullname: user?.fullName, profile: user?.imageUrl }, ...prev];
            }
            if (!optimisticNext && exists) {
                return prev.filter(u => u?.username !== user?.username);
            }
            return prev;
        });
        // optimistic counts
        setFollowersCount(c => Math.max(0, c + (optimisticNext ? 1 : -1)));

    const res = optimisticNext ? await followUser(target, userId) : await unfollowUser(target, userId);
        if (!res.success) {
            // revert on failure
            setFollowing(!optimisticNext);
            setFollowers(prev => {
                const exists = prev.some(u => u?.username === user?.username);
                if (optimisticNext && exists) {
                    return prev.filter(u => u?.username !== user?.username);
                }
                if (!optimisticNext && !exists) {
                    return [{ username: user?.username, fullname: user?.fullName, profile: user?.imageUrl }, ...prev];
                }
                return prev;
            });
            // revert count
            setFollowersCount(c => Math.max(0, c + (optimisticNext ? -1 : 1)));
        } else {
            // On success, if profile is private and we just followed (rare if backend auto-accepts), load data; if we unfollowed, hide data
            // Send follow notification for public profiles or when follow actually succeeded
            if (optimisticNext && profile?.id && String(profile.id) !== String(user.id)) {
                const actorName = (user.fullName || user.username) as string;
                try {
                    await sendNotification(user.id, {
                        recipientId: profile.id,
                        type: 'follow',
                        targetType: 'user',
                        targetId: profile.id,
                        title: 'متابع جديد',
                        body: ` قام بمتابعتك`,
                    });
                } catch {}
            }
            if (profile?.private && optimisticNext) {
                // Became allowed: fetch posts and lists
                const posts = await getUserPosts(username!);
                setUserPosts(posts);
                if (profile?.id != null) {
                    const [f1, f2] = await Promise.all([
                        getFollowers(profile.id),
                        getFollowing(profile.id)
                    ]);
                    setFollowers(Array.isArray(f1) ? f1 : []);
                    setFollowingList(Array.isArray(f2) ? f2 : []);
                    setFollowersCount(Array.isArray(f1) ? f1.length : 0);
                    setFollowingCount(Array.isArray(f2) ? f2.length : 0);
                }
            } else if (profile?.private && !optimisticNext) {
                // No longer allowed: hide content and lists
                setUserPosts([]);
                setListModalVisible(null);
                setFollowers([]);
                setFollowingList([]);
                // Try to refresh counts without lists
                if (profile?.id != null) {
                    try {
                        const [f1, f2] = await Promise.all([
                            getFollowers(profile.id),
                            getFollowing(profile.id)
                        ]);
                        setFollowersCount(Array.isArray(f1) ? f1.length : Math.max(0, followersCount - 1));
                        setFollowingCount(Array.isArray(f2) ? f2.length : followingCount);
                    } catch {
                        // fallback to optimistic decrement already applied
                    }
                }
            }
        }
    }, [following, profile?.username, profile?.id, profile?.private, user?.id, user?.username, user?.fullName, user?.imageUrl, username, followersCount, followingCount]);

    useEffect(() => {
        if (username) {
            loadData();
        }
    }, [username, loadData]);

    const renderFollowButton = () => {
        if (isOwnProfile) return null;

        if (following) {
            return (
                <View style={styles.followActionsRow}>
                    <TouchableOpacity 
                        style={styles.messageButton}
                        onPress={() => {
                            try {
                                if (profile?.username) {
                                    router.push({ pathname: '/conversation', params: { username: profile.username } })
                                }
                            } catch {}
                        }}
                    >
                        <Text style={styles.messageButtonText}>رسالة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.followButton, styles.followingButton]}
                        onPress={handleFollow}
                    >
                        <Text style={[styles.followButtonText, styles.followingButtonText]}>إلغاء المتابعة</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        // Pending follow request state for private profiles
        if (profile?.private && requestPending) {
            return (
                <View style={styles.followActionsRow}>
                    <TouchableOpacity 
                        style={[styles.messageButton, { backgroundColor: '#f0f0f0' }]}
                        disabled
                    >
                        <Text style={[styles.messageButtonText, { color: '#555' }]}>قيد الموافقة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.followButton, styles.followingButton]}
                        onPress={async () => {
                            if (!requestId || !user?.id) return
                            const res = await cancelFollowRequest(requestId, user.id)
                            if (res && res.success) {
                                setRequestPending(false)
                                setRequestId(null)
                                ToastAndroid.show('تم إلغاء الطلب', ToastAndroid.SHORT)
                            } else {
                                ToastAndroid.show('تعذر إلغاء الطلب', ToastAndroid.SHORT)
                            }
                        }}
                    >
                        <Text style={[styles.followButtonText, styles.followingButtonText]}>إلغاء الطلب</Text>
                    </TouchableOpacity>
                </View>
            )
        }

        return (
            <TouchableOpacity 
                style={styles.followButton}
                onPress={handleFollow}
            >
                <Text style={styles.followButtonText}>{profile?.private ? 'طلب متابعة' : 'متابعة'}</Text>
            </TouchableOpacity>
        )
    };

    const renderPrivateMessage = () => {
        // Show lock message only when access is not allowed
        const canView = isOwnProfile || !profile?.private || following;
        if (canView) return null;

        return (
            <View style={styles.privateContainer}>
                <LockKey size={48} color="#888" weight="regular" />
                <Text style={styles.privateTitle}>هذا الحساب خاص</Text>
                <Text style={styles.privateSubtitle}>
                    اتبع هذا الحساب لرؤية منشوراته
                </Text>
            </View>
        );
    };

    if (!profile && !loading) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>المستخدم غير موجود</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>رجوع</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Determine access once for render
    const canView = isOwnProfile || !profile?.private || following;
    const isBlockedEitherWay = !!blockStatus?.isBlocked;
    // Prevent revealing info before we know block status (unless own profile)
    const blockResolved = isOwnProfile || blockStatus !== null;

    return (
        <View style={{flex: 1, backgroundColor: "white"}}>
            <FlatList
                data={!loading && blockResolved && canView && !isBlockedEitherWay ? (activeTab === 'posts' ? userPosts : []) : []}
                keyExtractor={(item) => item.id!.toString()}
                showsVerticalScrollIndicator={false}
                onScrollBeginDrag={() => {setActivePostId(null)}}
                renderItem={({ item }) => (
                    <Post 
                        id={item.id}
                        title={item.title} 
                        content={item.content} 
                        created_at={new Date(typeof item.created_at === 'string' ? item.created_at.replace(/\.\d{6}/, '') : item.created_at!)} 
                        images={item.images}
                        comment_count={item.comment_count} 
                        links={item.links}
                        video={item.video}
                        author={item.author} 
                        reposted_post={item.reposted_post}
                        likes={item.likes}
                        isLiked={item.likes?.some(like => like?.user_id?.username === user?.username)}
                        isPlaying={activePostId === item.id!.toString()}
                        onPlay={() => {setActivePostId(item.id!.toString())}}
                    />
                )}
                onRefresh={onRefresh}
                refreshing={refreshing}
                ListHeaderComponent={
                    <>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => router.back()}>
                                <ArrowLeft size={24} color="#080808" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{isBlockedEitherWay ? 'الحساب' : (profile?.fullname || '')}</Text>
                            <TouchableOpacity onPress={() => setMenuVisible(true)}>
                                <List size={24} color="#080808" />
                            </TouchableOpacity>
                        </View>
                        {loading ? (
                            <SkeletonProfileHeader />
                        ) : (!blockResolved && !isOwnProfile) ? (
                            <SkeletonProfileHeader />
                        ) : isBlockedEitherWay ? (
                            <View style={styles.privateContainer}>
                                <Text style={styles.privateTitle}>الحساب غير متاح</Text>
                                <Text style={styles.privateSubtitle}>لا يمكنك عرض هذا الحساب بسبب الحظر</Text>
                            </View>
                        ) : (
                        <View style={styles.profileInfo}>
                            {/* Replace profile image with story bubble when available; otherwise show image */}
                            {profileStoryIndex !== null && storyGroups[profileStoryIndex] && storyGroups[profileStoryIndex].stories.length > 0 ? (
                                <TouchableOpacity onPress={() => router.push({ pathname: '/storyView', params: { index: String(profileStoryIndex) } })}>
                                    <Story image={storyGroups[profileStoryIndex].author.profile} viewed={storyGroups[profileStoryIndex].stories.every(s => s.isViewed)} />
                                </TouchableOpacity>
                            ) : (
                                <Image source={{ uri: profile?.profile }} style={styles.image} />
                            )}
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }}>
                                <Text style={[styles.heading]}>{profile?.fullname}</Text>
                                {profile?.verified && <SealCheck size={15} color="#1D9BF0" weight="fill"/>}
                            </View>
                            <Text style={[styles.subText]}>@{profile?.username}</Text>
                            
                            {/* Stats Section */}
                            {/** canView determines whether we can open lists and see posts */}
                            {/** When cannot view, show counts from profile object but keep lists disabled */}
                            <View style={styles.statsContainer}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>
                                        {canView ? userPosts.length : "-"}
                                    </Text>
                                    <Text style={styles.statLabel}>المنشورات</Text>
                                </View>
                                <TouchableOpacity
                                    disabled={!canView}
                                    onPress={() => setListModalVisible('followers')}
                                    style={styles.statItem}
                                >
                                    <Text style={styles.statNumber}>{canView ? followersCount : followersCount}</Text>
                                    <Text style={styles.statLabel}>المتابعون</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    disabled={!canView}
                                    onPress={() => setListModalVisible('following')}
                                    style={styles.statItem}
                                >
                                    <Text style={styles.statNumber}>{canView ? followingCount : followingCount}</Text>
                                    <Text style={styles.statLabel}>المتابَعون</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Follow/Edit Button */}
                            {isOwnProfile ? (
                                <TouchableOpacity style={styles.editButton}>
                                    <Text style={styles.editButtonText}>تعديل</Text>
                                </TouchableOpacity>
                            ) : (
                                renderFollowButton()
                            )}

                            {/* Tabs (only when view is allowed and not blocked) */}
                            {canView && (
                                <View style={styles.tabContainer}>
                                    <TouchableOpacity 
                                        style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
                                        onPress={() => setActiveTab('posts')}
                                    >
                                        <Article 
                                            size={20} 
                                            color={activeTab === 'posts' ? '#080808' : '#888'} 
                                            weight={activeTab === 'posts' ? 'fill' : 'regular'}
                                        />
                                        <Text style={[styles.tabText, activeTab === 'posts' && styles.activeTabText]}>
                                            المنشورات
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity 
                                        style={[styles.tab, activeTab === 'reposts' && styles.activeTab]}
                                        onPress={() => setActiveTab('reposts')}
                                    >
                                        <Repeat 
                                            size={20} 
                                            color={activeTab === 'reposts' ? '#080808' : '#888'} 
                                            weight={activeTab === 'reposts' ? 'fill' : 'regular'}
                                        />
                                        <Text style={[styles.tabText, activeTab === 'reposts' && styles.activeTabText]}>
                                            إعادة النشر
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                        )}
                        {!isBlockedEitherWay && renderPrivateMessage()}
                    </>
                }
                ListEmptyComponent={
                    loading ? (
                        <View>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <SkeletonPost key={i} />
                            ))}
                        </View>
                    ) : (
                        (!isBlockedEitherWay && canView) ? (
                            <View style={styles.emptyState}>
                                {activeTab === 'posts' && <Text style={styles.emptyText}>لا توجد منشورات</Text>}
                                {activeTab === 'reposts' && <Text style={styles.emptyText}>لا توجد إعادة نشر</Text>}
                                {activeTab === 'saves' && <Text style={styles.emptyText}>لا توجد محفوظات</Text>}
                            </View>
                        ) : null
                    )
                }
            />
            {/* Followers/Following Modal */}
            {listModalVisible && !isBlockedEitherWay && (
                <View style={styles.listModalBackdrop}>
                    <View style={styles.listModal}>
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>
                                {listModalVisible === 'followers' ? 'المتابعون' : 'المتابَعون'}
                            </Text>
                            <TouchableOpacity onPress={() => setListModalVisible(null)}>
                                <Text style={styles.closeText}>اغلاق</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={listModalVisible === 'followers' ? followers : followingList}
                            keyExtractor={(item, idx) => item?.username ?? String(idx)}
                            ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
                            renderItem={({ item }) => (
                                <View style={styles.listItem}>
                                    <Image source={{ uri: item?.profile }} style={styles.listAvatar} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.listName}>{item?.fullname || item?.username}</Text>
                                        {item?.username && <Text style={styles.listUsername}>@{item.username}</Text>}
                                    </View>
                                </View>
                            )}
                        />
                    </View>
                </View>
            )}

            {/* Profile actions menu */}
            <Modal
                // style={{ justifyContent: 'flex-end', padding: 10 }}
                animationType="fade"
                visible={menuVisible}
                transparent
                onRequestClose={() => setMenuVisible(false)}
            >
                <TouchableOpacity style={styles.listModalBackdrop} activeOpacity={1} onPress={() => setMenuVisible(false)} />
                <View style={[styles.listModal, { paddingHorizontal: 12, paddingTop: 8, maxHeight: undefined }]}>                    
                    {!isOwnProfile && (
                        <>
                            {blockStatus?.userBlockedTarget ? (
                                <TouchableOpacity
                                    style={{ paddingVertical: 12 }}
                                    onPress={async () => {
                                        try {
                                            if (!user?.id || !profile?.id) return;
                                            const res = await unblockUser(profile.id, user.id);
                                            if (res) {
                                                ToastAndroid.show('تم إلغاء الحظر', ToastAndroid.SHORT);
                                                setBlockStatus({ userBlockedTarget: false, targetBlockedUser: blockStatus?.targetBlockedUser || false, isBlocked: !!(blockStatus?.targetBlockedUser) });
                                            } else {
                                                ToastAndroid.show('فشل إلغاء الحظر', ToastAndroid.SHORT);
                                            }
                                        } catch { ToastAndroid.show('فشل إلغاء الحظر', ToastAndroid.SHORT); }
                                        finally { setMenuVisible(false); }
                                    }}
                                >
                                    <Text style={{ fontFamily: 'bold', color: '#d00', textAlign: 'center' }}>إلغاء حظر المستخدم</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={{ paddingVertical: 12 }}
                                    onPress={async () => {
                                        try {
                                            if (!user?.id || !profile?.id) return;
                                            const res = await blockUser(profile.id, user.id);
                                            if (res) {
                                                ToastAndroid.show('تم حظر المستخدم', ToastAndroid.SHORT);
                                                setBlockStatus({ userBlockedTarget: true, targetBlockedUser: blockStatus?.targetBlockedUser || false, isBlocked: true });
                                            } else {
                                                ToastAndroid.show('فشل الحظر', ToastAndroid.SHORT);
                                            }
                                        } catch { ToastAndroid.show('فشل الحظر', ToastAndroid.SHORT); }
                                        finally { setMenuVisible(false); }
                                    }}
                                >
                                    <Text style={{ fontFamily: 'bold', color: '#d00', textAlign: 'center' }}>حظر المستخدم</Text>
                                </TouchableOpacity>
                            )}
                            <View style={{ height: 1, backgroundColor: '#eee' }} />
                            <TouchableOpacity
                                style={{ paddingVertical: 12 }}
                                onPress={() => { setMenuVisible(false); setReportVisible(true); }}
                            >
                                <Text style={{ fontFamily: 'bold', color: '#222', textAlign: 'center' }}>الإبلاغ عن المستخدم</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </Modal>

            {/* Report user modal */}
            <Modal
                style={{ justifyContent: 'flex-end', margin: 0 }}
                animationType="slide"
                visible={reportVisible}
                transparent
                onRequestClose={() => setReportVisible(false)}
            >
                <TouchableOpacity style={styles.listModalBackdrop} activeOpacity={1} onPress={() => setReportVisible(false)} />
                <View style={[styles.listModal, { paddingHorizontal: 16, paddingTop: 12, maxHeight: '70%' }]}>                    
                    <Text style={[styles.listTitle, { textAlign: 'center', marginBottom: 8 }]}>الإبلاغ عن مستخدم</Text>
                    <Text style={{ fontFamily: 'regular', color: '#666', textAlign: 'right' }}>سبب الإبلاغ (اختياري)</Text>
                    <TextInput
                        style={{ borderWidth: 1, borderColor: '#e6e6e6', borderRadius: 8, padding: 10, minHeight: 100, textAlignVertical: 'top', marginTop: 6, fontFamily: 'regular' }}
                        placeholder="صف المشكلة بإيجاز..."
                        placeholderTextColor="#888"
                        multiline
                        value={reportReason}
                        onChangeText={setReportReason}
                        textAlign='right'
                    />
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity onPress={() => setReportVisible(false)} style={{ flex: 1, backgroundColor: '#eee', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}>
                            <Text style={{ fontFamily: 'bold', color: '#222' }}>إلغاء</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={reporting}
                            onPress={async () => {
                                if (!user?.id || !profile?.id) { ToastAndroid.show('يرجى تسجيل الدخول أولاً', ToastAndroid.SHORT); return; }
                                try {
                                    setReporting(true);
                                    const res = await createReport('user', profile.id, user.id, reportReason.trim() || undefined);
                                    if (res && res.success) {
                                        ToastAndroid.show('تم إرسال الإبلاغ', ToastAndroid.SHORT);
                                        setReportVisible(false);
                                        setReportReason('');
                                    } else {
                                        ToastAndroid.show('فشل إرسال الإبلاغ', ToastAndroid.SHORT);
                                    }
                                } catch { ToastAndroid.show('حدث خطأ أثناء الإبلاغ', ToastAndroid.SHORT); }
                                finally { setReporting(false); }
                            }}
                            style={{ flex: 1, backgroundColor: '#d9534f', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
                        >
                            <Text style={{ fontFamily: 'bold', color: '#fff' }}>{reporting ? 'جارٍ الإرسال...' : 'إبلاغ'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    heading: {
        fontSize: 18,
        fontFamily: "bold",
        color: "black",
        flexDirection: "row-reverse",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 5,
    },
    subText: {
        fontSize: 14,
        fontFamily: "regular",
        color: "gray",
        marginTop: -2,
    },
    header: {
        padding: 8,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: "bold",
        color: "black",
    },
    profileInfo: {
        padding: 5,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center"
    },
    image: {
        width: 90,
        height: 90,
        borderRadius: 60,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        paddingHorizontal: 20,
        width: '100%',
        gap: 10
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontFamily: 'bold',
        color: 'black',
    },
    statLabel: {
        fontSize: 14,
        fontFamily: 'regular',
        color: 'gray',
        marginTop: 2,
    },
    editButton: {
        marginTop: 20,
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        paddingHorizontal: 40,
        borderRadius: 8,
        borderColor: '#ddd',
    },
    followActionsRow: {
        flexDirection: 'row-reverse',
        gap: 8,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 8,
    },
    editButtonText: {
        fontSize: 16,
        fontFamily: 'regular',
        color: 'black',
        textAlign: 'center',
    },
    followButton: {
        marginTop: 20,
        backgroundColor: '#1D9BF0',
        paddingVertical: 8,
        paddingHorizontal: 40,
        borderRadius: 8,
    },
    messageButton: {
        flex: 1,
        marginTop: 20,
        backgroundColor: '#1D9BF0',
        paddingVertical: 8,
        paddingHorizontal: 40,
        borderRadius: 8,
        // backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    messageButtonText: {
        fontSize: 16,
        fontFamily: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    followingButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    followButtonText: {
        fontSize: 16,
        fontFamily: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    followingButtonText: {
        color: 'black',
    },
    tabContainer: {
        flexDirection: 'row',
        marginTop: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        width: '100%',
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#080808',
    },
    tabText: {
        fontSize: 14,
        fontFamily: 'regular',
        color: '#888',
        marginTop: 5,
    },
    activeTabText: {
        color: '#080808',
        fontFamily: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 16,
        fontFamily: 'regular',
        color: '#888',
    },
    privateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    privateTitle: {
        fontSize: 20,
        fontFamily: 'bold',
        color: '#080808',
        marginTop: 16,
        textAlign: 'center',
    },
    privateSubtitle: {
        fontSize: 16,
        fontFamily: 'regular',
        color: '#888',
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    loadingText: {
        fontSize: 16,
        fontFamily: 'regular',
        color: '#888',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 40,
    },
    errorText: {
        fontSize: 18,
        fontFamily: 'bold',
        color: '#080808',
        marginBottom: 20,
        textAlign: 'center',
    },
    backButton: {
        backgroundColor: '#1D9BF0',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
    },
    backButtonText: {
        fontSize: 16,
        fontFamily: 'bold',
        color: 'white',
        textAlign: 'center',
    },
    listModalBackdrop: {
        ...StyleSheet.absoluteFillObject as any,
        flexDirection: "row",
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    listModal: {
        maxHeight: '70%',
        backgroundColor: 'white',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        paddingBottom: 12,
    },
    listHeader: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    listTitle: {
        fontSize: 18,
        fontFamily: 'bold',
        color: '#080808',
    },
    closeText: {
        fontSize: 14,
        fontFamily: 'regular',
        color: '#1D9BF0',
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
    },
    listAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    listName: {
        fontSize: 16,
        fontFamily: 'bold',
        color: '#080808',
    },
    listUsername: {
        fontSize: 12,
        fontFamily: 'regular',
        color: '#666',
    },
});
