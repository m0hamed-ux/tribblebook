import { useEffect } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/assets/theme/styles";
import { useFonts } from "expo-font";

export default function Index() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    'regular': require('@/assets/fonts/ArbFONTS-Al-Jazeera-Arabic-Regular.ttf'),
    'bold': require('@/assets/fonts/ArbFONTS-Al-Jazeera-Arabic-Bold.ttf'),
    'light': require('@/assets/fonts/ArbFONTS-Al-Jazeera-Arabic-Light.ttf'),
  });
  const { isLoaded, isSignedIn } = useAuth();
  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace("/(home)/(tabs)");
    } else {
      router.replace("/(auth)/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <SafeAreaView style={[styles.container, { justifyContent: "center" }]}>
      <View>
        <Text style={[styles.title, { textAlign: "center", fontSize: 30 }]}>
          تريبل بوك
        </Text>
      </View>
    </SafeAreaView>
  );
}
