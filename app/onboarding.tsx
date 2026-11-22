import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { borderRadius, shadows, spacing } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';

export default function OnboardingScreen() {
  const router = useRouter();

  const handleGetStarted = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Hero Illustration */}
        <View style={styles.heroSection}>
          <View style={styles.illustrationCircle}>
            <View style={styles.screenCardMock}>
              <View style={styles.mockHeader}>
                <View style={[styles.dot, { backgroundColor: colors.error }]} />
                <View style={[styles.dot, { backgroundColor: colors.warning }]} />
                <View style={[styles.dot, { backgroundColor: colors.success }]} />
                <Text style={styles.mockUrl}>portal.service.gov/error</Text>
              </View>
              <View style={styles.mockBody}>
                <Ionicons name="alert-circle" size={26} color={colors.error} style={{ marginBottom: 6 }} />
                <Text style={styles.mockErrorTitle}>Error 403: Forbidden Action</Text>
                <Text style={styles.mockErrorSub}>Digital signature validation expired.</Text>
              </View>
            </View>

            {/* AI Magnifier badge */}
            <View style={styles.aiMagnifierBadge}>
              <Ionicons name="sparkles" size={22} color={colors.textInverse} />
            </View>
          </View>
        </View>

        {/* Text Section */}
        <View style={styles.textSection}>
          <Text style={styles.title}>Confused by what's on your screen?</Text>
          <Text style={styles.description}>
            Take a screenshot and let AI explain everything in simple language.
          </Text>
        </View>

        {/* 3 Step Features */}
        <View style={styles.stepsContainer}>
          <View style={styles.stepCard}>
            <View style={[styles.stepIconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="camera-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.stepTextContent}>
              <Text style={styles.stepTitle}>1. Snap or Upload Screenshot</Text>
              <Text style={styles.stepDesc}>Any banking form, error prompt, or government portal.</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={[styles.stepIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.12)' }]}>
              <Ionicons name="hardware-chip-outline" size={20} color={colors.accent} />
            </View>
            <View style={styles.stepTextContent}>
              <Text style={styles.stepTitle}>2. Multimodal AI Analysis</Text>
              <Text style={styles.stepDesc}>Decodes hidden errors, technical terms, and required fields.</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={[styles.stepIconBox, { backgroundColor: colors.successBg }]}>
              <Ionicons name="checkmark-done-circle-outline" size={20} color={colors.success} />
            </View>
            <View style={styles.stepTextContent}>
              <Text style={styles.stepTitle}>3. Simple Actionable Steps</Text>
              <Text style={styles.stepDesc}>Clear next steps, voice reading, and multi-language support.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Get Started"
          onPress={handleGetStarted}
          icon="arrow-forward"
          iconPosition="right"
          size="lg"
        />
        <SecondaryButton
          title="Learn More About Privacy"
          onPress={() => router.push('/(tabs)/settings')}
          variant="soft"
          size="sm"
          style={{ marginTop: spacing.sm }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: 56,
    paddingBottom: 130,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  illustrationCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  screenCardMock: {
    width: 210,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  mockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  mockUrl: {
    fontSize: 9,
    color: colors.secondaryText,
    marginLeft: 6,
    fontWeight: '500',
  },
  mockBody: {
    padding: 14,
    alignItems: 'center',
  },
  mockErrorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
    textAlign: 'center',
  },
  mockErrorSub: {
    fontSize: 10,
    color: colors.secondaryText,
    textAlign: 'center',
    marginTop: 3,
  },
  aiMagnifierBadge: {
    position: 'absolute',
    bottom: 12,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.elevated,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: spacing.sm,
    lineHeight: 32,
  },
  description: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  stepsContainer: {
    marginBottom: spacing.lg,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    padding: spacing.md + 2,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  stepIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stepTextContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.card,
  },
});

