import theme, { styles as appStyles } from '@/assets/theme/styles'
import { createCommunity } from '@/lib/db'
import { useUser } from '@clerk/clerk-expo'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'
import { ArrowRight, ImageSquare } from 'phosphor-react-native'
import React, { useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtspfuyuf/'
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'tribble_preset'

async function uploadToCloudinary(uri: string): Promise<string | null> {
  try {
    const form = new FormData()
    form.append('file', { uri, type: 'image/jpeg', name: `community_${Date.now()}.jpg` } as any)
    form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
    const res = await fetch(`${CLOUDINARY_URL}image/upload`, { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok && data.secure_url) return data.secure_url as string
    return null
  } catch (e) {
    console.log('cloudinary error', e)
    return null
  }
}

export default function CreateCommunityScreen() {
  const router = useRouter()
  const { user } = useUser()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [profile, setProfile] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const canSave = useMemo(() => name.trim().length > 0, [name])

  const onPickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      return Alert.alert('إذن مرفوض', 'نحتاج إلى إذن للوصول إلى الصور')
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
    if (!result.canceled && result.assets[0]) {
      setLoading(true)
      const url = await uploadToCloudinary(result.assets[0].uri)
      setLoading(false)
      if (url) setProfile(url)
      else Alert.alert('خطأ', 'تعذر رفع الصورة')
    }
  }

  const onCreate = async () => {
    if (!user?.id) return Alert.alert('خطأ', 'يرجى تسجيل الدخول أولاً')
    if (!name.trim()) return Alert.alert('تنبيه', 'اسم المجتمع مطلوب')
    try {
      setLoading(true)
      const resp = await createCommunity(name.trim(), user.id, { description: description.trim() || undefined, profile: profile || undefined })
      setLoading(false)
      if (resp) {
        Alert.alert('تم', 'تم إنشاء المجتمع بنجاح')
        router.back()
      } else {
        Alert.alert('خطأ', 'تعذر إنشاء المجتمع')
      }
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
          <Text style={s.headerTitle}>إنشاء مجتمع</Text>
          <Text style={s.headerSubtitle}>ابدأ مساحة لمشاركة اهتمامك</Text>
        </View>
        <View style={s.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 8 }}>
        <View style={s.avatarRow}>
          <TouchableOpacity onPress={onPickImage} activeOpacity={0.8} style={s.avatarBtn}>
            {profile ? (
              <Image source={{ uri: profile }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaeaea' }]}> 
                <ImageSquare size={28} color="#666" />
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>صورة المجتمع</Text>
            <Text style={s.help}>اختياري، يفضل 1:1</Text>
          </View>
        </View>

        <View style={s.fieldBlock}>
          <Text style={s.label}>اسم المجتمع</Text>
          <TextInput
            style={[appStyles.input, { borderRadius: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }]}
            placeholder="مثال: مطوري الواجهات"
            placeholderTextColor="#9e9e9e"
            value={name}
            onChangeText={setName}
          />
        </View>
        <View style={s.fieldBlock}>
          <Text style={s.label}>وصف</Text>
          <TextInput
            style={[appStyles.input, { height: 120, borderRadius: 12, borderTopLeftRadius: 12, borderBottomLeftRadius: 12, textAlignVertical: 'top' }]}
            placeholder="عرّف المجتمع بإيجاز"
            placeholderTextColor="#9e9e9e"
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={300}
          />
          <Text style={s.help}>{description.length}/300</Text>
        </View>

        <TouchableOpacity disabled={!canSave || loading} activeOpacity={0.8} style={[appStyles.buttonPrimary, { opacity: !canSave || loading ? 0.6 : 1 }]} onPress={onCreate}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontFamily: 'bold' }}>إنشاء</Text>}
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
})
