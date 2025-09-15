import { styles } from "@/assets/theme/styles";
import { useSignIn } from '@clerk/clerk-expo';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Page() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [validationErrors, setValidationErrors] = React.useState({
    email: '',
    password: ''
  })
  
  const clearValidationError = (field: keyof typeof validationErrors) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: ''
    }))
    setError('')
  }

  const validateInput = () => {
    const errors = {
      email: '',
      password: ''
    }
    
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailAddress.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب'
    } else if (!emailReg.test(emailAddress)) {
      errors.email = 'البريد الإلكتروني غير صحيح'
    }

    if (!password.trim()) {
      errors.password = 'كلمة المرور مطلوبة'
    } else if (password.length < 6) {
      errors.password = 'كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل'
    }

    setValidationErrors(errors)
    return Object.values(errors).every(error => error === '')
  }
  
  const onSignInPress = async () => {
    if (!isLoaded || !signIn) return
    
    // Clear previous errors
    setError('')
    
    // Validate input
    if (!validateInput()) {
      return
    }

    setIsLoading(true)
    
    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      })
      
      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId })
        router.replace('/')
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى')
        console.error(JSON.stringify(signInAttempt, null, 2))
      }
    } catch (err: any) {
      console.error('Sign in error:', err)
      
      // Handle specific Clerk errors
      if (err.errors && err.errors.length > 0) {
        const clerkError = err.errors[0]
        switch (clerkError.code) {
          case 'form_identifier_not_found':
            setError('البريد الإلكتروني غير مسجل')
            break
          case 'form_password_incorrect':
            setError('كلمة المرور غير صحيحة')
            break
          case 'form_identifier_exists':
            setError('هذا الحساب موجود بالفعل')
            break
          case 'session_exists':
            setError('أنت مسجل دخول بالفعل')
            break
          case 'too_many_requests':
            setError('محاولات كثيرة، يرجى المحاولة لاحقاً')
            break
          default:
            setError(clerkError.longMessage || clerkError.message || 'حدث خطأ أثناء تسجيل الدخول')
        }
      } else if (err.message) {
        setError('حدث خطأ في الاتصال، يرجى التحقق من الإنترنت')
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!isLoaded || !signIn) return
    
    if (!emailAddress.trim()) {
      setError('الرجاء إدخال البريد الإلكتروني أولاً')
      return
    }

    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailReg.test(emailAddress)) {
      setError('الرجاء إدخال بريد إلكتروني صحيح')
      return
    }

    try {
      setIsLoading(true)
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: emailAddress,
      })
      setError('')
      // You might want to navigate to a password reset page here
      alert('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني')
    } catch (err: any) {
      console.error('Forgot password error:', err)
      if (err.errors && err.errors.length > 0) {
        const clerkError = err.errors[0]
        switch (clerkError.code) {
          case 'form_identifier_not_found':
            setError('البريد الإلكتروني غير مسجل')
            break
          default:
            setError('حدث خطأ أثناء إرسال رابط إعادة التعيين')
        }
      } else {
        setError('حدث خطأ أثناء إرسال رابط إعادة التعيين')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>تسجيل الدخول</Text>
      <Text style={styles.subtitle}>
        مرحبًا بعودتك! الرجاء إدخال بريدك الإلكتروني وكلمة المرور للمتابعة.
      </Text>
      <View style={{display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12}}>
        <View style={styles.icon}>
          <MaterialIcons name="alternate-email" size={24} color="black" />
        </View>
        <TextInput
          autoCapitalize="none"
          value={emailAddress}
          placeholder="البريد الإلكتروني"
          onChangeText={(emailAddress) => {
            setEmailAddress(emailAddress)
            clearValidationError('email')
          }}
          keyboardType="email-address"
          returnKeyType="next"
          style={[styles.input, validationErrors.email && { borderColor: 'red' }]}
        />
      </View>
      {validationErrors.email ? (
        <Text style={{ color: 'red', fontSize: 12, textAlign: 'right', marginBottom: 8, fontFamily: 'regular' }}>
          {validationErrors.email}
        </Text>
      ) : null}
      <View style={{display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12}}>
        <View style={styles.icon}>
          <Feather name="lock" size={24} color="black" />
        </View>
        <TextInput
          value={password}
          placeholder="كلمة المرور"
          secureTextEntry={true}
          onChangeText={(password) => {
            setPassword(password)
            clearValidationError('password')
          }}
          onSubmitEditing={onSignInPress}
          returnKeyType="done"
          style={[styles.input, validationErrors.password && { borderColor: 'red' }]}
        />
      </View>
      {validationErrors.password ? (
        <Text style={{ color: 'red', fontSize: 12, textAlign: 'right', marginBottom: 8, fontFamily: 'regular' }}>
          {validationErrors.password}
        </Text>
      ) : null}
      
      {error ? (
        <Text style={{ color: 'red', fontSize: 12, textAlign: 'right', marginBottom: 12, fontFamily: 'regular' }}>
          {error}
        </Text>
      ) : null}
      <TouchableOpacity onPress={handleForgotPassword} disabled={isLoading}>
        <Text style={[styles.link, {textAlign: 'right', marginBottom: 24, fontFamily: 'regular'}, isLoading && { opacity: 0.6 }]}>
          هل نسيت كلمة المرور؟
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onSignInPress} disabled={isLoading}>
        <Text style={[styles.buttonPrimary, isLoading && { opacity: 0.6 }]}>
          {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/sign-up')}>
        <Text style={styles.buttonSecondary}>
          إنشاء حساب
        </Text>
      </TouchableOpacity>

    </View>
  )
}