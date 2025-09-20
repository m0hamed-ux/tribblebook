import Post from '@/app/components/post'
import { SkeletonPost } from '@/app/components/Skeleton'
import { PostProps } from '@/lib/database.module'
import { getPostById } from '@/lib/db'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { SafeAreaView, ScrollView, Text, View } from 'react-native'

export default function PostPreview() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string }>()
  const [post, setPost] = useState<PostProps | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const idStr = params.id ?? ''
      const id = idStr && !Number.isNaN(Number(idStr)) ? Number(idStr) : idStr
      const data = await getPostById(id)
      setPost(data)
    } catch (e) {
      console.log('postPreview load error:', e)
      setPost(null)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
          <View style={{ paddingHorizontal: 10 }}>
            <SkeletonPost />
          </View>
        </ScrollView>
      </SafeAreaView>
    )
  }

  if (!post) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#333', fontFamily: 'regular' }}>لم يتم العثور على المنشور</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
        <View style={{ paddingHorizontal: 0 }}>
          <Post
            {...post}
            created_at={new Date(typeof post.created_at === 'string' ? post.created_at.replace(/\.\d{6}/, '') : post.created_at!)}
            onDeleted={(deletedId) => {
              try {
            router.back()
              } catch {}
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
