import Reel, { ReelProps } from '@/app/components/reel';
import { PostProps } from '@/lib/database.module';
import { getReels } from '@/lib/db';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, StatusBar, View, ViewToken } from 'react-native';

// Transform PostProps to ReelProps
const transformPostsToReels = (posts: PostProps[], currentUserUsername?: string): ReelProps[] => {
    return posts
        .filter(post => post.video)
        .map(post => ({
            id: post.id?.toString() || Math.random().toString(),
            videoUrl: post.video!,
            title: post.title,
            caption: post.content || '',
            author: post.author!,
            likes: post.likes?.length || 0,
            isLiked: post.likes?.some(like => like?.user_id?.username === currentUserUsername) || false,
        }));
};

export default function WatchScreen() {
    const { user } = useUser();
    const navigation = useNavigation<any>();
    const [activeIndex, setActiveIndex] = useState(0);
    const [containerHeight, setContainerHeight] = useState(0);
    const [isScreenFocused, setIsScreenFocused] = useState(true);
    const [sampleReels, setSampleReels] = useState<ReelProps[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Load reels data on demand and on mount
    const loadReels = useCallback(async () => {
        try {
            const reelsData = await getReels();
            const transformedReels = transformPostsToReels(reelsData, user?.username || undefined);
            setSampleReels(transformedReels);
        } catch (error) {
            console.error('Failed to load reels:', error);
            setSampleReels([]);
        }
    }, [user?.username]);

    useEffect(() => {
        loadReels();
    }, [loadReels]);

    // Pull to refresh handler
    const onRefresh = useCallback(async () => {
        try {
            setRefreshing(true);
            await loadReels();
        } finally {
            setRefreshing(false);
        }
    }, [loadReels]);

    // Handle screen focus/blur events
    useFocusEffect(
        useCallback(() => {
            // Screen is focused
            setIsScreenFocused(true);
            
            return () => {
                // Screen is blurred/closed
                setIsScreenFocused(false);
            };
        }, [])
    );

    // Hide status bar for immersive experience
    useEffect(() => {
        StatusBar.setBackgroundColor('#000');
        StatusBar.setBarStyle('light-content');
        return () => {
            StatusBar.setBackgroundColor('#FFFFFF');
            StatusBar.setBarStyle('dark-content');
        };
    }, []);

    // Refresh when the tab is pressed
    useEffect(() => {
        const unsubscribe = navigation.addListener('tabPress', () => {
            onRefresh();
        });
        return unsubscribe;
    }, [navigation, onRefresh]);

    useEffect(() => {
        if (flatListRef.current && activeIndex < sampleReels.length) {
            flatListRef.current.scrollToIndex({
                index: activeIndex,
                animated: false,
            });
        }
    }, [activeIndex]);

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
        <View style={{ height: containerHeight }}>
            <Reel
                {...item}
                isPlaying={index === activeIndex && isScreenFocused}
                onPlay={() => setActiveIndex(index)}
            />
        </View>
    ), [activeIndex, containerHeight, isScreenFocused]);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: containerHeight,
        offset: containerHeight * index,
        index,
    }), [containerHeight]);

    const keyExtractor = useCallback((item: ReelProps) => item.id, []);

    return (
        <View 
            style={{ flex: 1, backgroundColor: '#000' }}
            onLayout={(event) => {
                const { height } = event.nativeEvent.layout;
                setContainerHeight(height);
            }}
        >
            {containerHeight > 0 && (
                <FlatList
                    ref={flatListRef}
                    data={sampleReels}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    onRefresh={onRefresh}
                    refreshing={refreshing}
                    pagingEnabled
                    showsVerticalScrollIndicator={false}
                    snapToInterval={containerHeight}
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
            )}
        </View>
    );
}