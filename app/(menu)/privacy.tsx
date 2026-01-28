import theme, { styles as appStyles } from '@/assets/theme/styles'
import { getUser, updateMyProfile } from '@/lib/db'
import { useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { ArrowRight } from 'phosphor-react-native'
import React, { useEffect, useState } from 'react'
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'

const Row = ({ title, value, onValueChange }: { title: string; value: boolean; onValueChange: (v: boolean) => void }) => (
  <View style={s.row}> 
    <Text style={s.rowText}>{title}</Text>
    <Switch value={value} onValueChange={onValueChange} thumbColor={value ? theme.colors.primary : '#fff'} trackColor={{ true: '#cfe9fb', false: '#e5e5e5' }} />
  </View>
)

export default function PrivacyScreen() {
  const router = useRouter()
  const { user } = useUser()
  const [privateAcc, setPrivateAcc] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadPrivacy() {
      try {
        if (user?.username) {
          const profile = await getUser(user.username)
          if (!cancelled && profile) setPrivateAcc(!!profile.private)
        }
      } catch (e) {
        // ignore; keep default
      }
    }
    loadPrivacy()
    return () => { cancelled = true }
  }, [user?.username])

  const onSave = async () => {
    if (!user?.id) return Alert.alert('خطأ', 'يرجى تسجيل الدخول أولاً')
    try {
      setLoading(true)
      const res = await updateMyProfile({ private: privateAcc }, user.id)
      setLoading(false)
      if (res) Alert.alert('تم الحفظ', 'تم تحديث إعدادات الخصوصية')
      else Alert.alert('خطأ', 'تعذر تحديث الإعدادات')
    } catch (e) {
      setLoading(false)
      Alert.alert('خطأ', 'حدث خطأ غير متوقع')
    }
  }

  return (
    <View style={[appStyles.container, { paddingTop: 8 }]}>      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <ArrowRight size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={s.headerTitle}>خصوصية الحساب</Text>
          <Text style={s.headerSubtitle}>تحكم في ظهور معلوماتك</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      <View style={{ gap: 10 }}>
        <Text style={s.sectionTitle}>حساب</Text>
        <View style={s.card}>
          <Row title="حساب خاص" value={privateAcc} onValueChange={setPrivateAcc} />
        </View>

        <TouchableOpacity activeOpacity={0.8} disabled={loading} style={[appStyles.buttonPrimary, { marginTop: 6, opacity: loading ? 0.6 : 1 }]} onPress={onSave}>
          <Text style={{ color: '#fff', fontFamily: 'bold' }}>{loading ? 'جارٍ الحفظ...' : 'حفظ'}</Text>
        </TouchableOpacity>
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
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
    fontFamily: 'regular',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff000000',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  rowText: {
    color: theme.colors.text.primary,
    fontSize: 16,
    fontFamily: 'regular',
  },
  sectionTitle: {
    color: theme.colors.text.secondary,
    fontFamily: 'bold',
    textAlign: 'right',
    marginTop: 10,
    marginBottom: 6,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  separator: {
    height: 1,
    backgroundColor: '#eaeaea',
  },
})
