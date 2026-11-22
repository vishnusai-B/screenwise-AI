import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../constants/colors';
import { borderRadius, shadows, spacing } from '../constants/theme';
import { APP_CONFIG } from '../constants/config';

export default function SplashScreen() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Smooth fade and scale animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Run entering animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // After 600ms, reveal badge and loading transition
    const badgeTimer = setTimeout(() => {
      Animated.timing(badgeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 500);

    // After 1200ms, mark engine ready
    const readyTimer = setTimeout(() => {
      setReady(true);
    }, 1200);

    return () => {
      clearTimeout(badgeTimer);
      clearTimeout(readyTimer);
    };
  }, [badgeAnim, fadeAnim, scaleAnim]);

  const handleContinue = () => {
    router.replace('/onboarding');
  };

  const handleSkipToHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Decorative ambient background accents */}
      <View style={styles.ambientCircleOne} />
      <View style={styles.ambientCircleTwo} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Brand Icon Badge */}
        <View style={styles.logoBadge}>
          <View style={styles.logoInner}>
            <Ionicons name="scan" size={38} color={colors.textInverse} />
          </View>
        </View>

        {/* Application Name */}
        <Text style={styles.appName}>ScreenWise AI</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>{APP_CONFIG.tagline}</Text>

        {/* Pill Badge */}
        <Animated.View style={[styles.badgeContainer, { opacity: badgeAnim }]}>
          <View style={styles.pillBadge}>
            <Ionicons name="sparkles" size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.pillBadgeText}>Multimodal Screen Intelligence</Text>
          </View>
        </Animated.View>

        {/* Action / Loader */}
        <View style={styles.actionSection}>
          {!ready ? (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Initializing Screen Engine...</Text>
            </View>
          ) : (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={handleContinue}
                activeOpacity={0.85}
              >
                <Text style={styles.getStartedText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primaryDark} style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkipToHome}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>Go directly to Home</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Version {APP_CONFIG.version} • Android Ready</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryDark,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  ambientCircleOne: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(15, 82, 186, 0.22)',
  },
  ambientCircleTwo: {
    position: 'absolute',
    bottom: 80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: borderRadius.xxl,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxl,
    ...shadows.elevated,
  },
  logoInner: {
    width: 70,
    height: 70,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textInverse,
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: colors.accentLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    maxWidth: 290,
  },
  badgeContainer: {
    marginBottom: spacing.xxxl,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.round,
  },
  pillBadgeText: {
    color: colors.accentLight,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
    minHeight: 110,
    justifyContent: 'center',
  },
  loaderBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    color: colors.mutedText,
    fontSize: 13,
    marginLeft: spacing.sm,
  },
  buttonGroup: {
    width: '100%',
    alignItems: 'center',
  },
  getStartedButton: {
    width: '100%',
    backgroundColor: colors.textInverse,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg - 2,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  getStartedText: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.mutedText,
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});
