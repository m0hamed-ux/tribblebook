import Header from '@/app/components/header'
import Post from '@/app/components/post'
import Story, { MyStory } from '@/app/components/story'
import { styles } from '@/assets/theme/styles'
import { PostProps, StoryViewProps, UserProps } from '@/lib/database.module'
import { getPosts, getStories } from '@/lib/db'
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import { Redirect, useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { FlatList, Text, TouchableOpacity, View } from 'react-native'

export default function Page() {
  const { user } = useUser()
  const router = useRouter()
  const data = [
    { id: "2", image : "https://images.unsplash.com/photo-1526779259212-939e64788e3c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZnJlZSUyMGltYWdlc3xlbnwwfHwwfHx8MA%3D%3D" },
    { id: "3", image : "https://images.unsplash.com/photo-1526779259212-939e64788e3c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZnJlZSUyMGltYWdlc3xlbnwwfHwwfHx8MA%3D%3D" },
    { id: "4", image : "https://images.unsplash.com/photo-1526779259212-939e64788e3c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZnJlZSUyMGltYWdlc3xlbnwwfHwwfHx8MA%3D%3D" },
    { id: "5", image : "https://images.unsplash.com/photo-1526779259212-939e64788e3c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZnJlZSUyMGltYWdlc3xlbnwwfHwwfHx8MA%3D%3D" },
    { id: "6", image : "https://images.unsplash.com/photo-1526779259212-939e64788e3c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZnJlZSUyMGltYWdlc3xlbnwwfHwwfHx8MA%3D%3D" },
    { id: "7", image : "https://images.unsplash.com/photo-1526779259212-939e64788e3c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZnJlZSUyMGltYWdlc3xlbnwwfHwwfHx8MA%3D%3D" },
    { id: "8", image : "https://images.unsplash.com/photo-1526779259212-939e64788e3c?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8ZnJlZSUyMGltYWdlc3xlbnwwfHwwfHx8MA%3D%3D" },
  ]
  const [refreshing, setRefreshing] = useState(false); 
  const [posts, setPosts] = useState<PostProps[]>([]);
  const [stories, setStories] = useState<Array<{ author: UserProps; stories: StoryViewProps[] }>>([])

  
  const loadData = useCallback(async () => {
    const data = await getPosts();
    setPosts(data);
    if (user?.id) {
      const s = await getStories(user.id)
      setStories(s)
    } else {
      setStories([])
    }
  }, [user?.id]);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);
  useEffect(() => {
    loadData();
    console.log(user?.username);
  }, [loadData]);
  const [activePostId, setActivePostId] = useState<string | null>(null);

  return (
    <View 
     style={[styles.container, {padding: 0, flex: 0}]}>
      <SignedIn>
        <FlatList
          data={posts} 
          keyExtractor={(item) => item.id!.toString()}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => {setActivePostId(null); console.log(activePostId)}}
          renderItem={({ item }) => (
            <Post 
              id={item.id}
              title={item.title} 
              content={item.content} 
              created_at={new Date(typeof item.created_at === 'string' ? item.created_at.replace(/\.\d{6}/, '') : item.created_at!)} 
              images={item.images} 
              video={item.video}
              author={item.author} 
              links={item.links}
              community={item.community}
              comment_count={item.comment_count}
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
              <Header />
              <FlatList
                data={(() => {
                  const meAuthor: UserProps = {
                    username: user?.username || '',
                    fullname: (user as any)?.fullName || user?.username || '',
                    profile: user?.imageUrl || ''
                  }
                  const hasMine = stories.some(g => g.author.username === user?.username)
                  const base = hasMine ? stories : ([{ author: meAuthor, stories: [] }] as Array<{ author: UserProps; stories: StoryViewProps[] }>).concat(stories)
                  return [...base].sort((a, b) => {
                    const aIsMe = a.author.username === user?.username
                    const bIsMe = b.author.username === user?.username
                    if (aIsMe && !bIsMe) return -1
                    if (bIsMe && !aIsMe) return 1
                    const aViewed = a.stories.every(s => s.isViewed)
                    const bViewed = b.stories.every(s => s.isViewed)
                    if (aViewed !== bViewed) return aViewed ? 1 : -1
                    // tie-breaker: newest story recency
                    const aLatest = a.stories[0]?.createdAt || ''
                    const bLatest = b.stories[0]?.createdAt || ''
                    return (new Date(bLatest).getTime() - new Date(aLatest).getTime())
                  })
                })()}
                keyExtractor={(item) => item.author.username}
                horizontal
                inverted
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                removeClippedSubviews
                showsHorizontalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  const isMe = item.author.username === user?.username
                  return (
                    <View style={{ alignItems: 'center' }}>
                      {isMe ? (
                        <MyStory image={user?.imageUrl} hasStories={item.stories.length > 0} groupIndex={index} />
                      ) : (
                        <TouchableOpacity onPress={() => router.push({ pathname: '/storyView', params: { index: String(index) } })}>
                          <Story image={item.author.profile} viewed={item.stories.every(s => s.isViewed)} />
                        </TouchableOpacity>
                      )}
                      <Text style={{ fontSize: 10, color: '#555', marginTop: 4, maxWidth: 80 }} numberOfLines={1}>
                        {isMe && item.stories.length === 0 ? 'قصتي' : item.author.username}
                      </Text>
                    </View>
                  )
                }}
                contentContainerStyle={{ paddingVertical: 10 }}
              />
              <Text style={[styles.title, {fontSize: 18, color: "black", paddingHorizontal: 10, marginBottom: 5}]}>
                أحدث المنشورات
              </Text>
            </>
          }
        />
      </SignedIn>
      <SignedOut>
        <Redirect href="/sign-in" />
      </SignedOut>
    </View>
  )
}