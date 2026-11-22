export type ExplanationMode = 'normal' | 'simple' | 'eli10';

export type LanguageCode =
  | 'en'
  | 'te'
  | 'hi'
  | 'ta'
  | 'kn'
  | 'ml'
  | 'bn'
  | 'mr';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ImportantItem {
  label: string;
  explanation: string;
}

export interface RecommendedStep {
  step: number;
  title: string;
  description: string;
}

/**
 * Target Gemini AI structured response schema specified in Phase 4
 */
export interface ScreenAnalysisData {
  screenTitle: string;
  screenCategory: string;
  summary: string;
  whatItMeans: string[];
  importantItems: ImportantItem[];
  recommendedSteps: RecommendedStep[];
  warnings: string[];
  uncertainties: string[];
}

export interface DetectedError {
  message: string;
  explanation: string;
  suggestedSolution: string;
}

export interface NextStep {
  step: number;
  title: string;
  description: string;
}

export interface ScreenAnalysisResult {
  id?: string;
  screenTitle: string;
  screenType: string;
  summary: string;
  importantInformation: string[];
  detectedErrors: DetectedError[];
  nextSteps: NextStep[];
  warnings: string[];
  confidence: ConfidenceLevel;
  language?: LanguageCode;
  mode?: ExplanationMode;
  imageUrl?: string;
  createdAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  status?: 'sending' | 'sent' | 'failed';
}

export type HistorySortOption = 'newest' | 'oldest' | 'title_asc';
export type HistorySyncStatus = 'synced' | 'local_only';

export interface SaveAnalysisInput {
  title?: string;
  aiData: ScreenAnalysisData;
  simplifiedAiData?: ScreenAnalysisData | null;
  translatedCache?: Record<string, ScreenAnalysisData>;
  activeMode?: 'original' | 'simple';
  activeLanguage?: LanguageCode;
  chatMessages?: ChatMessage[];
  includeScreenshot: boolean;
  screenshotUri?: string;
  screenshotMimeType?: string;
}

export interface HistoryItem {
  id: string;
  userId?: string;
  title: string;
  screenType: string;
  summary: string;
  imageUrl?: string;
  includeScreenshot?: boolean;
  screenshotStoragePath?: string;
  confidence: ConfidenceLevel;
  createdAt: string;
  updatedAt?: string;
  analysis: ScreenAnalysisResult;
  aiData?: ScreenAnalysisData;
  simplifiedAiData?: ScreenAnalysisData | null;
  translatedCache?: Record<string, ScreenAnalysisData>;
  activeMode?: 'original' | 'simple';
  activeLanguage?: LanguageCode;
  chatMessages?: ChatMessage[];
  syncStatus?: HistorySyncStatus;
  syncError?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  preferredLanguage: LanguageCode;
  preferredMode: ExplanationMode;
  speechRate: number;
}

export interface SelectedImageMetadata {
  uri: string;
  name?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  mimeType?: string;
  format?: 'jpg' | 'jpeg' | 'png' | 'webp' | string;
  base64?: string;
}

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  image?: SelectedImageMetadata;
}
