import { useRegisterPushToken } from '@/lib/notification'
import { useAuth } from '@clerk/clerk-expo'
import { Stack } from 'expo-router/stack'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Layout() {
  const { isSignedIn, isLoaded, userId } = useAuth()
  useRegisterPushToken(isLoaded && isSignedIn ? userId ?? undefined : undefined)
  return (
    <SafeAreaView style={{ flex: 1}}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  )
}