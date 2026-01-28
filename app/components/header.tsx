import { styles } from '@/assets/theme/styles'
import { useRouter } from 'expo-router'
import { Bell, ChatCircleDots } from 'phosphor-react-native'
import { Text, TouchableOpacity, View } from 'react-native'

type HeaderProps = { unreadCount?: number; unreadMessages?: number }
export default function Header({ unreadCount = 0, unreadMessages = 0 }: HeaderProps) {
    const router = useRouter()
    return (
        <View style={{paddingHorizontal: 10, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={[styles.title, {fontSize: 24}]}>تريبل بوك</Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
                <TouchableOpacity onPress={() => router.push('/messages')}>
                    <View style={{ position: 'relative' }}>
                        <ChatCircleDots size={24} color="#080808" />
                        {unreadMessages > 0 && (
                            <View style={{ position: 'absolute', top: -6, right: -8, backgroundColor: '#ef4444', borderRadius: 999, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: 'white', fontSize: 10, fontFamily: 'bold' }} numberOfLines={1}>
                                    {unreadMessages > 9 ? '9+' : String(unreadMessages)}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/notifications')}>
                    <View style={{ position: 'relative' }}>
                        <Bell size={24} color="#080808" />
                        {unreadCount > 0 && (
                            <View style={{ position: 'absolute', top: -4, right: -6, backgroundColor: '#ef4444', borderRadius: 999, minWidth: 16, height: 16, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: 'white', fontSize: 10, fontFamily: 'bold' }} numberOfLines={1}>
                                    {unreadCount > 9 ? '9+' : String(unreadCount)}
                                </Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    )
}