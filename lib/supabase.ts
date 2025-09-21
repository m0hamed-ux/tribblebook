// Supabase client (Expo-friendly)
// Reads Expo public env vars: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
// Make sure to set them in app.json or via EAS Secrets.
import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import 'react-native-url-polyfill/auto'

// Important: Use Expo public env (EXPO_PUBLIC_*) or values in app.json extra
const SUPABASE_URL =
	(Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_SUPABASE_URL ||
	process.env.EXPO_PUBLIC_SUPABASE_URL ||
	''
const SUPABASE_ANON_KEY =
	(Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
	process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
	''

// Create a singleton client; guard against missing envs to avoid crashes in dev.
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
	? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
			auth: {
				// We use Clerk for app auth; we only need Supabase for realtime and simple inserts
				// If you later connect Clerk to Supabase, you can pass a token via `supabase.auth.setSession`.
				persistSession: false,
				autoRefreshToken: false,
			},
			realtime: {
				params: {
					eventsPerSecond: 5,
				},
			},
		})
	: (null as any)

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Chat features will be disabled until configured.')
}

export type SupabaseClientType = typeof supabase

