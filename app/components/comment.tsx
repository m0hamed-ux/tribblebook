import { CommentProps, UserProps } from '@/lib/database.module';
import { timeAgo } from '@/lib/date';
import { Heart } from 'phosphor-react-native';
import { useState } from 'react';
import { Image, StyleSheet, Text, ToastAndroid, TouchableOpacity, View } from 'react-native';

interface CommentComponentProps {
    comments: Array<CommentProps>;
    onReply?: (commentId: number, username: string) => void;
    onLike?: (commentId: number) => void;
}

export default function Comment({ comments, onReply, onLike }: CommentComponentProps) {

    const [showReplies, setShowReplies] = useState<{ [key: number]: boolean }>({});
    if (comments.length === 0) {
        return (
            <View style={{ padding: 20 }}>
                <Text style={{ fontFamily: 'regular', fontSize: 16, color: '#666', textAlign: 'center' }}>
                    لا توجد تعليقات بعد. كن أول من يعلق!
                </Text>
            </View>
        );
    }
    return (
        <View>
            {comments.map((comment) => (
                <View key={comment.id}>
                    <View style={{ flex: 1, padding: 1, flexDirection: "row-reverse", gap: 10, borderBottomColor: '#eee' }}>
                        <Image style={style.profileImage} src={comment.author.profile} />
                        <View style={{ flex: 1 }}>
                            <View style={style.commentHeader}>
                                <Text style={style.authorname}>{comment.author.fullname}</Text>
                                <Text style={style.date}>{timeAgo(new Date(comment.created_at))}</Text>
                            </View>
                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center', gap: 15, marginTop: 5 }}>
                                <Text style={style.content}>
                                    {comment.reply_to_username && (<Text style={[style.content, {color: "#007AFF"}]}>@{comment.reply_to_username} </Text>)}{comment.content}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center', gap: 20, marginTop: 5 }}>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 5 }}
                                    onPress={() => onReply?.(comment.id, comment.author.username)}
                                >
                                    <Text style={{ fontFamily: 'regular', fontSize: 14, color: '#888' }}>
                                        رد
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}
                                    onPress={() => onLike?.(comment.id)}
                                >
                                    <Text style={{ fontFamily: 'regular', fontSize: 14, color: '#888' }}>
                                        0
                                    </Text>
                                    <Heart size={16} color="#888" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                    {comment.replies && comment.replies.length && (
                        <View style={{ marginRight: 50 }}>
                            <TouchableOpacity
                                onPress={() => setShowReplies(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                                style={{ paddingVertical: 5 }}
                            >
                                <Text style={{ fontFamily: 'regular', fontSize: 12, color: '#007AFF', textAlign: 'right' }}>
                                    {showReplies[comment.id] ? 'إخفاء الردود' : `عرض الردود (${comment.replies.length})`}
                                </Text>
                            </TouchableOpacity>
                            {showReplies[comment.id] && (
                                <Comment
                                    comments={comment.replies.filter((reply): reply is CommentProps => reply !== null)}
                                    onReply={onReply}
                                    onLike={onLike}
                                />
                            )}
                        </View>
                    )}
                </View>
            ))}
        </View>
    );
}

const style = StyleSheet.create({
    commentHeader: {
        flexDirection: 'row-reverse',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 10,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    date: {
        color: 'gray',
        fontSize: 10,
        fontFamily: 'regular',
        textAlign: "right",
    },
    authorname : {
        fontFamily: 'bold',
        fontSize: 16,
        color: 'black',
        textAlign: "right",
        verticalAlign: "middle",
    },
    content: {
        fontFamily: "regular",
        fontSize: 14,
        color: "black",
        marginBottom: 4,
        textAlign: "right",
        writingDirection: 'rtl',
    }
})
