import { CommentProps, UserProps } from '@/lib/database.module';
import { timeAgo } from '@/lib/date';
import { getPostComments, handleLike } from '@/lib/db';
import { useUser } from '@clerk/clerk-expo';
import Entypo from '@expo/vector-icons/Entypo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { BookmarkSimple, ChatCircle, Heart, Repeat, SealCheck, ShareFat } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, TouchableOpacity, View } from 'react-native';
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
    created_at?: string | Date,
    likes?: Array<{user_id: UserProps | null}>,
    isLiked?: boolean,
    isPlaying?: boolean,
    onPlay?: () => void,
}

export default function Post({id, author, title, content, images, video, created_at, likes, isLiked, isPlaying, onPlay}: PostProps){
    const { user } = useUser();
    const [commentVisible, setCommentVisible] = useState(false);
    const [playing, setPlaying] = useState(isPlaying ?? false);
    const [liked, setLiked] = useState(isLiked ?? false);
    const [likesCount, setLikesCount] = useState(likes?.length ?? 0);
    const [Comments, setComments] = useState<Array<CommentProps> | null>(null);
    const [loadingComments, setLoadingComments] = useState(false);
    
    // Update local state when isLiked prop changes
    useEffect(() => {
        setLiked(isLiked ?? false);
    }, [isLiked]);

    const videoSource = video ?? "";
    const player = useVideoPlayer(videoSource, (player) => {
        player.loop = true;
    });

    useEffect(() => {
        if (isPlaying !== undefined) {
            setPlaying(isPlaying);
        }
    }, [isPlaying]);

    useEffect(() => {
        if (playing && videoSource) {
            player.play();
        } else {
            player.pause();
        }
        console.log("playing state:", playing)
    }, [playing, player, videoSource]);

    useEffect(() => {
        return () => {
            if (player) {
                player.pause();
            }
        };
    }, [player]);

    const togglePlay = () => {
        if (!videoSource) return;
        setPlaying(prev => !prev);
        onPlay && onPlay();
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

    return (
        <View style={style.constainer}>
            <View style={style.author}>
                <Image source={{uri: author?.profile}} style={{width: 40, height: 40, borderRadius: 25}} />
                <View style={{flex: 1}} id='name'>
                    <View style={{flexDirection: 'row-reverse', alignItems: 'center', gap: 4}}>
                        <Text style={[style.authorname]}>{author?.fullname}</Text>
                        {author?.verified && <SealCheck size={14} color="#FFB400" weight="fill" /> }
                    </View>
                    <Text style={[style.date]}>{timeAgo(created_at!)}</Text>
                </View>
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

            <View style={{flexDirection: 'row-reverse', paddingVertical: 8, marginTop: 5}}>
                <TouchableOpacity onPress={toggleLike} style={style.reactionIcon}>
                    <Heart size={24} color={liked ? "#ff0000" : "#7b7b7bff"} weight={liked ? "fill" : "regular"} />
                    <Text style={{color: "#7b7b7bff"}}>{likesCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCommentVisible(true)} style={style.reactionIcon}>
                    <ChatCircle size={24} color="#7b7b7bff" />
                    <Text style={{color: "#7b7b7bff"}}>{Comments?.length || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={style.reactionIcon}><ShareFat size={24} color="#7b7b7bff" /><Text style={{color: "#7b7b7bff"}}>0</Text></TouchableOpacity>
                <TouchableOpacity style={style.reactionIcon}><Repeat size={24} color="#7b7b7bff" /><Text style={{color: "#7b7b7bff"}}>0</Text></TouchableOpacity>
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
                    <View style={style.commentInput}>
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
        padding: 16,
    },
    commentInput: {
        flexDirection: 'row-reverse',
        alignItems: 'center',
        gap: 8,
        borderTopColor: '#c3c3c3ce',
    }
});
