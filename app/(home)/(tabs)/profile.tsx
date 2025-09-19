import Post from '@/app/components/post';
import { PostProps } from '@/lib/database.module';
import { getUser, getUserPosts } from '@/lib/db';
import { useUser } from '@clerk/clerk-expo';
import { Article, BookmarkSimple, List, Repeat, SealCheck } from "phosphor-react-native";
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


export default function ProfileScreen() {
    const { user } = useUser();
    const [profile, setProfile] = useState<any>(null);
    const [userPosts, setUserPosts] = useState<PostProps[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'saves'>('posts');
    const [activePostId, setActivePostId] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        const userProfile = await getUser(user?.username as string);
        const posts = await getUserPosts(user?.username as string);
        setProfile(userProfile);
        setUserPosts(posts);
    }, [user?.username]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    }, [loadData]);
    useEffect(() => {
        if (user?.username) {
            loadData();
        }
    }, [user?.username, loadData]);
    return (
        <View style={{flex: 1, backgroundColor: "white"}}>
            <FlatList
                data={activeTab === 'posts' ? userPosts : activeTab === 'reposts' ? userPosts.filter(post => post.reposted_post) : []}
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
                        video={item.video}
                        links={item.links}
                        author={item.author} 
                        community={item.community}
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
                                    <Text style={styles.statNumber}>{userPosts.length}</Text>
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

                            {/* Edit Profile Button */}
                            <TouchableOpacity style={styles.editButton}>
                                <Text style={styles.editButtonText}>تعديل</Text>
                            </TouchableOpacity>

                            {/* Tabs Navigation */}
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

                                <TouchableOpacity 
                                    style={[styles.tab, activeTab === 'saves' && styles.activeTab]}
                                    onPress={() => setActiveTab('saves')}
                                >
                                    <BookmarkSimple 
                                        size={20} 
                                        color={activeTab === 'saves' ? '#080808' : '#888'} 
                                        weight={activeTab === 'saves' ? 'fill' : 'regular'}
                                    />
                                    <Text style={[styles.tabText, activeTab === 'saves' && styles.activeTabText]}>
                                        المحفوظات
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        {activeTab === 'posts' && <Text style={styles.emptyText}>لا توجد منشورات</Text>}
                        {activeTab === 'reposts' && <Text style={styles.emptyText}>لا توجد إعادة نشر</Text>}
                        {activeTab === 'saves' && <Text style={styles.emptyText}>لا توجد محفوظات</Text>}
                    </View>
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
        padding: 5,
        paddingHorizontal: 10,
        flexDirection: "row-reverse",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "white",
        // borderBottomWidth: 1,
        borderBottomColor: "#ccc",
    },
    profileInfo: {
        padding: 5,
        paddingHorizontal: 10,
        // flexDirection: "row-reverse",
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
        // borderWidth: 1,
        borderColor: '#ddd',
    },

    editButtonText: {
        fontSize: 16,
        fontFamily: 'regular',
        color: 'black',
        textAlign: 'center',
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

    tabContent: {
        flex: 1,
        padding: 20,
        minHeight: 200,
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
})