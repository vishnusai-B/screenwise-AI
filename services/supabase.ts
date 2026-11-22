import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { APP_CONFIG } from '../constants/config';

const ANON_USER_ID_STORAGE_KEY = 'screenwise_anon_user_id';

// Custom secure storage adapter for Expo
export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Ignore secure store errors in restricted environments
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Ignore secure store errors in restricted environments
    }
  },
};

/**
 * Generates a RFC4122 v4 UUID for anonymous user/record identification
 */
export function generateUuidV4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validates that mobile Supabase configuration uses a real HTTPS project URL
 * and a public anon/publishable key (never a secret/service-role key).
 */
export function isSupabaseConfigured(): boolean {
  const url = (APP_CONFIG.supabaseUrl || '').trim();
  const key = (APP_CONFIG.supabaseAnonKey || '').trim();

  if (!url || !key) return false;
  if (!url.startsWith('https://') || !url.includes('.supabase.co')) return false;
  if (
    url.includes('placeholder-project.supabase.co') ||
    url.includes('your-project.supabase.co')
  ) {
    return false;
  }
  if (
    key === 'placeholder-anon-key' ||
    key === 'your_supabase_anon_key_here' ||
    key.startsWith('sb_secret_') ||
    key.includes('service_role')
  ) {
    return false;
  }

  return true;
}

const supabaseUrl = isSupabaseConfigured()
  ? APP_CONFIG.supabaseUrl.trim()
  : 'https://placeholder-project.supabase.co';
const supabaseAnonKey = isSupabaseConfigured()
  ? APP_CONFIG.supabaseAnonKey.trim()
  : 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Returns the authenticated Supabase anonymous user ID when Supabase is configured,
 * or a persistent device-scoped anonymous UUID stored in SecureStore.
 */
export async function getOrCreateAnonymousUserId(): Promise<string> {
  if (isSupabaseConfigured()) {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        return sessionData.session.user.id;
      }
      const { data: anonData, error } = await supabase.auth.signInAnonymously();
      if (!error && anonData?.user?.id) {
        return anonData.user.id;
      }
    } catch {
      // Fallback to local persistent anonymous UUID if network/auth unavailable
    }
  }

  const existingId = await ExpoSecureStoreAdapter.getItem(ANON_USER_ID_STORAGE_KEY);
  if (existingId && existingId.length > 0) {
    return existingId;
  }

  const newAnonId = generateUuidV4();
  await ExpoSecureStoreAdapter.setItem(ANON_USER_ID_STORAGE_KEY, newAnonId);
  return newAnonId;
}

