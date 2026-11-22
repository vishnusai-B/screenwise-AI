import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  ScreenAnalysisResult,
  ScreenAnalysisData,
  ExplanationMode,
  LanguageCode,
  HistoryItem,
  ChatMessage,
  SelectedImageMetadata,
} from '../types';
import { HistoryService } from '../services/historyService';

export interface SaveCurrentAnalysisOptions {
  title?: string;
  includeScreenshot: boolean;
  activeMode?: 'original' | 'simple';
  activeLanguage?: LanguageCode;
}

interface AppContextType {
  // Screenshot & Image Processing
  selectedImage: SelectedImageMetadata | null;
  setSelectedImage: (image: SelectedImageMetadata | null) => void;
  selectedImageUri: string | null;
  setSelectedImageUri: (uri: string | null) => void;
  privacyConfirmed: boolean;
  setPrivacyConfirmed: (confirmed: boolean) => void;
  isLoadingImage: boolean;
  setIsLoadingImage: (loading: boolean) => void;
  imageError: string | null;
  setImageError: (error: string | null) => void;
  clearSelectedImage: () => void;

  // Analysis
  currentAnalysis: ScreenAnalysisResult | null;
  setCurrentAnalysis: (analysis: ScreenAnalysisResult | null) => void;
  latestAiAnalysis: ScreenAnalysisData | null;
  setLatestAiAnalysis: (data: ScreenAnalysisData | null) => void;
  simplifiedAiAnalysis: ScreenAnalysisData | null;
  setSimplifiedAiAnalysis: (data: ScreenAnalysisData | null) => void;

  // Multilingual Translation Cache (Phase 7)
  analysisGenerationId: string;
  translationCache: Record<string, ScreenAnalysisData>;
  getCachedTranslation: (mode: 'original' | 'simple', lang: LanguageCode) => ScreenAnalysisData | undefined;
  setCachedTranslation: (mode: 'original' | 'simple', lang: LanguageCode, data: ScreenAnalysisData) => void;
  clearTranslationCache: () => void;

  // Preferences
  explanationMode: ExplanationMode;
  setExplanationMode: (mode: ExplanationMode) => void;
  selectedLanguage: LanguageCode;
  setSelectedLanguage: (lang: LanguageCode) => void;
  voiceExplanationEnabled: boolean;
  setVoiceExplanationEnabled: (enabled: boolean) => void;

  // History & Saved Results (Phase 9)
  history: HistoryItem[];
  activeSavedAnalysisId: string | null;
  restoredMode: 'original' | 'simple';
  restoredLanguage: LanguageCode;
  addToHistory: (analysis: ScreenAnalysisResult, imageUri?: string) => void;
  saveCurrentAnalysisToHistory: (options: SaveCurrentAnalysisOptions) => Promise<HistoryItem>;
  renameHistoryItem: (id: string, newTitle: string) => Promise<void>;
  removeHistoryItemScreenshot: (id: string) => Promise<void>;
  removeAllHistoryScreenshots: () => Promise<void>;
  restoreHistoryItem: (item: HistoryItem) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => ChatMessage;
  updateChatMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearChat: () => void;

