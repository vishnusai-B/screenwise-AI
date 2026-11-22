import { Platform } from 'react-native';

/**
 * Determine default backend API URL based on platform.
 * Android emulator uses 10.0.2.2 to reach host machine localhost.
 * Web or iOS uses localhost.
 */
const getDefaultApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000';
  }

  return 'http://localhost:5000';
};

export const APP_CONFIG = {
  appName: 'ScreenWise AI',
  tagline: 'Understand Any Screen, Instantly.',
  version: '1.0.0',
  apiUrl: getDefaultApiUrl(),
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  supportedLanguages: [
    { code: 'en', label: 'English', nativeLabel: 'English', speechCode: 'en-US' },
    { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు', speechCode: 'te-IN' },
    { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', speechCode: 'hi-IN' },
    { code: 'ta', label: 'Tamil', nativeLabel: 'தமிழ்', speechCode: 'ta-IN' },
    { code: 'kn', label: 'Kannada', nativeLabel: 'ಕನ್ನಡ', speechCode: 'kn-IN' },
    { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം', speechCode: 'ml-IN' },
    { code: 'bn', label: 'Bengali', nativeLabel: 'বাংলা', speechCode: 'bn-IN' },
    { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी', speechCode: 'mr-IN' },
  ] as const,
  explanationModes: [
    {
      id: 'normal',
      name: 'Normal Mode',
      description: 'Clear and detailed professional explanation.',
    },
    {
      id: 'simple',
      name: 'Simple Mode',
      description: 'Easy words and short sentences.',
    },
    {
      id: 'eli10',
      name: "Explain Like I'm 10",
      description: 'Very simple breakdown with friendly relatable examples.',
    },
  ] as const,
};

