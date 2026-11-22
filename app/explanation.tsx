import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { borderRadius, shadows, spacing } from '../constants/theme';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { useApp } from '../context/AppContext';
import { ExplanationMode, LanguageCode } from '../types';

export default function ExplanationScreen() {
  const router = useRouter();
  const {
    currentAnalysis,
    explanationMode,
    setExplanationMode,
    selectedLanguage,
    setSelectedLanguage,
    isSpeaking,
    setIsSpeaking,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'explanation' | 'steps' | 'errors'>('explanation');

  // Fallback sample analysis if opened without active item
  const analysis = currentAnalysis || {
    screenTitle: 'NetBanking Session Timeout Error',
    screenType: 'Banking Portal Error',
    summary:
      'Your session expired after 5 minutes of inactivity to protect your account. No money was deducted.',
    importantInformation: [
      'Reference Code: ERR-SBI-904',
      'Transaction State: Incomplete / Cancelled',
      'Account Security: Uncompromised',
    ],
    detectedErrors: [
      {
        message: 'HTTP 401: Unauthorized / Session Token Invalidation',
        explanation: 'The security gateway terminated the link because no clicks were detected.',
        suggestedSolution: 'Return to login, enter your password again, and complete the transfer.',
      },
    ],
    nextSteps: [
      {
        step: 1,
        title: 'Close the timeout dialog',
        description: 'Click OK or Cancel on the pop-up warning.',
      },
      {
        step: 2,
        title: 'Open Official Login Page',
        description: 'Ensure the URL starts with https:// before entering credentials.',
      },
      {
        step: 3,
        title: 'Re-authenticate with OTP',
        description: 'Verify your phone receives the one-time passcode.',
      },
    ],
    warnings: [
      'Never disclose banking OTP or login credentials to anyone claiming to restore your session.',
    ],
    confidence: 'high' as const,
    mode: 'normal' as const,
    language: 'en' as const,
  };

  const handleVoiceToggle = () => {
    setIsSpeaking(!isSpeaking);
    Alert.alert(
      isSpeaking ? 'Voice Paused' : 'Voice Explanation',
      isSpeaking
        ? 'Narration paused.'
        : 'Playing voice explanation. Full multilingual Expo Speech synthesis is fully activated in Phase 6.'
    );
  };

  const getLanguageLabel = (code: string) => {
    switch (code) {
      case 'te':
        return 'తెలుగు (Telugu)';
      case 'hi':
        return 'हिन्दी (Hindi)';
      case 'en':
      default:
        return 'English';
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title="Screen Explanation"
        subtitle={analysis.screenType}
        showBack={true}
        rightAction={
          <TouchableOpacity
            style={[styles.voiceButton, isSpeaking && styles.voiceButtonActive]}
            onPress={handleVoiceToggle}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
              size={20}
              color={isSpeaking ? colors.textInverse : colors.primary}
            />
          </TouchableOpacity>
        }
      />

      <View style={styles.body}>
        {/* Screen Title & Category Badge */}
        <View style={styles.titleCard}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{analysis.screenType}</Text>
            </View>
            <View style={styles.confidenceBadge}>
              <Ionicons name="shield-checkmark" size={13} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={styles.confidenceText}>High Confidence</Text>
            </View>
          </View>
          <Text style={styles.title}>{analysis.screenTitle}</Text>
        </View>

        {/* Language & Mode Selector Controls */}
        <View style={styles.controlsCard}>
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Language:</Text>
            <View style={styles.pillRow}>
              {(['en', 'te', 'hi'] as LanguageCode[]).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.smallPill,
                    selectedLanguage === lang && styles.smallPillActive,
                  ]}
                  onPress={() => setSelectedLanguage(lang)}
                >
                  <Text
                    style={[
                      styles.smallPillText,
                      selectedLanguage === lang && styles.smallPillTextActive,
                    ]}
                  >
                    {lang === 'en' ? 'EN' : lang === 'te' ? 'తెలుగు' : 'हिन्दी'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.controlRow, { marginTop: spacing.sm }]}>
            <Text style={styles.controlLabel}>Mode:</Text>
            <View style={styles.pillRow}>
              {(['normal', 'simple', 'eli10'] as ExplanationMode[]).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.smallPill,
                    explanationMode === mode && styles.smallPillActive,
                  ]}
                  onPress={() => setExplanationMode(mode)}
                >
                  <Text
                    style={[
                      styles.smallPillText,
                      explanationMode === mode && styles.smallPillTextActive,
                    ]}
                  >
                    {mode === 'normal' ? 'Normal' : mode === 'simple' ? 'Simple' : 'ELI10'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Tab Pills */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'explanation' && styles.tabButtonActive]}
            onPress={() => setActiveTab('explanation')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'explanation' && styles.tabButtonTextActive]}>
              Summary
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'steps' && styles.tabButtonActive]}
            onPress={() => setActiveTab('steps')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'steps' && styles.tabButtonTextActive]}>
              Next Steps ({analysis.nextSteps.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'errors' && styles.tabButtonActive]}
            onPress={() => setActiveTab('errors')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'errors' && styles.tabButtonTextActive]}>
              Errors ({analysis.detectedErrors.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content: Explanation */}
        {activeTab === 'explanation' && (
          <View>
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="sparkles" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.cardTitle}>What This Screen Means</Text>
              </View>
              <Text style={styles.summaryText}>{analysis.summary}</Text>
            </View>

            {analysis.importantInformation.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="bookmark-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.cardTitle}>Important Information</Text>
                </View>
                {analysis.importantInformation.map((info, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Ionicons name="ellipse" size={6} color={colors.primary} style={{ marginTop: 7, marginRight: 8 }} />
                    <Text style={styles.bulletText}>{info}</Text>
                  </View>
                ))}
              </View>
            )}

            {analysis.warnings.length > 0 && (
              <View style={styles.warningCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="shield-outline" size={18} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={[styles.cardTitle, { color: '#B45309' }]}>Safety Precaution</Text>
                </View>
                {analysis.warnings.map((warn, idx) => (
                  <Text key={idx} style={styles.warningText}>
                    {warn}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Tab Content: Steps */}
        {activeTab === 'steps' && (
          <View style={styles.stepsContainer}>
            {analysis.nextSteps.map((step) => (
              <View key={step.step} style={styles.stepItemCard}>
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
        )}

        {/* Tab Content: Errors */}
        {activeTab === 'errors' && (
          <View>
            {analysis.detectedErrors.length === 0 ? (
              <View style={styles.noErrorCard}>
                <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} style={{ marginBottom: 6 }} />
                <Text style={styles.noErrorTitle}>No Direct Errors Found</Text>
                <Text style={styles.noErrorSub}>This screen represents normal informational or form content.</Text>
              </View>
            ) : (
              analysis.detectedErrors.map((err, idx) => (
                <View key={idx} style={styles.errorCard}>
                  <View style={styles.errorHeader}>
                    <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: 6 }} />
                    <Text style={styles.errorMessage}>{err.message}</Text>
                  </View>
                  <Text style={styles.errorExplanation}>
                    <Text style={{ fontWeight: '700' }}>Meaning: </Text>
                    {err.explanation}
                  </Text>
                  <View style={styles.solutionBox}>
                    <Ionicons name="checkmark-done" size={16} color={colors.success} style={{ marginRight: 6 }} />
                    <Text style={styles.solutionText}>
                      <Text style={{ fontWeight: '700' }}>Solution: </Text>
                      {err.suggestedSolution}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Bottom Conversation Bar */}
        <View style={styles.askAiBar}>
          <PrimaryButton
            title="Ask Follow-Up (Available in Phase 6)"
            onPress={() => {}}
            disabled={true}
            icon="chatbubble-ellipses-outline"
            size="lg"
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
  voiceButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonActive: {
    backgroundColor: colors.primary,
  },
  titleCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  categoryBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
    marginRight: spacing.sm,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: -0.3,
  },
  controlsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  smallPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  smallPillTextActive: {
    color: colors.textInverse,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.surface,
    ...shadows.subtle,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  summaryText: {
    fontSize: 14,
    color: colors.primaryText,
    lineHeight: 21,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  warningCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.3)',
    marginBottom: spacing.md,
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  stepsContainer: {
    marginBottom: spacing.md,
  },
  stepItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textInverse,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 3,
  },
  stepDescription: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  noErrorCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  noErrorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  noErrorSub: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 4,
  },
  errorCard: {
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
    marginBottom: spacing.md,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
    flex: 1,
  },
  errorExplanation: {
    fontSize: 13,
    color: colors.primaryText,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  solutionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  solutionText: {
    flex: 1,
    fontSize: 13,
    color: colors.success,
    lineHeight: 18,
  },
  askAiBar: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
});

