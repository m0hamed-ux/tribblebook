import { UserProps } from '@/lib/database.module';
import Entypo from '@expo/vector-icons/Entypo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { ChatCircle, Heart, Repeat, SealCheck, ShareFat } from 'phosphor-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface ReelProps {
    id: string;
    videoUrl: string;
    title: string;
    caption?: string;
    author: UserProps;
    likes?: number;
    isLiked?: boolean;
    isPlaying?: boolean;
    onPlay?: () => void;
}

export default function Reel({ 
    id, 
    videoUrl, 
    title, 
    caption, 
    author, 
    likes = 0, 
    isLiked = false, 
    isPlaying = false, 
    onPlay 
}: ReelProps) {
    const [playing, setPlaying] = useState(isPlaying);
    const [liked, setLiked] = useState(isLiked);
    const [likesCount, setLikesCount] = useState(likes);
    const [following, setFollowing] = useState(false);

    const player = useVideoPlayer(videoUrl, (player) => {
        player.loop = true;
        player.muted = false;
        player.volume = 0.8;
    });

    useEffect(() => {
        setPlaying(isPlaying);
        if (isPlaying) {
            player.play();
        } else {
            player.pause();
        }
    }, [isPlaying, player]);

    // Cleanup when component unmounts
    useEffect(() => {
        return () => {
            player.pause();
        };
    }, [player]);

    const togglePlay = useCallback(() => {
        if (onPlay) {
            onPlay();
        }
    }, [onPlay]);

    const handleLike = useCallback(() => {
        setLiked(!liked);
        setLikesCount(prev => liked ? prev - 1 : prev + 1);
        ToastAndroid.show(liked ? "تم إلغاء الإعجاب" : "تم الإعجاب", ToastAndroid.SHORT);
    }, [liked]);

    const handleFollow = useCallback(() => {
        setFollowing(!following);
        ToastAndroid.show(following ? "تم إلغاء المتابعة" : "تم المتابعة", ToastAndroid.SHORT);
    }, [following]);

    const handleComment = useCallback(() => {
        ToastAndroid.show("التعليقات", ToastAndroid.SHORT);
    }, []);

    const handleShare = useCallback(() => {
        ToastAndroid.show("مشاركة", ToastAndroid.SHORT);
    }, []);

    const handleRepost = useCallback(() => {
        ToastAndroid.show("إعادة نشر", ToastAndroid.SHORT);
    }, []);

    const handleMoreOptions = useCallback(() => {
        ToastAndroid.show("المزيد من الخيارات", ToastAndroid.SHORT);
    }, []);

    return (
        <View style={styles.container}>
            {/* Video Player */}
            <TouchableOpacity onPress={togglePlay} style={styles.videoContainer} activeOpacity={1}>
                <VideoView
                    player={player}
                    style={styles.video}
                    contentFit="cover"
                    nativeControls={false}
                />
            </TouchableOpacity>

            {/* User Info and Content */}
            <View style={styles.overlay}>
                <View style={styles.leftContent}>
                    {/* User Info */}
                    <View style={styles.userInfo}>
                        <Image source={{ uri: author.profile }} style={styles.avatar} />
                        <View style={styles.userDetails}>
                            <View style={styles.usernameRow}>
                                <Text style={styles.username}>{author.fullname}</Text>
                                {author.verified && <SealCheck size={16} color="#FFB400" weight="fill" />}
                            </View>
                            <TouchableOpacity onPress={handleFollow} style={styles.followButton}>
                                <Text style={styles.followButtonText}>
                                    {following ? "متابَع" : "متابعة"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Content */}
                    <View style={styles.contentContainer}>
                        <Text style={styles.title} numberOfLines={2}>{title}</Text>
                        {caption && (
                            <Text style={styles.caption} numberOfLines={3}>{caption}</Text>
                        )}
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.rightActions}>
                    {/* Like */}
                    <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
                        <Heart 
                            size={28} 
                            color={liked ? "#FF3040" : "#FFFFFF"} 
                            weight={liked ? "fill" : "regular"} 
                        />
                        <Text style={styles.actionText}>{likesCount}</Text>
                    </TouchableOpacity>

                    {/* Comment */}
                    <TouchableOpacity onPress={handleComment} style={styles.actionButton}>
                        <ChatCircle size={28} color="#FFFFFF" weight="regular" />
                        <Text style={styles.actionText}>تعليق</Text>
                    </TouchableOpacity>

                    {/* Repost */}
                    <TouchableOpacity onPress={handleRepost} style={styles.actionButton}>
                        <Repeat size={28} color="#FFFFFF" weight="regular" />
                        <Text style={styles.actionText}>إعادة نشر</Text>
                    </TouchableOpacity>

                    {/* Share */}
                    <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
                        <ShareFat size={28} color="#FFFFFF" weight="regular" />
                        <Text style={styles.actionText}>مشاركة</Text>
                    </TouchableOpacity>

                    {/* More Options */}
                    <TouchableOpacity onPress={handleMoreOptions} style={styles.actionButton}>
                        <Entypo name="dots-three-vertical" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: screenWidth,
        height: screenHeight,
        backgroundColor: '#000',
        position: 'relative',
    },
    videoContainer: {
        flex: 1,
    },
    video: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 32,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    leftContent: {
        flex: 1,
        marginRight: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    userDetails: {
        flex: 1,
    },
    usernameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    username: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'bold',
        marginRight: 6,
    },
    followButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    followButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: 'bold',
    },
    contentContainer: {
        marginBottom: 8,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'bold',
        marginBottom: 4,
        textAlign: 'right',
    },
    caption: {
        color: '#FFFFFF',
        fontSize: 14,
        fontFamily: 'regular',
        opacity: 0.9,
        textAlign: 'right',
    },
    rightActions: {
        alignItems: 'center',
        gap: 24,
    },
    actionButton: {
        alignItems: 'center',
        gap: 4,
    },
    actionText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontFamily: 'regular',
        textAlign: 'center',
    },
});