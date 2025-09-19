import { StoryViewProps, UserProps } from '@/lib/database.module'
import { timeAgo } from '@/lib/date'
import { deleteStory, getStories, getStoryViewers, viewStory } from '@/lib/db'
import { useUser } from '@clerk/clerk-expo'
import { LinearGradient } from 'expo-linear-gradient'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { VideoView, useVideoPlayer } from 'expo-video'
import { Eye, Trash } from 'phosphor-react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Dimensions, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

type StoryGroup = { author: UserProps; stories: StoryViewProps[] }

export default function StoryView() {
	const router = useRouter()
	const { index } = useLocalSearchParams<{ index?: string }>()
	const startIndex = useMemo(() => {
		const n = Number(index)
		return Number.isFinite(n) && n >= 0 ? n : 0
	}, [index])

	const { user } = useUser()
	const [groups, setGroups] = useState<StoryGroup[]>([])
	const [userIndex, setUserIndex] = useState<number>(startIndex)
	const [storyIndex, setStoryIndex] = useState<number>(0)
	const [progress, setProgress] = useState<number>(0)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const startedAtRef = useRef<number>(0)
	const pressStartRef = useRef<number>(0)
	const suppressTapRef = useRef<boolean>(false)
		const [sendingReaction, setSendingReaction] = useState<boolean>(false)
		const [viewersVisible, setViewersVisible] = useState(false)
		const [viewersData, setViewersData] = useState<import('@/lib/database.module').StoryViewersResponse | null>(null)
		const [loadingViewers, setLoadingViewers] = useState(false)

	// Derive current story & duration
	const currentGroup = groups[userIndex]
	const currentStories = currentGroup?.stories ?? []
	const currentStory = currentStories[storyIndex]
    const isOwnStory = currentGroup?.author?.username === user?.username
	const durationMs = useMemo(() => {
		if (!currentStory) return 0
		if (currentStory.media?.type === 'video') {
			const sec = currentStory.media?.durationSec
			return sec && sec > 0 ? sec * 1000 : 15000
		}
		return 15000
	}, [currentStory])

	// Load stories
	useEffect(() => {
		let mounted = true
		const load = async () => {
			if (!user?.id) return
			const res = await getStories(user.id)
			if (!mounted) return
			if (!res || res.length === 0) {
				router.back()
				return
			}
			setGroups(res)
			const safeIndex = Math.min(Math.max(0, startIndex), res.length - 1)
			setUserIndex(safeIndex)
			setStoryIndex(0)
		}
		load()
		return () => { mounted = false }
	}, [user?.id, startIndex, router])

	const clearTimer = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}
	}, [])

	const startTimer = useCallback((fromProgress: number = 0) => {
		clearTimer()
		setProgress(fromProgress)
		if (durationMs <= 0) return
		startedAtRef.current = Date.now() - Math.max(0, Math.min(1, fromProgress)) * durationMs
		intervalRef.current = setInterval(() => {
			const elapsed = Date.now() - startedAtRef.current
			const p = Math.min(1, elapsed / durationMs)
			setProgress(p)
			if (p >= 1) {
				clearTimer()
				next()
			}
		}, 50)
	}, [durationMs, clearTimer])

	useEffect(() => {
		if (currentStory) {
			startTimer(0)
		}
		return clearTimer
	}, [currentStory, startTimer, clearTimer])


		// Mark story as viewed when displayed
		useEffect(() => {
			const markViewed = async () => {
				if (!currentStory || !user?.id) return
				// Avoid duplicate calls if already viewed
				if (currentStory.isViewed) return
				try {
					const res = await viewStory(String(currentStory.id ?? ''), user.id)
					if (res && res.success) {
						// mutate local state to set isViewed
						setGroups(prev => {
							const next = [...prev]
							const g = next[userIndex]
							if (!g) return prev
							const s = g.stories[storyIndex]
							if (s) s.isViewed = true
							return next
						})
					}
				} catch {}
			}
			markViewed()
		}, [currentStory, user?.id, userIndex, storyIndex])

	// If a group has no stories, skip to next user automatically
	useEffect(() => {
		if (currentGroup && (currentStories?.length ?? 0) === 0) {
			const nextUserIdx = userIndex + 1
			if (nextUserIdx < groups.length) {
				setUserIndex(nextUserIdx)
				setStoryIndex(0)
			} else {
				router.back()
			}
		}
	}, [currentGroup, currentStories, userIndex, groups, router])

	const next = useCallback(() => {
		const group = groups[userIndex]
		if (!group) return router.back()
		const nextStoryIdx = storyIndex + 1
		if (nextStoryIdx < group.stories.length) {
			setStoryIndex(nextStoryIdx)
			return
		}
		// move to next user
		const nextUserIdx = userIndex + 1
		if (nextUserIdx < groups.length) {
			setUserIndex(nextUserIdx)
			setStoryIndex(0)
			return
		}
		router.back()
	}, [groups, storyIndex, userIndex, router])

	const prev = useCallback(() => {
		const group = groups[userIndex]
		if (!group) return router.back()
		const prevStoryIdx = storyIndex - 1
		if (prevStoryIdx >= 0) {
			setStoryIndex(prevStoryIdx)
			return
		}
		// move to previous user
		const prevUserIdx = userIndex - 1
		if (prevUserIdx >= 0) {
			const prevGroup = groups[prevUserIdx]
			setUserIndex(prevUserIdx)
			setStoryIndex(Math.max(0, (prevGroup?.stories?.length || 1) - 1))
			return
		}
		router.back()
	}, [groups, storyIndex, userIndex, router])

	// Video player (re-init when URI changes)
	const videoUri = currentStory?.media?.type === 'video' ? currentStory.media.uri : undefined
	const player = useVideoPlayer(videoUri || '', (p) => {
		if (p) {
			p.loop = false
			try { p.play() } catch {}
		}
	})

	useEffect(() => {
		return () => {
			try { player?.pause() } catch {}
		}
	}, [videoUri])

		const pause = useCallback(() => {
			clearTimer()
			try { player?.pause() } catch {}
		}, [clearTimer, player])

		const resume = useCallback(() => {
			startTimer(progress)
			try { player?.play() } catch {}
		}, [startTimer, progress, player])

	if (!currentStory) {
		return <View style={{ flex: 1, backgroundColor: '#000' }} />
	}

	// Compute canvas composition scaling to render exactly as composed
	const canvasW = currentStory.canvas?.width || SCREEN_WIDTH
	const canvasH = currentStory.canvas?.height || SCREEN_HEIGHT
	const uniformScale = Math.min(SCREEN_WIDTH / canvasW, SCREEN_HEIGHT / canvasH)
	const scaledW = canvasW * uniformScale
	const scaledH = canvasH * uniformScale

	const textShadowStyle = (shadow?: boolean) => shadow ? ({
		textShadowColor: '#000',
		textShadowOffset: { width: 0, height: 2 },
		textShadowRadius: 3,
	}) : null

	return (
		<View style={styles.container}>
			{/* Exact composition wrapper centered with letterboxing */}
			<View
				style={{
					position: 'absolute',
					width: scaledW,
					height: scaledH,
					left: (SCREEN_WIDTH - scaledW) / 2,
					top: (SCREEN_HEIGHT - scaledH) / 2,
					overflow: 'hidden',
				}}
			>
				{/* Composition in original canvas size, uniformly scaled */}
				<View style={{ width: canvasW, height: canvasH, transform: [{ scale: uniformScale }] }}>
					{/* Media with saved transform (absolute fill, then transform) */}
					<View style={[StyleSheet.absoluteFillObject, {
						transform: [
							{ translateX: currentStory.mediaTransform?.translateX ?? 0 },
							{ translateY: currentStory.mediaTransform?.translateY ?? 0 },
							{ scale: currentStory.mediaTransform?.scale ?? 1 },
							{ rotate: `${currentStory.mediaTransform?.rotation ?? 0}deg` },
						]
					}]}>
						{currentStory.media?.type === 'video' ? (
							<VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" />
						) : (
							<Image source={{ uri: currentStory.media?.uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
						)}
					</View>

					{/* Text overlays rendered as composed: origin at center (50%, 50%) with transforms */}
					{(currentStory.texts || []).map((t, idx) => (
						<View
							key={t.id || idx}
							style={{
								position: 'absolute',
								left: '50%',
								top: '50%',
								transform: [
									{ translateX: t.transform.translateX },
									{ translateY: t.transform.translateY },
									{ scale: t.transform.scale },
									{ rotate: `${t.transform.rotation}deg` },
								],
							}}
						>
							<Text
								style={{
									color: t.style.color,
									backgroundColor: t.style.backgroundColor as any,
									fontSize: t.style.fontSize,
									fontWeight: t.style.fontWeight,
									fontFamily: t.style.fontFamily,
									paddingHorizontal: t.style.backgroundColor === 'transparent' ? 0 : 6,
									paddingVertical: t.style.backgroundColor === 'transparent' ? 0 : 2,
									writingDirection: 'ltr',
									textAlign: 'left',
									...(textShadowStyle(t.style.shadow) as any),
								}}
							>
								{t.text}
							</Text>
						</View>
					))}
				</View>
			</View>

			{/* Gradient for readability */}
			<LinearGradient
				colors={['rgba(0,0,0,0.6)', 'transparent']}
				style={styles.topGradient}
			/>

			{/* Top bar: RTL progress + header */}
			<View style={styles.topOverlay}>
				{/* RTL progress bars */}
				<View style={styles.progressRow}>
					{currentStories.map((s, idx) => {
						const filled = idx < storyIndex ? 1 : idx === storyIndex ? progress : 0
						return (
							<View key={idx} style={styles.progressTrack}>
								<View style={[styles.progressFill, { width: `${filled * 100}%` }]} />
							</View>
						)
					})}
				</View>

				{/* Author info and close */}
				<View style={styles.headerRow}>
					<View style={styles.authorRow}>
						{!!currentGroup?.author?.profile && (
							<Image source={{ uri: currentGroup.author.profile }} style={styles.avatar} />
						)}
						<Text style={styles.authorName} numberOfLines={1}>
							{currentGroup?.author?.username || ''}
						</Text>
                        {!!currentStory?.createdAt && (
					    	<Text style={{ color: '#ccc', fontSize: 12 }}>
					    		{timeAgo(new Date(currentStory.createdAt))}
					    	</Text>
					    )}
					</View>
					<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
						<TouchableOpacity onPress={() => router.back()}>
							<Text style={styles.closeText}>إغلاق</Text>
									</TouchableOpacity>
								</View>
				</View>
			</View>

			{/* Tap areas: per spec, tap LEFT goes to NEXT story */}
			<View style={styles.touchOverlay} pointerEvents="box-none">
				<TouchableOpacity
					style={styles.leftTap}
					activeOpacity={0.8}
					onPress={() => {
						if (suppressTapRef.current) { suppressTapRef.current = false; return }
						next()
					}}
					onPressIn={() => { pressStartRef.current = Date.now(); pause() }}
					onPressOut={() => { suppressTapRef.current = (Date.now() - pressStartRef.current) >= 250; resume() }}
				/>
				<TouchableOpacity
					style={styles.rightTap}
					activeOpacity={0.8}
					onPress={() => {
						if (suppressTapRef.current) { suppressTapRef.current = false; return }
						prev()
					}}
					onPressIn={() => { pressStartRef.current = Date.now(); pause() }}
					onPressOut={() => { suppressTapRef.current = (Date.now() - pressStartRef.current) >= 250; resume() }}
				/>
			</View>

							{/* Bottom controls: own story => viewers + delete; others => emoji bar */}
							<View style={styles.reactionBar} pointerEvents="box-none">
								{isOwnStory ? (
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
										<TouchableOpacity
											style={styles.eyePill}
											onPress={async () => {
												if (!currentStory?.id || !user?.id) return
												setLoadingViewers(true)
												setViewersVisible(true)
												const data = await getStoryViewers(String(currentStory.id), user.id)
												// Filter out self from viewers list
												if (data && Array.isArray(data.viewers)) {
													data.viewers = data.viewers.filter(v => v.user.username !== user.username)
												}
												setViewersData(data)
												setLoadingViewers(false)
											}}
										>
											<Text style={{ color: '#fff', fontSize: 16 }}>
                                                <Eye size={24} color="#fff" weight="fill" />
                                            </Text>
										</TouchableOpacity>
										<TouchableOpacity
											style={styles.eyePill}
											onPress={() => {
												Alert.alert(
													'حذف القصة',
													'هل تريد حذف هذه القصة؟',
													[
														{ text: 'إلغاء', style: 'cancel' },
														{ text: 'حذف', style: 'destructive', onPress: async () => {
															if (!currentStory?.id || !user?.id) return
															try {
																await deleteStory(String(currentStory.id), user.id)
																// remove from local state and advance
																setViewersVisible(false)
																setGroups(prev => {
																	const next = prev.map(g => ({ ...g, stories: [...g.stories] }))
																	const g = next[userIndex]
																	if (!g) return prev
																	g.stories.splice(storyIndex, 1)
																	return next
																})

																// decide where to go next
																setTimeout(() => {
																	const g = groups[userIndex]
																	const remaining = g?.stories?.length ?? 0
																	if (remaining > storyIndex) {
																		// current indices still valid
																		return
																	}
																	if ((g?.stories?.length ?? 0) > 0) {
																		setStoryIndex(Math.max(0, (g!.stories.length - 1)))
																		return
																	}
																	// move to next user or exit
																	const nextUserIdx = userIndex + 1
																	if (nextUserIdx < groups.length) {
																		setUserIndex(nextUserIdx)
																		setStoryIndex(0)
																	} else {
																		router.back()
																	}
																}, 0)
															} catch {}
														} }
													]
												)
											}}
										>
											<Text style={{ color: '#fff', fontSize: 16 }}>
                                                <Trash size={24} color="rgba(255, 0, 0, 1)" weight="fill" />
                                            </Text>
										</TouchableOpacity>
									</View>
								) : (
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
										<View style={styles.reactionRow}>
											{['🔥','😂','😍','😮','😢','👏'].map((emo) => (
												<TouchableOpacity
													key={emo}
													activeOpacity={0.7}
													style={styles.reactionBtn}
													onPress={async () => {
														if (!currentStory || !user?.id) return
														try {
															setSendingReaction(true)
															await viewStory(String(currentStory.id ?? ''), user.id, emo)
															// optimistic: mark viewed as well
															setGroups(prev => {
																const next = [...prev]
																const g = next[userIndex]
																if (g?.stories[storyIndex]) g.stories[storyIndex].isViewed = true
																return next
															})
														} finally {
															setSendingReaction(false)
														}
													}}
												>
													<Text style={styles.reactionText}>{emo}</Text>
												</TouchableOpacity>
											))}
										</View>
									</View>
								)}
							</View>

							{/* Viewers Modal */}
							<Modal visible={viewersVisible} animationType="slide" transparent onRequestClose={() => setViewersVisible(false)}>
								<View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
									<View style={{ backgroundColor: '#111', maxHeight: SCREEN_HEIGHT * 0.7, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 12 }}>
										<View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
											<Text style={{ color: '#fff', fontSize: 16, fontFamily: 'bold' }}>المشاهدون</Text>
											<TouchableOpacity onPress={() => setViewersVisible(false)}><Text style={styles.closeText}>إغلاق</Text></TouchableOpacity>
										</View>
										{loadingViewers ? (
											<Text style={{ color: '#aaa' }}>جار التحميل...</Text>
										) : viewersData ? (
											<>
												<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
													{Object.entries(viewersData.reactionSummary || {}).map(([emo, count]) => (
														<View key={emo} style={{ backgroundColor: '#222', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
															<Text style={{ color: '#fff' }}>{emo} {count}</Text>
														</View>
													))}
												</View>
												<ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}>
													{(viewersData.viewers || []).map(v => (
														<View key={String(v.id)} style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomColor: '#222', borderBottomWidth: StyleSheet.hairlineWidth }}>
															<View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
																<Image source={{ uri: v.user.profile }} style={{ width: 36, height: 36, borderRadius: 18 }} />
																<View>
																	<Text style={{ color: '#fff' }}>{v.user.fullname || v.user.username}</Text>
																	<Text style={{ color: '#aaa', fontSize: 12 }}>{timeAgo(new Date(v.viewedAt))}</Text>
																</View>
															</View>
															{v.reaction && <Text style={{ fontSize: 18 }}>{v.reaction}</Text>}
														</View>
													))}
												</ScrollView>
											</>
										) : (
											<Text style={{ color: '#aaa' }}>لا توجد بيانات</Text>
										)}
									</View>
								</View>
							</Modal>
		</View>
	)
}

