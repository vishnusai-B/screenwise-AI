import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { borderRadius, shadows, spacing } from '../../constants/theme';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Header } from '../../components/Header';
import { APP_CONFIG } from '../../constants/config';
import { useApp } from '../../context/AppContext';
import { HistoryService } from '../../services/historyService';
import { ExplanationMode, LanguageCode } from '../../types';

export default function SettingsScreen() {
  const {
    selectedLanguage,
    setSelectedLanguage,
    explanationMode,
    setExplanationMode,
    voiceExplanationEnabled,
    setVoiceExplanationEnabled,
    removeAllHistoryScreenshots,
    clearHistory,
    history,
  } = useApp();

  const storageStats = HistoryService.getStorageStats(history);

  const handleLanguageSelect = (code: LanguageCode) => {
    setSelectedLanguage(code);
  };

  const handleModeSelect = (mode: ExplanationMode) => {
    setExplanationMode(mode);
  };

  const showPrivacyPolicy = () => {
    Alert.alert(
      'Privacy & Security Policy',
      '• ScreenWise AI analyzes screenshots locally and in-memory.\n• Screenshots are not stored permanently unless explicitly saved by you.\n• Never upload bank passwords, CVV numbers, or OTP codes.\n• AI-generated guidance should be cross-verified on official websites.',
      [{ text: 'Understood', style: 'default' }]
    );
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title="Settings & Preferences"
        subtitle="Customize language, explanations & privacy"
      />

      <View style={styles.body}>
        {/* Section 1: Language Preference */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="language-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Explanation Language</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Select the language in which you want screen explanations and voice narration.
          </Text>

          <View style={styles.languageOptions}>
            {APP_CONFIG.supportedLanguages.map((lang) => {
              const isSelected = selectedLanguage === lang.code;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.langButton,
                    isSelected && styles.langButtonActive,
                  ]}
                  onPress={() => handleLanguageSelect(lang.code as LanguageCode)}
                  activeOpacity={0.75}
                >
                  <View style={styles.langTextCol}>
                    <Text
                      style={[
                        styles.langTitle,
                        isSelected && styles.langTitleActive,
                      ]}
                    >
                      {lang.label}
                    </Text>
                    <Text
                      style={[
                        styles.langNative,
                        isSelected && styles.langNativeActive,
                      ]}
                    >
                      {lang.nativeLabel}
                    </Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={isSelected ? colors.primary : colors.mutedText}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 2: Explanation Mode */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Explanation Mode</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Choose how simple or detailed you want AI explanations to be.
          </Text>

          <View style={styles.modeOptions}>
            {APP_CONFIG.explanationModes.map((mode) => {
              const isSelected = explanationMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.modeButton,
                    isSelected && styles.modeButtonActive,
                  ]}
                  onPress={() => handleModeSelect(mode.id as ExplanationMode)}
                  activeOpacity={0.75}
                >
                  <View style={styles.modeContent}>
                    <Text
                      style={[
                        styles.modeName,
                        isSelected && styles.modeNameActive,
                      ]}
                    >
                      {mode.name}
                    </Text>
                    <Text style={styles.modeDesc}>{mode.description}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={isSelected ? colors.primary : colors.mutedText}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 3: Voice / Accessibility */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="volume-medium-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Voice Guidance</Text>
          </View>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: spacing.md }}>
              <Text style={styles.switchLabel}>Text-to-Speech Playback</Text>
              <Text style={styles.switchSub}>
                Automatically make voice reading controls available on explanation screens.
              </Text>
            </View>
            <Switch
              value={voiceExplanationEnabled}
              onValueChange={setVoiceExplanationEnabled}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={voiceExplanationEnabled ? colors.primary : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Section 4: Privacy & Storage Management (Phase 9) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>Privacy & Storage Management</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Saved analyses: {storageStats.totalItems} ({storageStats.textOnly} text-only, {storageStats.withScreenshots} with private screenshot, {storageStats.totalChatMessages} chat messages).
          </Text>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={showPrivacyPolicy}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} style={{ marginRight: 10 }} />
              <Text style={styles.actionLabel}>View Privacy Commitment</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => {
              if (storageStats.withScreenshots === 0) {
                Alert.alert('No Saved Images', 'None of your saved analyses currently store a screenshot image.');
                return;
              }
              Alert.alert(
                'Remove Saved Screenshots',
                'Delete all saved private screenshots while keeping your text explanations, translations, and follow-up chats?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove Images', style: 'destructive', onPress: () => removeAllHistoryScreenshots() },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="images-outline" size={18} color={colors.warning} style={{ marginRight: 10 }} />
              <Text style={[styles.actionLabel, { color: colors.warning }]}>
                Remove Saved Screenshots (Keep Text)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={() => {
              if (history.length === 0) {
                Alert.alert('History Empty', 'There are no saved analyses to delete.');
                return;
              }
              Alert.alert(
                'Delete All Saved Data',
                'Are you sure you want to delete all saved analyses, chats, and private screenshots?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete All', style: 'destructive', onPress: clearHistory },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="trash-outline" size={18} color={colors.error} style={{ marginRight: 10 }} />
              <Text style={[styles.actionLabel, { color: colors.error }]}>Delete All Saved Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedText} />
          </TouchableOpacity>
        </View>

        {/* Section 5: About App */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>About ScreenWise AI</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{APP_CONFIG.version}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>AI Model</Text>
            <Text style={styles.infoValue}>Google Gemini Vision</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Target Platform</Text>
            <Text style={styles.infoValue}>Android Native / Expo EAS</Text>
          </View>
          <View style={styles.disclaimerBox}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} style={{ marginRight: 6 }} />
            <Text style={styles.disclaimerText}>
              ScreenWise AI provides educational and explanatory assistance. Always verify sensitive banking and legal instructions directly through official sources.
            </Text>
          </View>
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
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  sectionDescription: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: spacing.md,
    lineHeight: 17,
  },
  languageOptions: {
    marginTop: spacing.xs,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  langButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  langTextCol: {
    flex: 1,
  },
  langTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  langTitleActive: {
    color: colors.primary,
  },
  langNative: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 1,
  },
  langNativeActive: {
    color: colors.primary,
  },
  modeOptions: {
    marginTop: spacing.xs,
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  modeContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  modeName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
  },
  modeNameActive: {
    color: colors.primary,
  },
  modeDesc: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  switchSub: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 2,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
});

