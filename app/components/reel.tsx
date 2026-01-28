import { getOrCreateConversation, sendPostMessage } from '@/lib/chat';
import { CommentProps, UserProps } from '@/lib/database.module';
import { handleLike as apiHandleLike, createComment, createPost, createReport, getFollowing, getPostComments, getUser, handleCommentLike, handleCommentUnlike, sendNotification } from '@/lib/db';
import { sendMessageNotification } from '@/lib/notification';
import { useUser } from '@clerk/clerk-expo';
import Entypo from '@expo/vector-icons/Entypo';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoPlayer, VideoView } from 'expo-video';
import { ChatCircle, Heart, Repeat, SealCheck, ShareFat } from 'phosphor-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
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
    const router = useRouter();
    const [playing, setPlaying] = useState(isPlaying);
    const [liked, setLiked] = useState(isLiked);
    const [likesCount, setLikesCount] = useState(likes);
    const [following, setFollowing] = useState(false);
    const [isPlayerReleased, setIsPlayerReleased] = useState(false);
    const [commentVisible, setCommentVisible] = useState(false);
    const [optionsVisible, setOptionsVisible] = useState(false);
    const [shareVisible, setShareVisible] = useState(false);
    const [repostVisible, setRepostVisible] = useState(false);
    const [repostTitle, setRepostTitle] = useState('');
    const [repostContent, setRepostContent] = useState('');
    const [submittingRepost, setSubmittingRepost] = useState(false);
    const [reportVisible, setReportVisible] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);
    const [Comments, setComments] = useState<Array<CommentProps> | null>(null);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [postingComment, setPostingComment] = useState(false);
    const [currentProfile, setCurrentProfile] = useState<UserProps | null>(null);
    const [replyTo, setReplyTo] = useState<{ parentId: number | null, username: string | null }>({ parentId: null, username: null });
    const commentInputRef = useRef<TextInput>(null);
    const currentUsername = user?.username;
    const playerRef = useRef<VideoPlayer | null>(null);
    const [followingList, setFollowingList] = useState<UserProps[]>([])
    const [loadingFollowing, setLoadingFollowing] = useState(false)
    const [shareQuery, setShareQuery] = useState('')
    const [sendingTo, setSendingTo] = useState<string | null>(null)

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

    // Load current user's profile from backend (not Clerk)
    useEffect(() => {
        const load = async () => {
            try {
                const username = (user as any)?.username;
                if (!username) return;
                const u = await getUser(username);
                setCurrentProfile(u ?? null);
            } catch {}
        };
        load();
    }, [user]);
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

    const togglePlay = useCallback(() => {
        if (isPlayerReleased) return;

        const currentPlayer = playerRef.current || player;
        if (!currentPlayer) return;

        try {
            setPlaying((prev) => {
                const next = !prev;
                if (next) {
                    // Going to play
                    currentPlayer.play();
                    if (onPlay) onPlay();
                } else {
                    // Going to pause
                    currentPlayer.pause();
                }
                return next;
            });
        } catch (error) {
            console.warn('Error toggling video playback:', error);
            // Do not permanently release on transient errors
        }
    }, [onPlay, player, isPlayerReleased]);

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
                // Notify reel author (post like) on like only
                if (newLikedState && author?.id && user?.id && String(author.id) !== String(user.id)) {
                    const actorName = (user.fullName || user.username) as string;
                    try {
                        await sendNotification(user.id, {
                            recipientId: author.id,
                            type: 'like',
                            targetType: 'post',
                            targetId: parseInt(id),
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
    }, [liked, user, id]);

    const handleFollow = useCallback(() => {
        setFollowing(!following);
        ToastAndroid.show(following ? "تم إلغاء المتابعة" : "تم المتابعة", ToastAndroid.SHORT);
    }, [following]);

    const handleComment = useCallback(() => {
        setCommentVisible(true);
    }, []);

    const handleShare = useCallback(() => {
        setShareVisible(true)
    }, []);

    const handleRepost = useCallback(() => {
        setRepostVisible(true);
    }, []);

    const handleMoreOptions = useCallback(() => {
        setOptionsVisible(true);
    }, []);

    const handlePublishComment = useCallback(async () => {
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
            // Re-fetch to ensure details/nesting
            setLoadingComments(true);
            const fetched = await getPostComments(parseInt(id));
            setComments(Array.isArray(fetched) ? fetched : []);
            ToastAndroid.show('تم نشر التعليق', ToastAndroid.SHORT);

            // Notifications: comment on reel (post) and reply
            const actorName = (user.fullName || user.username) as string;
            if (author?.id && String(author.id) !== String(user.id)) {
                try {
                    await sendNotification(user.id, {
                        recipientId: author.id,
                        type: 'comment',
                        targetType: 'post',
                        targetId: parseInt(id),
                        title: 'تعليق جديد',
                        body: ` علّق على منشورك`,
                    });
                } catch {}
            }
            if (replyTo.parentId && replyTo.username) {
                try {
                    const replyTarget = await getUser(replyTo.username);
                    const targetId = replyTarget?.id;
                    if (targetId && String(targetId) !== String(user.id) && (!author?.id || String(targetId) !== String(author.id))) {
                        await sendNotification(user.id, {
                            recipientId: targetId,
                            type: 'reply',
                            targetType: 'post',
                            targetId: parseInt(id),
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
            setLoadingComments(false);
        }
    }, [commentText, id, replyTo.parentId, replyTo.username, router, user]);

    const updateLikesInTree = useCallback((list: Array<CommentProps>, targetId: number, liked: boolean): Array<CommentProps> => {
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
    }, [currentUsername]);

    const handleToggleCommentLike = useCallback(async (commentId: number) => {
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
                // Send notification to comment author when liked
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
    }, [Comments, currentUsername, router, updateLikesInTree, user?.id]);

    const submitRepost = useCallback(async () => {
        if (!user || !user.id) {
            ToastAndroid.show('يرجى تسجيل الدخول أولاً', ToastAndroid.SHORT);
            router.push('/(auth)/sign-in');
            return;
        }
        const title = repostTitle.trim();
        const content = repostContent.trim();
        if (!title && !content) {
            ToastAndroid.show('أضف عنواناً أو محتوى لإعادة النشر', ToastAndroid.SHORT);
            return;
        }
        try {
            setSubmittingRepost(true);
            const result = await createPost(title, content, user.id, undefined, undefined, undefined, undefined, id);
            if (!result) {
                ToastAndroid.show('فشل إعادة النشر', ToastAndroid.SHORT);
                return;
            }
            ToastAndroid.show('تمت إعادة النشر', ToastAndroid.SHORT);
            setRepostVisible(false);
            setRepostTitle('');
            setRepostContent('');
        } catch (e) {
            ToastAndroid.show('حدث خطأ أثناء إعادة النشر', ToastAndroid.SHORT);
        } finally {
            setSubmittingRepost(false);
        }
    }, [id, repostContent, repostTitle, router, user]);

    const navigateToUserProfile = useCallback(() => {
        if (author?.username && author.username !== user?.username) {
            router.push(`/(views)/userprofile?username=${author.username}`);
        }
    }, [author?.username, user?.username, router]);

    return (
        <View style={styles.container}>
            {/* Video Player */}
            <View style={styles.videoContainer}>
                <VideoView
                    player={player}
                    style={styles.video}
                    contentFit="contain"
                    nativeControls={false}
                />

                {/* Play overlay icon when paused */}
                {!playing && (
                    <View style={styles.playOverlay} pointerEvents="none">
                        <View style={styles.playOverlayCircle}>
                            <Entypo name="controller-play" size={64} color="white" />
                        </View>
                    </View>
                )}

                {/* Full-screen press target for reliable toggle */}
                <Pressable onPress={togglePlay} style={StyleSheet.absoluteFill} android_ripple={{ color: 'transparent' }} />
            </View>

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
                        <TouchableOpacity onPress={navigateToUserProfile}>
                            <Image source={{ uri: author.profile }} style={styles.avatar} />
                        </TouchableOpacity>
                        <View style={styles.userDetails}>
                            <TouchableOpacity onPress={navigateToUserProfile}>
                                <View style={styles.usernameRow}>
                                    <Text style={styles.username}>{author.fullname}</Text>
                                    {author.verified && <SealCheck size={16} color="#FFB400" weight="fill" />}
                                </View>
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

            {/* Options Menu */}
            <Modal
                animationType="fade"
                visible={optionsVisible}
                transparent
                onRequestClose={() => setOptionsVisible(false)}
            >
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setOptionsVisible(false)} />
                <View style={styles.optionsSheet}>
                    <Text style={styles.sheetTitle}>الخيارات</Text>
                    <TouchableOpacity style={styles.sheetItem} onPress={() => { setOptionsVisible(false); setTimeout(() => setShareVisible(true), 80); }}>
                        <ShareFat size={20} color="#333" />
                        <Text style={styles.sheetItemText}>مشاركة</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.sheetItem} onPress={() => { setOptionsVisible(false); setRepostVisible(true); }}>
                        <Repeat size={20} color="#333" />
                        <Text style={styles.sheetItemText}>إعادة نشر</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.sheetItem} onPress={() => { setOptionsVisible(false); setReportVisible(true); }}>
                        <Entypo name="flag" size={18} color="#333" />
                        <Text style={styles.sheetItemText}>إبلاغ</Text>
                    </TouchableOpacity>
                </View>
            </Modal>

            {/* Share Modal: followed users */}
            <Modal
                animationType="slide"
                transparent
                visible={shareVisible}
                onRequestClose={() => setShareVisible(false)}
            >
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShareVisible(false)} />
                <View style={styles.repostSheet}>
                    <Text style={styles.sheetTitle}>مشاركة مع</Text>
                    <TextInput
                        value={shareQuery}
                        onChangeText={setShareQuery}
                        placeholder="ابحث عن متابَعين"
                        placeholderTextColor="#888"
                        style={[styles.input, { marginBottom: 8 }]}
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
                                                    if (!user?.id) { ToastAndroid.show('يرجى تسجيل الدخول أولاً', ToastAndroid.SHORT); return }
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
                        <TouchableOpacity onPress={() => setShareVisible(false)} style={[styles.actionBtn, { backgroundColor: '#999' }]}>
                            <Text style={styles.actionBtnText}>إغلاق</Text>
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
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setRepostVisible(false)} />
                <View style={styles.repostSheet}>
                    <Text style={styles.sheetTitle}>إعادة نشر</Text>
                    <Text style={styles.formLabel}>العنوان</Text>
                    <TextInput
                        placeholder="أدخل عنواناً (اختياري)"
                        placeholderTextColor="#888"
                        style={styles.input}
                        value={repostTitle}
                        onChangeText={setRepostTitle}
                        textAlign="right"
                    />
                    <Text style={styles.formLabel}>المحتوى</Text>
                    <TextInput
                        placeholder="أضف تعليقك (اختياري)"
                        placeholderTextColor="#888"
                        style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                        multiline
                        value={repostContent}
                        onChangeText={setRepostContent}
                        textAlign="right"
                    />
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity disabled={submittingRepost} onPress={() => setRepostVisible(false)} style={[styles.actionBtn, { backgroundColor: '#999' }]}>
                            <Text style={styles.actionBtnText}>إلغاء</Text>
                        </TouchableOpacity>
                        <TouchableOpacity disabled={submittingRepost} onPress={submitRepost} style={[styles.actionBtn, { backgroundColor: '#1D9BF0' }]}>
                            <Text style={styles.actionBtnText}>{submittingRepost ? 'جارٍ الإرسال...' : 'نشر'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

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
                        <View style={styles.replyBadge}>
                            <Text style={styles.replyBadgeText}>الرد على @{replyTo.username}</Text>
                            <TouchableOpacity onPress={() => setReplyTo({ parentId: null, username: null })}>
                                <Text style={styles.replyBadgeClear}>إلغاء</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                    <View style={styles.commentInput}>
                        <Image
                            source={{ uri: (currentProfile?.profile as any) || undefined }}
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

            {/* Report Modal */}
            <Modal
                animationType="slide"
                transparent
                visible={reportVisible}
                onRequestClose={() => setReportVisible(false)}
            >
                <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setReportVisible(false)} />
                <View style={styles.repostSheet}>
                    <Text style={styles.sheetTitle}>إبلاغ عن منشور</Text>
                    <Text style={styles.formLabel}>سبب الإبلاغ (اختياري)</Text>
                    <TextInput
                        placeholder="صف المشكلة بإيجاز..."
                        placeholderTextColor="#888"
                        style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                        multiline
                        value={reportReason}
                        onChangeText={setReportReason}
                        textAlign="right"
                    />
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                        <TouchableOpacity disabled={reporting} onPress={() => setReportVisible(false)} style={[styles.actionBtn, { backgroundColor: '#999' }]}>
                            <Text style={styles.actionBtnText}>إلغاء</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            disabled={reporting}
                            onPress={async () => {
                                if (!user?.id) {
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
                            style={[styles.actionBtn, { backgroundColor: '#d9534f' }]}
                        >
                            <Text style={styles.actionBtnText}>{reporting ? 'جارٍ الإرسال...' : 'إبلاغ'}</Text>
                        </TouchableOpacity>
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
        position: 'relative',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject as any,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playOverlayCircle: {
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderRadius: 48,
        padding: 12,
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
    },
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
        marginTop: 8,
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
});