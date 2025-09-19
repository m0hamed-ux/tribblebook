import { CommentProps, CommunityProps, UserProps } from '@/lib/database.module';
import { timeAgo } from '@/lib/date';
import { createComment, getPostComments, getUser, handleCommentLike, handleCommentUnlike, handleLike } from '@/lib/db';
import { useUser } from '@clerk/clerk-expo';
import Entypo from '@expo/vector-icons/Entypo';
import { useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { BookmarkSimple, ChatCircle, Heart, Repeat, SealCheck, ShareFat } from 'phosphor-react-native';
import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
import Carousel from './carousel';
import Comment from './comment';
import ExpandableText from './ExpandableText';

export interface PostProps {
    id?: number,
    author?: UserProps,
    title: string,
    content?: string,
    images?: string[],
    video?: string,
    links?: string,
    community?: CommunityProps | null,
    created_at?: string | Date,
    likes?: Array<{user_id: UserProps | null}>,
    isLiked?: boolean,
    isPlaying?: boolean,
    onPlay?: () => void,
    comment_count?: number
}

export default function Post({id, author, title, content, images, video, community, created_at, likes, isLiked, isPlaying, onPlay, links, comment_count}: PostProps){
    const { user } = useUser();
    const router = useRouter();
    const [commentVisible, setCommentVisible] = useState(false);
    const [playing, setPlaying] = useState(isPlaying ?? false);
    const [liked, setLiked] = useState(isLiked ?? false);
    const [likesCount, setLikesCount] = useState(likes?.length ?? 0);
    const [Comments, setComments] = useState<Array<CommentProps> | null>(null);
    const [loadingComments, setLoadingComments] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [commentText, setCommentText] = useState('');
    const [postingComment, setPostingComment] = useState(false);
    const [replyTo, setReplyTo] = useState<{ parentId: number | null, username: string | null }>({ parentId: null, username: null });
    const commentInputRef = useRef<TextInput>(null);
    const currentUsername = user?.username;

    const reloadComments = async () => {
        try {
            setLoadingComments(true);
            const fetched = await getPostComments(id!);
            setComments(Array.isArray(fetched) ? fetched : []);
        } catch (e) {
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    };
    
    useEffect(() => {
        const fetchProfile = async () => {
            if (author?.username) {
                const fetchedProfile = await getUser(author.username);
                setProfile(fetchedProfile);
            }
        };
        fetchProfile();
    }, [author?.username]);
    // Update local state when isLiked prop changes
    useEffect(() => {
        setLiked(isLiked ?? false);
    }, [isLiked]);

    const videoSource = video ?? "";
    const player = useVideoPlayer(videoSource, (player) => {
        if (player && videoSource) {
            player.loop = true;
        }
    });

    useEffect(() => {
        if (isPlaying !== undefined) {
            setPlaying(isPlaying);
        }
    }, [isPlaying]);

    useEffect(() => {
        if (!player || !videoSource) return;
        
        try {
            if (playing) {
                player.play();
            } else {
                player.pause();
            }
            console.log("playing state:", playing)
        } catch (error) {
            console.log("Error controlling video player:", error);
        }
    }, [playing, player, videoSource]);

    useEffect(() => {
        return () => {
            if (player) {
                try {
                    player.pause();
                } catch (error) {
                    console.log("Error pausing video player during cleanup:", error);
                }
            }
        };
    }, [player]);

    const togglePlay = () => {
        if (!videoSource || !player) return;
        
        try {
            setPlaying(prev => !prev);
            onPlay && onPlay();
        } catch (error) {
            console.log("Error toggling video play:", error);
        }
    };
    const toggleLike = async () => {
        if (!user || !id) {
            ToastAndroid.show("Unable to like post", ToastAndroid.SHORT);
            return;
        }

        const newLikedState = !liked;
        
        // Optimistically update UI
        setLiked(newLikedState);
        setLikesCount(prev => newLikedState ? prev + 1 : (prev > 0 ? prev - 1 : 0));
        
        try {
            // Call API
            const result = await handleLike(Number(id), user.id);
            
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
    }

    const navigateToUserProfile = () => {
        if (author?.username && author.username !== user?.username) {
            router.push(`/(views)/userprofile?username=${author.username}`);
        }
    };
    const navigateToCommunity = () => {
        if (community?.id != null) {
            router.push(`/(views)/community?id=${community.id}`);
        }
    };
    console.log("community:", community)

    const handlePublishComment = async () => {
        if (!user || !user.id || !id) {
            ToastAndroid.show('يرجى تسجيل الدخول أولاً', ToastAndroid.SHORT);
            router.push('/(auth)/sign-in');
            return;
        }

        const text = commentText.trim();
        if (!text) {
            ToastAndroid.show('لا يمكن إرسال تعليق فارغ', ToastAndroid.SHORT);
            return;
        }
        if (text.length > 100) {
            ToastAndroid.show('الحد الأقصى للتعليق 100 حرف', ToastAndroid.SHORT);
            return;
        }

        try {
            setPostingComment(true);
            const newComment = await createComment(String(id), text, user.id, replyTo.parentId ?? undefined, replyTo.username ?? undefined);
            if (!newComment) {
                ToastAndroid.show('فشل نشر التعليق', ToastAndroid.SHORT);
                return;
            }
            // Clear input and reply context
            setCommentText('');
            setReplyTo({ parentId: null, username: null });
            // Re-fetch to ensure proper author details and nesting
            await reloadComments();
            ToastAndroid.show('تم نشر التعليق', ToastAndroid.SHORT);
        } catch (e) {
            ToastAndroid.show('حدث خطأ أثناء نشر التعليق', ToastAndroid.SHORT);
        } finally {
            setPostingComment(false);
        }
    };

    const updateLikesInTree = (list: Array<CommentProps>, targetId: number, liked: boolean): Array<CommentProps> => {
        return list.map((c) => {
            if (!c) return c;
            if (c.id === targetId) {
                let likes = Array.isArray(c.likes) ? [...c.likes] : [];
                if (liked) {
                    if (currentUsername && !likes.some(l => (l?.user_id as any)?.username === currentUsername)) {
                        likes.push({ user_id: { username: currentUsername } as any });
                    }
                } else {
                    if (currentUsername) {
                        likes = likes.filter(l => (l?.user_id as any)?.username !== currentUsername);
                    }
                }
                return { ...c, likes } as CommentProps;
            }
            if (Array.isArray(c.replies) && c.replies.length) {
                const newReplies = updateLikesInTree(c.replies.filter((r): r is CommentProps => r !== null), targetId, liked);
                return { ...c, replies: newReplies } as CommentProps;
            }
            return c;
        });
    };

    const handleToggleCommentLike = async (commentId: number) => {
        if (!user?.id) {
            ToastAndroid.show('يرجى تسجيل الدخول أولاً', ToastAndroid.SHORT);
            router.push('/(auth)/sign-in');
            return;
        }
        const findInTree = (list: Array<CommentProps>): CommentProps | undefined => {
            for (const c of list) {
                if (!c) continue;
                if (c.id === commentId) return c;
                if (Array.isArray(c.replies) && c.replies.length) {
                    const found = findInTree(c.replies.filter((r): r is CommentProps => r !== null));
                    if (found) return found;
                }
            }
            return undefined;
        };
        const current = Comments ? findInTree(Comments) : undefined;
        const alreadyLiked = !!(current && currentUsername && Array.isArray(current.likes) && current.likes.some(l => (l?.user_id as any)?.username === currentUsername));

        if (Comments) {
            setComments(updateLikesInTree(Comments, commentId, !alreadyLiked));
        }
        try {
            if (alreadyLiked) {
                const res = await handleCommentUnlike(commentId, user.id);
                if (res === null) throw new Error('unlike failed');
            } else {
                const res = await handleCommentLike(commentId, user.id);
                if (res === null) throw new Error('like failed');
            }
        } catch (e) {
            if (Comments) {
                setComments(updateLikesInTree(Comments, commentId, alreadyLiked));
            }
            ToastAndroid.show('فشل تحديث الإعجاب', ToastAndroid.SHORT);
        }
    };

    return (
        <View style={style.constainer}>
            <View style={style.author}>
                <TouchableOpacity onPress={community ? navigateToCommunity : navigateToUserProfile}>
                    {community ? (
                        <>
                        <Image source={{uri: community?.profile}} style={{width: 40, height: 40, borderRadius: 10}} />
                        <Image source={{uri: author?.profile}} style={{width: 20, height: 20, borderRadius: 25, position: "absolute", bottom: -5, left:-5}} />
                        </>
                    ) : (
                        <Image source={{uri: author?.profile}} style={{width: 40, height: 40, borderRadius: 25}} />
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={{flex: 1}} id='name' onPress={community ? navigateToCommunity : navigateToUserProfile}>
                    {community ? (
                        <View>
                            <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}>
                                <Text style={[style.authorname, {fontSize: 14}]}>{community?.name}</Text>
                            </View>
                            <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2}}>
                                <Text style={[style.authorname, {fontSize: 12, color: '#666'}]}>{author?.fullname}</Text>
                                {author?.verified && <SealCheck size={12} color="#FFB400" weight="fill" />}
                                <Text style={[style.date, {marginLeft: 4}]}>• {timeAgo(created_at!)}</Text>
                            </View>
                        </View>
                    ) : (
                        <View>
                            <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}>
                                <Text style={[style.authorname]}>{author?.fullname}</Text>
                                {author?.verified && <SealCheck size={14} color="#FFB400" weight="fill" />}
                            </View>
                            <Text style={[style.date]}>{timeAgo(created_at!)}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={{ height: 20, width: 20, justifyContent: "center", alignItems: "center"}} onPress={() => {ToastAndroid.show("Post options", ToastAndroid.SHORT)}}>
                    <Entypo name="dots-three-horizontal" size={14} color="black" />
                </TouchableOpacity>
            </View>

            <View style={{paddingHorizontal: 8}}>
                <Text style={{fontFamily: 'bold', fontSize: 16, color: 'black', marginBottom: 0, textAlign: "right"}}>{title}</Text>
                {content && <ExpandableText content={content} />}
            </View>

            {images && <Carousel images={images}/>}

            {video && videoSource && (
                <View style={{position: 'relative', marginTop: 8}}>
                    <VideoView
                        allowsFullscreen={true}
                        player={player}
                        style={{ width: '100%', height: 300, backgroundColor: 'black' }}
                        contentFit="contain"
                        nativeControls={false}
                    />
                    <TouchableOpacity
                        onPress={togglePlay}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        {!playing && <Entypo name="controller-play" size={64} color="white" />}
                    </TouchableOpacity>
                </View>
            )}
            
            {links && (
                <View style={{paddingHorizontal: 8, marginTop: 8}}>
                    <TouchableOpacity
                        onPress={() => {
                            if (links.startsWith('http://') || links.startsWith('https://')) {
                                Linking.openURL(links).catch(err => console.error('Failed to open URL:', err));
                            }
                        }}
                        style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}
                        activeOpacity={0.7}
                    >
                        <Text style={{fontFamily: 'bold', fontSize: 14, color: '#1D9BF0', textAlign: 'right', textDecorationLine: 'underline'}}>
                            {links.slice(0, 20)}{links.length > 20 ? '...' : ''}
                        </Text>
                        <Entypo name="link" size={14} color="#1D9BF0" />
                    </TouchableOpacity>
                </View>
            )}

            <View style={{flexDirection: 'row-reverse', paddingVertical: 8, marginTop: 5}}>
                <TouchableOpacity onPress={toggleLike} style={style.reactionIcon}>
                    <Heart size={24} color={liked ? "#ff0000" : "#7b7b7bff"} weight={liked ? "fill" : "regular"} />
                    <Text style={{color: "#7b7b7bff"}}>{likesCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCommentVisible(true)} style={style.reactionIcon}>
                    <ChatCircle size={24} color="#7b7b7bff" />
                    <Text style={{color: "#7b7b7bff"}}>{comment_count || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={style.reactionIcon}><ShareFat size={24} color="#7b7b7bff" /><Text style={{color: "#7b7b7bff"}}></Text></TouchableOpacity>
                <TouchableOpacity style={style.reactionIcon}><Repeat size={24} color="#7b7b7bff" /><Text style={{color: "#7b7b7bff"}}></Text></TouchableOpacity>
                <TouchableOpacity style={style.reactionIcon}><BookmarkSimple size={24} color="#7b7b7bff" /></TouchableOpacity>
            </View>

            <Modal
                animationType="slide"
                visible={commentVisible}
                style={style.commentModal}
                backdropColor={'rgba(87, 87, 87, 0.14)'}
                onRequestClose={() => setCommentVisible(!commentVisible)}
                onShow={async () => {
                    if (!Comments) {
                        setLoadingComments(true);
                        try {
                            const fetchedComments = await getPostComments(id!);
                            setComments(Array.isArray(fetchedComments) ? fetchedComments : []);
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
                <View style={style.commentContainer}>
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
                                    setReplyTo({ parentId: commentId, username });
                                    setTimeout(() => commentInputRef.current?.focus(), 50);
                                }}
                                onLike={handleToggleCommentLike}
                                onUserPress={(username) => {
                                    router.push(`/(views)/userprofile?username=${username}`);
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
                    {replyTo.parentId ? (
                        <View style={style.replyBadge}>
                            <Text style={style.replyBadgeText}>الرد على @{replyTo.username}</Text>
                            <TouchableOpacity onPress={() => setReplyTo({ parentId: null, username: null })}>
                                <Text style={style.replyBadgeClear}>إلغاء</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                    <View style={style.commentInput}>
                        <Image
                            source={{uri: profile?.profile}}
                            style={{width: 40, height: 40, borderRadius: 20, marginRight: 8}}
                        />
                        <TextInput
                            ref={commentInputRef}
                            placeholder={replyTo.username ? `الرد على @${replyTo.username}` : 'أضف تعليق...'}
                            placeholderTextColor={'#888888'}
                            style={{backgroundColor: '#ddddddff', flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, fontFamily: 'regular'}}
                            multiline
                            numberOfLines={1}
                            textAlignVertical="top"
                            textAlign='right'
                            value={commentText}
                            onChangeText={setCommentText}
                            maxLength={100}
                         />
                        <TouchableOpacity onPress={handlePublishComment} disabled={postingComment} style={{padding: 8, opacity: postingComment ? 0.6 : 1}}>
                            <Text style={{color: '#1D9BF0', fontFamily: 'bold'}}>{postingComment ? 'جاري النشر...' : 'نشر'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const style = StyleSheet.create({
    date: {
        color: 'gray',
        fontSize: 10,
        fontFamily: 'regular',
        textAlign: "right",
    },
    constainer: {
        paddingVertical: 8,
        borderBottomWidth: 6,
        borderBottomColor: 'lightgray',
    },
    author: {
        paddingHorizontal: 8,
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    authorname : {
        fontFamily: 'bold',
        fontSize: 16,
        color: 'black',
        textAlign: "right",
        verticalAlign: "middle"
    },
    reactionIcon: {
        color: '#7b7b7bff',
        fontSize: 12,
        fontFamily: 'regular',
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        marginTop: 5,
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
        padding: 5,
        paddingBottom: 10,
    },
    commentInput: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        borderTopColor: '#c3c3c3ce',
    }
    ,
    replyBadge: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 8,
        marginBottom: 6,
        borderRadius: 8,
        backgroundColor: '#f2f7ff',
    },
    replyBadgeText: {
        fontFamily: 'regular',
        color: '#1D9BF0',
        fontSize: 12,
    },
    replyBadgeClear: {
        fontFamily: 'bold',
        color: '#ff3b30',
        fontSize: 12,
    }
});
