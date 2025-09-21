import { getOrCreateConversation, sendPostMessage } from '@/lib/chat';
import { CommentProps, CommunityProps, UserProps } from '@/lib/database.module';
import { timeAgo } from '@/lib/date';
import { createComment, createPost, createReport, deletePost, getFollowing, getPostComments, getUser, handleCommentLike, handleCommentUnlike, handleLike, sendNotification } from '@/lib/db';
import { sendMessageNotification } from '@/lib/notification';
import { useUser } from '@clerk/clerk-expo';
import Entypo from '@expo/vector-icons/Entypo';
import { useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import { ChatCircle, Heart, Repeat, SealCheck, ShareFat } from 'phosphor-react-native';
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
    comment_count?: number,
    onDeleted?: (id: number) => void,
    reposted_post?: PostProps 
}

export default function Post({id, author, title, content, images, video, community, created_at, likes, isLiked, isPlaying, onPlay, links, comment_count, onDeleted, reposted_post}: PostProps){
    const { user } = useUser();
    const router = useRouter();
    const [commentVisible, setCommentVisible] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [shareVisible, setShareVisible] = useState(false);
    const [repostVisible, setRepostVisible] = useState(false);
    const [repostTitle, setRepostTitle] = useState('');
    const [repostContent, setRepostContent] = useState('');
    const [submittingRepost, setSubmittingRepost] = useState(false);
    const [playing, setPlaying] = useState(isPlaying ?? false);
    const [liked, setLiked] = useState(isLiked ?? false);
    const [likesCount, setLikesCount] = useState(likes?.length ?? 0);
    const [Comments, setComments] = useState<Array<CommentProps> | null>(null);
    const [loadingComments, setLoadingComments] = useState(false);
    const [profile, setProfile] = useState<any>(null);
    const [currentProfile, setCurrentProfile] = useState<UserProps | null>(null);
    const [followingList, setFollowingList] = useState<UserProps[]>([]);
    const [loadingFollowing, setLoadingFollowing] = useState(false);
    const [shareQuery, setShareQuery] = useState('');
    const [sendingTo, setSendingTo] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [postingComment, setPostingComment] = useState(false);
    const [removed, setRemoved] = useState(false);
    const [replyTo, setReplyTo] = useState<{ parentId: number | null, username: string | null }>({ parentId: null, username: null });
    const [reportVisible, setReportVisible] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);
    const commentInputRef = useRef<TextInput>(null);
    const currentUsername = user?.username;
    const isOwner = author?.username && user?.username && author.username === user.username;
    const isCommunityAdmin = !!(community?.community_admin && user?.username && community.community_admin.username === user.username);
    const canDelete = isOwner || isCommunityAdmin;
    const [deleting, setDeleting] = useState(false);

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
    // Load current user's backend profile (id) to enable sharing
    useEffect(() => {
        (async () => {
            try {
                const uname = (user as any)?.username
                if (!uname) return
                const me = await getUser(uname)
                setCurrentProfile(me ?? null)
            } catch {}
        })()
    }, [user])
    // Load following list when share modal opens
    useEffect(() => {
        (async () => {
            if (!shareVisible) return
            try {
                const meId = currentProfile?.id ? String(currentProfile.id) : null
                if (!meId) return
                setLoadingFollowing(true)
                const list = await getFollowing(meId)
                setFollowingList(Array.isArray(list) ? list : [])
            } catch {
                setFollowingList([])
            } finally {
                setLoadingFollowing(false)
            }
        })()
    }, [shareVisible, currentProfile?.id])
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

    // Reposted post video setup (separate player)
    const repostVideoSource = reposted_post?.video ?? "";
    const repostPlayer = useVideoPlayer(repostVideoSource, (p) => {
        if (p && repostVideoSource) {
            p.loop = true;
        }
    });
    useEffect(() => {
        if (!repostPlayer || !repostVideoSource) return;
        try { repostPlayer.pause(); } catch {}
    }, [repostPlayer, repostVideoSource]);

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
                // Send notification to post author on like only (not unlike)
                if (newLikedState && author?.id && user?.id && String(author.id) !== String(user.id)) {
                    const actorName = (user.fullName || user.username) as string;
                    try {
                        await sendNotification(user.id, {
                            recipientId: author.id,
                            type: 'like',
                            targetType: 'post',
                            targetId: id!,
                            title: 'إعجاب بمنشورك',
                            body: ` أعجب بمنشورك`,
                        });
                    } catch {}
                }
            }
        } catch (error) {
            // Revert optimistic update if error occurred
            setLiked(!newLikedState);
            setLikesCount(prev => newLikedState ? (prev > 0 ? prev - 1 : 0) : prev + 1);
            ToastAndroid.show("Error updating like", ToastAndroid.SHORT);
        }
    }

    const navigateToUserProfile = () => {
        if (author?.username) {
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

            // Send notifications (avoid notifying self)
            const actorName = (user.fullName || user.username) as string;
            // Notify post author about a new comment
            if (author?.id && String(author.id) !== String(user.id)) {
                try {
                    await sendNotification(user.id, {
                        recipientId: author.id,
                        type: 'comment',
                        targetType: 'post',
                        targetId: id!,
                        title: 'تعليق جديد',
                        body: ` علّق على منشورك`,
                    });
                } catch {}
            }
            // If it's a reply, notify the comment owner (reply target)
            if (replyTo.parentId && replyTo.username) {
                try {
                    const replyTarget = await getUser(replyTo.username);
                    const targetId = replyTarget?.id;
                    if (targetId && String(targetId) !== String(user.id) && (!author?.id || String(targetId) !== String(author.id))) {
                        await sendNotification(user.id, {
                            recipientId: targetId,
                            type: 'reply',
                            targetType: 'post',
                            targetId: id!,
                            title: 'رد جديد',
                            body: ` رد على تعليقك`,
                        });
                    }
                } catch {}
            }
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
                // Send notification to comment author for like
                const actorName = (user.fullName || user.username) as string;
                if (current?.author?.id && String(current.author.id) !== String(user.id)) {
                    try {
                        await sendNotification(user.id, {
                            recipientId: current.author.id,
                            type: 'like',
                            targetType: 'comment',
                            targetId: commentId,
                            title: 'إعجاب بتعليقك',
                            body: ` أعجب بتعليقك`,
                        });
                    } catch {}
                }
            }
        } catch (e) {
            if (Comments) {
                setComments(updateLikesInTree(Comments, commentId, alreadyLiked));
            }
            ToastAndroid.show('فشل تحديث الإعجاب', ToastAndroid.SHORT);
        }
    };

    if (removed) return null;
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
                <TouchableOpacity style={{ height: 20, width: 20, justifyContent: "center", alignItems: "center"}} onPress={() => setOptionsVisible(true)}>
                    <Entypo name="dots-three-horizontal" size={14} color="black" />
                </TouchableOpacity>
            </View>

            <View style={{paddingHorizontal: 8}}>
                <Text style={{fontFamily: 'bold', fontSize: 16, color: 'black', marginBottom: 0, textAlign: "right"}}>{title}</Text>
                {content && <ExpandableText content={content} />}
            </View>

            {images && <Carousel images={images}/>}

            {/* Reposted Post - full inline rendering */}
            {reposted_post ? (
                <TouchableOpacity
                    activeOpacity={0.85}
                    style={style.repostCard}
                    onPress={() => {
                        try {
                            const rid = (reposted_post as any)?.id
                            if (rid != null) {
                                router.push(`/(views)/postPreview?id=${rid}`)
                            }
                        } catch {}
                    }}
                >
                    {/* Header */}
                    <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10}}>
                        <TouchableOpacity onPress={(e: any) => { e?.stopPropagation?.();
                            if (reposted_post.community?.id != null) {
                                router.push(`/(views)/community?id=${reposted_post.community.id}`);
                            } else if (reposted_post.author?.username) {
                                router.push(`/(views)/userprofile?username=${reposted_post.author.username}`);
                            }
                        }}>
                            {reposted_post.community ? (
                                <>
                                    <Image source={{uri: reposted_post.community?.profile}} style={{width: 36, height: 36, borderRadius: 8}} />
                                    {reposted_post.author?.profile ? (
                                        <Image source={{uri: reposted_post.author.profile}} style={{width: 18, height: 18, borderRadius: 9, position: 'absolute', bottom: -5, left:-5}} />
                                    ) : null}
                                </>
                            ) : (
                                <Image source={{uri: reposted_post.author?.profile}} style={{width: 36, height: 36, borderRadius: 18}} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={{flex: 1}} onPress={(e: any) => { e?.stopPropagation?.();
                            if (reposted_post.community?.id != null) {
                                router.push(`/(views)/community?id=${reposted_post.community.id}`);
                            } else if (reposted_post.author?.username) {
                                router.push(`/(views)/userprofile?username=${reposted_post.author.username}`);
                            }
                        }}>
                            {reposted_post.community ? (
                                <View>
                                    <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}>
                                        <Text style={[style.authorname, {fontSize: 14}]}>{reposted_post.community?.name}</Text>
                                    </View>
                                    <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2}}>
                                        <Text style={[style.authorname, {fontSize: 12, color: '#666'}]}>{reposted_post.author?.fullname}</Text>
                                        {reposted_post.author?.verified && <SealCheck size={12} color="#FFB400" weight="fill" />}
                                        {/* {reposted_post.created_at ? (
                                            <Text style={[style.date, {marginLeft: 4}]}>• {timeAgo(reposted_post.created_at as any)}</Text>
                                        ) : null} */}
                                    </View>
                                </View>
                            ) : (
                                <View>
                                    <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}>
                                        <Text style={[style.authorname]}>{reposted_post.author?.fullname}</Text>
                                        {reposted_post.author?.verified && <SealCheck size={14} color="#FFB400" weight="fill" />}
                                    </View>
                                    {/* {reposted_post.created_at ? (
                                        <Text style={[style.date]}>{timeAgo(reposted_post.created_at as any)}</Text>
                                    ) : null} */}
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Title & Content */}
                    <View style={{paddingHorizontal: 0}}>
                        <Text style={{fontFamily: 'bold', fontSize: 15, color: 'black', marginBottom: 0, textAlign: 'right'}}>
                            {reposted_post.title}
                        </Text>
                        {reposted_post.content ? (
                            <Text style={{fontFamily: 'regular', fontSize: 13, color: '#333', marginTop: 4, textAlign: 'right'}}>
                                {reposted_post.content}
                            </Text>
                        ) : null}
                    </View>

                    {/* Media */}
                    {Array.isArray(reposted_post.images) && reposted_post.images.length > 0 ? (
                        <View style={{marginTop: 8}}>
                            <Carousel images={reposted_post.images} />
                        </View>
                    ) : null}

                    {/* Video (reposted) */}
                    {reposted_post.video && repostVideoSource ? (
                        <View style={{marginTop: 8, position: 'relative'}}>
                            <VideoView
                                allowsFullscreen={true}
                                player={repostPlayer}
                                style={{ width: '100%', height: 250, backgroundColor: 'black' }}
                                contentFit="contain"
                                nativeControls={false}
                            />
                            <View
                                style={{
                                    position: 'absolute',
                                    top: 8,
                                    right: 8,
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                            >
                                <Entypo name="video" size={14} color="#fff" />
                            </View>
                        </View>
                    ) : null}

                    {/* Link */}
                    {reposted_post.links ? (
                        <View style={{marginTop: 8}}>
                            <TouchableOpacity
                                onPress={(e: any) => { e?.stopPropagation?.();
                                    const lnk = reposted_post.links as string;
                                    if (lnk.startsWith('http://') || lnk.startsWith('https://')) {
                                        Linking.openURL(lnk).catch(err => console.error('Failed to open URL:', err));
                                    }
                                }}
                                style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}
                                activeOpacity={0.7}
                            >
                                <Text style={{fontFamily: 'bold', fontSize: 13, color: '#1D9BF0', textAlign: 'right', textDecorationLine: 'underline'}}>
                                    {(reposted_post.links as string).slice(0, 20)}{(reposted_post.links as string).length > 20 ? '...' : ''}
                                </Text>
                                <Entypo name="link" size={14} color="#1D9BF0" />
                            </TouchableOpacity>
                        </View>
                    ) : null}
                </TouchableOpacity>
            ) : null}

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
                <TouchableOpacity style={style.reactionIcon} onPress={() => setShareVisible(true)}>
                    <ShareFat size={24} color="#7b7b7bff" />
                    <Text style={{color: "#7b7b7bff"}}></Text>
                </TouchableOpacity>
                <TouchableOpacity style={style.reactionIcon} onPress={() => setRepostVisible(true)}>
                    <Repeat size={24} color="#7b7b7bff" />
                    <Text style={{color: "#7b7b7bff"}}></Text>
                </TouchableOpacity>
            </View>

            <Modal
                animationType="fade"
                visible={optionsVisible}
                transparent
                onRequestClose={() => setOptionsVisible(false)}
            >
                <TouchableOpacity style={style.modalBackdrop} activeOpacity={1} onPress={() => setOptionsVisible(false)} />
                <View style={style.optionsSheet}>
                    <Text style={style.sheetTitle}>الخيارات</Text>
                    <TouchableOpacity style={style.sheetItem} onPress={() => { setOptionsVisible(false); setTimeout(() => setShareVisible(true), 80); }}>
                        <ShareFat size={20} color="#333" />
                        <Text style={style.sheetItemText}>مشاركة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={style.sheetItem} onPress={() => { setOptionsVisible(false); setTimeout(() => setRepostVisible(true), 80); }}>
                        <Repeat size={20} color="#333" />
                        <Text style={style.sheetItemText}>إعادة نشر</Text>
                    </TouchableOpacity>
                    {canDelete && (
                        <TouchableOpacity
                            disabled={deleting}
                            style={[style.sheetItem, { backgroundColor: '#fff5f5' }]}
                            onPress={async () => {
                                if (!user?.id || !id) { ToastAndroid.show('غير مصرح', ToastAndroid.SHORT); return; }
                                setDeleting(true);
                                try {
                                    const res = await deletePost(String(id), user.id);
                                    if (res?.success) {
                                        ToastAndroid.show('تم حذف المنشور', ToastAndroid.SHORT);
                                        setOptionsVisible(false);
                                        if (typeof id === 'number') {
                                            // Notify parent to remove this post if provided
                                            try { onDeleted && onDeleted(id); } catch {}
                                        }
                                        setRemoved(true);
                                    } else {
                                        ToastAndroid.show('فشل حذف المنشور', ToastAndroid.SHORT);
                                    }
                                } catch (e) {
                                    ToastAndroid.show('حدث خطأ أثناء الحذف', ToastAndroid.SHORT);
                                } finally {
                                    setDeleting(false);
                                }
                            }}
                        >
                            <Entypo name="trash" size={20} color="#d00" />
                            <Text style={[style.sheetItemText, { color: '#d00' }]}>{deleting ? 'جار الحذف...' : 'حذف'}</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={style.sheetItem} onPress={() => { setOptionsVisible(false); setTimeout(() => setReportVisible(true), 80); }}>
                        <Entypo name="flag" size={18} color="#333" />
                        <Text style={style.sheetItemText}>إبلاغ</Text>
                    </TouchableOpacity>
                    {!isOwner && (
                        <TouchableOpacity style={style.sheetItem} onPress={() => { setOptionsVisible(false); navigateToUserProfile(); }}>
                            <Entypo name="user" size={18} color="#333" />
                            <Text style={style.sheetItemText}>عن الحساب</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </Modal>

            {/* Share Modal: followed users */}
            <Modal
                animationType="slide"
                transparent
                visible={shareVisible}
                onRequestClose={() => setShareVisible(false)}
            >
                <TouchableOpacity style={style.modalBackdrop} activeOpacity={1} onPress={() => setShareVisible(false)} />
                <View style={style.repostSheet}>
                    <Text style={style.sheetTitle}>مشاركة مع</Text>
                    <TextInput
                        value={shareQuery}
                        onChangeText={setShareQuery}
                        placeholder="ابحث عن متابَعين"
                        placeholderTextColor="#888"
                        style={[style.input, { marginBottom: 8 }]}
                        textAlign="right"
                    />
                    <View style={{ maxHeight: 320 }}>
                        {loadingFollowing ? (
                            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                                <Text style={{ fontFamily: 'regular', color: '#666' }}>جاري التحميل...</Text>
                            </View>
                        ) : (
                            <ScrollView style={{ maxHeight: 320 }}>
                                {followingList
                                    .filter(u => {
                                        const q = shareQuery.trim().toLowerCase()
                                        if (!q) return true
                                        return (u.username || '').toLowerCase().includes(q) || (u.fullname || '').toLowerCase().includes(q)
                                    })
                                    .map(u => (
                                        <View key={String(u.id)} style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
                                            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                                                <Image source={{ uri: (u.profile as any) || undefined }} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#eee' }} />
                                                <View>
                                                    <Text style={{ fontFamily: 'bold', color: '#111', textAlign: 'right' }}>{u.username}</Text>
                                                    <Text style={{ fontFamily: 'regular', color: '#666', textAlign: 'right' }}>{u.fullname}</Text>
                                                </View>
                                            </View>
                                            <TouchableOpacity
                                                disabled={sendingTo === String(u.id)}
                                                onPress={async () => {
                                                    if (!user?.id || !id) { ToastAndroid.show('يرجى تسجيل الدخول أولاً', ToastAndroid.SHORT); return }
                                                    const meId = currentProfile?.id ? String(currentProfile.id) : null
                                                    if (!meId) { ToastAndroid.show('بيانات الحساب غير متاحة', ToastAndroid.SHORT); return }
                                                    try {
                                                        setSendingTo(String(u.id))
                                                        const conv = await getOrCreateConversation(meId, String(u.id))
                                                        if (conv) {
                                                            await sendPostMessage(conv.id, meId, Number(id))
                                                            const senderFullname = currentProfile?.fullname || currentProfile?.username || 'User'
                                                            sendMessageNotification({ userId: String(u.id), senderFullname, message: 'شارك منشورًا' })
                                                            ToastAndroid.show('تم الإرسال', ToastAndroid.SHORT)
                                                            setShareVisible(false)
                                                        } else {
                                                            ToastAndroid.show('تعذر فتح المحادثة', ToastAndroid.SHORT)
                                                        }
                                                    } catch {
                                                        ToastAndroid.show('فشل الإرسال', ToastAndroid.SHORT)
                                                    } finally {
                                                        setSendingTo(null)
                                                    }
                                                }}
                                                style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1D9BF0', borderRadius: 8, opacity: sendingTo === String(u.id) ? 0.6 : 1 }}
                                            >
                                                <Text style={{ color: 'white', fontFamily: 'bold' }}>{sendingTo === String(u.id) ? '...' : 'إرسال'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                {(!followingList || followingList.length === 0) && !loadingFollowing ? (
                                    <Text style={{ textAlign: 'center', color: '#666', fontFamily: 'regular', paddingVertical: 16 }}>لا يوجد متابعون</Text>
                                ) : null}
                            </ScrollView>
                        )}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity onPress={() => setShareVisible(false)} style={[style.actionBtn, { backgroundColor: '#999' }]}>
                            <Text style={style.actionBtnText}>إغلاق</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Report Modal */}
            <Modal
                animationType="slide"
                transparent
                visible={reportVisible}
                onRequestClose={() => setReportVisible(false)}
            >
                <TouchableOpacity style={style.modalBackdrop} activeOpacity={1} onPress={() => setReportVisible(false)} />
                <View style={style.repostSheet}>
                    <Text style={style.sheetTitle}>إبلاغ عن منشور</Text>
                    <Text style={style.formLabel}>سبب الإبلاغ (اختياري)</Text>
                    <TextInput
                        style={[style.input, { height: 100, textAlignVertical: 'top' }]}
                        value={reportReason}
                        onChangeText={setReportReason}
                        placeholder="صف المشكلة بإيجاز..."
                        placeholderTextColor="#888"
                        textAlign="right"
                        multiline
                    />
                    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 10 }}>
                        <TouchableOpacity
                            style={[style.actionBtn, { backgroundColor: '#eee' }]}
                            onPress={() => setReportVisible(false)}
                            disabled={reporting}
                        >
                            <Text style={[style.actionBtnText, { color: '#222' }]}>إلغاء</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[style.actionBtn, { backgroundColor: '#d9534f' }, reporting ? { opacity: 0.6 } : null]}
                            disabled={reporting}
                            onPress={async () => {
                                if (!user?.id || !id) {
                                    ToastAndroid.show('يرجى تسجيل الدخول أولاً', ToastAndroid.SHORT);
                                    router.push('/(auth)/sign-in');
                                    return;
                                }
                                try {
                                    setReporting(true);
                                    const res = await createReport('post', id, user.id, reportReason.trim() || undefined);
                                    if (res && res.success) {
                                        ToastAndroid.show('تم إرسال الإبلاغ', ToastAndroid.SHORT);
                                        setReportVisible(false);
                                        setReportReason('');
                                    } else {
                                        ToastAndroid.show('فشل إرسال الإبلاغ', ToastAndroid.SHORT);
                                    }
                                } catch (e) {
                                    ToastAndroid.show('حدث خطأ أثناء الإبلاغ', ToastAndroid.SHORT);
                                } finally {
                                    setReporting(false);
                                }
                            }}
                        >
                            <Text style={style.actionBtnText}>{reporting ? 'جارٍ الإرسال...' : 'إبلاغ'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Repost Modal */}
            <Modal
                animationType="slide"
                transparent
                visible={repostVisible}
                onRequestClose={() => setRepostVisible(false)}
            >
                <TouchableOpacity style={style.modalBackdrop} activeOpacity={1} onPress={() => setRepostVisible(false)} />
                <View style={style.repostSheet}>
                    <Text style={style.sheetTitle}>إعادة نشر</Text>
                    <View style={{ gap: 10 }}>
                        <Text style={style.formLabel}>العنوان</Text>
                        <TextInput
                            style={style.input}
                            value={repostTitle}
                            onChangeText={setRepostTitle}
                            placeholder="اكتب عنوان المنشور..."
                            placeholderTextColor="#888"
                            textAlign="right"
                        />
                        <Text style={style.formLabel}>المحتوى (اختياري)</Text>
                        <TextInput
                            style={[style.input, { height: 100, textAlignVertical: 'top' }]}
                            value={repostContent}
                            onChangeText={setRepostContent}
                            placeholder="اكتب محتوى المنشور..."
                            placeholderTextColor="#888"
                            textAlign="right"
                            multiline
                            numberOfLines={4}
                        />
                        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-between' }}>
                            <TouchableOpacity
                                style={[style.actionBtn, { backgroundColor: '#eee' }]}
                                onPress={() => setRepostVisible(false)}
                                disabled={submittingRepost}
                            >
                                <Text style={[style.actionBtnText, { color: '#222' }]}>إلغاء</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[style.actionBtn, { backgroundColor: '#1D9BF0' }, submittingRepost ? { opacity: 0.6 } : null]}
                                disabled={submittingRepost}
                                onPress={async () => {
                                    if (!repostTitle.trim()) {
                                        ToastAndroid.show('يرجى إدخال عنوان', ToastAndroid.SHORT);
                                        return;
                                    }
                                    if (!user?.id) {
                                        ToastAndroid.show('يرجى تسجيل الدخول أولاً', ToastAndroid.SHORT);
                                        return;
                                    }
                                    try {
                                        setSubmittingRepost(true);
                                        const res = await createPost(
                                            repostTitle.trim(),
                                            repostContent.trim(),
                                            user.id,
                                            undefined,
                                            undefined,
                                            undefined,
                                            community?.id as any,
                                            id as any
                                        );
                                        if (res) {
                                            ToastAndroid.show('تمت إعادة النشر', ToastAndroid.SHORT);
                                            setRepostVisible(false);
                                            setRepostTitle('');
                                            setRepostContent('');
                                        } else {
                                            ToastAndroid.show('فشل في إعادة النشر', ToastAndroid.SHORT);
                                        }
                                    } catch (e) {
                                        ToastAndroid.show('حدث خطأ أثناء إعادة النشر', ToastAndroid.SHORT);
                                    } finally {
                                        setSubmittingRepost(false);
                                    }
                                }}
                            >
                                <Text style={style.actionBtnText}>{submittingRepost ? 'جارٍ المشاركة...' : 'مشاركة'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

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
    repostCard: {
        marginHorizontal: 8,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#e9e9e9',
        backgroundColor: '#fafafa',
        borderRadius: 12,
        padding: 10,
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    optionsSheet: {
        position: 'absolute',
        left: 10,
        right: 10,
        bottom: 10,
        backgroundColor: 'white',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        gap: 2,
    },
    repostSheet: {
        position: 'absolute',
        left: 10,
        right: 10,
        bottom: 10,
        backgroundColor: 'white',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
    },
    sheetTitle: {
        fontFamily: 'bold',
        fontSize: 16,
        color: '#000',
        textAlign: 'center',
        paddingVertical: 6,
        borderBottomColor: '#eee',
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginBottom: 4,
    },
    sheetItem: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
    },
    sheetItemText: {
        fontFamily: 'regular',
        fontSize: 14,
        color: '#222',
    },
    formLabel: {
        fontFamily: 'regular',
        fontSize: 12,
        color: '#666',
        textAlign: 'right',
    },
    input: {
        borderWidth: 1,
        borderColor: '#e6e6e6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontFamily: 'regular',
        fontSize: 14,
        backgroundColor: '#fafafa',
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionBtnText: {
        color: '#fff',
        fontFamily: 'bold',
        fontSize: 14,
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
