import { SignedIn, SignedOut, useUser } from '@clerk/clerk-expo'
import { Link, Redirect } from 'expo-router'
import { Text, FlatList, Image, View, ToastAndroid } from 'react-native'
import { SignOutButton } from '@/app/components/SignOutButton'
import {styles} from '@/assets/theme/styles'
import Story , {MyStory} from '@/app/components/story'
import Post from '@/app/components/post'
import { useCallback, useEffect, useState } from 'react'
import Header from '@/app/components/header'
import { getPosts } from '@/lib/db'
import { PostProps } from '@/lib/database.module'

export default function Page() {
  const { user } = useUser()
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

  
  const loadData = useCallback(async () => {
    const data = await getPosts();
    setPosts(data);
  }, []);
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
                data={data}
                keyExtractor={(item) => item.id}
                horizontal
                inverted
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                removeClippedSubviews
                showsHorizontalScrollIndicator={false}
                ListHeaderComponent={<MyStory image={user?.imageUrl} />}
                renderItem={({ item }) => <Story image={item.image} />}
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