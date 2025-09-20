import theme, { styles as appStyles } from '@/assets/theme/styles'
import { useRouter } from 'expo-router'
import { ArrowRight } from 'phosphor-react-native'
import React, { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function VerificationScreen() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [note, setNote] = useState('')

  const onSubmit = () => {
    Alert.alert('تم الاستلام', 'سيتم مراجعة طلبك قريباً')
  }

  return (
    <View style={[appStyles.container, { paddingTop: 8 }]}>      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <ArrowRight size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={s.headerTitle}>طلب التحقق</Text>
          <Text style={s.headerSubtitle}>اطلب الشارة الزرقاء لحسابك</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
        <Text style={{ color: theme.colors.text.secondary, textAlign: 'right', marginBottom: 12, fontFamily: 'regular' }}>
          املأ المعلومات التالية لإرسال طلب الحصول على الشارة الزرقاء.
        </Text>
        <View style={s.fieldBlock}>
          <Text style={s.label}>الاسم الكامل</Text>
          <TextInput
            style={[appStyles.input, { borderRadius: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }]}
            placeholder="مثال: محمد أحمد"
            placeholderTextColor="#9e9e9e"
            value={fullName}
            onChangeText={setFullName}
          />
        </View>
        <View style={s.fieldBlock}>
          <Text style={s.label}>ملاحظات إضافية</Text>
          <TextInput
            style={[appStyles.input, { height: 120, borderRadius: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, textAlignVertical: 'top' }]}
            placeholder="اكتب أي تفاصيل تساعد في التحقق"
            placeholderTextColor="#9e9e9e"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={300}
          />
          <Text style={s.help}>تلميح: أرفق روابط تثبت هويتك أو نشاطك (مثال: موقع شخصي، حسابات موثقة).</Text>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={appStyles.buttonPrimary} onPress={onSubmit}>
          <Text style={{ color: '#fff', fontFamily: 'bold' }}>إرسال الطلب</Text>
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
