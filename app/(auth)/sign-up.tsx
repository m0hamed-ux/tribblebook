import { styles } from "@/assets/theme/styles"
import { useSignUp, useUser } from '@clerk/clerk-expo'
import Feather from '@expo/vector-icons/Feather'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter } from 'expo-router'
import * as React from 'react'
import { Text, TextInput, TouchableOpacity, View } from 'react-native'

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [username, setUsername] = React.useState('')
  const [fullname, setFullname] = React.useState('')
  const [birthdate, setBirthdate] = React.useState('')
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [error, setError] = React.useState('')
  const [pendingVerification, setPendingVerification] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [codeError, setCodeError] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [validationErrors, setValidationErrors] = React.useState({
    fullname: '',
    username: '',
    email: '',
    password: '',
    birthdate: ''
  })
  const saveUser = async (id: string) => {
    try {
      const usr = await fetch('https://tribblebook-backend.onrender.com/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: username,
          email: emailAddress,
          fullname: fullname,
          profileImage: 'https://jhtyrwwvzjwsutjyqoog.supabase.co/storage/v1/object/public/storage/sbcf-default-avatar.webp',
          bio: "",
          isPrivate: false,
          birthdate: birthdate,
          user_id: id
        })
      })
      
      if (!usr.ok) {
        const errorData = await usr.json()
        throw new Error(errorData.message || 'فشل في حفظ بيانات المستخدم')
      }
      
      const res = await usr.json()
      return { success: true, data: res }
    } catch (error) {
      console.error('Error saving user:', error)
      return { 
        success: false, 
        error: (error as Error).message || 'حدث خطأ أثناء حفظ بيانات المستخدم' 
      }
    }
  }

  const clearValidationError = (field: keyof typeof validationErrors) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: ''
    }))
  }

  const validateInput = () => {
    const errors = {
      fullname: '',
      username: '',
      email: '',
      password: '',
      birthdate: ''
    }
    
    const usernameReg = /^[a-zA-Z0-9_]{3,15}$/
    const nameReg = /^[a-zA-Z\u0600-\u06FF\s]{3,30}$/
    const passwordReg = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!fullname.trim()) {
      errors.fullname = 'الاسم الكامل مطلوب'
    } else if (!nameReg.test(fullname)) {
      errors.fullname = 'الاسم الكامل يجب أن يحتوي على 3-30 حرف من الأحرف والمسافات فقط'
    }

    if (!username.trim()) {
      errors.username = 'اسم المستخدم مطلوب'
    } else if (!usernameReg.test(username)) {
      errors.username = 'اسم المستخدم يجب أن يحتوي على 3-15 حرف من الأحرف والأرقام والشرطة السفلية فقط'
    }

    if (!emailAddress.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب'
    } else if (!emailReg.test(emailAddress)) {
      errors.email = 'البريد الإلكتروني غير صحيح'
    }

    if (!password.trim()) {
      errors.password = 'كلمة المرور مطلوبة'
    } else if (!passwordReg.test(password)) {
      errors.password = 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل، حرف، رقم'
    }

    if (!birthdate) {
      errors.birthdate = 'تاريخ الميلاد مطلوب'
    } else {
      const today = new Date()
      const birth = new Date(birthdate)
      const age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) ? age - 1 : age
      
      if (actualAge < 18) {
        errors.birthdate = 'يجب أن تكون 18 سنة أو أكثر للتسجيل'
      }
    }

    setValidationErrors(errors)
    return Object.values(errors).every(error => error === '')
  }

  const onSignUpPress = async () => {
    if (!isLoaded) return
    
    setError('')
    
    if (!validateInput()) {
      return
    }

    setIsLoading(true)
    
    try {
      await signUp.create({
        emailAddress,
        password,
        username,
        firstName: fullname
      })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err: any) {
      console.error('Sign up error:', err)
      
     
      if (err.errors && err.errors.length > 0) {
        const clerkError = err.errors[0]
        switch (clerkError.code) {
          case 'form_identifier_exists':
            setError(clerkError.message.includes("username") ? "اسم المستخدم مُستخدم بالفعل" : "البريد الإلكتروني مُستخدم بالفعل")
            break
          case 'form_username_invalid':
            setError('اسم المستخدم غير صالح')
            break
          case 'form_username_taken':
            setError('اسم المستخدم مُستخدم بالفعل')
            break
          case 'form_password_pwned':
            setError('كلمة المرور ضعيفة جداً، يرجى اختيار كلمة مرور أقوى')
            break
          case 'form_password_validation':
            setError('كلمة المرور لا تلبي متطلبات الأمان')
            break
          default:
            setError(clerkError.longMessage || clerkError.message || 'حدث خطأ أثناء إنشاء الحساب')
        }
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setIsLoading(false)
      setTimeout(() => setError(''), 5000)
    }
  }

  const onVerifyPress = async () => {
    if (!isLoaded) return
    
    setCodeError('')
    setIsLoading(true)
    
    try {
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      })
      
      if (signUpAttempt.status === 'complete') {
        const userId = signUpAttempt.createdUserId
        console.log('User ID:', userId)
        const saveResult = await saveUser(userId!)
        if (!saveResult.success) {
          setCodeError(saveResult.error || 'حدث خطأ أثناء حفظ بيانات المستخدم')
          return
        }
        await setActive({ session: signUpAttempt.createdSessionId })
        router.replace('/(home)/(tabs)')
      } else {
        setCodeError('رمز التحقق غير صحيح')
      }
    } catch (err: any) {
      console.error('Verification error:', err)
      
      if (err.errors && err.errors.length > 0) {
        const clerkError = err.errors[0]
        switch (clerkError.code) {
          case 'verification_failed':
            setCodeError('رمز التحقق غير صحيح')
            break
          case 'verification_expired':
            setCodeError('انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد')
            break
          default:
            setCodeError(clerkError.message || 'حدث خطأ أثناء التحقق من الرمز')
        }
      } else {
        setCodeError('حدث خطأ أثناء التحقق من الرمز، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>تأكيد البريد الإلكتروني</Text>
        <Text style={styles.subtitle}>
          الرجاء إدخال رمز التحقق المرسل إلى بريدك الإلكتروني.
        </Text>
        <View style={{display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12}}>
          <View style={styles.icon}>
            <Feather name="mail" size={24} color="black" />
          </View>
          <TextInput
            value={code}
            keyboardType="numeric"
            placeholder="رمز التحقق"
            placeholderTextColor={"#999"}
            onChangeText={(code) => setCode(code)}
            style={styles.input}
          />
        </View>
        {codeError ? (
          <Text style={{color: 'red', fontSize: 12, textAlign: 'right', marginBottom: 4}}>
            {codeError}
          </Text>
        ) : null}
        <TouchableOpacity onPress={onVerifyPress} disabled={isLoading || !code.trim()}>
          <Text style={[styles.buttonPrimary, (isLoading || !code.trim()) && { opacity: 0.6 }]}>
            {isLoading ? 'جاري التحقق...' : 'تأكيد'}
          </Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>إنشاء حساب</Text>
      <Text style={styles.subtitle}>
        مرحبًا بك! الرجاء إدخال بريدك الإلكتروني وكلمة المرور لإنشاء حساب جديد.
      </Text>
      
      <View style={{display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12}}>
        <View style={styles.icon}>
          <Feather name="user" size={24} color="black" />
        </View>
        <TextInput
          autoCapitalize="none"
          value={fullname}
          placeholder="الاسم الكامل"
          placeholderTextColor={"#999"}
          onChangeText={(name) => {
            setFullname(name)
            clearValidationError('fullname')
          }}
          style={[styles.input, validationErrors.fullname && { borderColor: 'red' }]}
        />
      </View>
      {validationErrors.fullname ? (
        <Text style={{ color: 'red', fontSize: 12, textAlign: 'right', marginBottom: 8, fontFamily: 'regular' }}>
          {validationErrors.fullname}
        </Text>
      ) : null}
      <View style={{display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12}}>
        <View style={styles.icon}>
          <Feather name="hash" size={24} color="black" />
        </View>
        <TextInput
          autoCapitalize="none"
          value={username}
          placeholder="اسم المستخدم"
          placeholderTextColor={"#999"}
          onChangeText={(username) => {
            setUsername(username)
            clearValidationError('username')
          }}
          style={[styles.input, validationErrors.username && { borderColor: 'red' }]}
        />
      </View>
      {validationErrors.username ? (
        <Text style={{ color: 'red', fontSize: 12, textAlign: 'right', marginBottom: 8, fontFamily: 'regular' }}>
          {validationErrors.username}
        </Text>
      ) : null}
      <View style={{display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12}}>
        <View style={styles.icon}>
          <MaterialIcons name="calendar-today" size={24} color="black" />
        </View>
        <TouchableOpacity
          onPress={() => {
            setShowDatePicker(true);
          }}
          style={[styles.input, {justifyContent: 'center'}, validationErrors.birthdate && { borderColor: 'red' }]}
        >
          <Text style={{color: birthdate ? 'black' : '#999', textAlign: 'right', fontFamily: 'regular'}}>
            {birthdate || 'تاريخ الميلاد'}
          </Text>
        </TouchableOpacity>
      </View>
      {validationErrors.birthdate ? (
        <Text style={{ color: 'red', fontSize: 12, textAlign: 'right', marginBottom: 8, fontFamily: 'regular' }}>
          {validationErrors.birthdate}
        </Text>
      ) : null}
      {showDatePicker && (
        <DateTimePicker
          value={birthdate ? new Date(birthdate) : new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            if (selectedDate) {
              setBirthdate(selectedDate.toISOString().split("T")[0]);
              clearValidationError('birthdate')
              setShowDatePicker(false);
            }
          }}
        />
      )}
      
      <View style={{display: 'flex', flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 12}}>
        <View style={styles.icon}>
          <MaterialIcons name="alternate-email" size={24} color="black" />
        </View>
        <TextInput
          autoCapitalize="none"
          value={emailAddress}
          placeholder="البريد الإلكتروني"
          placeholderTextColor={"#999"}
          onChangeText={(email) => {
            setEmailAddress(email)
            clearValidationError('email')
          }}
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
          placeholderTextColor={"#999"}
          secureTextEntry={true}
          onChangeText={(password) => {
            setPassword(password)
            clearValidationError('password')
          }}
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
      <TouchableOpacity onPress={onSignUpPress} disabled={isLoading}>
        <Text style={[styles.buttonPrimary, isLoading && { opacity: 0.6 }]}>
          {isLoading ? 'جاري إنشاء الحساب...' : 'متابعة'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/sign-in')}>
        <Text style={styles.buttonSecondary}>
        تسجيل الدخول
        </Text>
      </TouchableOpacity>
    </View>
  )
}