import { Redirect, Stack } from 'expo-router'
import { useAuth } from '@clerk/clerk-expo'
import { SafeAreaView } from 'react-native-safe-area-context'
import { use, useState } from 'react'
import { useFonts } from 'expo-font'


export default function AuthRoutesLayout() {
  const { isSignedIn } = useAuth()
  if (isSignedIn) {
    return <Redirect href={'/'} />
  }

  return (
    <SafeAreaView style={{ flex: 1}}>
      <Stack>
        {/* <Stack.Screen name="welcome" options={{ headerShown: false }} /> */}
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  )
}