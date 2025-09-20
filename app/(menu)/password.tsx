import theme, { styles as appStyles } from '@/assets/theme/styles'
import { useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { ArrowRight } from 'phosphor-react-native'
import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function PasswordScreen() {
  const router = useRouter()
  const { user } = useUser()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const canSave = useMemo(() => !!current && !!next && !!confirm && next === confirm, [current, next, confirm])

  const onSave = async () => {
    if (!current || !next || !confirm) {
      return Alert.alert('تنبيه', 'الرجاء ملء جميع الحقول')
    }
    if (next !== confirm) {
      return Alert.alert('خطأ', 'كلمتا المرور غير متطابقتين')
    }
    if (!user) {
      return Alert.alert('خطأ', 'يرجى تسجيل الدخول أولاً')
    }
    try {
      setLoading(true)
      await user.updatePassword({ currentPassword: current, newPassword: next })
      setLoading(false)
      Alert.alert('تم التحديث', 'تم تغيير كلمة المرور بنجاح')
      setCurrent('')
      setNext('')
      setConfirm('')
      router.back()
    } catch (e: any) {
      setLoading(false)
      const msg = e?.errors?.[0]?.message || e?.message || 'تعذر تغيير كلمة المرور'
      Alert.alert('خطأ', msg)
    }
  }

  return (
    <View style={[appStyles.container, { paddingTop: 8 }]}>      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <ArrowRight size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={s.headerTitle}>إعداد كلمة المرور</Text>
          <Text style={s.headerSubtitle}>حافظ على أمان حسابك</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
        <View style={s.fieldBlock}>
          <Text style={s.label}>كلمة المرور الحالية</Text>
          <TextInput
            style={[appStyles.input, { borderRadius: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }]}
            placeholder="########"
            placeholderTextColor="#9e9e9e"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
          />
        </View>
        <View style={s.fieldBlock}>
          <Text style={s.label}>كلمة المرور الجديدة</Text>
          <TextInput
            style={[appStyles.input, { borderRadius: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }]}
            placeholder="########"
            placeholderTextColor="#9e9e9e"
            value={next}
            onChangeText={setNext}
            secureTextEntry
          />
          <Text style={s.help}>يجب أن تتكون من 6 أحرف على الأقل.</Text>
        </View>
        <View style={s.fieldBlock}>
          <Text style={s.label}>تأكيد كلمة المرور</Text>
          <TextInput
            style={[appStyles.input, { borderRadius: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }]}
            placeholder="########"
            placeholderTextColor="#9e9e9e"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />
        </View>

        <TouchableOpacity disabled={!canSave || loading} activeOpacity={0.8} style={[appStyles.buttonPrimary, { opacity: !canSave || loading ? 0.6 : 1 }]} onPress={onSave}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontFamily: 'bold' }}>تحديث كلمة المرور</Text>}
        </TouchableOpacity>
      </ScrollView>
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
  fieldBlock: {
    marginBottom: 10,
  },
  label: {
    color: theme.colors.text.secondary,
    fontFamily: 'regular',
    marginBottom: 6,
    textAlign: 'right',
    fontSize: 12,
  },
  help: {
    color: theme.colors.text.muted,
    fontFamily: 'regular',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
})
