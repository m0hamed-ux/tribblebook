import Post from '@/app/components/post';
import { PostProps } from '@/lib/database.module';
import { getUser, getUserPosts } from '@/lib/db';
import { useUser } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Article, List, LockKey, Repeat, SealCheck } from "phosphor-react-native";
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
    const [loading, setLoading] = useState(true);

    // Check if this is the current user's profile
    const isOwnProfile = user?.username === username;

    const loadData = useCallback(async () => {
        if (!username) return;
        
        try {
            setLoading(true);
            const userProfile = await getUser(username);
            setProfile(userProfile);
            
            // Only fetch posts if profile is public or it's the user's own profile
            if (!userProfile?.private || isOwnProfile) {
                const posts = await getUserPosts(username);
                setUserPosts(posts);
            } else {
                setUserPosts([]);
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

    const handleFollow = useCallback(() => {
        // Toggle follow state (not implemented - just UI)
        setFollowing(!following);
        // TODO: Implement actual follow API call
    }, [following]);

    useEffect(() => {
        if (username) {
            loadData();
        }
    }, [username, loadData]);

    const renderFollowButton = () => {
        if (isOwnProfile) return null;

        return (
            <TouchableOpacity 
                style={[styles.followButton, following && styles.followingButton]}
                onPress={handleFollow}
            >
                <Text style={[styles.followButtonText, following && styles.followingButtonText]}>
                    {following ? "متابَع" : "متابعة"}
                </Text>
            </TouchableOpacity>
        );
    };

    const renderPrivateMessage = () => {
        if (!profile?.private || isOwnProfile) return null;

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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>جاري تحميل الملف الشخصي...</Text>
            </View>
        );
    }

    if (!profile) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>المستخدم غير موجود</Text>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Text style={styles.backButtonText}>رجوع</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={{flex: 1, backgroundColor: "white"}}>
            <FlatList
                data={profile?.private && !isOwnProfile ? [] : (activeTab === 'posts' ? userPosts : [])}
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
                            <Text style={styles.headerTitle}>{profile?.fullname}</Text>
                            <TouchableOpacity>
                                <List size={24} color="#080808" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.profileInfo}>
                            <Image source={{ uri: profile?.profile }} style={styles.image} />
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 }}>
                                <Text style={[styles.heading]}>{profile?.fullname}</Text>
                                {profile?.verified && <SealCheck size={15} color="#1D9BF0" weight="fill"/>}
                            </View>
                            <Text style={[styles.subText]}>@{profile?.username}</Text>
                            
                            {/* Stats Section */}
                            <View style={styles.statsContainer}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>
                                        {profile?.private && !isOwnProfile ? "-" : userPosts.length}
                                    </Text>
                                    <Text style={styles.statLabel}>المنشورات</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{profile?.followers?.length || 0}</Text>
                                    <Text style={styles.statLabel}>المتابعون</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Text style={styles.statNumber}>{profile?.following?.length || 0}</Text>
                                    <Text style={styles.statLabel}>المتابَعون</Text>
                                </View>
                            </View>

                            {/* Follow/Edit Button */}
                            {isOwnProfile ? (
                                <TouchableOpacity style={styles.editButton}>
                                    <Text style={styles.editButtonText}>تعديل</Text>
                                </TouchableOpacity>
                            ) : (
                                renderFollowButton()
                            )}

                            {/* Tabs Navigation - Only show if not private or own profile */}
                            {(!profile?.private || isOwnProfile) && (
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
                        {renderPrivateMessage()}
                    </>
                }
                ListEmptyComponent={
                    !profile?.private || isOwnProfile ? (
                        <View style={styles.emptyState}>
                            {activeTab === 'posts' && <Text style={styles.emptyText}>لا توجد منشورات</Text>}
                            {activeTab === 'reposts' && <Text style={styles.emptyText}>لا توجد إعادة نشر</Text>}
                            {activeTab === 'saves' && <Text style={styles.emptyText}>لا توجد محفوظات</Text>}
                        </View>
                    ) : null
                }
            />
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
});
