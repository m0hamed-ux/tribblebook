import theme, { styles as appStyles } from '@/assets/theme/styles'
import { useClerk } from '@clerk/clerk-expo'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { ArrowRight, SignOut } from 'phosphor-react-native'
import React, { useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export default function SignOutConfirmScreen() {
  const router = useRouter()
  const { signOut } = useClerk()
  const [loading, setLoading] = useState(false)

  const onConfirm = async () => {
    try {
      setLoading(true)
      await signOut()
      Linking.openURL(Linking.createURL('/(auth)/sign-in'))
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <View style={[appStyles.container, { paddingTop: 8 }]}>      
      <View style={s.header}>
        <TouchableOpacity disabled={loading} onPress={() => router.back()} style={s.headerBtn}>
          <ArrowRight size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>تأكيد تسجيل الخروج</Text>
        <View style={s.headerBtn} />
      </View>

      <View style={s.card}>
        <View style={s.iconCircle}>
          <SignOut size={28} color={theme.colors.error} />
        </View>
        <Text style={s.title}>هل تريد بالتأكيد تسجيل الخروج؟</Text>
        <Text style={s.subtitle}>سيتم إنهاء جلستك الحالية ويمكنك تسجيل الدخول لاحقاً.</Text>

        <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 12 }}>
          <TouchableOpacity disabled={loading} onPress={onConfirm} activeOpacity={0.8} style={[appStyles.buttonPrimary, { flex: 1, opacity: loading ? 0.7 : 1 }]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontFamily: 'bold' }}>تأكيد</Text>}
          </TouchableOpacity>
          <TouchableOpacity disabled={loading} onPress={() => router.back()} activeOpacity={0.8} style={[appStyles.buttonSecondary, { flex: 1 }]}>
            <Text style={{ color: theme.colors.buttonSecondary.text, fontFamily: 'bold' }}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    color: theme.colors.text.primary,
    fontFamily: 'bold',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff000000',
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fde8e7',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    color: theme.colors.text.primary,
    textAlign: 'center',
    fontFamily: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontFamily: 'regular',
  },
})
