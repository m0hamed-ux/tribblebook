import { ClerkProvider } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router'

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'regular': require('@/assets/fonts/ArbFONTS-Al-Jazeera-Arabic-Regular.ttf'),
    'bold': require('@/assets/fonts/ArbFONTS-Al-Jazeera-Arabic-Bold.ttf'),
    'light': require('@/assets/fonts/ArbFONTS-Al-Jazeera-Arabic-Light.ttf'),
  });
  return (
    <ClerkProvider tokenCache={tokenCache}>
      <Slot />
    </ClerkProvider>
  )
}