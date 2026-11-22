import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { AnalysisService } from '../services/analysisService';
import { colors } from '../constants/colors';
import { spacing, borderRadius, shadows } from '../constants/theme';
import { PrimaryButton, SecondaryButton } from '../components';
import { ScreenAnalysisData } from '../types';
import { adaptAiDataToResult } from '../services/historyService';

const STAGES = [
  'Uploading screenshot to ScreenWise server...',
  'Extracting visible text and system elements...',
  'Analyzing layout and error messages with Gemini AI...',
  'Structuring simplified explanation and next steps...',
];

export default function AnalyzingScreen() {
  const router = useRouter();
  const {
    selectedImage,
    setLatestAiAnalysis,
    setCurrentAnalysis,
  } = useApp();

  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Prevent duplicate concurrent requests and manage lifecycle
  const hasTriggeredRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const stageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAnalysis = async () => {
    if (isAnalyzing) return;
    if (!selectedImage) {
      setErrorMessage('No screenshot selected. Please return and select an image.');
      return;
    }

    try {
      setIsAnalyzing(true);
      setErrorMessage(null);
      setCurrentStageIndex(0);

      // Create new AbortController for this attempt
      abortControllerRef.current = new AbortController();

      // Rotate informational stage indicators while waiting for backend
      stageIntervalRef.current = setInterval(() => {
        setCurrentStageIndex((prev) => (prev + 1) % STAGES.length);
      }, 2000);

      const aiData: ScreenAnalysisData = await AnalysisService.analyzeScreen(
        selectedImage,
        abortControllerRef.current.signal
      );

      // Save structured AI response (Note: never saved to History or cloud automatically; requires explicit user action on Results screen)
      setLatestAiAnalysis(aiData);

      const adaptedResult = adaptAiDataToResult(
        `curr-${Date.now()}`,
        aiData,
        new Date().toISOString()
      );
      setCurrentAnalysis(adaptedResult);

      // Navigate to dedicated results screen
      router.replace('/results');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'An unexpected error occurred during analysis.';
      setErrorMessage(msg);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
      if (stageIntervalRef.current) {
        clearInterval(stageIntervalRef.current);
        stageIntervalRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      startAnalysis();
    }

    return () => {
      // Allow re-triggering if React StrictMode or router remounts this screen
      hasTriggeredRef.current = false;
      // Abort in-flight request and clear timer on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (stageIntervalRef.current) {
        clearInterval(stageIntervalRef.current);
        stageIntervalRef.current = null;
      }
    };
  }, []);

  const handleRetry = () => {
    hasTriggeredRef.current = false;
    startAnalysis();
  };

  const handleReturnToPreview = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    router.replace('/preview');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Decorative ambient gradients */}
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />

      <View style={styles.content}>
        {/* Animated Scanner Visual */}
        <View style={styles.scannerRingOuter}>
          <View style={styles.scannerRingInner}>
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.thumbnail}
                resizeMode="cover"
              />
            ) : (
              <Ionicons name="scan-outline" size={44} color={colors.accent} />
            )}
            <View style={styles.radarSweep}>
              {isAnalyzing ? (
                <ActivityIndicator size="large" color={colors.accent} />
              ) : (
                <Ionicons name="alert-circle" size={40} color={colors.error} />
              )}
            </View>
          </View>
        </View>

        {isAnalyzing ? (
          <>
            <Text style={styles.title}>Understanding your screen...</Text>
            <Text style={styles.stageText}>{STAGES[currentStageIndex]}</Text>

            <View style={styles.stagesIndicatorCard}>
              <View style={styles.statusRow}>
                <Ionicons name="sparkles" size={16} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={styles.statusNotice}>
                  Google Gemini Multimodal Vision AI is analyzing visible text, form elements, and alerts.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleReturnToPreview}
              activeOpacity={0.7}
              style={styles.cancelButton}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.textInverse} style={{ marginRight: 6 }} />
              <Text style={styles.cancelText}>Cancel Analysis</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.errorTitle}>Analysis Incomplete</Text>
            <Text style={styles.errorDescription}>{errorMessage}</Text>

            <View style={styles.buttonStack}>
              <PrimaryButton
                title="Retry Analysis"
                onPress={handleRetry}
                icon="refresh"
                size="lg"
                style={{ marginBottom: spacing.md }}
              />

              <SecondaryButton
                title="Return to Preview"
                onPress={handleReturnToPreview}
                icon="arrow-back"
                variant="outline"
                size="md"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  ambientTop: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(15, 82, 186, 0.25)',
  },
  ambientBottom: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  scannerRingOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    backgroundColor: 'rgba(10, 37, 64, 0.6)',
    ...shadows.elevated,
  },
  scannerRingInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    opacity: 0.45,
  },
  radarSweep: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 37, 64, 0.3)',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  stageText: {
    fontSize: 14,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.xl,
    minHeight: 20,
    fontWeight: '500',
  },
  stagesIndicatorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusNotice: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 18,
    flex: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.round,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: spacing.sm,
  },
  cancelText: {
    fontSize: 13,
    color: colors.textInverse,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textInverse,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  buttonStack: {
    width: '100%',
  },
});
