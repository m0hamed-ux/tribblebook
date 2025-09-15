import Reel, { ReelProps } from '@/app/components/reel';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, StatusBar, View, ViewToken } from 'react-native';

const { height: screenHeight } = Dimensions.get('window');

// Sample data for reels
const sampleReels: ReelProps[] = [
    {
        id: '1',
        videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        title: 'Big Buck Bunny - قصة الأرنب الكبير',
        caption: 'فيلم رسوم متحركة قصير مذهل يحكي قصة أرنب كبير يواجه تحديات مختلفة في الغابة. هذا العمل الفني يجمع بين الإبداع والتقنية المتطورة.',
        author: {
            username: 'bigbuck_official',
            fullname: 'Big Buck Studio',
            profile: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            verified: true,
            bio: 'استوديو الرسوم المتحركة الرسمي',
        },
        likes: 15420,
        isLiked: false,
    },
    {
        id: '2',
        videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        title: 'Elephants Dream - حلم الأفيال',
        caption: 'رحلة خيالية مذهلة في عالم الأحلام والخيال. يستكشف هذا الفيلم القصير الحدود بين الواقع والحلم من خلال قصة مؤثرة وبصريات رائعة.',
        author: {
            username: 'dream_creators',
            fullname: 'Dream Creators Studio',
            profile: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            verified: true,
            bio: 'نحول الأحلام إلى واقع رقمي',
        },
        likes: 8760,
        isLiked: true,
    },
    {
        id: '3',
        videoUrl: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        title: 'For Bigger Blazes - من أجل نيران أكبر',
        caption: 'مشاهد مثيرة ومليئة بالأكشن والإثارة. يقدم هذا الفيديو تجربة بصرية مذهلة مع مؤثرات خاصة متطورة تجعلك في قلب الحدث.',
        author: {
            username: 'action_films',
            fullname: 'Action Films Pro',
            profile: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
            verified: false,
            bio: 'أفلام الأكشن والإثارة',
        },
        likes: 12340,
        isLiked: false,
    },
];

export default function Page() {
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // Hide status bar for immersive experience
    useEffect(() => {
        StatusBar.setHidden(true);
        return () => {
            StatusBar.setHidden(false);
        };
    }, []);

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            const index = viewableItems[0].index;
            if (index !== null && index !== activeIndex) {
                setActiveIndex(index);
            }
        }
    }, [activeIndex]);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
        waitForInteraction: false,
    }).current;

    const renderItem = useCallback(({ item, index }: { item: ReelProps; index: number }) => (
        <Reel
            {...item}
            isPlaying={index === activeIndex}
            onPlay={() => setActiveIndex(index)}
        />
    ), [activeIndex]);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: screenHeight,
        offset: screenHeight * index,
        index,
    }), []);

    const keyExtractor = useCallback((item: ReelProps) => item.id, []);

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
            <FlatList
                ref={flatListRef}
                data={sampleReels}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                snapToInterval={screenHeight}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={getItemLayout}
                removeClippedSubviews={true}
                maxToRenderPerBatch={2}
                windowSize={3}
                initialNumToRender={1}
                updateCellsBatchingPeriod={100}
                disableIntervalMomentum={true}
                bounces={false}
            />
        </View>
    );
}