import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';



export type PermissionState = 'unknown' | 'granted' | 'denied'

/**
 * Ask permissions and return Expo push token string when available.
 * Returns null when not on a physical device or permission denied.
 */
export async function registerForPushNotificationsAsync(): Promise<{ token: string | null; permission: PermissionState }> {
	// Android notification channel (required for notifications to appear)
	if (Platform.OS === 'android') {
		await Notifications.setNotificationChannelAsync('default', {
			name: 'default',
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: '#FF231F7C',
		})
	}

	if (!Device.isDevice) {
		return { token: null, permission: 'denied' }
	}

	// Permissions
	const { status: existingStatus } = await Notifications.getPermissionsAsync()
	let finalStatus = existingStatus
	if (existingStatus !== 'granted') {
		const { status } = await Notifications.requestPermissionsAsync()
		finalStatus = status
	}
	if (finalStatus !== 'granted') {
		return { token: null, permission: 'denied' }
	}

	// Get token (provide projectId to be explicit across EAS/dev)
	const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId || Constants.easConfig?.projectId
	const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
	return { token: token.data ?? null, permission: 'granted' }
}

// Prefer configurable API base; fallback to known backend URL
const API_BASE: string = ((Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_API_URL as string)
  || 'https://tribblebook-backend.onrender.com'

/**
 * Persist the device's Expo push token to backend.
 * Backend expects Authorization: Bearer <userId> and JSON body { token }.
 */
export async function savePushTokenToBackend(token: string, userId: string): Promise<boolean> {
	// Simple single-attempt save. Use savePushTokenWithRetry for retrying logic.
	try {
		const res = await fetch(`${API_BASE}/user/save-token`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${userId}`,
			},
			body: JSON.stringify({ token }),
		})
		return res.ok
	} catch (e) {
		console.log('save push token error:', e)
		return false
	}
}

/**
 * Retry helper with exponential backoff. Attempts the provided fn up to `attempts` times.
 */
async function retry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 500): Promise<T> {
	let lastErr: any
	for (let i = 0; i < attempts; i++) {
		try {
			return await fn()
		} catch (e) {
			lastErr = e
			const delay = baseDelayMs * Math.pow(2, i)
			await new Promise((res) => setTimeout(res, delay))
		}
	}
	throw lastErr
}

/**
 * Attempts to save the token with retries. Returns true if saved.
 */
export async function savePushTokenWithRetry(token: string, userId: string, attempts = 3): Promise<boolean> {
	try {
		return await retry(async () => {
			const ok = await savePushTokenToBackend(token, userId)
			if (!ok) throw new Error('save failed')
			return true
		}, attempts)
	} catch (e) {
		console.log('savePushTokenWithRetry ultimately failed:', e)
		return false
	}
}

/**
 * Send a push notification when a user sends a message.
 * Body: { userId, senderFullname, message }
 */
export async function sendMessageNotification(params: { userId: string; senderFullname: string; message: string }): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/messages/send-notification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    return res.ok
  } catch (e) {
    console.log('sendMessageNotification error:', e)
    return false
  }
}

/**
 * Hook that registers for push notifications and saves the token when a user is available.
 */
export function useRegisterPushToken(userId?: string | null) {
	const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
	const [permission, setPermission] = useState<PermissionState>('unknown')
	const [saved, setSaved] = useState<boolean>(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		let intervalId: any = null
		async function run() {
			if (!userId) return
			try {
				const { token, permission } = await registerForPushNotificationsAsync()
				if (cancelled) return
				setPermission(permission)
				setExpoPushToken(token)
				if (token) {
					// Try saving with immediate retries
					const ok = await savePushTokenWithRetry(token, userId, 3)
					if (cancelled) return
					setSaved(ok)
					if (!ok) {
						setError('Failed to save push token to backend (will retry in background)')
						// kick off background retries every 30s until saved or unmounted
						intervalId = setInterval(async () => {
							try {
								const ok2 = await savePushTokenWithRetry(token, userId, 2)
								if (ok2) {
									setSaved(true)
									setError(null)
									if (intervalId) {
										clearInterval(intervalId)
										intervalId = null
									}
								}
							} catch (e) {
								console.log('Background token save retry failed:', e)
							}
						}, 30000)
					}
				}
			} catch (e: any) {
				if (!cancelled) setError(String(e?.message ?? e))
			}
		}
		run()
		return () => {
			cancelled = true
			if (intervalId) clearInterval(intervalId)
		}
	}, [userId])

	return { expoPushToken, permission, saved, error }
}


