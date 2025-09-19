import Post from '@/app/components/post';
import type { CommunityProps, PostProps } from '@/lib/database.module';
import { getCommunity, getCommunityPosts, joinCommunity, leaveCommunity } from '@/lib/db';
import { useUser } from '@clerk/clerk-expo';
import Entypo from '@expo/vector-icons/Entypo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';

export default function CommunityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const idParam = params?.id as string | undefined;
  const communityId = useMemo(() => (idParam ? String(idParam) : undefined), [idParam]);
  const { user } = useUser();

  const [community, setCommunity] = useState<CommunityProps | null>(null);
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentlyPlayingPostId, setCurrentlyPlayingPostId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAll = async () => {
    if (!communityId) return;
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        getCommunity(communityId),
        getCommunityPosts(communityId),
      ]);
      setCommunity(c);
      setPosts(Array.isArray(p) ? p : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  const onRefresh = async () => {
    if (!communityId) return;
    setRefreshing(true);
    try {
      const [c, p] = await Promise.all([
        getCommunity(communityId),
        getCommunityPosts(communityId),
      ]);
      console.log(c)
      setCommunity(c);
      setPosts(Array.isArray(p) ? p : []);
    } finally {
      setRefreshing(false);
    }
  };

  const onPlay = (postId?: number) => {
    setCurrentlyPlayingPostId((prev) => (prev === postId ? null : postId ?? null));
  };

  const isMember = useMemo(() => {
    if (!community?.members || !user?.username) return false;
    try {
      return community.members.some((m: any) => {
        if (!m) return false;
        // Members might be array of UserProps or { user_id: UserProps }
        const candidate = m.user_id ?? m;
        return candidate?.username === user.username;
      });
    } catch {
      return false;
    }
  }, [community?.members, user?.username]);

  const handleJoinLeave = async () => {
    if (!communityId) return;
    if (!user?.id) {
      ToastAndroid.show('يرجى تسجيل الدخول أولاً', ToastAndroid.SHORT);
      router.push('/(auth)/sign-in');
      return;
    }
    if (isMember) {
      Alert.alert(
        'تأكيد المغادرة',
        'هل تريد بالفعل مغادرة هذا المجتمع؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          {
            text: 'مغادرة',
            style: 'destructive',
            onPress: async () => {
              setActionLoading(true);
              try {
                const res = await leaveCommunity(communityId, user.id);
                if (!res) throw new Error('leave failed');
                ToastAndroid.show('تمت المغادرة', ToastAndroid.SHORT);
                await fetchAll();
              } catch (e) {
                ToastAndroid.show('فشل تنفيذ العملية', ToastAndroid.SHORT);
              } finally {
                setActionLoading(false);
              }
            }
          }
        ]
      );
      return;
    }
    setActionLoading(true);
    try {
      const res = await joinCommunity(communityId, user.id);
      if (!res) throw new Error('join failed');
      ToastAndroid.show('تم الانضمام', ToastAndroid.SHORT);
      await fetchAll();
    } catch (e) {
      ToastAndroid.show('فشل تنفيذ العملية', ToastAndroid.SHORT);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'white' }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Entypo name="chevron-thin-left" size={18} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{community?.name}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Banner */}
        <View style={{ width: '100%', height: 120, backgroundColor: '#eee' }}>
          {community?.banner ? (
            <Image source={{ uri: community.banner }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : null}
        </View>

        {/* Avatar and title */}
        <View style={styles.headerCard}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
            <Image
              source={{ uri: community?.profile }}
              style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#ddd' }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.communityName}>{community?.name ?? '...'}</Text>
              {!!community?.members?.length && (
                <Text style={styles.membersCount}>{community.members.length} أعضاء</Text>
              )}
            </View>
            <TouchableOpacity
              disabled={actionLoading}
              style={[styles.joinBtn, isMember && styles.leaveBtn, actionLoading && { opacity: 0.6 }]}
              onPress={handleJoinLeave}
            >
              <Text style={[styles.joinBtnText, isMember && styles.leaveBtnText]}>
                {isMember ? 'مغادرة' : 'انضم'}
              </Text>
            </TouchableOpacity>
          </View>

          {!!community?.description && (
            <Text style={styles.description}>{community.description}</Text>
          )}

          {/* Stats: members and posts */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statNumber}>{community?.members?.length ?? 0}</Text>
              <Text style={styles.statLabel}>أعضاء</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statNumber}>{posts.length}</Text>
              <Text style={styles.statLabel}>منشورات</Text>
            </View>
          </View>

          {/* Create Post CTA for members */}
          {isMember && (
            <TouchableOpacity
              onPress={() => router.push(`/(home)/(tabs)/addPost?communityId=${communityId}`)}
              style={styles.createPostBtn}
            >
              <Text style={styles.createPostText}>إنشاء منشور</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Posts */}
        <View style={{ paddingHorizontal: 0 }}>
          {loading ? (
            <Text style={styles.loadingText}>جاري التحميل...</Text>
          ) : posts.length === 0 ? (
            <Text style={styles.emptyText}>لا توجد منشورات بعد</Text>
          ) : (
            posts.map((post) => (
              <Post
                key={post.id}
                id={post.id}
                author={post.author}
                title={post.title}
                content={post.content}
                images={post.images}
                video={post.video}
                links={post.links}
                comment_count={post.comment_count}
                created_at={new Date(typeof post.created_at === 'string' ? post.created_at.replace(/\.\d{6}/, '') : post.created_at!)}
                likes={post.likes}
                isLiked={post.isLiked}
                isPlaying={currentlyPlayingPostId === post.id}
                onPlay={() => onPlay(post.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    backgroundColor: 'white',
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'bold',
    fontSize: 16,
    color: '#111',
  },
  headerCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
    borderBottomColor: '#eee',
    borderBottomWidth: 6,
    backgroundColor: 'white',
  },
  communityName: {
    fontFamily: 'bold',
    fontSize: 18,
    color: 'black',
    textAlign: 'right',
  },
  membersCount: {
    fontFamily: 'regular',
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  joinBtn: {
    backgroundColor: '#1D9BF0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  leaveBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f01d1dff',
  },
  joinBtnText: {
    color: 'white',
    fontFamily: 'bold',
    fontSize: 14,
  },
  leaveBtnText: {
    color: '#f01d1dff',
  },
  description: {
    fontFamily: 'regular',
    fontSize: 14,
    color: '#333',
    textAlign: 'right',
    marginTop: 8,
  },
  statsRow: {
    marginTop: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  statChip: {
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
    gap: 6,
  },
  statNumber: {
    fontFamily: 'bold',
    fontSize: 14,
    color: '#111',
  },
  statLabel: {
    fontFamily: 'regular',
    fontSize: 12,
    color: '#666',
  },
  createPostBtn: {
    marginTop: 10,
    backgroundColor: '#1D9BF0',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createPostText: {
    color: 'white',
    fontFamily: 'bold',
    fontSize: 14,
  },
  adminCard: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderColor: '#eee',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
  },
  adminName: {
    fontFamily: 'bold',
    fontSize: 14,
    color: '#111',
    textAlign: 'right',
  },
  adminUsername: {
    fontFamily: 'regular',
    fontSize: 12,
    color: '#777',
    textAlign: 'right',
  },
  loadingText: {
    textAlign: 'center',
    paddingVertical: 24,
    color: '#666',
    fontFamily: 'regular',
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 24,
    color: '#999',
    fontFamily: 'regular',
  },
});
