import React, { useState, useRef, useEffect, useCallback, ComponentRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { borderRadius, shadows, spacing } from '../constants/theme';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { EmptyState } from '../components/EmptyState';
import { useApp } from '../context/AppContext';
import { AnalysisService } from '../services/analysisService';
import { TranslationService } from '../services/translationService';
import { SpeechService, SpeechRate, SpeechPitch } from '../services/speechService';
import * as Speech from 'expo-speech';
import { prepareSpeechContent, SpeechSectionId } from '../utils/speechHelper';
import { Platform } from 'react-native';
import { ImportantItem, RecommendedStep, LanguageCode } from '../types';
import { SUPPORTED_LANGUAGES, SupportedLanguageCode, getLanguageDefinition } from '../constants/languages';
import { ChatService } from '../services/chatService';

export default function ResultsScreen() {
  const router = useRouter();
  const {
    latestAiAnalysis,
    simplifiedAiAnalysis,
    setSimplifiedAiAnalysis,
    selectedImage,
    clearSelectedImage,
    analysisGenerationId,
    getCachedTranslation,
    setCachedTranslation,
    chatMessages,
    addChatMessage,
    updateChatMessage,
    clearChat,
    history,
    activeSavedAnalysisId,
    restoredMode,
    restoredLanguage,
    saveCurrentAnalysisToHistory,
  } = useApp();

  const [activeMode, setActiveMode] = useState<'original' | 'simple'>(restoredMode || 'original');
  const [isSimplifying, setIsSimplifying] = useState(false);
  const [simplificationError, setSimplificationError] = useState<string | null>(null);

  // Translation State (Phase 7)
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguageCode>(
    (restoredLanguage as SupportedLanguageCode) || 'en'
  );
  const [selectedLanguageForTranslation, setSelectedLanguageForTranslation] = useState<SupportedLanguageCode>(
    restoredLanguage && restoredLanguage !== 'en'
      ? (restoredLanguage as SupportedLanguageCode)
      : 'te'
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Save History State (Phase 9)
  const existingSavedItem = activeSavedAnalysisId
    ? history.find((h) => h.id === activeSavedAnalysisId)
    : undefined;
  const [saveTitle, setSaveTitle] = useState<string>(
    existingSavedItem?.title || latestAiAnalysis?.screenTitle || ''
  );
  // STRICT PRIVACY RULE: Never save screenshots automatically; default to false unless restoring an item where user already consented
  const [includeScreenshotConsent, setIncludeScreenshotConsent] = useState<boolean>(
    existingSavedItem ? Boolean(existingSavedItem.includeScreenshot) : false
  );
  const [isSavingHistory, setIsSavingHistory] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Synchronize mode, language, and save inputs when switching or restoring an analysis
  useEffect(() => {
    setActiveMode(restoredMode || 'original');
    const targetLang = (restoredLanguage as SupportedLanguageCode) || 'en';
    setCurrentLanguage(targetLang);
    if (targetLang !== 'en') {
      setSelectedLanguageForTranslation(targetLang);
    }
    const matchedSaved = activeSavedAnalysisId
      ? history.find((h) => h.id === activeSavedAnalysisId)
      : undefined;
    setSaveTitle(matchedSaved?.title || latestAiAnalysis?.screenTitle || '');
    setIncludeScreenshotConsent(matchedSaved ? Boolean(matchedSaved.includeScreenshot) : false);
    setSaveSuccessMessage(null);
    setSaveError(null);
  }, [analysisGenerationId]);

  // Speech State (Phase 6)
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused' | 'done'>('idle');
  const [speakingSection, setSpeakingSection] = useState<SpeechSectionId | null>(null);
  const [speechRate, setSpeechRate] = useState<SpeechRate>('normal');
  const [speechPitch, setSpeechPitch] = useState<SpeechPitch>('normal');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  const supportsPause = SpeechService.supportsPauseResume();

  // Chat State (Phase 8)
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [retryQuestion, setRetryQuestion] = useState<string | null>(null);
  const [failedUserMsgId, setFailedUserMsgId] = useState<string | null>(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [speakingChatMsgId, setSpeakingChatMsgId] = useState<string | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const chatScrollRef = useRef<ComponentRef<typeof ScrollView> | null>(null);

  // Load available voices on mount
  useEffect(() => {
    let isMounted = true;
    SpeechService.getAvailableVoices().then((voices) => {
      if (isMounted && voices && voices.length > 0) {
        setAvailableVoices(voices);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up speech and in-flight requests when unmounting or leaving
  useEffect(() => {
    return () => {
      SpeechService.stopSpeech();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (chatAbortRef.current) {
        chatAbortRef.current.abort();
      }
    };
  }, []);

  const handleAnalyzeAnother = () => {
    SpeechService.stopSpeech();
    clearSelectedImage();
    router.replace('/upload');
  };

  const handleBackToHome = () => {
    SpeechService.stopSpeech();
    router.replace('/(tabs)');
  };

  const handleSelectOriginalMode = () => {
    // Stop ongoing speech before switching explanation text
    SpeechService.stopSpeech();
    setSpeechState('idle');
    setSpeakingSection(null);
    setSpeakingChatMsgId(null);

    setActiveMode('original');
    setSimplificationError(null);
  };

  const handleSelectSimpleMode = async () => {
    // Stop ongoing speech before switching explanation text
    SpeechService.stopSpeech();
    setSpeechState('idle');
    setSpeakingSection(null);
    setSpeakingChatMsgId(null);

    setActiveMode('simple');
    setSimplificationError(null);

    // If already simplified and cached, switch immediately without calling Gemini
    if (simplifiedAiAnalysis) {
      return;
    }

    if (!latestAiAnalysis || isSimplifying) {
      return;
    }

    try {
      setIsSimplifying(true);
      abortControllerRef.current = new AbortController();

      const simplified = await AnalysisService.simplifyAnalysis(
        latestAiAnalysis,
        abortControllerRef.current.signal
      );

      setSimplifiedAiAnalysis(simplified);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to generate simplified explanation.';
      setSimplificationError(msg);
    } finally {
      setIsSimplifying(false);
    }
  };

  const handleRetrySimplification = () => {
    handleSelectSimpleMode();
  };

  // Determine base English source based on active mode
  const isDisplayingSimple = activeMode === 'simple' && Boolean(simplifiedAiAnalysis);
  const baseEnglishData = isDisplayingSimple && simplifiedAiAnalysis ? simplifiedAiAnalysis : latestAiAnalysis;

  // Determine current display data (Translated or English)
  const cachedTranslatedData = currentLanguage !== 'en' ? getCachedTranslation(activeMode, currentLanguage) : undefined;
  const currentData = cachedTranslatedData || baseEnglishData;

  const currentLangDef = getLanguageDefinition(currentLanguage);

  // Determine whether current language has a dedicated voice on the device
  const hasVoiceForCurrentLanguage =
    currentLanguage === 'en' ||
    availableVoices.some(
      (v) => v.language && v.language.toLowerCase().startsWith(currentLangDef.code)
    );

  // Translation Handlers (Phase 7)
  const handleTranslate = async () => {
    if (!baseEnglishData) return;

    // If English selected, just set currentLanguage to 'en'
    if (selectedLanguageForTranslation === 'en') {
      SpeechService.stopSpeech();
      setSpeechState('idle');
      setSpeakingSection(null);
      setSpeakingChatMsgId(null);
      setCurrentLanguage('en');
      setTranslationError(null);
      return;
    }

    // Stop speech before changing language
    SpeechService.stopSpeech();
    setSpeechState('idle');
    setSpeakingSection(null);
    setSpeakingChatMsgId(null);
    setTranslationError(null);

    // Check cache first
    const cached = getCachedTranslation(activeMode, selectedLanguageForTranslation);
    if (cached) {
      setCurrentLanguage(selectedLanguageForTranslation);
      return;
    }

    if (isTranslating) return;

    try {
      setIsTranslating(true);
      abortControllerRef.current = new AbortController();

      const translated = await TranslationService.translateAnalysis(
        baseEnglishData,
        selectedLanguageForTranslation,
        abortControllerRef.current.signal
      );

      setCachedTranslation(activeMode, selectedLanguageForTranslation, translated);
      setCurrentLanguage(selectedLanguageForTranslation);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to translate explanation.';
      setTranslationError(msg);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleViewOriginal = () => {
    SpeechService.stopSpeech();
    setSpeechState('idle');
    setSpeakingSection(null);
    setSpeakingChatMsgId(null);
    setCurrentLanguage('en');
    setTranslationError(null);
  };

  const handleRetryTranslation = () => {
    handleTranslate();
  };

  // Speech Handlers
  const handleListenFull = async () => {
    if (!currentData) return;

    // If currently paused on supported platform, resume
    if (speechState === 'paused' && supportsPause) {
      const resumed = await SpeechService.resumeSpeech();
      if (resumed) {
        setSpeechState('speaking');
        return;
      }
    }

    const textToSpeak = prepareSpeechContent(currentData, 'all');
    if (!textToSpeak) return;

    setSpeechError(null);
    setSpeakingSection('all');
    setSpeechState('speaking');

    // Speech language is driven by the currently displayed explanation language
    const speechLanguage = currentLangDef.bcp47;

    // Check if device has a voice matching the target language when not English
    let voiceToUse = selectedVoice;
    if (currentLanguage !== 'en' && availableVoices.length > 0) {
      const langPrefix = currentLangDef.code;
      const matchingVoice = availableVoices.find(
        (v) => v.language && v.language.toLowerCase().startsWith(langPrefix)
      );
      if (matchingVoice) {
        voiceToUse = matchingVoice.identifier;
      } else {
        // If voice for non-English language is missing, inform user softly
        console.warn(`[SpeechService] Notice: No dedicated voice found for ${currentLangDef.name}. Using system default.`);
      }
    }

    await SpeechService.speakText(textToSpeak, {
      rate: speechRate,
      pitch: speechPitch,
      voice: voiceToUse,
      language: speechLanguage,
      onStart: () => {
        setSpeechState('speaking');
      },
      onDone: () => {
        setSpeechState('done');
        setSpeakingSection(null);
      },
      onStopped: () => {
        setSpeechState('idle');
        setSpeakingSection(null);
      },
      onError: (err) => {
        setSpeechState('idle');
        setSpeakingSection(null);
        setSpeechError(err?.message || 'Voice playback error');
      },
    });
  };

  const handlePauseResume = async () => {
    if (speechState === 'speaking') {
      const paused = await SpeechService.pauseSpeech();
      if (paused) {
        setSpeechState('paused');
      }
    } else if (speechState === 'paused') {
      const resumed = await SpeechService.resumeSpeech();
      if (resumed) {
        setSpeechState('speaking');
      }
    }
  };

  const handleListenSection = async (section: SpeechSectionId) => {
    if (!currentData) return;

    // If this section is already speaking, tapping stops it
    if ((speechState === 'speaking' || speechState === 'paused') && speakingSection === section) {
      await handleStopSpeech();
      return;
    }

    const textToSpeak = prepareSpeechContent(currentData, section);
    if (!textToSpeak) return;

    setSpeechError(null);
    setSpeakingSection(section);
    setSpeechState('speaking');

    // Speech language is driven by the currently displayed explanation language
    const speechLanguage = currentLangDef.bcp47;

    // Check if device has a voice matching the target language when not English
    let voiceToUse = selectedVoice;
    if (currentLanguage !== 'en' && availableVoices.length > 0) {
      const langPrefix = currentLangDef.code;
      const matchingVoice = availableVoices.find(
        (v) => v.language && v.language.toLowerCase().startsWith(langPrefix)
      );
      if (matchingVoice) {
        voiceToUse = matchingVoice.identifier;
      }
    }

    await SpeechService.speakText(textToSpeak, {
      rate: speechRate,
      pitch: speechPitch,
      voice: voiceToUse,
      language: speechLanguage,
      onStart: () => {
        setSpeechState('speaking');
      },
      onDone: () => {
        setSpeechState('done');
        setSpeakingSection(null);
      },
      onStopped: () => {
        setSpeechState('idle');
        setSpeakingSection(null);
      },
      onError: (err) => {
        setSpeechState('idle');
        setSpeakingSection(null);
        setSpeechError(err?.message || 'Section voice playback error');
      },
    });
  };

  const handleStopSpeech = async () => {
    await SpeechService.stopSpeech();
    setSpeechState('idle');
    setSpeakingSection(null);
  };

  const handleSetRate = async (rate: SpeechRate) => {
    setSpeechRate(rate);
    // If currently active, re-speak current target with new rate
    if ((speechState === 'speaking' || speechState === 'paused') && speakingSection && currentData) {
      const textToSpeak = prepareSpeechContent(currentData, speakingSection);
      await SpeechService.speakText(textToSpeak, {
        rate,
        pitch: speechPitch,
        voice: selectedVoice,
        onStart: () => setSpeechState('speaking'),
        onDone: () => {
          setSpeechState('done');
          setSpeakingSection(null);
        },
        onStopped: () => {
          setSpeechState('idle');
          setSpeakingSection(null);
        },
        onError: (err) => {
          setSpeechState('idle');
          setSpeakingSection(null);
          setSpeechError(err?.message || 'Voice playback error');
        },
      });
    }
  };

  const handleSetPitch = async (pitch: SpeechPitch) => {
    setSpeechPitch(pitch);
    // If currently active, re-speak current target with new pitch
    if ((speechState === 'speaking' || speechState === 'paused') && speakingSection && currentData) {
      const textToSpeak = prepareSpeechContent(currentData, speakingSection);
      await SpeechService.speakText(textToSpeak, {
        rate: speechRate,
        pitch,
        voice: selectedVoice,
        onStart: () => setSpeechState('speaking'),
        onDone: () => {
          setSpeechState('done');
          setSpeakingSection(null);
        },
        onStopped: () => {
          setSpeechState('idle');
          setSpeakingSection(null);
        },
        onError: (err) => {
          setSpeechState('idle');
          setSpeakingSection(null);
          setSpeechError(err?.message || 'Voice playback error');
        },
      });
    }
  };

  const handleSelectVoice = async (voiceIdentifier: string | undefined) => {
    setSelectedVoice(voiceIdentifier);
    setShowVoicePicker(false);
    // If currently active, re-speak current target with new voice
    if ((speechState === 'speaking' || speechState === 'paused') && speakingSection && currentData) {
      const textToSpeak = prepareSpeechContent(currentData, speakingSection);
      await SpeechService.speakText(textToSpeak, {
        rate: speechRate,
        pitch: speechPitch,
        voice: voiceIdentifier,
        onStart: () => setSpeechState('speaking'),
        onDone: () => {
          setSpeechState('done');
          setSpeakingSection(null);
        },
        onStopped: () => {
          setSpeechState('idle');
          setSpeakingSection(null);
        },
        onError: (err) => {
          setSpeechState('idle');
          setSpeakingSection(null);
          setSpeechError(err?.message || 'Voice playback error');
        },
      });
    }
  };

  // --- Phase 8: Chat Handlers ---

  /** Generate context-aware suggested questions from the current analysis */
  const getSuggestedQuestions = useCallback((): string[] => {
    if (dynamicSuggestions.length > 0) {
      return dynamicSuggestions.slice(0, 4);
    }
    if (!currentData) return [];
    const suggestions: string[] = [];

    if (currentData.screenCategory && currentData.screenCategory.toLowerCase().includes('error')) {
      suggestions.push('Why did this error happen?');
    }

    if (currentData.recommendedSteps && currentData.recommendedSteps.length > 0) {
      suggestions.push('What should I do first?');
    }

    if (currentData.warnings && currentData.warnings.length > 0) {
      suggestions.push('Is this warning safe to ignore?');
    }

    if (currentData.importantItems && currentData.importantItems.length > 0) {
      const firstLabel = currentData.importantItems[0].label;
      if (firstLabel.length <= 60) {
        suggestions.push(`What does "${firstLabel}" mean?`);
      } else {
        suggestions.push('Explain the important items.');
      }
    }

    if (suggestions.length < 3) {
      suggestions.push('Can you explain this in simpler words?');
    }
    if (suggestions.length < 4) {
      suggestions.push('What should I be careful about?');
    }

    return suggestions.slice(0, 4);
  }, [currentData, dynamicSuggestions]);

  /** Send a chat question to the backend */
  const handleSendChat = async (questionText: string, existingUserMsgId?: string) => {
    const q = questionText.trim();
    if (!q || !latestAiAnalysis || isChatLoading) return;

    setChatInput('');
    setChatError(null);
    setRetryQuestion(null);
    setFailedUserMsgId(null);

    // Stop any active speech
    SpeechService.stopSpeech();
    setSpeechState('idle');
    setSpeakingSection(null);
    setSpeakingChatMsgId(null);

    // Build history from previously sent messages (excluding failed or currently retried message)
    const priorHistory = chatMessages
      .filter((m) => m.status === 'sent' && m.content.length > 0 && m.id !== existingUserMsgId)
      .slice(-10);

    // Add user message immediately or reuse existing failed message on retry
    let targetUserMsgId = existingUserMsgId;
    if (targetUserMsgId) {
      updateChatMessage(targetUserMsgId, { status: 'sending' });
    } else {
      const userMsg = addChatMessage({ role: 'user', content: q, status: 'sending' });
      targetUserMsgId = userMsg.id;
    }

    setIsChatLoading(true);
    chatAbortRef.current = new AbortController();

    // Scroll to bottom
    setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await ChatService.sendChatMessage({
        analysis: currentData || latestAiAnalysis,
        question: q,
        messages: priorHistory,
        mode: activeMode,
        language: currentLanguage as SupportedLanguageCode,
        signal: chatAbortRef.current.signal,
      });

      updateChatMessage(targetUserMsgId, { status: 'sent' });
      addChatMessage({ role: 'assistant', content: response.answer, status: 'sent' });
      if (response.suggestedQuestions && response.suggestedQuestions.length > 0) {
        setDynamicSuggestions(response.suggestedQuestions);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to get answer.';
      updateChatMessage(targetUserMsgId, { status: 'failed' });
      setChatError(msg);
      setRetryQuestion(q);
      setFailedUserMsgId(targetUserMsgId);
    } finally {
      setIsChatLoading(false);
      chatAbortRef.current = null;
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  /** Retry the last failed question */
  const handleRetryChat = () => {
    if (retryQuestion) {
      handleSendChat(retryQuestion, failedUserMsgId || undefined);
    }
  };

  /** Clear the conversation */
  const handleClearChat = () => {
    if (chatAbortRef.current) {
      chatAbortRef.current.abort();
      chatAbortRef.current = null;
    }
    setIsChatLoading(false);
    SpeechService.stopSpeech();
    setSpeakingChatMsgId(null);
    setChatError(null);
    setRetryQuestion(null);
    setFailedUserMsgId(null);
    setDynamicSuggestions([]);
    setChatInput('');
    clearChat();
  };

  /** Speak an individual assistant chat message */
  const handleSpeakChatMessage = async (msgId: string, text: string) => {
    // If already speaking this message, stop
    if (speakingChatMsgId === msgId) {
      await SpeechService.stopSpeech();
      setSpeakingChatMsgId(null);
      return;
    }

    // Stop any other speech (section or chat)
    await SpeechService.stopSpeech();
    setSpeechState('idle');
    setSpeakingSection(null);
    setSpeakingChatMsgId(msgId);

    const speechLanguage = currentLangDef.bcp47;

    let voiceToUse = selectedVoice;
    if (currentLanguage !== 'en' && availableVoices.length > 0) {
      const langPrefix = currentLangDef.code;
      const matchingVoice = availableVoices.find(
        (v) => v.language && v.language.toLowerCase().startsWith(langPrefix)
      );
      if (matchingVoice) {
        voiceToUse = matchingVoice.identifier;
      }
    }

    await SpeechService.speakText(text, {
      rate: speechRate,
      pitch: speechPitch,
      voice: voiceToUse,
      language: speechLanguage,
      onDone: () => setSpeakingChatMsgId(null),
      onStopped: () => setSpeakingChatMsgId(null),
      onError: () => setSpeakingChatMsgId(null),
    });
  };

  const visibleChatMessages = chatMessages.filter(
    (m) => m.role !== 'system' && (m.content.length > 0 || m.status === 'sending')
  );

  // --- Phase 9: Save Analysis Handler ---
  const handleSaveAnalysis = async () => {
    if (!latestAiAnalysis || isSavingHistory) return;

    const cleanTitle = (saveTitle || latestAiAnalysis.screenTitle).trim();
    if (!cleanTitle) {
      setSaveError('Please enter a valid title for this saved analysis.');
      return;
    }

    try {
      setIsSavingHistory(true);
      setSaveError(null);
      setSaveSuccessMessage(null);

      const wasUpdate = Boolean(activeSavedAnalysisId);
      const canSaveScreenshot = Boolean(includeScreenshotConsent && selectedImage?.uri);

      const saved = await saveCurrentAnalysisToHistory({
        title: cleanTitle,
        includeScreenshot: canSaveScreenshot,
        activeMode,
        activeLanguage: currentLanguage,
      });

      setSaveTitle(saved.title);
      if (saved.syncStatus === 'synced') {
        setSaveSuccessMessage(
          wasUpdate
            ? 'Updated in Cloud & History (including latest chat & translations).'
            : canSaveScreenshot
            ? 'Saved to Cloud & History with private screenshot.'
            : 'Saved to Cloud & History (text & chat only — no screenshot stored).'
        );
      } else if (saved.syncError) {
        setSaveSuccessMessage(
          `Saved locally on this device only (cloud sync failed: ${saved.syncError}).`
        );
      } else {
        setSaveSuccessMessage(
          wasUpdate
            ? 'Updated locally on this device (cloud sync not configured).'
            : canSaveScreenshot
            ? 'Saved locally on this device with screenshot (cloud sync not configured).'
            : 'Saved locally on this device (text & chat only — cloud sync not configured).'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save analysis to History.';
      setSaveError(msg);
    } finally {
      setIsSavingHistory(false);
    }
  };

  if (!latestAiAnalysis || !currentData) {
    return (
      <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
        <Header title="Analysis Results" showBack={true} />
        <View style={styles.body}>
          <EmptyState
            icon="scan-outline"
            title="No Active Results"
            description="You have not analyzed a screenshot yet. Please upload a screenshot to see AI explanations."
            actionTitle="Upload Screenshot"
            onActionPress={() => router.replace('/upload')}
          />
        </View>
      </ScreenContainer>
    );
  }

  const {
    screenTitle,
    screenCategory,
    summary,
    whatItMeans,
    importantItems,
    recommendedSteps,
    warnings,
    uncertainties,
  } = currentData;

  const getSectionDisplayName = (sec: SpeechSectionId | null): string => {
    switch (sec) {
      case 'summary':
        return 'Overview';
      case 'whatItMeans':
        return 'What This Means';
      case 'importantItems':
        return 'Important Items';
      case 'recommendedSteps':
        return 'Next Steps';
      case 'warnings':
        return 'Safety Warnings';
      case 'uncertainties':
        return 'Unclear Elements';
      case 'all':
        return 'Full Explanation';
      default:
        return 'Audio';
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title="Screen Analysis"
        subtitle={screenCategory}
        showBack={true}
        onBackPress={handleBackToHome}
        rightAction={
          <TouchableOpacity
            style={styles.headerHomeBtn}
            onPress={handleBackToHome}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <View style={styles.body}>
        {/* Language Mode Selector (Phase 5) */}
        <View style={styles.modeSelectorCard}>
          <Text style={styles.selectorLabel}>EXPLANATION MODE</Text>
          <View style={styles.segmentedContainer}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                activeMode === 'original' && styles.segmentTabActive,
              ]}
              onPress={handleSelectOriginalMode}
              activeOpacity={0.8}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={activeMode === 'original' ? colors.primary : colors.secondaryText}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  activeMode === 'original' && styles.segmentTabTextActive,
                ]}
              >
                Original Explanation
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                activeMode === 'simple' && styles.segmentTabActive,
              ]}
              onPress={handleSelectSimpleMode}
              activeOpacity={0.8}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={activeMode === 'simple' ? colors.primary : colors.secondaryText}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.segmentTabText,
                  activeMode === 'simple' && styles.segmentTabTextActive,
                ]}
              >
                Simple Language
              </Text>
            </TouchableOpacity>
          </View>

          {/* Mode Indicator notice */}
          <View style={styles.modeIndicatorRow}>
            <Ionicons
              name={activeMode === 'simple' ? 'happy-outline' : 'code-outline'}
              size={14}
              color={activeMode === 'simple' ? colors.success : colors.secondaryText}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.modeIndicatorText}>
              {activeMode === 'simple'
                ? 'Simplified for everyday understanding (jargon-free)'
                : 'Detailed technical explanation from original screen analysis'}
            </Text>
          </View>
        </View>

        {/* Multilingual Translation Bar (Phase 7) */}
        <View style={styles.translationCard}>
          <View style={styles.translationCardHeader}>
            <View style={styles.translationTitleRow}>
              <Ionicons name="language" size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.translationCardHeading}>EXPLANATION LANGUAGE</Text>
            </View>
            {currentLanguage !== 'en' && (
              <TouchableOpacity
                onPress={handleViewOriginal}
                style={styles.viewOriginalBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-undo-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.viewOriginalBtnText}>View English Original</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Current Active Language Pill & Dropdown Toggle */}
          <View style={styles.translationSelectorRow}>
            <TouchableOpacity
              onPress={() => setShowLanguageDropdown(!showLanguageDropdown)}
              style={styles.languageDropdownToggle}
              activeOpacity={0.8}
            >
              <Text style={styles.languageDropdownToggleLabel}>Target Language:</Text>
              <Text style={styles.languageDropdownToggleValue}>
                {getLanguageDefinition(selectedLanguageForTranslation).nativeName} (
                {getLanguageDefinition(selectedLanguageForTranslation).name})
              </Text>
              <Ionicons
                name={showLanguageDropdown ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.primary}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleTranslate}
              disabled={isTranslating}
              style={[
                styles.translateActionBtn,
                (isTranslating || (selectedLanguageForTranslation === currentLanguage && !cachedTranslatedData)) &&
                  styles.translateActionBtnDisabled,
              ]}
              activeOpacity={0.8}
            >
              {isTranslating ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <Ionicons name="sync-outline" size={14} color={colors.textInverse} style={{ marginRight: 4 }} />
                  <Text style={styles.translateActionBtnText}>
                    {selectedLanguageForTranslation === currentLanguage && cachedTranslatedData
                      ? 'Translated'
                      : 'Translate'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Language Dropdown List */}
          {showLanguageDropdown && (
            <View style={styles.languagesGrid}>
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = selectedLanguageForTranslation === lang.code;
                const isCurrentActive = currentLanguage === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => {
                      setSelectedLanguageForTranslation(lang.code);
                      setShowLanguageDropdown(false);
                    }}
                    style={[
                      styles.languageGridItem,
                      isSelected && styles.languageGridItemActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.languageGridItemNative,
                        isSelected && styles.languageGridItemNativeActive,
                      ]}
                    >
                      {lang.nativeName}
                    </Text>
                    <Text
                      style={[
                        styles.languageGridItemEnglish,
                        isSelected && styles.languageGridItemEnglishActive,
                      ]}
                    >
                      {lang.name}
                    </Text>
                    {isCurrentActive && (
                      <View style={styles.activeLangDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Translation Status Notice */}
          {currentLanguage !== 'en' && (
            <View style={styles.translatedBadgeRow}>
              <Ionicons name="checkmark-done" size={13} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={styles.translatedBadgeText}>
                Showing {currentLangDef.nativeName} ({currentLangDef.name}) explanation
              </Text>
            </View>
          )}

          {/* Translation Error Banner */}
          {translationError && (
            <View style={styles.translationErrorCard}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.error} style={{ marginRight: 6 }} />
              <Text style={styles.translationErrorText}>{translationError}</Text>
              <TouchableOpacity onPress={handleRetryTranslation} style={styles.translationRetryBtn}>
                <Text style={styles.translationRetryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Loading Indicator while translating */}
        {isTranslating && (
          <View style={styles.simplifyingCard}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.simplifyingTitle}>
                Translating explanation into {getLanguageDefinition(selectedLanguageForTranslation).name}...
              </Text>
              <Text style={styles.simplifyingSubtitle}>
                Gemini AI is converting the structured explanation while preserving all codes and steps.
              </Text>
            </View>
          </View>
        )}

        {/* Loading Indicator while simplifying */}
        {isSimplifying && (
          <View style={styles.simplifyingCard}>
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.simplifyingTitle}>Making this easier to understand...</Text>
              <Text style={styles.simplifyingSubtitle}>
                Gemini AI is converting technical terms into plain everyday English.
              </Text>
            </View>
          </View>
        )}

        {/* Simplification Error Card with Retry Button */}
        {simplificationError && (
          <View style={styles.simplificationErrorCard}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.simplificationErrorTitle}>Could not simplify explanation</Text>
              <Text style={styles.simplificationErrorMsg}>{simplificationError}</Text>
            </View>
            <TouchableOpacity onPress={handleRetrySimplification} style={styles.errorRetryBtn}>
              <Text style={styles.errorRetryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voice Playback Control Bar (Phase 6) */}
        <View style={styles.voiceControlCard}>
          <View style={styles.voiceCardTopRow}>
            <View style={styles.voiceTitleRow}>
              <View
                style={[
                  styles.voiceStatusDot,
                  speechState === 'speaking' && styles.voiceStatusDotActive,
                  speechState === 'paused' && styles.voiceStatusDotPaused,
                ]}
              />
              <Text style={styles.voiceCardHeading} numberOfLines={1}>
                {speechState === 'speaking'
                  ? speakingSection === 'all'
                    ? 'Speaking Entire Explanation'
                    : `Speaking: ${getSectionDisplayName(speakingSection)}`
                  : speechState === 'paused'
                  ? `Paused: ${getSectionDisplayName(speakingSection)}`
                  : 'Voice Audio Output'}
              </Text>
            </View>

            {/* Speed Selector Pills */}
            <View style={styles.speedSelectorPills}>
              {(['slow', 'normal', 'fast'] as SpeechRate[]).map((rate) => (
                <TouchableOpacity
                  key={rate}
                  onPress={() => handleSetRate(rate)}
                  style={[
                    styles.speedPill,
                    speechRate === rate && styles.speedPillActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.speedPillText,
                      speechRate === rate && styles.speedPillTextActive,
                    ]}
                  >
                    {rate === 'slow' ? '0.8x' : rate === 'normal' ? '1.0x' : '1.25x'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Settings Row: Pitch & Voice Selector */}
          <View style={styles.voiceSubSettingsRow}>
            <View style={styles.pitchSelectorGroup}>
              <Text style={styles.settingLabel}>Pitch:</Text>
              {(['low', 'normal', 'high'] as SpeechPitch[]).map((pitch) => (
                <TouchableOpacity
                  key={pitch}
                  onPress={() => handleSetPitch(pitch)}
                  style={[
                    styles.pitchPill,
                    speechPitch === pitch && styles.pitchPillActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pitchPillText,
                      speechPitch === pitch && styles.pitchPillTextActive,
                    ]}
                  >
                    {pitch === 'low' ? 'Low' : pitch === 'normal' ? 'Natural' : 'High'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Voice Dropdown / Indicator */}
            {availableVoices.length > 0 ? (
              <TouchableOpacity
                onPress={() => setShowVoicePicker(!showVoicePicker)}
                style={styles.voicePickerToggleBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.voicePickerToggleText} numberOfLines={1}>
                  {selectedVoice
                    ? availableVoices.find((v) => v.identifier === selectedVoice)?.name || 'Device Voice'
                    : 'Default Voice'}
                </Text>
                <Ionicons
                  name={showVoicePicker ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={colors.primary}
                  style={{ marginLeft: 3 }}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.voiceFallbackBadge}>
                <Ionicons name="mic-outline" size={12} color={colors.secondaryText} style={{ marginRight: 4 }} />
                <Text style={styles.voiceFallbackText}>System Default Voice</Text>
              </View>
            )}
          </View>

          {/* Voice Dropdown List (if expanded) */}
          {showVoicePicker && availableVoices.length > 0 && (
            <View style={styles.voiceDropdownMenu}>
              <TouchableOpacity
                style={[
                  styles.voiceMenuItem,
                  !selectedVoice && styles.voiceMenuItemActive,
                ]}
                onPress={() => handleSelectVoice(undefined)}
              >
                <Text style={[styles.voiceMenuText, !selectedVoice && styles.voiceMenuTextActive]}>
                  Device Default (Recommended)
                </Text>
              </TouchableOpacity>
              {availableVoices.slice(0, 5).map((v) => (
                <TouchableOpacity
                  key={v.identifier}
                  style={[
                    styles.voiceMenuItem,
                    selectedVoice === v.identifier && styles.voiceMenuItemActive,
                  ]}
                  onPress={() => handleSelectVoice(v.identifier)}
                >
                  <Text
                    style={[
                      styles.voiceMenuText,
                      selectedVoice === v.identifier && styles.voiceMenuTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {v.name} {v.language ? `(${v.language})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Missing Language Voice Notice (Task 4) */}
          {!hasVoiceForCurrentLanguage && (
            <View style={styles.voiceMissingWarningBox}>
              <Ionicons name="alert-circle-outline" size={14} color="#B45309" style={{ marginRight: 6 }} />
              <Text style={styles.voiceMissingWarningText}>
                Your device does not currently have a dedicated {currentLangDef.nativeName} ({currentLangDef.name}) text-to-speech voice installed. Audio playback will use the system default synthesizer, or you can read the explanation on screen.
              </Text>
            </View>
          )}

          {/* Voice Action Buttons */}
          <View style={styles.voiceButtonsRow}>
            <TouchableOpacity
              onPress={handleListenFull}
              style={[
                styles.mainListenButton,
                speechState === 'speaking' && speakingSection === 'all' && styles.mainListenButtonActive,
              ]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={
                  speechState === 'speaking' && speakingSection === 'all'
                    ? 'volume-high'
                    : speechState === 'done'
                    ? 'refresh-outline'
                    : 'volume-medium-outline'
                }
                size={18}
                color={colors.textInverse}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.mainListenButtonText}>
                {speechState === 'speaking' && speakingSection === 'all'
                  ? 'Speaking...'
                  : speechState === 'done'
                  ? 'Listen Again'
                  : 'Listen to Explanation'}
              </Text>
            </TouchableOpacity>

            {/* Pause / Resume Button (Only displayed on platforms with native support: iOS, Web) */}
            {supportsPause && (speechState === 'speaking' || speechState === 'paused') && (
              <TouchableOpacity
                onPress={handlePauseResume}
                style={styles.pauseButton}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={speechState === 'paused' ? 'play' : 'pause'}
                  size={16}
                  color={colors.textInverse}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.pauseButtonText}>
                  {speechState === 'paused' ? 'Resume' : 'Pause'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Stop Button */}
            {(speechState === 'speaking' || speechState === 'paused') && (
              <TouchableOpacity
                onPress={handleStopSpeech}
                style={styles.stopButton}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
                <Text style={styles.stopButtonText}>Stop</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Platform limitation notice for Android */}
          {!supportsPause && (speechState === 'speaking' || speechState === 'paused') && (
            <View style={styles.androidNoticeRow}>
              <Ionicons name="information-circle-outline" size={13} color={colors.secondaryText} style={{ marginRight: 4 }} />
              <Text style={styles.androidNoticeText}>
                Android TTS plays continuously. Tap Stop to end playback, or tap any section to listen specifically.
              </Text>
            </View>
          )}

          {speechError && (
            <Text style={styles.speechErrorText}>{speechError}</Text>
          )}
        </View>

        {/* Section A: Screen Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Ionicons name="folder-open-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.categoryBadgeText}>{screenCategory}</Text>
            </View>

            {isDisplayingSimple ? (
              <View style={[styles.aiBadge, { backgroundColor: colors.successBg, borderColor: '#BBF7D0' }]}>
                <Ionicons name="checkmark-circle-outline" size={12} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={[styles.aiBadgeText, { color: colors.success }]}>Simple Language View</Text>
              </View>
            ) : (
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={12} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={styles.aiBadgeText}>Gemini Vision</Text>
              </View>
            )}

            <View style={{ flex: 1 }} />

            {/* Section Speaker for Summary */}
            <TouchableOpacity
              style={[
                styles.sectionSpeakerBtn,
                speakingSection === 'summary' && styles.sectionSpeakerBtnActive,
              ]}
              onPress={() => handleListenSection('summary')}
              accessibilityLabel="Listen to Overview"
            >
              <Ionicons
                name={speakingSection === 'summary' ? 'volume-high' : 'volume-medium-outline'}
                size={16}
                color={speakingSection === 'summary' ? colors.primary : colors.secondaryText}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>{screenTitle}</Text>
          <Text style={styles.summary}>{summary}</Text>

          {/* Screenshot Thumbnail Reference */}
          {selectedImage?.uri && (
            <View style={styles.thumbnailStrip}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
              <View style={styles.thumbnailInfo}>
                <Text style={styles.thumbnailLabel}>Source Screenshot</Text>
                <Text style={styles.thumbnailName} numberOfLines={1}>
                  {selectedImage.name || 'screenshot.png'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Section B: What This Means */}
        {whatItMeans && whatItMeans.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>
                {isDisplayingSimple ? 'What This Means In Plain Words' : 'What This Means'}
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[
                  styles.sectionSpeakerBtn,
                  speakingSection === 'whatItMeans' && styles.sectionSpeakerBtnActive,
                ]}
                onPress={() => handleListenSection('whatItMeans')}
                accessibilityLabel="Listen to What This Means"
              >
                <Ionicons
                  name={speakingSection === 'whatItMeans' ? 'volume-high' : 'volume-medium-outline'}
                  size={16}
                  color={speakingSection === 'whatItMeans' ? colors.primary : colors.secondaryText}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.pointsList}>
              {whatItMeans.map((point: string, index: number) => (
                <View key={index} style={styles.pointRow}>
                  <View style={styles.pointBullet} />
                  <Text style={styles.pointText}>{point}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section C: Important Information */}
        {importantItems && importantItems.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>
                {isDisplayingSimple ? 'Important Things To Know' : 'Important Visible Information'}
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[
                  styles.sectionSpeakerBtn,
                  speakingSection === 'importantItems' && styles.sectionSpeakerBtnActive,
                ]}
                onPress={() => handleListenSection('importantItems')}
                accessibilityLabel="Listen to Important Information"
              >
                <Ionicons
                  name={speakingSection === 'importantItems' ? 'volume-high' : 'volume-medium-outline'}
                  size={16}
                  color={speakingSection === 'importantItems' ? colors.primary : colors.secondaryText}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.itemsList}>
              {importantItems.map((item: ImportantItem, index: number) => (
                <View key={index} style={styles.itemCard}>
                  <View style={styles.itemLabelRow}>
                    <Ionicons name="bookmark" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.itemLabel}>{item.label}</Text>
                  </View>
                  <Text style={styles.itemExplanation}>{item.explanation}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section D: What Should I Do Next? */}
        {recommendedSteps && recommendedSteps.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[styles.iconBox, { backgroundColor: colors.successBg }]}>
                <Ionicons name="checkbox-outline" size={18} color={colors.success} />
              </View>
              <Text style={styles.sectionTitle}>
                {isDisplayingSimple ? 'Easy Steps To Follow' : 'What Should I Do Next?'}
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[
                  styles.sectionSpeakerBtn,
                  speakingSection === 'recommendedSteps' && styles.sectionSpeakerBtnActive,
                ]}
                onPress={() => handleListenSection('recommendedSteps')}
                accessibilityLabel="Listen to Next Steps"
              >
                <Ionicons
                  name={speakingSection === 'recommendedSteps' ? 'volume-high' : 'volume-medium-outline'}
                  size={16}
                  color={speakingSection === 'recommendedSteps' ? colors.primary : colors.secondaryText}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.stepsList}>
              {recommendedSteps.map((step: RecommendedStep) => (
                <View key={step.step} style={styles.stepCard}>
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>{step.step}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>{step.title}</Text>
                    <Text style={styles.stepDescription}>{step.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Section E: Warnings (Only displayed when warnings exist) */}
        {warnings && warnings.length > 0 && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning-outline" size={20} color="#D97706" style={{ marginRight: 8 }} />
              <Text style={styles.warningTitle}>Safety Precautions & Warnings</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[
                  styles.sectionSpeakerBtn,
                  speakingSection === 'warnings' && styles.sectionSpeakerBtnActive,
                ]}
                onPress={() => handleListenSection('warnings')}
                accessibilityLabel="Listen to Warnings"
              >
                <Ionicons
                  name={speakingSection === 'warnings' ? 'volume-high' : 'volume-medium-outline'}
                  size={16}
                  color={speakingSection === 'warnings' ? '#92400E' : '#B45309'}
                />
              </TouchableOpacity>
            </View>
            {warnings.map((warn: string, index: number) => (
              <View key={index} style={styles.warningRow}>
                <Text style={styles.warningBullet}>⚠</Text>
                <Text style={styles.warningText}>{warn}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Section F: Unclear Information (Honest feedback if text was blurry) */}
        {uncertainties && uncertainties.length > 0 && (
          <View style={styles.uncertaintyCard}>
            <View style={styles.uncertaintyHeader}>
              <Ionicons name="help-circle-outline" size={20} color={colors.secondaryText} style={{ marginRight: 8 }} />
              <Text style={styles.uncertaintyTitle}>Unclear or Unreadable Elements</Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={[
                  styles.sectionSpeakerBtn,
                  speakingSection === 'uncertainties' && styles.sectionSpeakerBtnActive,
                ]}
                onPress={() => handleListenSection('uncertainties')}
                accessibilityLabel="Listen to Unclear Elements"
              >
                <Ionicons
                  name={speakingSection === 'uncertainties' ? 'volume-high' : 'volume-medium-outline'}
                  size={16}
                  color={speakingSection === 'uncertainties' ? colors.primary : colors.secondaryText}
                />
              </TouchableOpacity>
            </View>
            {uncertainties.map((item: string, index: number) => (
              <Text key={index} style={styles.uncertaintyText}>
                • {item}
              </Text>
            ))}
          </View>
        )}

        {/* Section G: AI Follow-up Chat (Phase 8) */}
        <View style={styles.chatSectionCard}>
          <View style={styles.chatSectionHeader}>
            <View style={styles.chatTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
                <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
              </View>
              <Text style={styles.chatSectionTitle}>Ask Questions About This Screen</Text>
            </View>
            {visibleChatMessages.length > 0 && (
              <TouchableOpacity
                onPress={handleClearChat}
                style={styles.clearChatBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={13} color={colors.error} style={{ marginRight: 4 }} />
                <Text style={styles.clearChatBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Empty Chat State */}
          {visibleChatMessages.length === 0 && !isChatLoading && (
            <View style={styles.chatEmptyState}>
              <Ionicons name="chatbubble-ellipses-outline" size={36} color={colors.mutedText} style={{ marginBottom: spacing.sm }} />
              <Text style={styles.chatEmptyTitle}>Have questions about this screen?</Text>
              <Text style={styles.chatEmptySubtitle}>
                Ask me to explain error messages, important details or recommended steps.
              </Text>

              {/* Suggested Questions */}
              <View style={styles.suggestedPillsRow}>
                {getSuggestedQuestions().map((suggestion, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.suggestedPill}
                    onPress={() => handleSendChat(suggestion)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.suggestedPillText} numberOfLines={2}>{suggestion}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Chat Messages Area */}
          {(visibleChatMessages.length > 0 || isChatLoading) && (
            <ScrollView
              ref={chatScrollRef}
              style={styles.chatMessagesArea}
              contentContainerStyle={styles.chatMessagesContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {visibleChatMessages.map((msg) => {
                const isUser = msg.role === 'user';
                const isFailed = msg.status === 'failed';

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.chatBubbleRow,
                      isUser ? styles.chatBubbleRowUser : styles.chatBubbleRowAssistant,
                    ]}
                  >
                    {/* Assistant avatar */}
                    {!isUser && (
                      <View style={styles.chatAvatarBox}>
                        <Ionicons name="sparkles" size={14} color={colors.primary} />
                      </View>
                    )}

                    <View
                      style={[
                        styles.chatBubble,
                        isUser ? styles.userBubble : styles.assistantBubble,
                        isFailed && styles.failedBubble,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chatBubbleText,
                          isUser ? styles.userBubbleText : styles.assistantBubbleText,
                          isFailed && styles.failedBubbleText,
                        ]}
                      >
                        {msg.content}
                      </Text>

                      {/* Speaker button for assistant messages */}
                      {!isUser && !isFailed && msg.content.length > 0 && (
                        <TouchableOpacity
                          style={styles.chatSpeakerBtn}
                          onPress={() => handleSpeakChatMessage(msg.id, msg.content)}
                          activeOpacity={0.7}
                          accessibilityLabel="Listen to AI answer"
                        >
                          <Ionicons
                            name={speakingChatMsgId === msg.id ? 'volume-high' : 'volume-medium-outline'}
                            size={14}
                            color={speakingChatMsgId === msg.id ? colors.primary : colors.secondaryText}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Assistant Loading Bubble */}
              {isChatLoading && (
                <View style={[styles.chatBubbleRow, styles.chatBubbleRowAssistant]}>
                  <View style={styles.chatAvatarBox}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                  </View>
                  <View style={[styles.chatBubble, styles.assistantBubble, { flexDirection: 'row', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={[styles.chatBubbleText, styles.assistantBubbleText, { color: colors.secondaryText }]}>
                      Thinking...
                    </Text>
                  </View>
                </View>
              )}

              {/* Chat Error Banner */}
              {chatError && (
                <View style={styles.chatErrorBanner}>
                  <Ionicons name="alert-circle-outline" size={14} color={colors.error} style={{ marginRight: 6 }} />
                  <Text style={styles.chatErrorText} numberOfLines={2}>{chatError}</Text>
                  {retryQuestion && (
                    <TouchableOpacity onPress={handleRetryChat} style={styles.chatRetryBtn} activeOpacity={0.7}>
                      <Ionicons name="refresh-outline" size={13} color={colors.textInverse} style={{ marginRight: 3 }} />
                      <Text style={styles.chatRetryBtnText}>Retry</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Suggested questions after messages */}
              {!isChatLoading && visibleChatMessages.length > 0 && visibleChatMessages.length < 20 && (
                <View style={styles.suggestedAfterRow}>
                  {getSuggestedQuestions().map((suggestion, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestedPillSmall}
                      onPress={() => handleSendChat(suggestion)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.suggestedPillSmallText} numberOfLines={1}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          )}

          {/* Chat Input Row */}
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Ask a question about this screen..."
              placeholderTextColor={colors.mutedText}
              value={chatInput}
              onChangeText={setChatInput}
              multiline={false}
              maxLength={1000}
              returnKeyType="send"
              editable={!isChatLoading}
              onSubmitEditing={() => handleSendChat(chatInput)}
            />
            <TouchableOpacity
              style={[
                styles.chatSendBtn,
                (!chatInput.trim() || isChatLoading) && styles.chatSendBtnDisabled,
              ]}
              onPress={() => handleSendChat(chatInput)}
              disabled={!chatInput.trim() || isChatLoading}
              activeOpacity={0.8}
            >
              {isChatLoading ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Ionicons name="send" size={16} color={colors.textInverse} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Section H: Save Analysis to History (Phase 9) */}
        <View style={styles.saveSectionCard}>
          <View style={styles.saveSectionHeader}>
            <View style={styles.saveTitleRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
                <Ionicons
                  name={activeSavedAnalysisId ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.saveSectionTitle}>
                  {activeSavedAnalysisId ? 'Saved in Analysis History' : 'Save Analysis to History'}
                </Text>
                <Text style={styles.saveSectionSubtitle}>
                  Keep this explanation, translations, and follow-up chat for later reference
                </Text>
              </View>
            </View>
            {activeSavedAnalysisId && (
              <View style={styles.savedStatusBadge}>
                <Ionicons name="checkmark-circle" size={13} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.savedStatusBadgeText}>Saved</Text>
              </View>
            )}
          </View>

          <View style={styles.saveFieldGroup}>
            <Text style={styles.saveFieldLabel}>CUSTOM TITLE</Text>
            <TextInput
              style={styles.saveTitleInput}
              value={saveTitle}
              onChangeText={(text) => {
                setSaveTitle(text);
                setSaveError(null);
              }}
              placeholder={screenTitle || 'Enter a title for this analysis'}
              placeholderTextColor={colors.mutedText}
              maxLength={250}
            />
          </View>

          <View style={styles.consentRow}>
            <View style={styles.consentTextGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={15}
                  color={includeScreenshotConsent ? colors.primary : colors.secondaryText}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.consentTitle}>Save screenshot image privately</Text>
              </View>
              <Text style={styles.consentDescription}>
                {selectedImage?.uri
                  ? 'Off by default for your privacy. Enable only if you want to store a private copy of this screenshot alongside the text explanation.'
                  : 'No screenshot image attached to this session (text-only analysis).'}
              </Text>
            </View>
            <Switch
              value={Boolean(includeScreenshotConsent && selectedImage?.uri)}
              onValueChange={(val) => {
                setIncludeScreenshotConsent(val);
                setSaveSuccessMessage(null);
              }}
              disabled={!selectedImage?.uri}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={
                includeScreenshotConsent && selectedImage?.uri ? colors.primary : colors.surface
              }
            />
          </View>

          {saveError && (
            <View style={styles.saveFeedbackError}>
              <Ionicons name="alert-circle-outline" size={15} color={colors.error} style={{ marginRight: 6 }} />
              <Text style={styles.saveFeedbackErrorText}>{saveError}</Text>
            </View>
          )}

          {saveSuccessMessage && (
            <View style={styles.saveFeedbackSuccess}>
              <Ionicons name="checkmark-circle-outline" size={15} color={colors.success} style={{ marginRight: 6 }} />
              <Text style={styles.saveFeedbackSuccessText}>{saveSuccessMessage}</Text>
            </View>
          )}

          <View style={styles.saveActionsRow}>
            <TouchableOpacity
              style={[styles.savePrimaryBtn, isSavingHistory && styles.savePrimaryBtnDisabled]}
              onPress={handleSaveAnalysis}
              disabled={isSavingHistory}
              activeOpacity={0.85}
            >
              {isSavingHistory ? (
                <ActivityIndicator size="small" color={colors.textInverse} style={{ marginRight: 8 }} />
              ) : (
                <Ionicons
                  name={activeSavedAnalysisId ? 'sync-outline' : 'bookmark-outline'}
                  size={16}
                  color={colors.textInverse}
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={styles.savePrimaryBtnText}>
                {activeSavedAnalysisId ? 'Update Saved Analysis' : 'Save Analysis to History'}
              </Text>
            </TouchableOpacity>

            {activeSavedAnalysisId && (
              <TouchableOpacity
                style={styles.viewHistoryShortcutBtn}
                onPress={() => {
                  SpeechService.stopSpeech();
                  router.push('/(tabs)/history');
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="time-outline" size={15} color={colors.primary} style={{ marginRight: 5 }} />
                <Text style={styles.viewHistoryShortcutText}>Open History</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Additional Controls */}
        <View style={styles.controlsSection}>
          <PrimaryButton
            title="Analyze Another Screenshot"
            onPress={handleAnalyzeAnother}
            icon="camera-outline"
            size="lg"
            style={{ marginBottom: spacing.md }}
          />

          <SecondaryButton
            title="Back to Home Dashboard"
            onPress={handleBackToHome}
            icon="home-outline"
            variant="outline"
            size="md"
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxxl,
  },
  body: {
    padding: spacing.lg,
  },
  headerHomeBtn: {
    padding: spacing.xs,
  },
  modeSelectorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  segmentTabActive: {
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  segmentTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modeIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  modeIndicatorText: {
    fontSize: 12,
    color: colors.secondaryText,
    flex: 1,
  },
  translationCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  translationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  translationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translationCardHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.8,
  },
  viewOriginalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  viewOriginalBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  translationSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  languageDropdownToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  languageDropdownToggleLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    marginRight: 6,
  },
  languageDropdownToggleValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    flex: 1,
  },
  translateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    minWidth: 90,
  },
  translateActionBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  translateActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
  },
  languagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  languageGridItem: {
    width: '23%',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  languageGridItemActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  languageGridItemNative: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
    textAlign: 'center',
  },
  languageGridItemNativeActive: {
    color: colors.primary,
  },
  languageGridItemEnglish: {
    fontSize: 10,
    color: colors.secondaryText,
    textAlign: 'center',
  },
  languageGridItemEnglishActive: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  activeLangDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  translatedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingTop: 4,
  },
  translatedBadgeText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
  translationErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  translationErrorText: {
    fontSize: 11,
    color: colors.error,
    flex: 1,
  },
  translationRetryBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  translationRetryBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textInverse,
  },
  voiceControlCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  voiceCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  voiceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  voiceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.mutedText,
    marginRight: spacing.sm,
  },
  voiceStatusDotActive: {
    backgroundColor: colors.success,
  },
  voiceStatusDotPaused: {
    backgroundColor: '#F59E0B',
  },
  voiceCardHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  voiceSubSettingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  pitchSelectorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryText,
    marginRight: 6,
  },
  pitchPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
    marginRight: 4,
  },
  pitchPillActive: {
    backgroundColor: colors.primary,
  },
  pitchPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  pitchPillTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  voicePickerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    maxWidth: 150,
  },
  voicePickerToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },
  voiceFallbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceFallbackText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  voiceDropdownMenu: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    marginBottom: spacing.md,
  },
  voiceMenuItem: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  voiceMenuItemActive: {
    backgroundColor: colors.primarySoft,
  },
  voiceMissingWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  voiceMissingWarningText: {
    fontSize: 11,
    color: '#92400E',
    flex: 1,
    lineHeight: 16,
  },
  voiceMenuText: {
    fontSize: 12,
    color: colors.primaryText,
  },
  voiceMenuTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  speedSelectorPills: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.round,
    padding: 2,
  },
  speedPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  speedPillActive: {
    backgroundColor: colors.primary,
  },
  speedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  speedPillTextActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  voiceButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mainListenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.subtle,
  },
  mainListenButtonActive: {
    backgroundColor: '#0A4094',
  },
  mainListenButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginLeft: spacing.sm,
    ...shadows.subtle,
  },
  pauseButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },
  stopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginLeft: spacing.sm,
    ...shadows.subtle,
  },
  stopButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },
  androidNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
  androidNoticeText: {
    fontSize: 11,
    color: colors.secondaryText,
    flex: 1,
    lineHeight: 15,
  },
  speechErrorText: {
    fontSize: 12,
    color: colors.error,
    marginTop: spacing.sm,
  },
  sectionSpeakerBtn: {
    padding: spacing.xs,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionSpeakerBtnActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  simplifyingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  simplifyingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  simplifyingSubtitle: {
    fontSize: 12,
    color: colors.primaryDark,
    lineHeight: 16,
  },
  simplificationErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  simplificationErrorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  simplificationErrorMsg: {
    fontSize: 12,
    color: '#991B1B',
    marginTop: 2,
  },
  errorRetryBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
  errorRetryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  aiBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primaryText,
    marginBottom: spacing.sm,
    lineHeight: 28,
  },
  summary: {
    fontSize: 15,
    color: colors.secondaryText,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  thumbnailStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailImage: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    backgroundColor: colors.border,
  },
  thumbnailInfo: {
    flex: 1,
  },
  thumbnailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
  },
  thumbnailName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primaryText,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  pointsList: {
    gap: spacing.md,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pointBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
    marginRight: spacing.md,
  },
  pointText: {
    fontSize: 14,
    color: colors.primaryText,
    lineHeight: 21,
    flex: 1,
  },
  itemsList: {
    gap: spacing.md,
  },
  itemCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    flex: 1,
  },
  itemExplanation: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 19,
  },
  stepsList: {
    gap: spacing.md,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 19,
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: spacing.lg,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  warningBullet: {
    fontSize: 14,
    color: '#D97706',
    marginRight: spacing.sm,
    marginTop: 1,
  },
  warningText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
    flex: 1,
  },
  uncertaintyCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  uncertaintyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  uncertaintyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondaryText,
  },
  uncertaintyText: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 19,
    marginBottom: 4,
  },
  controlsSection: {
    marginTop: spacing.md,
  },
  // Phase 8: Chat Styles
  chatSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  chatSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  chatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chatSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
    marginLeft: spacing.md,
  },
  clearChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearChatBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.error,
  },
  chatEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  chatEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  chatEmptySubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  suggestedPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  suggestedPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    maxWidth: '48%',
  },
  suggestedPillText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  suggestedAfterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestedPillSmall: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestedPillSmallText: {
    fontSize: 11,
    color: colors.secondaryText,
    fontWeight: '600',
  },
  chatMessagesArea: {
    maxHeight: 360,
    marginBottom: spacing.md,
  },
  chatMessagesContent: {
    paddingVertical: spacing.xs,
  },
  chatBubbleRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
    alignItems: 'flex-end',
  },
  chatBubbleRowUser: {
    justifyContent: 'flex-end',
  },
  chatBubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  chatAvatarBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
    marginBottom: 2,
  },
  chatBubble: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceSubtle,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  failedBubble: {
    backgroundColor: colors.errorBg,
    borderColor: '#FECACA',
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userBubbleText: {
    color: colors.textInverse,
  },
  assistantBubbleText: {
    color: colors.primaryText,
  },
  failedBubbleText: {
    color: colors.error,
    fontStyle: 'italic',
  },
  chatSpeakerBtn: {
    alignSelf: 'flex-end',
    padding: 4,
    marginTop: 4,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  chatErrorText: {
    fontSize: 11,
    color: colors.error,
    flex: 1,
  },
  chatRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    marginLeft: spacing.xs,
  },
  chatRetryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.primaryText,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    maxHeight: 44,
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
  },
  chatSendBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  saveSectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  saveSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  saveTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  saveSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  saveSectionSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  savedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginLeft: spacing.sm,
  },
  savedStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  saveFieldGroup: {
    marginBottom: spacing.md,
  },
  saveFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  saveTitleInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.primaryText,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  consentTextGroup: {
    flex: 1,
    paddingRight: spacing.md,
  },
  consentTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  consentDescription: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 4,
    lineHeight: 16,
  },
  saveFeedbackError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  saveFeedbackErrorText: {
    fontSize: 12,
    color: colors.error,
    flex: 1,
  },
  saveFeedbackSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  saveFeedbackSuccessText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },
  saveActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  savePrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    ...shadows.subtle,
  },
  savePrimaryBtnDisabled: {
    backgroundColor: '#93C5FD',
  },
  savePrimaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textInverse,
  },
  viewHistoryShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  viewHistoryShortcutText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
