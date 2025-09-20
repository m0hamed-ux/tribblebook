import theme, { styles as appStyles } from '@/assets/theme/styles'
import { updateMyProfile } from '@/lib/db'
import { useUser } from '@clerk/clerk-expo'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { ArrowRight, ImageSquare, User as UserIcon } from 'phosphor-react-native'
import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

// Cloudinary configuration
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtspfuyuf/'
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'tribble_preset'

async function uploadToCloudinary(uri: string): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('file', { uri, type: 'image/jpeg', name: `avatar_${Date.now()}.jpg` } as any)
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    const res = await fetch(`${CLOUDINARY_URL}image/upload`, { method: 'POST', body: formData })
    const data = await res.json()
    if (res.ok && data.secure_url) return data.secure_url as string
    return null
  } catch (e) {
    console.log('avatar upload error', e)
    return null
  }
}

export default function AccountScreen() {
  const router = useRouter()
  const { user } = useUser()
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSave = useMemo(() => name.trim().length > 0 || bio.trim().length > 0 || !!avatar, [name, bio, avatar])

  const onPickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('إذن مرفوض', 'نحتاج إلى إذن للوصول إلى معرض الصور')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri
        setLoading(true)
        const url = await uploadToCloudinary(uri)
        setLoading(false)
        if (url) setAvatar(url)
        else Alert.alert('خطأ', 'فشل في رفع الصورة')
      }
    } catch (e) {
      setLoading(false)
      Alert.alert('خطأ', 'تعذر اختيار الصورة')
    }
  }

  const onSave = async () => {
    if (!user?.id) return Alert.alert('خطأ', 'يرجى تسجيل الدخول أولاً')
    try {
      setLoading(true)
      const payload: any = {}
      if (name.trim()) payload.fullname = name.trim()
      if (bio.trim()) payload.bio = bio.trim()
      if (avatar) payload.profile = avatar
      const res = await updateMyProfile(payload, user.id)
      setLoading(false)
      if (res) Alert.alert('تم الحفظ', 'تم تحديث ملفك الشخصي')
      else Alert.alert('خطأ', 'تعذر تحديث الملف الشخصي')
    } catch (e) {
      setLoading(false)
      Alert.alert('خطأ', 'تعذر تحديث الملف الشخصي')
    }
  }

  return (
    <View style={[appStyles.container, { paddingTop: 8 }]}>      
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <ArrowRight size={22} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={s.headerTitle}>إعدادات الحساب</Text>
          <Text style={s.headerSubtitle}>تحديث اسمك واسم المستخدم</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
        {/* Avatar picker */}
        <View style={s.avatarRow}>
          <TouchableOpacity onPress={onPickAvatar} activeOpacity={0.8} style={s.avatarBtn}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaeaea' }]}> 
                <ImageSquare size={28} color="#666" />
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>الصورة الشخصية</Text>
            <Text style={s.help}>اختر صورة واضحة لملفك</Text>
          </View>
        </View>

        <View style={s.fieldBlock}>
          <Text style={s.label}>الاسم الكامل</Text>
          <View style={s.inputRow}>
            {/* <View style={s.iconWrap}><UserIcon size={20} color="#3a3a3a" /></View> */}
            <TextInput
              style={[appStyles.input, {borderRadius: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12}]}
              placeholder="مثال: محمد أحمد"
              placeholderTextColor="#9e9e9e"
              value={name}
              onChangeText={setName}
            />
          </View>
        </View>
        <View style={s.fieldBlock}>
          <Text style={s.label}>نبذة عنك</Text>
          <TextInput
            style={[appStyles.input, { height: 120, borderRadius: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, textAlignVertical: 'top' }]}
            placeholder="اكتب نبذة قصيرة عنك"
            placeholderTextColor="#9e9e9e"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={200}
          />
          <Text style={[s.help, { textAlign: 'left', writingDirection: 'ltr' }]}>{bio.length}/200</Text>
        </View>

        <TouchableOpacity disabled={!canSave || loading} activeOpacity={0.8} style={[appStyles.buttonPrimary, { marginTop: 6, opacity: !canSave || loading ? 0.6 : 1 }]} onPress={onSave}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontFamily: 'bold' }}>حفظ التغييرات</Text>}
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
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    // backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatarBtn: {
    borderRadius: 40,
    overflow: 'hidden',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  fieldBlock: {
    // marginBottom: 10,
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
  iconWrap: {
    width: 44,
    // height: '100%',
    // flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: '#eaeaea',
  },
})
