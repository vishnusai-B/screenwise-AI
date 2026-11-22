import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  ActivityIndicator,
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
import { ImageService } from '../services/imageService';
import { formatFileSize } from '../utils/imageValidation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PreviewScreen() {
  const router = useRouter();
  const {
    selectedImage,
    setSelectedImage,
    clearSelectedImage,
    privacyConfirmed,
    setPrivacyConfirmed,
    isLoadingImage,
    setIsLoadingImage,
    setImageError,
  } = useApp();

  const [replacing, setReplacing] = useState(false);

  // If no image is selected, show a clear empty state with upload action
  if (!selectedImage) {
    return (
      <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
        <Header title="Screenshot Preview" showBack={true} />
        <View style={styles.body}>
          <EmptyState
            icon="image-outline"
            title="No Screenshot Selected"
            description="Please choose an image from your gallery or capture one with your camera to preview."
            actionTitle="Go to Upload"
            onActionPress={() => router.replace('/upload')}
          />
        </View>
      </ScreenContainer>
    );
  }

  // Handle image replacement from gallery
  const handleReplaceGallery = async () => {
    try {
      setReplacing(true);
      setIsLoadingImage(true);
      const img = await ImageService.pickFromGallery();
      if (img) {
        setSelectedImage(img);
        setPrivacyConfirmed(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to replace image';
      setImageError(msg);
      Alert.alert('Image Selection Failed', msg);
    } finally {
      setReplacing(false);
      setIsLoadingImage(false);
    }
  };

  // Handle image replacement from camera
  const handleReplaceCamera = async () => {
    try {
      setReplacing(true);
      setIsLoadingImage(true);
      const img = await ImageService.captureFromCamera();
      if (img) {
        setSelectedImage(img);
        setPrivacyConfirmed(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera capture failed';
      setImageError(msg);
      Alert.alert('Camera Capture Failed', msg);
    } finally {
      setReplacing(false);
      setIsLoadingImage(false);
    }
  };

  const promptReplaceOption = () => {
    Alert.alert(
      'Replace Screenshot',
      'Select a new image from your gallery or capture a photo with your camera.',
      [
        { text: 'Choose from Gallery', onPress: handleReplaceGallery },
        { text: 'Take a Photo', onPress: handleReplaceCamera },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Screenshot',
      'Are you sure you want to remove this screenshot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            clearSelectedImage();
            router.replace('/upload');
          },
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!privacyConfirmed) {
      Alert.alert(
        'Privacy Confirmation Required',
        'Please verify that you have reviewed your screenshot and confirmed the privacy checkbox before continuing.'
      );
      return;
    }

    // Navigate to the Analysis preparation screen (prepares for Phase 4 AI analysis)
    router.push('/analyzing');
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title="Review Screenshot"
        subtitle="Verify details and remove sensitive information"
        showBack={true}
      />

      <View style={styles.body}>
        {/* Large Aspect-Ratio Preserving Preview Area */}
        <View style={styles.previewCard}>
          <View style={styles.imageWrapper}>
            {replacing || isLoadingImage ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Processing image...</Text>
              </View>
            ) : (
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Quick Action Overlay Strip */}
          <View style={styles.actionStrip}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={promptReplaceOption}
              activeOpacity={0.75}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color={colors.primary} />
              <Text style={styles.actionButtonText}>Replace</Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleRemoveImage}
              activeOpacity={0.75}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Metadata Specifications Card */}
        <View style={styles.metadataCard}>
          <View style={styles.metadataHeader}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.metadataTitle}>Image Specifications</Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Filename</Text>
            <Text style={styles.metaValue} numberOfLines={1}>
              {selectedImage.name || 'screenshot.png'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Format</Text>
            <View style={styles.formatBadge}>
              <Text style={styles.formatBadgeText}>
                {(selectedImage.format || 'PNG').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Dimensions</Text>
            <Text style={styles.metaValue}>
              {selectedImage.width && selectedImage.height
                ? `${selectedImage.width} × ${selectedImage.height} px`
                : 'Standard Screen Resolution'}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>File Size</Text>
            <Text style={styles.metaValue}>
              {formatFileSize(selectedImage.fileSize)}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Upload Validation</Text>
            <View style={styles.validBadge}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={styles.validBadgeText}>Format & Size Verified</Text>
            </View>
          </View>
        </View>

        {/* Section 6: Sensitive Information Warning Card */}
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="warning-outline" size={22} color="#D97706" style={{ marginRight: 8 }} />
            <Text style={styles.warningTitle}>Sensitive Information Warning</Text>
          </View>

          <Text style={styles.warningBody}>
            Your screenshot may contain sensitive information such as passwords, OTPs, bank account details, or personal information. Please review your image and remove sensitive details before continuing.
          </Text>

          {/* Confirmation Checkbox */}
          <TouchableOpacity
            style={[
              styles.checkboxRow,
              privacyConfirmed && styles.checkboxRowActive,
            ]}
            onPress={() => setPrivacyConfirmed(!privacyConfirmed)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: privacyConfirmed }}
          >
            <View
              style={[
                styles.checkboxBox,
                privacyConfirmed && styles.checkboxBoxChecked,
              ]}
            >
              {privacyConfirmed && (
                <Ionicons name="checkmark" size={16} color={colors.textInverse} />
              )}
            </View>
            <Text style={styles.checkboxLabel}>
              I have checked my screenshot and removed sensitive information.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Button Section */}
        <View style={styles.buttonSection}>
          <PrimaryButton
            title="Continue to Analysis"
            onPress={handleContinue}
            disabled={!privacyConfirmed || replacing || isLoadingImage}
            icon="arrow-forward"
            iconPosition="right"
            size="lg"
          />

          <SecondaryButton
            title="Choose a Different Screenshot"
            onPress={promptReplaceOption}
            variant="outline"
            size="md"
            style={{ marginTop: spacing.md }}
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
  previewCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  imageWrapper: {
    width: '100%',
    height: Math.min(SCREEN_WIDTH * 0.95, 380),
    backgroundColor: '#0F172A', // Slate 900 background to frame screenshot contrast
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.textInverse,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  actionStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs + 2,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
  actionDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
  },
  metadataCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    ...shadows.subtle,
  },
  metadataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  metadataTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs + 3,
  },
  metaLabel: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 13,
    color: colors.primaryText,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  formatBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  formatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  validBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  validBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  warningCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    marginBottom: spacing.xl,
    ...shadows.subtle,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#92400E',
  },
  warningBody: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkboxRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.secondaryText,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    backgroundColor: colors.surface,
  },
  checkboxBoxChecked: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
    lineHeight: 18,
  },
  buttonSection: {
    marginTop: spacing.xs,
  },
});
