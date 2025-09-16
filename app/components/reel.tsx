import { CommentProps, UserProps } from '@/lib/database.module';
import { handleLike as apiHandleLike, getPostComments } from '@/lib/db';
import { useUser } from '@clerk/clerk-expo';
import Entypo from '@expo/vector-icons/Entypo';
import { LinearGradient } from 'expo-linear-gradient';
import { useVideoPlayer, VideoPlayer, VideoView } from 'expo-video';
import { ChatCircle, Heart, Repeat, SealCheck, ShareFat } from 'phosphor-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import ExpandableText from './ExpandableText';
import Comment from './comment';


const { width: screenWidth } = Dimensions.get('window');

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
    const { user } = useUser();
    const [playing, setPlaying] = useState(isPlaying);
    const [liked, setLiked] = useState(isLiked);
    const [likesCount, setLikesCount] = useState(likes);
    const [following, setFollowing] = useState(false);
    const [isPlayerReleased, setIsPlayerReleased] = useState(false);
    const [commentVisible, setCommentVisible] = useState(false);
    const [Comments, setComments] = useState<Array<CommentProps> | null>(null);
    const [loadingComments, setLoadingComments] = useState(false);
    const playerRef = useRef<VideoPlayer | null>(null);

    const player = useVideoPlayer(videoUrl, (player) => {
        if (player) {
            player.loop = true;
            player.muted = false;
            player.volume = 0.8;
            playerRef.current = player;
        }
    });

    useEffect(() => {
        setPlaying(isPlaying);
        const currentPlayer = playerRef.current || player;
        
        if (!isPlayerReleased && currentPlayer) {
            try {
                if (isPlaying) {
                    currentPlayer.play();
                } else {
                    currentPlayer.pause();
                }
            } catch (error) {
                console.warn('Error controlling video player:', error);
                setIsPlayerReleased(true);
            }
        }
    }, [isPlaying, player, isPlayerReleased]);

    // Cleanup when component unmounts or video changes
    useEffect(() => {
        return () => {
            const currentPlayer = playerRef.current || player;
            if (!isPlayerReleased && currentPlayer) {
                try {
                    currentPlayer.pause();
                } catch (error) {
                    console.warn('Error pausing video player during cleanup:', error);
                } finally {
                    setIsPlayerReleased(true);
                    playerRef.current = null;
                }
            }
        };
    }, [videoUrl]); // Only cleanup when video URL changes

    const togglePlay = useCallback(() => {
        if (!isPlayerReleased) {
            const currentPlayer = playerRef.current || player;
            if (currentPlayer) {
                try {
                    if (playing) {
                        currentPlayer.pause();
                        setPlaying(false);
                    } else {
                        currentPlayer.play();
                        setPlaying(true);
                    }
                } catch (error) {
                    console.warn('Error toggling video playback:', error);
                    setIsPlayerReleased(true);
                }
            }
        }
        
        if (onPlay) {
            onPlay();
        }
    }, [playing, onPlay, player, isPlayerReleased]);

    const handleLike = useCallback(async () => {
        if (!user || !id) {
            ToastAndroid.show("Unable to like reel", ToastAndroid.SHORT);
            return;
        }

        const newLikedState = !liked;
        
        // Optimistically update UI
        setLiked(newLikedState);
        setLikesCount(prev => newLikedState ? prev + 1 : (prev > 0 ? prev - 1 : 0));
        
        try {
            // Call API
            const result = await apiHandleLike(parseInt(id), user.id);
            
            if (result === null) {
                // Revert optimistic update if API call failed
                setLiked(!newLikedState);
                setLikesCount(prev => newLikedState ? (prev > 0 ? prev - 1 : 0) : prev + 1);
                ToastAndroid.show("Failed to update like", ToastAndroid.SHORT);
            } else {
                ToastAndroid.show(newLikedState ? "Liked" : "Unliked", ToastAndroid.SHORT);
            }
        } catch (error) {
            // Revert optimistic update if error occurred
            setLiked(!newLikedState);
            setLikesCount(prev => newLikedState ? (prev > 0 ? prev - 1 : 0) : prev + 1);
            ToastAndroid.show("Error updating like", ToastAndroid.SHORT);
        }
    }, [liked, user, id]);

    const handleFollow = useCallback(() => {
        setFollowing(!following);
        ToastAndroid.show(following ? "تم إلغاء المتابعة" : "تم المتابعة", ToastAndroid.SHORT);
    }, [following]);

    const handleComment = useCallback(() => {
        setCommentVisible(true);
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
                    contentFit="contain"
                    nativeControls={false}
                />
            </TouchableOpacity>

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                style={styles.bottomGradient}
                pointerEvents="none"
            />

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
                            // <Text style={styles.caption} numberOfLines={3}>{caption}</Text>
                            <ExpandableText content={caption} color='white' />
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

            <Modal
                animationType="slide"
                visible={commentVisible}
                style={styles.commentModal}
                backdropColor={'rgba(87, 87, 87, 0.14)'}
                onRequestClose={() => setCommentVisible(!commentVisible)}
                onShow={async () => {
                    if (!Comments) {
                        setLoadingComments(true);
                        try {
                            const fetchedComments = await getPostComments(parseInt(id));
                            setComments(fetchedComments || []);
                        } catch (error) {
                            console.log("Error fetching comments:", error);
                            setComments([]);
                        } finally {
                            setLoadingComments(false);
                        }
                    }
                }}
            >
                <TouchableOpacity onPress={() => setCommentVisible(!commentVisible)} style={{ flex: 1 }}></TouchableOpacity>
                <View style={styles.commentContainer}>
                    <Text style={{fontFamily: 'bold', fontSize: 18, color: 'black', marginBottom: 10, paddingBottom: 10, textAlign: "center", borderBottomColor: "#c3c3c3ce", borderBottomWidth: 0.5}}>التعليقات</Text>
                    <ScrollView style={{flex: 1}} showsVerticalScrollIndicator={false}>
                        {loadingComments ? (
                            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40}}>
                                <Text style={{fontFamily: 'regular', fontSize: 16, color: '#666', textAlign: 'center'}}>
                                    جاري تحميل التعليقات...
                                </Text>
                            </View>
                        ) : Comments && Comments.length > 0 ? (
                            <Comment 
                                comments={Comments} 
                                onReply={(commentId, username) => {
                                    ToastAndroid.show(`رد على ${username}`, ToastAndroid.SHORT);
                                    // You can add reply functionality here
                                }}
                                onLike={(commentId) => {
                                    ToastAndroid.show("تم الإعجاب بالتعليق", ToastAndroid.SHORT);
                                }}
                            />
                        ) : (
                            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40}}>
                                <Text style={{fontFamily: 'regular', fontSize: 16, color: '#666', textAlign: 'center'}}>
                                    لا توجد تعليقات حتى الآن
                                </Text>
                                <Text style={{fontFamily: 'regular', fontSize: 14, color: '#999', textAlign: 'center', marginTop: 4}}>
                                    كن أول من يعلق!
                                </Text>
                            </View>
                        )}
                    </ScrollView>
                    <View style={styles.commentInput}>
                        <Image
                            source={{uri: user?.imageUrl}}
                            style={{width: 40, height: 40, borderRadius: 20, marginRight: 8}}
                        />
                        <TextInput
                            placeholder="أضف تعليق..."
                            placeholderTextColor={'#888888'}
                            style={{backgroundColor: '#ddddddff', flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontFamily: 'regular'}}
                            multiline
                            numberOfLines={1}
                            textAlignVertical="top"
                            textAlign='right'
                         />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: screenWidth,
        flex: 1,
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
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 150,
    },
    overlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 10,
        paddingBottom: 0,
        flexDirection: 'row-reverse',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    leftContent: {
        flex: 1,
    },
    userInfo: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    userDetails: {
        flex: 1,
        flexDirection: 'row-reverse',
        // justifyContent: 'center',
        alignItems: 'center',
        gap: 5
    },
    usernameRow: {
        flexDirection: 'row-reverse',
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
        marginBottom: 24,
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
    commentModal: {
        flex: 1,
        marginTop: 100, 
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    }, 
    commentContainer: {
        height: '95%',
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
    },
    commentInput: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        borderTopColor: '#c3c3c3ce',
    }
});