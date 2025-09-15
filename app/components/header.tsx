import { View, Text } from 'react-native'
import { ChatCircleDots, Bell } from 'phosphor-react-native'
import {styles} from '@/assets/theme/styles'

export default function Header() {
    return (
        <View style={{paddingHorizontal: 10, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={[styles.title, {fontSize: 24}]}>
                تريبل بوك
            </Text>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 15}}>
                <ChatCircleDots size={24} color="#080808" />
                <Bell size={24} color="#080808" />
            </View>
        </View>
    )
}