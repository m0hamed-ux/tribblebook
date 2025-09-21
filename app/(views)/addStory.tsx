import { createStory } from '@/lib/db';
import { useAuth, useUser } from '@clerk/clerk-expo';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { VideoView, useVideoPlayer } from 'expo-video';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type MediaType = 'image' | 'video';

type Transform = {
	translateX: number;
	translateY: number;
	scale: number;
	rotation: number; // in degrees
};

type TextStyleConfig = {
	color: string;
	backgroundColor: string | 'transparent';
	shadow: boolean;
	fontSize: number;
	fontWeight: 'normal' | 'bold';
	fontFamily?: string; // optional, platform dependent
};

type StoryTextOverlay = {
	id: string;
	text: string;
	transform: Transform;
	style: TextStyleConfig;
	// UI bookkeeping
	anchorX?: number;
	anchorY?: number;
};

type PickedMedia = {
	uri: string;
	type: MediaType;
	durationSec?: number;
};

type Story = {
	id: string;
	createdAt: string; // ISO
	canvas: { width: number; height: number };
	media: PickedMedia;
	mediaTransform: Transform;
	texts: StoryTextOverlay[];
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// Cloudinary configuration (same pattern as addPost.tsx)
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtspfuyuf/';
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || 'tribble_preset';

const uploadToCloudinarySimple = async (uri: string, type: MediaType): Promise<string | null> => {
	try {
		const formData = new FormData();
		formData.append('file', {
			uri,
			type: type === 'image' ? 'image/jpeg' : 'video/mp4',
			name: `${type}_${Date.now()}.${type === 'image' ? 'jpg' : 'mp4'}`,
		} as any);
		const endpoint = type === 'image' ? 'image/upload' : 'video/upload';
		const response = await fetch(`${CLOUDINARY_URL}${endpoint}`, {
			method: 'POST',
			body: formData,
		});
		const data = await response.json();
		if (response.ok && data.secure_url) return data.secure_url as string;
		console.error('Simple Cloudinary upload failed:', data);
		return null;
	} catch (error) {
		console.error('Simple Cloudinary upload error:', error);
		return null;
	}
};

async function uploadToCloudinary(uri: string, type: MediaType): Promise<string | null> {
	try {
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
		if (response.ok && data.secure_url) return data.secure_url as string;
		// fallback to simple upload
		return await uploadToCloudinarySimple(uri, type);
	} catch (error) {
		console.error('Cloudinary upload error:', error);
		Alert.alert('خطأ', 'حدث خطأ أثناء رفع الوسائط');
		return null;
	}
}

const DEFAULT_TEXT_STYLE: TextStyleConfig = {
	color: '#ffffff',
	backgroundColor: 'transparent',
	shadow: true,
	fontSize: 24,
	fontWeight: 'bold',
};

function useCompositeGesture(
	initial: Transform,
	onChange?: (t: Transform) => void,
	onEnd?: (t: Transform) => void,
) {
	const translateX = useSharedValue(initial.translateX);
	const translateY = useSharedValue(initial.translateY);
	const scale = useSharedValue(initial.scale);
	const rotation = useSharedValue(initial.rotation);

	const start = useRef({ x: 0, y: 0, scale: 1, rotation: 0 });

	const pan = Gesture.Pan()
		.onStart(() => {
			start.current.x = translateX.value;
			start.current.y = translateY.value;
		})
		.onUpdate((e) => {
			translateX.value = start.current.x + e.translationX;
			translateY.value = start.current.y + e.translationY;
			onChange && runOnJS(onChange)({
				translateX: translateX.value,
				translateY: translateY.value,
				scale: scale.value,
				rotation: rotation.value,
			});
		})
		.onEnd(() => {
			onEnd && runOnJS(onEnd)({
				translateX: translateX.value,
				translateY: translateY.value,
				scale: scale.value,
				rotation: rotation.value,
			});
		});

	const pinch = Gesture.Pinch()
		.onStart(() => {
			start.current.scale = scale.value;
		})
		.onUpdate((e) => {
			const next = Math.max(0.3, Math.min(8, start.current.scale * e.scale));
			scale.value = next;
			onChange && runOnJS(onChange)({
				translateX: translateX.value,
				translateY: translateY.value,
				scale: next,
				rotation: rotation.value,
			});
		})
		.onEnd(() => {
			onEnd && runOnJS(onEnd)({
				translateX: translateX.value,
				translateY: translateY.value,
				scale: scale.value,
				rotation: rotation.value,
			});
		});

	const rotate = Gesture.Rotation()
		.onStart(() => {
			start.current.rotation = rotation.value;
		})
		.onUpdate((e) => {
			const nextDeg = start.current.rotation + (e.rotation * 180) / Math.PI;
			rotation.value = nextDeg;
			onChange && runOnJS(onChange)({
				translateX: translateX.value,
				translateY: translateY.value,
				scale: scale.value,
				rotation: nextDeg,
			});
		})
		.onEnd(() => {
			onEnd && runOnJS(onEnd)({
				translateX: translateX.value,
				translateY: translateY.value,
				scale: scale.value,
				rotation: rotation.value,
			});
		});

	const composed = Gesture.Simultaneous(pan, pinch, rotate);

	const style = useAnimatedStyle(() => ({
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value },
			{ scale: scale.value },
			{ rotate: `${rotation.value}deg` },
		],
	}));

	const api = {
		set: (t: Transform) => {
			translateX.value = withTiming(t.translateX);
			translateY.value = withTiming(t.translateY);
			scale.value = withTiming(t.scale);
			rotation.value = withTiming(t.rotation);
		},
		get: (): Transform => ({
			translateX: translateX.value,
			translateY: translateY.value,
			scale: scale.value,
			rotation: rotation.value,
		}),
	};

	return { gesture: composed, animatedStyle: style, api } as const;
}

