import theme, { styles as globalStyles } from '@/assets/theme/styles';
import { createPost } from '@/lib/db';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    ToastAndroid,
    TouchableOpacity,
    View
} from 'react-native';


const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtspfuyuf/';
// Use the preset from your .env file
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'tribble_preset';

// Alternative function for simple upload without preset
const uploadToCloudinarySimple = async (uri: string, type: 'image' | 'video'): Promise<string | null> => {
    try {
        const formData = new FormData();
        formData.append('file', {
            uri,
            type: type === 'image' ? 'image/jpeg' : 'video/mp4',
            name: `${type}_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
        } as any);
        
        // Using auto upload without preset (requires enabled auto-upload in Cloudinary)
        const endpoint = type === 'image' ? 'image/upload' : 'video/upload';
        const response = await fetch(`${CLOUDINARY_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
        });

        const data = await response.json();
        console.log('Simple Cloudinary response:', data);
        
        if (response.ok && data.secure_url) {
            return data.secure_url;
        } else {
            console.error('Simple Cloudinary upload failed:', data);
            return null;
        }
    } catch (error) {
        console.error('Simple Cloudinary upload error:', error);
        return null;
    }
};

interface MediaItem {
    uri: string;
    type: 'image' | 'video';
    duration?: number;
}

export default function AddPostPage() {
    const { user } = useUser();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);

    // Enable RTL for Arabic


    // Video player for preview
    const videoPlayer = useVideoPlayer(mediaItems.length > 0 && mediaType === 'video' ? mediaItems[0].uri : '', (player) => {
        player.loop = true;
        player.muted = false;
    });

    // Update video source when media changes
    useEffect(() => {
        if (mediaType === 'video' && mediaItems.length > 0) {
            videoPlayer.replace(mediaItems[0].uri);
        }
    }, [mediaItems, mediaType]);

    const uploadToCloudinary = async (uri: string, type: 'image' | 'video'): Promise<string | null> => {
        try {
            // First try with upload preset
            const formData = new FormData();
            formData.append('file', {
                uri,
                type: type === 'image' ? 'image/jpeg' : 'video/mp4',
                name: `${type}_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
            } as any);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            const endpoint = type === 'image' ? 'image/upload' : 'video/upload';
            let response = await fetch(`${CLOUDINARY_URL}${endpoint}`, {
                method: 'POST',
                body: formData,
            });

            let data = await response.json();
            console.log('Cloudinary response with preset:', data);
            
            if (response.ok && data.secure_url) {
                return data.secure_url;
            }
            
            // If preset fails, try simple upload
            console.log('Preset upload failed, trying simple upload...');
            return await uploadToCloudinarySimple(uri, type);
            
        } catch (error) {
            console.error('Cloudinary upload error:', error);
            Alert.alert('خطأ', 'حدث خطأ أثناء رفع الملف');
            return null;
        }
    };

    const pickImages = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('خطأ', 'نحتاج إلى إذن للوصول إلى معرض الصور');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: 5,
            });

            if (!result.canceled && result.assets) {
                const selectedImages = result.assets.slice(0, 5).map(asset => ({
                    uri: asset.uri,
                    type: 'image' as const,
                }));
                setMediaItems(selectedImages);
                setMediaType('image');
            }
        } catch (error) {
            Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الصور');
        }
    };

    const pickVideo = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('خطأ', 'نحتاج إلى إذن للوصول إلى معرض الصور');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: true,
                quality: 0.8,
                videoMaxDuration: 60, // 1 minute max
            });

            if (!result.canceled && result.assets[0]) {
                const video = result.assets[0];
                if (video.duration && video.duration > 60000) { // 60 seconds in milliseconds
                    Alert.alert('خطأ', 'يجب أن يكون الفيديو أقل من دقيقة واحدة');
                    return;
                }
                setMediaItems([{
                    uri: video.uri,
                    type: 'video',
                    duration: video.duration || undefined,
                }]);
                setMediaType('video');
            }
        } catch (error) {
            Alert.alert('خطأ', 'حدث خطأ أثناء اختيار الفيديو');
        }
    };

    const removeMedia = (index: number) => {
        const newMediaItems = mediaItems.filter((_, i) => i !== index);
        setMediaItems(newMediaItems);
        if (newMediaItems.length === 0) {
            setMediaType(null);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim()) {
            Alert.alert('خطأ', 'يرجى إدخال عنوان للمنشور');
            return;
        }

        if (!user?.id) {
            Alert.alert('خطأ', 'يرجى تسجيل الدخول أولاً');
            return;
        }

        setIsUploading(true);

        try {
            let uploadedImages: string[] = [];
            let uploadedVideo: string | undefined;

            // Upload media to Cloudinary
            if (mediaItems.length > 0) {
                if (mediaType === 'image') {
                    console.log('Uploading images:', mediaItems.length);
                    const imagePromises = mediaItems.map((item, index) => {
                        console.log(`Uploading image ${index + 1}:`, item.uri);
                        return uploadToCloudinary(item.uri, 'image');
                    });
                    const imageUrls = await Promise.all(imagePromises);
                    console.log('Image upload results:', imageUrls);
                    uploadedImages = imageUrls.filter(url => url !== null) as string[];
                    
                    if (uploadedImages.length === 0) {
                        Alert.alert('خطأ', 'فشل في رفع الصور. تحقق من اتصال الإنترنت أو إعدادات Cloudinary');
                        setIsUploading(false);
                        return;
                    }
                } else if (mediaType === 'video') {
                    console.log('Uploading video:', mediaItems[0].uri);
                    uploadedVideo = await uploadToCloudinary(mediaItems[0].uri, 'video') || undefined;
                    
                    if (!uploadedVideo) {
                        Alert.alert('خطأ', 'فشل في رفع الفيديو. تحقق من اتصال الإنترنت أو إعدادات Cloudinary');
                        setIsUploading(false);
                        return;
                    }
                }
            }

            // Create post
            const result = await createPost(
                title,
                content || '',
                user.id,
                uploadedImages.length > 0 ? uploadedImages : undefined,
                uploadedVideo,
                undefined // links
            );

            if (result) {
                ToastAndroid.show('تم نشر المنشور بنجاح!', ToastAndroid.SHORT);
                // Reset form
                setTitle('');
                setContent('');
                setMediaItems([]);
                setMediaType(null);
            } else {
                Alert.alert('خطأ', 'فشل في نشر المنشور. يرجى المحاولة مرة أخرى');
            }
        } catch (error) {
            console.error('Post creation error:', error);
            Alert.alert('خطأ', 'حدث خطأ أثناء نشر المنشور');
        } finally {
            setIsUploading(false);
        }
    };

    const MediaPickerModal = () => (
        <Modal
            visible={showMediaPicker}
            transparent={true}
            animationType="slide"
            onRequestClose={() => setShowMediaPicker(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>اختر نوع الوسائط</Text>
                    
                    <TouchableOpacity
                        style={styles.mediaOption}
                        onPress={() => {
                            setShowMediaPicker(false);
                            pickImages();
                        }}
                        disabled={mediaType === 'video'}
                    >
                        <MaterialIcons name="photo-library" size={24} color={theme.colors.primary} />
                        <Text style={styles.mediaOptionText}>صور (حتى 5)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.mediaOption}
                        onPress={() => {
                            setShowMediaPicker(false);
                            pickVideo();
                        }}
                        disabled={mediaType === 'image'}
                    >
                        <MaterialIcons name="videocam" size={24} color={theme.colors.primary} />
                        <Text style={styles.mediaOptionText}>فيديو (حتى دقيقة)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowMediaPicker(false)}
                    >
                        <Text style={styles.cancelButtonText}>إلغاء</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );

    return (
        <ScrollView style={[globalStyles.container, styles.container]}>
            <Text style={styles.pageTitle}>إنشاء منشور جديد</Text>

            {/* Title Input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>العنوان</Text>
                <TextInput
                    style={[globalStyles.input, styles.titleInput]}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="اكتب عنوان المنشور..."
                    placeholderTextColor={theme.colors.text.muted}
                    multiline={false}
                    textAlign="right"
                />
            </View>

            {/* Content Input */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>المحتوى (اختياري)</Text>
                <TextInput
                    style={[globalStyles.input, styles.contentInput]}
                    value={content}
                    onChangeText={setContent}
                    placeholder="اكتب محتوى المنشور..."
                    placeholderTextColor={theme.colors.text.muted}
                    multiline={true}
                    numberOfLines={4}
                    textAlign="right"
                    textAlignVertical="top"
                />
            </View>

            {/* Media Section */}
            <View style={styles.mediaContainer}>
                <Text style={styles.label}>الوسائط</Text>
                
                {mediaItems.length === 0 ? (
                    <TouchableOpacity
                        style={styles.addMediaButton}
                        onPress={() => setShowMediaPicker(true)}
                    >
                        <Ionicons name="add-circle-outline" size={48} color={theme.colors.primary} />
                        <Text style={styles.addMediaText}>إضافة صور أو فيديو</Text>
                    </TouchableOpacity>
                ) : (
                    <View>
                        <View style={styles.mediaPreview}>
                            {mediaType === 'image' ? (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                    {mediaItems.map((item, index) => (
                                        <View key={index} style={styles.imagePreviewContainer}>
                                            <Image source={{ uri: item.uri }} style={styles.imagePreview} />
                                            <TouchableOpacity
                                                style={styles.removeButton}
                                                onPress={() => removeMedia(index)}
                                            >
                                                <Ionicons name="close-circle" size={24} color="#E74C3C" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : (
                                <View style={styles.videoPreviewContainer}>
                                    <VideoView
                                        player={videoPlayer}
                                        style={styles.videoPreview}
                                        allowsFullscreen
                                        allowsPictureInPicture
                                    />
                                    <TouchableOpacity
                                        style={styles.removeButton}
                                        onPress={() => removeMedia(0)}
                                    >
                                        <Ionicons name="close-circle" size={24} color="#E74C3C" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.changeMediaButton}
                            onPress={() => {
                                setMediaItems([]);
                                setMediaType(null);
                                setShowMediaPicker(true);
                            }}
                        >
                            <Text style={styles.changeMediaText}>تغيير الوسائط</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={[globalStyles.buttonPrimary, styles.submitButton, isUploading && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isUploading || !title.trim()}
            >
                {isUploading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#FFFFFF" size="small" />
                        <Text style={styles.submitButtonText}>جاري النشر...</Text>
                    </View>
                ) : (
                    <Text style={styles.submitButtonText}>نشر المنشور</Text>
                )}
            </TouchableOpacity>

            <MediaPickerModal />
        </ScrollView>
    );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: {
        paddingTop: 20,
    },
    pageTitle: {
        fontSize: 25,
        // fontfamily: 'bold',
        color: theme.colors.primary,
        textAlign: 'center',
        marginBottom: 30,
        fontFamily: 'bold',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        // fontWeight: '600',
        color: theme.colors.text.primary,
        marginBottom: 8,
        textAlign: 'right',
        fontFamily: 'bold',
    },
    titleInput: {
        fontSize: 18,
        fontWeight: '500',
        borderRadius: 8,
    },
    contentInput: {
        height: 120,
        fontSize: 16,
        borderRadius: 8,
    },
    mediaContainer: {
        marginBottom: 30,
    },
    addMediaButton: {
        borderWidth: 2,
        borderColor: theme.colors.primary,
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
    },
    addMediaText: {
        fontSize: 16,
        color: theme.colors.primary,
        marginTop: 8,
        fontFamily: 'regular',
        textAlign: 'center',
    },
    mediaPreview: {
        marginBottom: 10,
    },
    imagePreviewContainer: {
        position: 'relative',
        marginRight: 10,
    },
    imagePreview: {
        width: 100,
        height: 100,
        borderRadius: 8,
        backgroundColor: theme.colors.surface,
    },
    videoPreviewContainer: {
        position: 'relative',
        width: '100%',
        alignItems: 'center',
    },
    videoPreview: {
        width: width - 32,
        height: 200,
        borderRadius: 12,
        backgroundColor: '#000',
    },
    removeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    changeMediaButton: {
        backgroundColor: theme.colors.surface,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    changeMediaText: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'regular',
    },
    submitButton: {
        marginTop: 20,
        marginBottom: 40,
        minHeight: 50,
        justifyContent: 'center',
    },
    submitButtonText: {
        fontSize: 18,
        // fontWeight: 'bold',
        color: '#FFFFFF',
        fontFamily: 'bold',
    },
    disabledButton: {
        opacity: 0.6,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text.primary,
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'bold',
    },
    mediaOption: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        marginBottom: 12,
    },
    mediaOptionText: {
        fontSize: 16,
        color: theme.colors.text.primary,
        marginLeft: 12,
        fontFamily: 'regular',
    },
    cancelButton: {
        padding: 16,
        backgroundColor: theme.colors.error,
        borderRadius: 12,
        marginTop: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        textAlign: 'center',
        fontWeight: 'bold',
        fontFamily: 'bold',
    },
});