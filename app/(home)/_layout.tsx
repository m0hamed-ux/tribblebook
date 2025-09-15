import { Stack } from 'expo-router/stack'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'

export default function Layout() {
  return (
    <SafeAreaView style={{ flex: 1}}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  )
}