function ColorSwatch({ color, selected, onPress }: { color: string; selected?: boolean; onPress: () => void }) {
	return (
		<Pressable onPress={onPress} style={[styles.colorSwatch, { backgroundColor: color }, selected && styles.colorSwatchSelected]} />
	);
}

export default function AddStoryScreen() {
	const router = useRouter();
	const { isSignedIn } = useAuth();
	const { user } = useUser();
	const [picked, setPicked] = useState<PickedMedia | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [canvasSize, setCanvasSize] = useState({ width: SCREEN_W, height: SCREEN_H * 0.75 });

	const [mediaTransform, setMediaTransform] = useState<Transform>({ translateX: 0, translateY: 0, scale: 1, rotation: 0 });
	const mediaComposite = useCompositeGesture(mediaTransform, setMediaTransform, setMediaTransform);

	const [texts, setTexts] = useState<StoryTextOverlay[]>([]);
	const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
	const selectedText = useMemo(() => texts.find((t) => t.id === selectedTextId), [texts, selectedTextId]);

		const [editModalVisible, setEditModalVisible] = useState(false);
	const presetTextColors = ['#ffffff', '#000000', '#FF4D4D', '#FFD166', '#06D6A0', '#118AB2', '#8338EC'];
	const presetBgColors = ['transparent', '#000000AA', '#FFFFFFAA', '#FF4D4DAA', '#118AB2AA', '#06D6A0AA'];

	const onPick = useCallback(async (type: MediaType) => {
		const baseOpts: ImagePicker.ImagePickerOptions = {
			mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
			allowsMultipleSelection: false,
			quality: 1,
			videoMaxDuration: 30,
			allowsEditing: false,
		};
		const result = await ImagePicker.launchImageLibraryAsync(baseOpts);
		if (result.canceled) return;
		const asset = result.assets?.[0];
		if (!asset) return;

	let durationRaw = (asset as any).duration as number | undefined;
	let durationSec = typeof durationRaw === 'number' ? (durationRaw > 1000 ? durationRaw / 1000 : durationRaw) : undefined;
	// Coerce to integer seconds for backend (avoids e.g., "17.261")
	const durationInt = typeof durationSec === 'number' ? Math.round(durationSec) : undefined;

		if (type === 'video') {
			if (typeof durationSec === 'number' && durationSec > 30) {
				Alert.alert('الفيديو طويل', 'يرجى اختيار فيديو أقل من 30 ثانية.');
				return;
			}
		}

	setPicked({ uri: asset.uri, type, durationSec: durationInt });
	}, []);

	const onAddText = useCallback(() => {
		const id = `t_${Date.now()}`;
		const newOverlay: StoryTextOverlay = {
			id,
			text: 'اكتب هنا',
			transform: { translateX: 0, translateY: 0, scale: 1, rotation: 0 },
			style: { ...DEFAULT_TEXT_STYLE },
		};
		setTexts((prev) => [...prev, newOverlay]);
		setSelectedTextId(id);
	}, []);

	const onShare = useCallback(async () => {
		if (!picked) return;
		if (!isSignedIn || !user?.id) { Alert.alert('تسجيل الدخول', 'يرجى تسجيل الدخول أولاً.'); return; }

		setIsUploading(true);
		try {
			// 1) Upload media to get a public URL
			const uploadedUrl = await uploadToCloudinary(picked.uri, picked.type);
			if (!uploadedUrl) { Alert.alert('خطأ', 'فشل في رفع الوسائط'); return; }

			// 2) Build payload with public URL
			const story = {
				createdAt: new Date().toISOString(),
				canvas: canvasSize,
				media: {
					...picked,
					uri: uploadedUrl,
					...(picked.type === 'video'
						? { durationSec: typeof picked.durationSec === 'number' ? Math.round(Number(picked.durationSec)) : undefined }
						: {}),
				},
				mediaTransform,
				texts: texts.map(t => ({
					id: t.id,
					text: t.text,
					transform: t.transform,
					style: {
						color: t.style.color,
						backgroundColor: t.style.backgroundColor,
						shadow: t.style.shadow,
						fontSize: t.style.fontSize,
						fontWeight: t.style.fontWeight,
						fontFamily: t.style.fontFamily,
					}
				}))
			} as const;

			const res = await createStory(story as any, user.id)
			if (res && res.success) {
				Alert.alert('تم', 'تم نشر القصة بنجاح.', [{ text: 'حسناً', onPress: () => router.back() }])
			} else {
				Alert.alert('فشل', 'تعذر نشر القصة. حاول مرة أخرى لاحقاً.')
			}
		} catch (e: any) {
			console.log('share story error', e)
			Alert.alert('خطأ', 'حدث خطأ غير متوقع.')
		} finally {
			setIsUploading(false);
		}
	}, [picked, isSignedIn, user, canvasSize, mediaTransform, texts, router]);

	const resetAll = useCallback(() => {
		setPicked(null);
		setTexts([]);
		setSelectedTextId(null);
		setMediaTransform({ translateX: 0, translateY: 0, scale: 1, rotation: 0 });
		mediaComposite.api.set({ translateX: 0, translateY: 0, scale: 1, rotation: 0 });
	}, [mediaComposite.api]);

	// Prepare a video player when media is a video
	const videoSource = picked?.type === 'video' ? { uri: picked.uri } : undefined;
	const player = useVideoPlayer(videoSource as any, (p) => {
		if (videoSource) {
			p.loop = true;
			p.play();
			p.muted = false;
		}
	});

	return (
		<GestureHandlerRootView style={{ flex: 1, backgroundColor: 'black' }}>
			<SafeAreaView style={{ flex: 1, backgroundColor: 'black' }}>
				{/* Top bar */}
				<View style={styles.topBar}>
					<Pressable onPress={() => (picked ? resetAll() : router.back())} style={styles.iconBtn}>
						<Ionicons name="arrow-back" size={24} color="#fff" />
					</Pressable>
					<Text style={styles.title}>{picked ? 'تعديل القصة' : 'إنشاء قصة'}</Text>
					<View style={{ flexDirection: 'row', gap: 12 }}>
						{picked && (
							<Pressable onPress={onAddText} style={styles.iconBtn}>
								<Ionicons name="text" size={22} color="#fff" />
							</Pressable>
						)}
					</View>
				</View>

				{/* Content */}
				{!picked ? (
					<View style={styles.pickerContainer}>
						<Text style={styles.helperText}>اختر صورة أو فيديو أقل من 30 ثانية</Text>
						<View style={styles.pickerButtonsRow}>
							<Pressable style={[styles.pickerBtn, { backgroundColor: '#333' }]} onPress={() => onPick('image')}>
								<Ionicons name="image" size={22} color="#fff" />
								<Text style={styles.btnLabel}>صورة</Text>
							</Pressable>
							<Pressable style={[styles.pickerBtn, { backgroundColor: '#333' }]} onPress={() => onPick('video')}>
								<Ionicons name="videocam" size={22} color="#fff" />
								<Text style={styles.btnLabel}>فيديو</Text>
							</Pressable>
						</View>
						<View style={[styles.pickerButtonsRow, { marginTop: 10 }]}>
							<Pressable style={[styles.pickerBtn, { backgroundColor: '#444' }]} onPress={async () => {
								const { status } = await ImagePicker.requestCameraPermissionsAsync();
								if (status !== 'granted') { Alert.alert('صلاحية مطلوبة', 'يلزم منح صلاحية الكاميرا.'); return; }
								const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
								if (!res.canceled && res.assets?.[0]) setPicked({ uri: res.assets[0].uri, type: 'image' });
							}}>
								<Ionicons name="camera" size={22} color="#fff" />
								<Text style={styles.btnLabel}>تصوير صورة</Text>
							</Pressable>
							<Pressable style={[styles.pickerBtn, { backgroundColor: '#444' }]} onPress={async () => {
								const { status } = await ImagePicker.requestCameraPermissionsAsync();
								if (status !== 'granted') { Alert.alert('صلاحية مطلوبة', 'يلزم منح صلاحية الكاميرا.'); return; }
								const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 1, videoMaxDuration: 30, allowsEditing: false });
								if (!res.canceled && res.assets?.[0]) {
									const d = (res.assets[0] as any).duration as number | undefined;
									const ds = typeof d === 'number' ? (d > 1000 ? d / 1000 : d) : undefined;
									if (typeof ds === 'number' && ds > 30) { Alert.alert('الفيديو طويل', 'يرجى تصوير فيديو أقل من 30 ثانية.'); return; }
									// Ensure integer seconds to satisfy backend integer type
									setPicked({ uri: res.assets[0].uri, type: 'video', durationSec: typeof ds === 'number' ? Math.round(ds) : undefined });
								}
							}}>
								<Ionicons name="videocam-outline" size={22} color="#fff" />
								<Text style={styles.btnLabel}>تصوير فيديو</Text>
							</Pressable>
						</View>
					</View>
				) : (
					<View style={{ flex: 1 }}>
						<View
							style={styles.canvas}
							onLayout={(e) => setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
						>
							{/* Media with gestures */}
							<GestureDetector gesture={mediaComposite.gesture}>
								<Animated.View style={[StyleSheet.absoluteFill, mediaComposite.animatedStyle]}>
									{picked.type === 'image' ? (
										<Image source={{ uri: picked.uri }} style={styles.media} contentFit="contain" />
									) : (
										<VideoView
											// disable controls
											style={styles.media}
											player={player}
											nativeControls={false}
										/>
									)}
								</Animated.View>
							</GestureDetector>

							{/* Text overlays */}
							{texts.map((t) => (
								<TextSticker
									key={t.id}
									overlay={t}
									selected={t.id === selectedTextId}
									onSelect={() => setSelectedTextId(t.id)}
									onChange={(updated) =>
										setTexts((prev) => prev.map((x) => (x.id === t.id ? { ...updated } : x)))
									}
									onDelete={() => setTexts((prev) => prev.filter((x) => x.id !== t.id))}
									onRequestEdit={(anchor) => {
										setTexts((prev) => prev.map((x) => (x.id === t.id ? { ...x, anchorX: anchor.x, anchorY: anchor.y } : x)));
															setSelectedTextId(t.id);
										setEditModalVisible(true);
									}}
								/>
							))}
							{isUploading && (
								<View style={styles.loadingOverlay} pointerEvents="none">
									<ActivityIndicator size="large" color="#1D9BF0" />
									<Text style={styles.loadingText}>جارٍ النشر...</Text>
								</View>
							)}
						</View>

						{/* Bottom bar */}
						<View style={styles.bottomBar}>
							<Pressable style={[styles.shareBtn, isUploading && styles.shareBtnDisabled]} onPress={onShare} disabled={isUploading}>
								{isUploading ? (
									<ActivityIndicator size="small" color="#000" />
								) : (
									<>
										<Ionicons name="send" size={18} color="#000" />
										<Text style={[styles.shareLabel]}>مشاركة</Text>
									</>
								)}
							</Pressable>
						</View>
					</View>
				)}

				{/* Edit Text Modal */}
				<Modal visible={editModalVisible} animationType="slide" transparent onRequestClose={() => setEditModalVisible(false)}>
					<View style={styles.modalBackdrop}>
						<View style={styles.modalSheet}>
							<View style={styles.modalHeader}>
								<Text style={styles.modalTitle}>تعديل النص</Text>
								<Pressable onPress={() => setEditModalVisible(false)} style={styles.iconBtn}>
									<Ionicons name="close" size={22} color="#fff" />
								</Pressable>
							</View>
							{selectedText && (
								<View style={{ gap: 14 }}>
									<Text style={styles.sectionLabel}>النص</Text>
									<TextInput
										value={selectedText.text}
										onChangeText={(val) =>
											setTexts((prev) => prev.map((x) => (x.id === selectedText.id ? { ...x, text: val } : x)))
										}
										placeholder="اكتب هنا"
										placeholderTextColor="#aaa"
										style={[styles.textInput, { writingDirection: 'ltr', textAlign: 'left' }]}
									/>

									<Text style={styles.sectionLabel}>حجم الخط</Text>
									<View style={styles.rowCenter}>
										<Pressable
											style={styles.smallCtlBtn}
											onPress={() =>
												setTexts((prev) =>
													prev.map((x) =>
														x.id === selectedText.id
															? { ...x, style: { ...x.style, fontSize: Math.max(10, x.style.fontSize - 2) } }
															: x,
													),
												)
											}
										>
											<Ionicons name="remove" size={18} color="#fff" />
										</Pressable>
										<Text style={{ color: '#fff', marginHorizontal: 12 }}>{selectedText.style.fontSize}</Text>
										<Pressable
											style={styles.smallCtlBtn}
											onPress={() =>
												setTexts((prev) =>
													prev.map((x) =>
														x.id === selectedText.id
															? { ...x, style: { ...x.style, fontSize: Math.min(120, x.style.fontSize + 2) } }
															: x,
													),
												)
											}
										>
											<Ionicons name="add" size={18} color="#fff" />
										</Pressable>
									</View>

									<Text style={styles.sectionLabel}>السمك</Text>
									<View style={styles.rowCenter}>
										<Pressable
											onPress={() =>
												setTexts((prev) =>
													prev.map((x) =>
														x.id === selectedText.id ? { ...x, style: { ...x.style, fontWeight: 'normal' } } : x,
													),
												)
											}
											style={[styles.toggleBtn, selectedText.style.fontWeight === 'normal' && styles.toggleBtnActive]}
										>
											<Text style={styles.toggleBtnText}>عادي</Text>
										</Pressable>
										<Pressable
											onPress={() =>
												setTexts((prev) =>
													prev.map((x) =>
														x.id === selectedText.id ? { ...x, style: { ...x.style, fontWeight: 'bold' } } : x,
													),
												)
											}
											style={[styles.toggleBtn, selectedText.style.fontWeight === 'bold' && styles.toggleBtnActive]}
										>
											<Text style={styles.toggleBtnText}>عريض</Text>
										</Pressable>
									</View>

									<Text style={styles.sectionLabel}>لون النص</Text>
									<View style={styles.colorsRow}>
										{presetTextColors.map((c) => (
											<ColorSwatch
												key={c}
												color={c}
												selected={selectedText.style.color === c}
												onPress={() =>
													setTexts((prev) =>
														prev.map((x) => (x.id === selectedText.id ? { ...x, style: { ...x.style, color: c } } : x)),
													)
												}
											/>
										))}
									</View>

									<Text style={styles.sectionLabel}>الخلفية</Text>
									<View style={styles.colorsRow}>
										{presetBgColors.map((c) => (
											<ColorSwatch
												key={c}
												color={c === 'transparent' ? '#222' : c}
												selected={selectedText.style.backgroundColor === c}
												onPress={() =>
													setTexts((prev) =>
														prev.map((x) =>
															x.id === selectedText.id ? { ...x, style: { ...x.style, backgroundColor: c as any } } : x,
														),
													)
												}
											/>
										))}
									</View>

									<Text style={styles.sectionLabel}>الظل</Text>
									<View style={styles.rowCenter}>
										<Pressable
											onPress={() =>
												setTexts((prev) =>
													prev.map((x) =>
														x.id === selectedText.id ? { ...x, style: { ...x.style, shadow: !x.style.shadow } } : x,
													),
												)
											}
											style={[styles.toggleBtn, selectedText.style.shadow && styles.toggleBtnActive]}
										>
											<Text style={styles.toggleBtnText}>{selectedText.style.shadow ? 'مفعل' : 'معطل'}</Text>
										</Pressable>
									</View>

									<View style={[styles.rowSpace, { marginTop: 6 }]}>
										<Pressable
											style={[styles.deleteBtn]}
											onPress={() => {
												setTexts((prev) => prev.filter((x) => x.id !== selectedText.id));
												setEditModalVisible(false);
												setSelectedTextId(null);
											}}
										>
											<Ionicons name="trash" size={16} color="#fff" />
											<Text style={styles.deleteLabel}>حذف</Text>
										</Pressable>
										<Pressable style={[styles.doneBtn]} onPress={() => setEditModalVisible(false)}>
											<Ionicons name="checkmark" size={18} color="#000" />
											<Text style={styles.doneLabel}>تم</Text>
										</Pressable>
									</View>
								</View>
							)}
						</View>
					</View>
				</Modal>
			</SafeAreaView>
		</GestureHandlerRootView>
	);
}

