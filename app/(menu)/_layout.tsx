import { Stack } from 'expo-router/stack'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Layout() {
  return (
    <SafeAreaView style={{ flex: 1}}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="password" options={{ headerShown: false }} />
        <Stack.Screen name="privacy" options={{ headerShown: false }} />
        <Stack.Screen name="communities" options={{ headerShown: false }} />
        <Stack.Screen name="createCommunity" options={{ headerShown: false }} />
        <Stack.Screen name="editCommunity" options={{ headerShown: false }} />
        <Stack.Screen name="verification" options={{ headerShown: false }} />
        <Stack.Screen name="about" options={{ headerShown: false }} />
        <Stack.Screen name="terms" options={{ headerShown: false }} />
        <Stack.Screen name="signout" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  )
}