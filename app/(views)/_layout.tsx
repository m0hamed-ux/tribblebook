import { Stack } from 'expo-router/stack'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Layout() {
  return (
    <SafeAreaView style={{ flex: 1}}>
      <Stack>
        <Stack.Screen name="userprofile" options={{ headerShown: false }} />
        <Stack.Screen name="addStory" options={{ headerShown: false }} />
        <Stack.Screen name="community" options={{ headerShown: false }} />
        <Stack.Screen name="storyView" options={{ headerShown: false }} />
        <Stack.Screen name="postPreview" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="messages" options={{ headerShown: false }} />
        <Stack.Screen name="conversation" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  )
}