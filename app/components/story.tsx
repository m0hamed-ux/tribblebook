import { StoryProps } from "@/lib/database.module";
import { useRouter } from 'expo-router';
import { PlusCircle } from 'phosphor-react-native';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, TouchableOpacity, View } from "react-native";

export default function Story({image, viewed}: StoryProps & { viewed?: boolean }) {
    const scale = useRef(new Animated.Value(0.9)).current
    useEffect(() => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 80 }).start()
    }, [])
    return (
        <Animated.View style={[style.container, { borderColor: viewed ? '#a9a9a9' : '#1D9BF0', transform: [{ scale }] }]}>
            <Image style={style.image} source={{ uri: image }} />
        </Animated.View>
    )
}


export function MyStory(
    {
        image,
        hasStories,
        groupIndex,
    }:
    StoryProps & { hasStories?: boolean; groupIndex?: number }
){
    const router = useRouter();
    return(
        <View>
            {/* Tap on the bubble: if user already has stories, open the story viewer at this index; otherwise open add story */}
            <TouchableOpacity
                onPress={() => {
                    if (hasStories) {
                        router.push({ pathname: '/storyView', params: { index: String(groupIndex ?? 0) } })
                    } else {
                        router.push('/addStory')
                    }
                }}
                activeOpacity={0.85}
            >
                <View style={[
                    style.container,
                    {
                        borderColor: hasStories ? '#1D9BF0' : 'transparent',
                        borderWidth: hasStories ? 3 : 0,
                    }
                ]}>
                    <Image style={style.image} source={{uri: image}} />
                </View>
            </TouchableOpacity>
            {/* Plus icon: always add story. Use its own touchable to prevent bubbling and ensure composer opens */}
            <TouchableOpacity
                onPress={() => router.push('/addStory')}
                activeOpacity={0.9}
                style={style.plusIcon}
            >
                <PlusCircle size={24} color="#1D9BF0" weight="fill" />
            </TouchableOpacity>
        </View>
    )
}

const style = StyleSheet.create({
    container: {
        width: 80,
        height: 80,
        backgroundColor: 'transparent',
        borderRadius: 40,
        marginHorizontal: 3,
        borderWidth: 3,
        borderColor: '#1D9BF0',
        padding: 3,
    },
    image: {
        width: "100%",
        height: "100%",
        borderRadius: 100,
    }, 
    plusIcon: {
        position: 'absolute',
        bottom: 1,
        left: 0,
        backgroundColor: 'white',
        borderRadius: 12,
    }
})