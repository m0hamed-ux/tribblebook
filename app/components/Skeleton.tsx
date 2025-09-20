import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useRef } from 'react'
import { Animated, StyleProp, View, ViewStyle } from 'react-native'

type SkeletonProps = {
  width?: number
  height?: number
  radius?: number
  style?: StyleProp<ViewStyle>
}

const AnimatedLG = Animated.createAnimatedComponent(LinearGradient)

export function Skeleton({ width, height = 16, radius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    )
    loop.start()
    return () => loop.stop()
  }, [shimmer])

  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-200, 200] })

  return (
    <View
      style={[
        {
          ...(width != null ? { width } : { alignSelf: 'stretch' }),
          height,
          borderRadius: radius,
          overflow: 'hidden',
          backgroundColor: '#E9ECEF',
        },
        style,
      ]}
    >
      <AnimatedLG
        colors={['#E9ECEF', '#F5F6F7', '#E9ECEF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '60%',
          transform: [{ translateX }],
        }}
      />
    </View>
  )
}

export function SkeletonCircle({ size = 48, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} />
}

export function SkeletonLine({ width, height = 12, style }: { width?: number; height?: number; style?: StyleProp<ViewStyle> }) {
  return <Skeleton width={width} height={height} radius={6} style={style} />
}

export function SkeletonStoryRow({ count = 6 }: { count?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 10, paddingVertical: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ alignItems: 'center' }}>
          <SkeletonCircle size={62} />
          <SkeletonLine width={40} height={8} style={{ marginTop: 6 }} />
        </View>
      ))}
    </View>
  )
}

export function SkeletonPost() {
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <SkeletonCircle size={36} />
        <View style={{ flex: 1 }}>
          <SkeletonLine width={120} height={10} />
          <SkeletonLine width={80} height={8} style={{ marginTop: 6 }} />
        </View>
      </View>
      {/* Content lines */}
      <SkeletonLine height={10} style={{ marginTop: 12, width: '90%' as any }} />
      <SkeletonLine height={10} style={{ marginTop: 8, width: '70%' as any }} />
      {/* Media placeholder */}
      <Skeleton height={220} radius={12} style={{ marginTop: 12, width: '100%' as any }} />
      {/* Actions */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        <SkeletonCircle size={24} />
        <SkeletonCircle size={24} />
        <SkeletonCircle size={24} />
      </View>
    </View>
  )
}

export function SkeletonProfileHeader() {
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 10, paddingTop: 8 }}>
      <View style={{ alignSelf: 'flex-end' }}>
        <Skeleton width={24} height={24} radius={6} />
      </View>
      <SkeletonCircle size={90} />
      <SkeletonLine width={140} height={14} style={{ marginTop: 10 }} />
      <SkeletonLine width={100} height={10} style={{ marginTop: 6 }} />
      {/* Stats */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%', paddingHorizontal: 20, marginTop: 20 }}>
        <View style={{ alignItems: 'center' }}>
          <SkeletonLine width={40} height={14} />
          <SkeletonLine width={60} height={10} style={{ marginTop: 6 }} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <SkeletonLine width={40} height={14} />
          <SkeletonLine width={60} height={10} style={{ marginTop: 6 }} />
        </View>
        <View style={{ alignItems: 'center' }}>
          <SkeletonLine width={40} height={14} />
          <SkeletonLine width={60} height={10} style={{ marginTop: 6 }} />
        </View>
      </View>
      <Skeleton width={140} height={36} radius={8} style={{ marginTop: 20 }} />
      {/* Tabs */}
      <View style={{ flexDirection: 'row', width: '100%', marginTop: 24 }}>
        <SkeletonLine height={2} style={{ width: '50%' as any }} />
        <SkeletonLine height={2} style={{ width: '50%' as any }} />
      </View>
    </View>
  )
}

export default Skeleton