const BAR_HEIGHT = 3

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000',
	},
	media: {
		width: SCREEN_WIDTH,
		height: SCREEN_HEIGHT,
	},
	topGradient: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		height: 140,
	},
	topOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		paddingTop: 14,
		paddingHorizontal: 10,
	},
	progressRow: {
		flexDirection: 'row-reverse',
		gap: 4,
	},
	progressTrack: {
		flex: 1,
		height: BAR_HEIGHT,
		backgroundColor: 'rgba(255,255,255,0.3)',
		borderRadius: BAR_HEIGHT / 2,
		overflow: 'hidden',
		position: 'relative',
	},
	progressFill: {
		position: 'absolute',
		right: 0, // anchor to right for RTL fill
		top: 0,
		bottom: 0,
		backgroundColor: '#fff',
	},
	headerRow: {
		marginTop: 10,
		flexDirection: 'row-reverse',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	authorRow: {
		flexDirection: 'row-reverse',
		alignItems: 'center',
		gap: 8,
		flex: 1,
	},
	avatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
	},
	authorName: {
		color: '#fff',
		fontSize: 14,
		flexShrink: 1,
		textAlign: 'right',
        fontFamily: "bold"
	},
	closeText: {
		color: '#fff',
		fontSize: 14,
	},
	touchOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		flexDirection: 'row',
	},
	leftTap: {
		width: '50%',
		height: '100%',
	},
	rightTap: {
		width: '50%',
		height: '100%',
	},
		eyePill: {
			backgroundColor: 'rgba(0,0,0,0.35)',
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 999,
		},
		reactionBar: {
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 24,
			alignItems: 'center',
			justifyContent: 'center',
		},
		reactionRow: {
			flexDirection: 'row',
			backgroundColor: 'rgba(0,0,0,0.35)',
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 999,
			gap: 6,
		},
		reactionBtn: {
			paddingHorizontal: 10,
			paddingVertical: 6,
		},
		reactionText: {
			fontSize: 20,
		},
})

