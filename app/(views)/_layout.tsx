import { Stack } from 'expo-router/stack'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Layout() {
  return (
    <SafeAreaView style={{ flex: 1}}>
      <Stack>
        <Stack.Screen name="userprofile" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  )
}