function TextSticker({
	overlay,
	selected,
	onSelect,
	onChange,
	onDelete,
	onRequestEdit,
}: {
	overlay: StoryTextOverlay;
	selected: boolean;
	onSelect: () => void;
	onChange: (o: StoryTextOverlay) => void;
	onDelete: () => void;
	onRequestEdit: (anchor: { x: number; y: number }) => void;
}) {
	const composite = useCompositeGesture(
		overlay.transform,
		(t) => onChange({ ...overlay, transform: t }),
		(t) => onChange({ ...overlay, transform: t }),
	);

	const tap = Gesture.Tap().onEnd((_e) => {
		// Use runOnJS to safely call React state updates from a gesture worklet (required especially on Android)
		runOnJS(onSelect)();
		runOnJS(onRequestEdit)({ x: 0, y: 0 });
	});

	const textShadowStyle = overlay.style.shadow
		? {
				textShadowColor: '#000',
				textShadowOffset: { width: 0, height: 2 },
				textShadowRadius: 3,
			}
		: null;

	return (
		<GestureDetector gesture={Gesture.Simultaneous(composite.gesture, tap)}>
			<Animated.View
				style={[
					styles.stickerContainer,
					composite.animatedStyle,
					selected ? { borderColor: '#fff', borderWidth: 1 } : null,
				]}
			>
				<Text
					style={[
						{
							color: overlay.style.color,
							backgroundColor: overlay.style.backgroundColor,
							fontSize: overlay.style.fontSize,
							fontFamily: overlay.style.fontWeight === 'bold' ? "bold" : "regular",
							paddingHorizontal: overlay.style.backgroundColor === 'transparent' ? 0 : 6,
							paddingVertical: overlay.style.backgroundColor === 'transparent' ? 0 : 2,
							writingDirection: 'ltr',
							textAlign: 'left',
						},
						textShadowStyle as any,
					]}
				>
					{overlay.text}
				</Text>

				{selected && (
					<View style={styles.floatingBox}>
						<Pressable style={styles.floatBtn} onPress={() => onRequestEdit({ x: 0, y: 0 })}>
							<Ionicons name="create" size={14} color="#000" />
							<Text style={styles.floatBtnLabel}>تعديل</Text>
						</Pressable>
						<Pressable style={[styles.floatBtn, { backgroundColor: '#bb2d3b' }]} onPress={onDelete}>
							<Ionicons name="trash" size={14} color="#fff" />
						</Pressable>
					</View>
				)}
			</Animated.View>
		</GestureDetector>
	);
}

