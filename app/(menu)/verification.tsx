import theme, { styles as appStyles } from '@/assets/theme/styles'
import type { VerificationRequest } from '@/lib/database.module'
import { timeAgo } from '@/lib/date'
import { createVerificationRequest, getMyVerificationRequests } from '@/lib/db'
import { useUser } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { ArrowRight, CheckCircle, Clock, XCircle } from 'phosphor-react-native'
import React, { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function VerificationScreen() {
  const router = useRouter()
  const { user } = useUser()
  const [fullName, setFullName] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState<VerificationRequest[]>([])

  const canSubmit = useMemo(() => {
    const msg = buildMessage(fullName, note)
    return fullName.trim().length >= 2 && msg.trim().length >= 5 && !submitting
  }, [fullName, note, submitting])

  const hasPending = useMemo(() => requests.some(r => r.status === 'pending'), [requests])

  function buildMessage(name: string, noteText: string) {
    const n = name.trim()
    const t = noteText.trim()
    if (t.length === 0) return `الاسم: ${n}`
    return `الاسم: ${n}\nملاحظات: ${t}`
  }

  const loadRequests = async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const list = await getMyVerificationRequests(user.id)
      setRequests(Array.isArray(list) ? list : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const onSubmit = async () => {
    if (!user?.id) return Alert.alert('تنبيه', 'يرجى تسجيل الدخول أولاً')
    const message = buildMessage(fullName, note)
    if (message.trim().length < 5) return Alert.alert('تنبيه', 'الرسالة يجب أن تكون 5 أحرف على الأقل')
    if (hasPending) return Alert.alert('طلب قيد المراجعة', 'لديك طلب تحقق قيد الانتظار حالياً')
    try {
      setSubmitting(true)
      const res = await createVerificationRequest(message, user.id)
      if (res?.success) {
        Alert.alert('تم الاستلام', 'تم إرسال الطلب وسيتم مراجعته قريباً')
        setNote('')
        await loadRequests()
      } else {
        Alert.alert('خطأ', 'تعذر إرسال الطلب، حاول لاحقاً')
      }
    } catch (e) {
      Alert.alert('خطأ', 'حدث خطأ غير متوقع')
    } finally {
      setSubmitting(false)
    }
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

        <TouchableOpacity
          activeOpacity={0.8}
          style={[appStyles.buttonPrimary, { opacity: (!canSubmit || hasPending) ? 0.6 : 1 }]}
          onPress={onSubmit}
          disabled={!canSubmit || hasPending}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontFamily: 'bold' }}>
              {hasPending ? 'لديك طلب قيد الانتظار' : 'إرسال الطلب'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ marginTop: 16 }}>
          <Text style={[s.label, { marginBottom: 8 }]}>سجل الطلبات</Text>
          {loading ? (
            <ActivityIndicator color={theme.colors.text.secondary} />
          ) : requests.length === 0 ? (
            <Text style={s.help}>لا توجد طلبات سابقة</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {requests.map((r) => (
                <RequestItem key={String(r.id)} req={r} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

function RequestItem({ req }: { req: VerificationRequest }) {
  const color = req.status === 'approved' ? '#2e7d32' : req.status === 'rejected' ? '#c62828' : '#ef6c00'
  const Icon = req.status === 'approved' ? CheckCircle : req.status === 'rejected' ? XCircle : Clock
  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Icon size={18} color={color} />
          <Text style={[s.cardTitle, { color }]}>{statusLabel(req.status)}</Text>
        </View>
        <Text style={s.cardDate}>{timeAgo(req.created_at)}</Text>
      </View>
      <Text style={s.cardText}>{req.request_message}</Text>
      {req.reviewed_at ? (
        <Text style={[s.cardDate, { marginTop: 4 }]}>آخر تحديث: {timeAgo(req.reviewed_at)}</Text>
      ) : null}
    </View>
  )
}

function statusLabel(s: VerificationRequest['status']) {
  switch (s) {
    case 'approved':
      return 'مقبول'
    case 'rejected':
      return 'مرفوض'
    default:
      return 'قيد المراجعة'
  }
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
  card: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fff',
  },
  cardTitle: {
    fontFamily: 'bold',
    fontSize: 14,
  },
  cardText: {
    marginTop: 8,
    color: theme.colors.text.primary,
    fontFamily: 'regular',
    textAlign: 'right',
    lineHeight: 20,
  },
  cardDate: {
    color: theme.colors.text.muted,
    fontFamily: 'regular',
    fontSize: 12,
  },
})