  // Audio / Speech
  isSpeaking: boolean;
  setIsSpeaking: (speaking: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedImage, setSelectedImageState] = useState<SelectedImageMetadata | null>(null);
  const [selectedImageUri, setSelectedImageUriState] = useState<string | null>(null);
  const [privacyConfirmed, setPrivacyConfirmed] = useState<boolean>(false);
  const [isLoadingImage, setIsLoadingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [currentAnalysis, setCurrentAnalysis] = useState<ScreenAnalysisResult | null>(null);
  const [latestAiAnalysis, setLatestAiAnalysisState] = useState<ScreenAnalysisData | null>(null);
  const [simplifiedAiAnalysis, setSimplifiedAiAnalysis] = useState<ScreenAnalysisData | null>(null);
  const [analysisGenerationId, setAnalysisGenerationId] = useState<string>(() => `gen-${Date.now()}`);
  const [translationCache, setTranslationCache] = useState<Record<string, ScreenAnalysisData>>({});

  const [activeSavedAnalysisId, setActiveSavedAnalysisId] = useState<string | null>(null);
  const [restoredMode, setRestoredMode] = useState<'original' | 'simple'>('original');
  const [restoredLanguage, setRestoredLanguage] = useState<LanguageCode>('en');

  const [explanationMode, setExplanationMode] = useState<ExplanationMode>('normal');
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
  const [voiceExplanationEnabled, setVoiceExplanationEnabled] = useState<boolean>(true);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Load saved history for the current anonymous user on mount
  useEffect(() => {
    let isMounted = true;
    HistoryService.loadHistory()
      .then((items) => {
        if (isMounted && items.length > 0) {
          setHistory(items);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const clearTranslationCache = () => {
    setTranslationCache({});
  };

  /**
   * Builds unique composite cache key combining:
   * 1. analysisGenerationId (unique to each specific screenshot analysis)
   * 2. explanation mode ('original' | 'simple')
   * 3. target language code ('te', 'hi', etc.)
   */
  const getCachedTranslation = (mode: 'original' | 'simple', lang: LanguageCode): ScreenAnalysisData | undefined => {
    const key = `${analysisGenerationId}_${mode}_${lang}`;
    return translationCache[key] || translationCache[`${mode}_${lang}`];
  };

  const setCachedTranslation = (mode: 'original' | 'simple', lang: LanguageCode, data: ScreenAnalysisData) => {
    const key = `${analysisGenerationId}_${mode}_${lang}`;
    const modeLangKey = `${mode}_${lang}`;
    setTranslationCache((prev) => ({
      ...prev,
      [key]: data,
      [modeLangKey]: data,
    }));
  };

  const setLatestAiAnalysis = (data: ScreenAnalysisData | null) => {
    setLatestAiAnalysisState(data);
    // Generate new unique generation identity for each fresh analysis
    setAnalysisGenerationId(`gen-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);
    // Reset saved state and restored preferences for a fresh screenshot analysis
    setActiveSavedAnalysisId(null);
    setRestoredMode('original');
    setRestoredLanguage('en');
    // Invalidate simplified cache, previous screenshot translations & previous chat messages completely
    setSimplifiedAiAnalysis(null);
    setTranslationCache({});
    setChatMessages([]);
  };

  // Synchronized setter for image metadata and uri
  const setSelectedImage = (image: SelectedImageMetadata | null) => {
    setSelectedImageState(image);
    setSelectedImageUriState(image ? image.uri : null);
    if (!image) {
      setPrivacyConfirmed(false);
      setImageError(null);
    }
  };

  const setSelectedImageUri = (uri: string | null) => {
    setSelectedImageUriState(uri);
    if (!uri) {
      setSelectedImageState(null);
      setPrivacyConfirmed(false);
      setImageError(null);
    } else if (!selectedImage || selectedImage.uri !== uri) {
      setSelectedImageState({
        uri,
        name: uri.split('/').pop() || 'screenshot.png',
      });
    }
  };

  const clearSelectedImage = () => {
    setSelectedImageState(null);
    setSelectedImageUriState(null);
    setPrivacyConfirmed(false);
    setImageError(null);
    setLatestAiAnalysisState(null);
    setSimplifiedAiAnalysis(null);
    setActiveSavedAnalysisId(null);
    setRestoredMode('original');
    setRestoredLanguage('en');
    setAnalysisGenerationId(`gen-${Date.now()}`);
    setTranslationCache({});
    setChatMessages([]);
  };

  const addToHistory = (analysis: ScreenAnalysisResult, _imageUri?: string) => {
    // Legacy compatibility helper — never stores screenshot automatically without explicit consent
    const newItem: HistoryItem = {
      id: `hist-${Date.now()}`,
      title: analysis.screenTitle,
      screenType: analysis.screenType,
      summary: analysis.summary,
      imageUrl: undefined,
      includeScreenshot: false,
      confidence: analysis.confidence,
      createdAt: new Date().toISOString(),
      analysis,
    };
    setHistory((prev) => [newItem, ...prev]);
  };

  /**
   * Explicitly save or update the current analysis in History (Phase 9).
   * Screenshot is only saved when `options.includeScreenshot === true`.
   */
  const saveCurrentAnalysisToHistory = async (
    options: SaveCurrentAnalysisOptions
  ): Promise<HistoryItem> => {
    if (!latestAiAnalysis) {
      throw new Error('No active analysis available to save.');
    }

    // Extract portable mode_lang translation entries for persistence
    const portableTranslations: Record<string, ScreenAnalysisData> = {};
    Object.entries(translationCache).forEach(([k, val]) => {
      const parts = k.split('_');
      if (parts.length >= 2) {
        const modePart = parts[parts.length - 2];
        const langPart = parts[parts.length - 1];
        if ((modePart === 'original' || modePart === 'simple') && langPart) {
          portableTranslations[`${modePart}_${langPart}`] = val;
        }
      }
    });

    const savedItem = await HistoryService.saveAnalysis(
      {
        title: options.title || latestAiAnalysis.screenTitle,
        aiData: latestAiAnalysis,
        simplifiedAiData: simplifiedAiAnalysis,
        translatedCache: portableTranslations,
        activeMode: options.activeMode || 'original',
        activeLanguage: options.activeLanguage || 'en',
        chatMessages,
        includeScreenshot: options.includeScreenshot === true,
        screenshotUri: options.includeScreenshot === true ? selectedImageUri || undefined : undefined,
        screenshotMimeType: options.includeScreenshot === true ? selectedImage?.mimeType : undefined,
      },
      activeSavedAnalysisId || undefined
    );

    setActiveSavedAnalysisId(savedItem.id);
    setHistory((prev) => {
      const exists = prev.some((item) => item.id === savedItem.id);
      if (exists) {
        return prev.map((item) => (item.id === savedItem.id ? savedItem : item));
      }
      return [savedItem, ...prev];
    });

    return savedItem;
  };

  const renameHistoryItem = async (id: string, newTitle: string): Promise<void> => {
    const updated = await HistoryService.renameAnalysis(id, newTitle);
    setHistory((prev) => prev.map((item) => (item.id === id ? updated : item)));
  };

  const removeHistoryItemScreenshot = async (id: string): Promise<void> => {
    const updated = await HistoryService.removeScreenshotFromAnalysis(id);
    setHistory((prev) => prev.map((item) => (item.id === id ? updated : item)));
    if (activeSavedAnalysisId === id) {
      setSelectedImageState(null);
      setSelectedImageUriState(null);
    }
  };

  const removeAllHistoryScreenshots = async (): Promise<void> => {
    const updatedList = await HistoryService.removeAllScreenshots();
    setHistory(updatedList);
  };

  /**
   * Restore a saved analysis item (including simplified view, translations, and chat messages)
   * into the active Results state so the user can view or continue chatting.
   */
  const restoreHistoryItem = (item: HistoryItem) => {
    const newGenId = `gen-restored-${item.id}-${Date.now()}`;
    setAnalysisGenerationId(newGenId);

    // Reconstruct ScreenAnalysisData if item only had legacy ScreenAnalysisResult
    const aiData: ScreenAnalysisData = item.aiData || {
      screenTitle: item.title,
      screenCategory: item.screenType,
      summary: item.summary,
      whatItMeans: [item.summary],
      importantItems: (item.analysis.importantInformation || []).map((d: string) => {
        const [label, ...rest] = d.split(':');
        return {
          label: (label || 'Detail').trim(),
          explanation: rest.join(':').trim() || d,
        };
      }),
      recommendedSteps: (item.analysis.nextSteps || []).map((s) => ({
        step: s.step,
        title: s.title,
        description: s.description,
      })),
      warnings: item.analysis.warnings || [],
      uncertainties: [],
    };

    setLatestAiAnalysisState(aiData);
    setCurrentAnalysis(item.analysis);
    setSimplifiedAiAnalysis(item.simplifiedAiData || null);

    // Hydrate translation cache with the restored generation ID
    const hydratedCache: Record<string, ScreenAnalysisData> = {};
    if (item.translatedCache) {
      Object.entries(item.translatedCache).forEach(([k, val]) => {
        hydratedCache[k] = val;
        hydratedCache[`${newGenId}_${k}`] = val;
      });
    }
    setTranslationCache(hydratedCache);

    setChatMessages(item.chatMessages || []);
    setRestoredMode(item.activeMode || 'original');
    setRestoredLanguage(item.activeLanguage || 'en');
    setActiveSavedAnalysisId(item.id);

    // Only restore screenshot preview if explicit consent was granted and image URL exists
    if (item.includeScreenshot && item.imageUrl) {
      setSelectedImageState({
        uri: item.imageUrl,
        name: `${item.title.replace(/\s+/g, '_').toLowerCase()}.png`,
      });
      setSelectedImageUriState(item.imageUrl);
    } else {
      setSelectedImageState(null);
      setSelectedImageUriState(null);
    }
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
    if (activeSavedAnalysisId === id) {
      setActiveSavedAnalysisId(null);
    }
    HistoryService.deleteAnalysis(id).catch(() => {});
  };

  const clearHistory = () => {
    setHistory([]);
    setActiveSavedAnalysisId(null);
    HistoryService.clearAllHistory().catch(() => {});
  };

  const addChatMessage = (message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage => {
    const newMsg: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, newMsg]);
    return newMsg;
  };

  const updateChatMessage = (id: string, updates: Partial<ChatMessage>) => {
    setChatMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  return (
    <AppContext.Provider
      value={{
        selectedImage,
        setSelectedImage,
        selectedImageUri,
        setSelectedImageUri,
        privacyConfirmed,
        setPrivacyConfirmed,
        isLoadingImage,
        setIsLoadingImage,
        imageError,
        setImageError,
        clearSelectedImage,
        currentAnalysis,
        setCurrentAnalysis,
        latestAiAnalysis,
        setLatestAiAnalysis,
        simplifiedAiAnalysis,
        setSimplifiedAiAnalysis,
        analysisGenerationId,
        translationCache,
        getCachedTranslation,
        setCachedTranslation,
        clearTranslationCache,
        explanationMode,
        setExplanationMode,
        selectedLanguage,
        setSelectedLanguage,
        voiceExplanationEnabled,
        setVoiceExplanationEnabled,
        history,
        activeSavedAnalysisId,
        restoredMode,
        restoredLanguage,
        addToHistory,
        saveCurrentAnalysisToHistory,
        renameHistoryItem,
        removeHistoryItemScreenshot,
        removeAllHistoryScreenshots,
        restoreHistoryItem,
        deleteHistoryItem,
        clearHistory,
        chatMessages,
        addChatMessage,
        updateChatMessage,
        clearChat,
        isSpeaking,
        setIsSpeaking,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