const styles = StyleSheet.create({
	topBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingVertical: 8,
		backgroundColor: 'black',
	},
	title: { color: '#fff', fontSize: 16, fontWeight: '600', fontFamily: 'bold' },
	iconBtn: {
		padding: 8,
		borderRadius: 999,
		backgroundColor: 'rgba(255,255,255,0.08)',
	},
	pickerContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 18,
	},
	helperText: { color: '#bbb', fontSize: 14, fontFamily: 'regular' },
	pickerButtonsRow: { flexDirection: 'row', gap: 16 },
	pickerBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
	},
	btnLabel: { color: '#fff', fontSize: 14, fontFamily: 'bold' },
	canvas: {
		flex: 1,
		backgroundColor: '#000',
		overflow: 'hidden',
	},
	media: {
		width: '100%',
		height: '100%',
	},
	loadingOverlay: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	loadingText: { color: '#e5e5e5', marginTop: 8, fontFamily: 'regular' },
	bottomBar: {
		padding: 12,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: '#222',
		backgroundColor: '#000',
	},
	shareBtn: {
		backgroundColor: '#1D9BF0',
		paddingVertical: 12,
		borderRadius: 999,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: 8,
		fontFamily: 'bold'
	},
	shareBtnDisabled: { opacity: 0.7 },
	shareLabel: { color: '#000', fontSize: 16, fontFamily: 'bold' },
	textInput: {
		backgroundColor: '#1a1a1a',
		color: '#fff',
		borderRadius: 10,
		paddingHorizontal: 12,
		paddingVertical: Platform.select({ ios: 12, default: 8 }),
		borderWidth: 1,
		borderColor: '#333',
		fontFamily: 'regular'
	},
	rowCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
	rowSpace: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	smallCtlBtn: {
		padding: 8,
		backgroundColor: '#333',
		borderRadius: 999,
	},
	toggleBtn: {
		paddingVertical: 8,
		paddingHorizontal: 12,
		backgroundColor: '#222',
		borderRadius: 999,
		marginHorizontal: 6,
	},
	toggleBtnActive: { backgroundColor: '#1D9BF0' },
	toggleBtnText: { color: '#fff', fontWeight: '600' },
	colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
	colorSwatch: {
		width: 28,
		height: 28,
		borderRadius: 14,
		borderWidth: 2,
		borderColor: '#000',
	},
	colorSwatchSelected: { borderColor: '#b7b7b7ff', borderWidth: 2 },
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'flex-end',
	},
	modalSheet: {
		backgroundColor: '#111',
		padding: 16,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		gap: 10,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		fontFamily: 'regular'
	},
	modalTitle: { color: '#fff', fontSize: 16, fontFamily: 'bold' },
	sectionLabel: { color: '#aaa', fontSize: 12, fontFamily: 'regular'},
	stickerContainer: {
		position: 'absolute',
		left: '50%',
		top: '50%',
	},
	floatingBox: {
		position: 'absolute',
		top: -36,
		left: -6,
		flexDirection: 'row',
		gap: 6,
		backgroundColor: '#fff',
		paddingHorizontal: 6,
		paddingVertical: 4,
		borderRadius: 999,
	},
	floatBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: '#ffe066',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
	},
	floatBtnLabel: { color: '#000', fontFamily: 'regular', fontSize: 12 },
	deleteBtn: {
		backgroundColor: '#333',
		paddingVertical: 10,
		paddingHorizontal: 14,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	deleteLabel: { color: '#fff', fontFamily: 'regular' },
	doneBtn: {
		backgroundColor: '#1D9BF0',
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,

	},
	doneLabel: { color: '#000', fontFamily: 'regular' },
});

