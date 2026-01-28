import { DialogProvider, dialogService } from '@/app/components/dialouge';
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@clerk/clerk-expo/token-cache';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Alert, I18nManager } from 'react-native';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();
I18nManager.forceRTL(false);
I18nManager.allowRTL(false);
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'regular': require('@/assets/fonts/ArbFONTS-Al-Jazeera-Arabic-Regular.ttf'),
    'bold': require('@/assets/fonts/ArbFONTS-Al-Jazeera-Arabic-Bold.ttf'),
    'light': require('@/assets/fonts/ArbFONTS-Al-Jazeera-Arabic-Light.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (I18nManager.isRTL) {
      I18nManager.allowRTL(false);
      I18nManager.forceRTL(false);
    }
  }, []);

  // Patch Alert.alert to use our dialogService (so existing Alert.alert calls show our custom dialog)
  useEffect(() => {
    const original = Alert.alert
    // @ts-ignore
    Alert.alert = (title?: any, message?: any, buttons?: any, options?: any) => {
      try {
        dialogService.showFromAlertArgs(title, message, buttons)
      } catch (e) {
        // fallback to original
        original(title, message, buttons, options)
      }
    }
    return () => {
      // restore
      // @ts-ignore
      Alert.alert = original
    }
  }, [])

  const publishableKey =
    process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    (Constants.expoConfig?.extra as any)?.clerkPublishableKey;

  if (!publishableKey) {
    throw new Error('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Set it in your environment or EAS secrets.');
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <DialogProvider>
        <Slot />
      </DialogProvider>
    </ClerkProvider>
  )
}