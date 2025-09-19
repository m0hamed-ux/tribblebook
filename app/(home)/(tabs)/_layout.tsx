import { Tabs } from 'expo-router';
import { Compass, House, MonitorPlay, PlusCircle, User } from 'phosphor-react-native';
export default function TabLayout() {
    return (
        <Tabs screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#1D9BF0',
        tabBarInactiveTintColor: "#8E8E93",
        tabBarLabelStyle: { fontSize: 12, fontFamily: 'regular', textAlign: "center", includeFontPadding: false, },
        tabBarStyle: {
            backgroundColor: route.name === 'watch' ? 'black' : 'white',
            borderTopColor: route.name === 'watch' ? 'black' : '#eee',
        },
        })}>
            <Tabs.Screen 
                name="index"
                options={{
                    title: 'الرئيسية',
                    tabBarIcon: ({ color }) => <House size={24} color={color} weight="fill" />,
                }}
            />
            <Tabs.Screen 
                name="explore"
                options={{
                    title: 'استكشاف',
                    tabBarIcon: ({ color }) => <Compass  size={24} color={color} weight="fill" />,
                }}
            />
            <Tabs.Screen 
                name="addPost"
                options={{
                    title: 'نشر',
                    tabBarIcon: ({ color }) => <PlusCircle size={30} color={color} weight="fill" />,
                }}
            />
            <Tabs.Screen 
                name="watch"
                options={{
                    title: 'مشاهدة',
                    tabBarIcon: ({ color }) => <MonitorPlay size={24} color={color} weight="fill" />,
                }}
            />
            <Tabs.Screen 
                name="profile"
                options={{
                    title: 'ملفي',
                    tabBarIcon: ({ color }) => <User size={24} color={color} weight="fill" />,
                }}
            />
        </Tabs>
    );
}