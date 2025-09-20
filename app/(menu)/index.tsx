import theme, { styles as appStyles } from '@/assets/theme/styles'
import { useRouter } from 'expo-router'
import {
	ArrowRight,
	CaretLeft,
	Info,
	Key,
	Lock,
	Scroll as ScrollIcon,
	SealCheck,
	SignOut,
	UserGear,
	UsersThree,
} from 'phosphor-react-native'
import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

type IconType = React.ComponentType<{ size?: number; color?: string }>

type SettingItemProps = {
	title: string
	Icon: IconType
	onPress?: () => void
	danger?: boolean
}

const SettingItem: React.FC<SettingItemProps> = ({ title, Icon, onPress, danger }) => {
	return (
		<TouchableOpacity
			onPress={onPress}
			activeOpacity={0.7}
			style={s.item}
		>
			{/* Row is RTL via row-reverse so the first child appears on the right */}
			<View style={[s.iconWrap, danger && { backgroundColor: '#fde8e7' }]}>
				<Icon size={22} color={danger ? theme.colors.error : theme.colors.primary} />
			</View>
			<Text style={[s.itemText, danger && { color: theme.colors.error }]}>{title}</Text>
			<CaretLeft size={18} color={danger ? theme.colors.error : '#919191'} />
		</TouchableOpacity>
	)
}

export default function SettingsScreen() {
	const router = useRouter()
	const handleLogout = () => router.push({ pathname: '/(menu)/signout' })

	return (
		<View style={[appStyles.container, { paddingTop: 8 }]}>      
			{/* Header */}
			<View style={s.header}>
				<TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
					<ArrowRight size={22} color={theme.colors.text.primary} />
				</TouchableOpacity>
				<View style={{ flex: 1, alignItems: 'center' }}>
					<Text style={s.headerTitle}>الإعدادات</Text>
					<Text style={s.headerSubtitle}>إدارة حسابك والتفضيلات</Text>
				</View>
				<View style={s.headerBtn} />
			</View>

			<ScrollView contentContainerStyle={s.list}>
				<SettingItem title="إعدادات الحساب" Icon={UserGear} onPress={() => router.push({ pathname: '/(menu)/account' })} />
				<SettingItem title="إعداد كلمة المرور" Icon={Key} onPress={() => router.push({ pathname: '/(menu)/password' })} />
				<SettingItem title="خصوصية الحساب" Icon={Lock} onPress={() => router.push({ pathname: '/(menu)/privacy' })} />
				<SettingItem title="المجتمعات" Icon={UsersThree} onPress={() => router.push({ pathname: '/(menu)/communities' })} />
				<SettingItem title="طلب التحقق" Icon={SealCheck} onPress={() => router.push({ pathname: '/(menu)/verification' })} />
				<SettingItem title="معلومات التطبيق" Icon={Info} onPress={() => router.push({ pathname: '/(menu)/about' })} />
				<SettingItem title="الخصوصية والشروط" Icon={ScrollIcon} onPress={() => router.push({ pathname: '/(menu)/terms' })} />

				<View style={s.divider} />

				<SettingItem title="تسجيل الخروج" Icon={SignOut} onPress={handleLogout} danger />
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
	list: {
		paddingVertical: 8,
	},
	item: {
		flexDirection: 'row-reverse',
		alignItems: 'center',
		gap: 12,
		backgroundColor: theme.colors.surface,
		paddingVertical: 16,
		paddingHorizontal: 14,
		borderRadius: 12,
		marginBottom: 10,
		shadowColor: '#000',
		shadowOpacity: 0.05,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 1,
	},
	iconWrap: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#e9f3fb',
	},
	itemText: {
		flex: 1,
		textAlign: 'right',
		color: theme.colors.text.primary,
		fontSize: 16,
		fontFamily: 'regular',
	},
	divider: {
		height: 1,
		backgroundColor: '#eaeaea',
		marginVertical: 6,
	},
})

