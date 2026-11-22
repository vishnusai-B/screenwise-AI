export type SupportedLanguageCode =
  | 'en'
  | 'te'
  | 'hi'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'bn'
  | 'mr';

export interface LanguageDefinition {
  code: SupportedLanguageCode;
  name: string;
  nativeName: string;
  bcp47: string;
}

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { code: 'en', name: 'English', nativeName: 'English', bcp47: 'en-US' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', bcp47: 'te-IN' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', bcp47: 'hi-IN' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', bcp47: 'ta-IN' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', bcp47: 'kn-IN' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', bcp47: 'ml-IN' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', bcp47: 'bn-IN' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', bcp47: 'mr-IN' },
];

export const LANGUAGE_CODE_MAP = new Map<string, LanguageDefinition>(
  SUPPORTED_LANGUAGES.map((l) => [l.code, l])
);

export function isValidLanguageCode(code: string): code is SupportedLanguageCode {
  return LANGUAGE_CODE_MAP.has(code);
}

export function getLanguageDefinition(code: string): LanguageDefinition {
  return LANGUAGE_CODE_MAP.get(code) || SUPPORTED_LANGUAGES[0];
}

