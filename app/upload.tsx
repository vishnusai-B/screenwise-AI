import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { borderRadius, shadows, spacing } from '../constants/theme';
import { ScreenContainer } from '../components/ScreenContainer';
import { Header } from '../components/Header';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { useApp } from '../context/AppContext';
import { ImageService } from '../services/imageService';
import { formatFileSize } from '../utils/imageValidation';

export default function UploadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; category?: string }>();
  const {
    selectedImage,
    setSelectedImage,
    clearSelectedImage,
    isLoadingImage,
    setIsLoadingImage,
    imageError,
    setImageError,
  } = useApp();

  const [loadingAction, setLoadingAction] = useState<'gallery' | 'camera' | null>(null);

  // Pick from Gallery
  const handlePickFromGallery = async () => {
    try {
      setLoadingAction('gallery');
      setIsLoadingImage(true);
      setImageError(null);

      const image = await ImageService.pickFromGallery();
      if (image) {
        setSelectedImage(image);
        // Automatically advance to dedicated preview screen
        router.push('/preview');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to select image';
      setImageError(msg);
      Alert.alert('Image Selection Failed', msg);
    } finally {
      setLoadingAction(null);
      setIsLoadingImage(false);
    }
  };

  // Capture with Camera
  const handleCaptureFromCamera = async () => {
    try {
      setLoadingAction('camera');
      setIsLoadingImage(true);
      setImageError(null);

      const image = await ImageService.captureFromCamera();
      if (image) {
        setSelectedImage(image);
        // Automatically advance to dedicated preview screen
        router.push('/preview');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to capture photo';
      setImageError(msg);
      Alert.alert('Camera Capture Failed', msg);
    } finally {
      setLoadingAction(null);
      setIsLoadingImage(false);
    }
  };

  // Auto-launch camera if opened via "Take a Photo" from Home
  useEffect(() => {
    if (params.source === 'camera' && !selectedImage) {
      handleCaptureFromCamera();
    }
  }, [params.source]);

  const handleRemove = () => {
    clearSelectedImage();
  };

  const handleGoToPreview = () => {
    if (selectedImage) {
      router.push('/preview');
    }
  };

  return (
    <ScreenContainer scrollable={true} contentContainerStyle={styles.container}>
      <Header
        title="Upload Screenshot"
        subtitle={params.category ? `Target: ${params.category}` : 'Understand any digital screen'}
        showBack={true}
      />

      <View style={styles.body}>
        {/* Category Pill */}
        {params.category && (
          <View style={styles.categoryPill}>
            <Ionicons name="folder-open-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.categoryPillText}>Category: {params.category}</Text>
          </View>
        )}

        {/* Error Alert Banner if an error occurred */}
        {imageError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{imageError}</Text>
          </View>
        )}

        {/* Existing Screenshot Preview or Upload Dropzone */}
        {selectedImage ? (
          <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
              <View style={styles.previewBadge}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.previewBadgeText}>Screenshot Selected</Text>
              </View>
              <TouchableOpacity
                onPress={handleRemove}
                style={styles.removeImageButton}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={styles.removeImageText}>Remove</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.imageFrame}>
              <Image
                source={{ uri: selectedImage.uri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaText} numberOfLines={1}>
                {selectedImage.name || 'screenshot.png'} • {formatFileSize(selectedImage.fileSize)}
              </Text>
            </View>

            <View style={styles.previewActions}>
              <SecondaryButton
                title="Replace Image"
                onPress={handlePickFromGallery}
                icon="images-outline"
                variant="outline"
                size="sm"
                loading={loadingAction === 'gallery'}
                style={{ flex: 1, marginRight: spacing.sm }}
              />
              <SecondaryButton
                title="Retake Photo"
                onPress={handleCaptureFromCamera}
                icon="camera-outline"
                variant="outline"
                size="sm"
                loading={loadingAction === 'camera'}
                style={{ flex: 1 }}
              />
            </View>

            <View style={{ marginTop: spacing.md }}>
              <PrimaryButton
                title="Proceed to Review Screen"
                onPress={handleGoToPreview}
                icon="arrow-forward"
                iconPosition="right"
                size="lg"
              />
            </View>
          </View>
        ) : (
          <View style={styles.dropzone}>
            <View style={styles.illustrationIconBox}>
              {isLoadingImage ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={44} color={colors.primary} />
              )}
            </View>
            <Text style={styles.dropzoneTitle}>Select Screenshot</Text>
            <Text style={styles.dropzoneDescription}>
              Upload a clear image of an error message, banking transaction, government form, or college portal screen.
            </Text>

            <View style={styles.buttonStack}>
              <PrimaryButton
                title="Choose from Gallery"
                onPress={handlePickFromGallery}
                icon="images-outline"
                size="lg"
                loading={loadingAction === 'gallery'}
                style={{ marginBottom: spacing.md }}
              />
              <SecondaryButton
                title="Take a Photo"
                onPress={handleCaptureFromCamera}
                icon="camera-outline"
                variant="soft"
                size="md"
                loading={loadingAction === 'camera'}
              />
            </View>
          </View>
        )}

        {/* Supported Formats Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.infoTitle}>Supported Formats & Limits</Text>
          </View>
          <Text style={styles.infoText}>
            Supports JPG, JPEG, PNG, and WEBP formats up to 10 MB. High-resolution screenshots preserve text clarity for superior multimodal analysis.
          </Text>

          <View style={styles.tagRow}>
            <View style={styles.formatTag}>
              <Text style={styles.formatTagText}>JPG / JPEG</Text>
            </View>
            <View style={styles.formatTag}>
              <Text style={styles.formatTagText}>PNG</Text>
            </View>
            <View style={styles.formatTag}>
              <Text style={styles.formatTagText}>WEBP</Text>
            </View>
            <View style={styles.formatTag}>
              <Text style={styles.formatTagText}>Max 10 MB</Text>
            </View>
          </View>
        </View>

        {/* Security & Privacy Notice */}
        <View style={styles.privacyNoticeCard}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.success} style={{ marginRight: 8, marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.privacyNoticeTitle}>Privacy Commitment</Text>
            <Text style={styles.privacyNoticeText}>
              Screenshots are never saved permanently on remote servers without explicit consent. Sensitive numbers and credentials should be redacted before analysis.
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
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(15, 82, 186, 0.2)',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.25)',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.error,
    lineHeight: 18,
  },
  dropzone: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginBottom: spacing.xl,
    ...shadows.subtle,
  },
  illustrationIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  dropzoneTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: spacing.xs,
  },
  dropzoneDescription: {
    fontSize: 13,
    color: colors.secondaryText,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.xxl,
    maxWidth: 290,
  },
  buttonStack: {
    width: '100%',
  },
  previewContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successBg,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.success,
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
  },
  removeImageText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '600',
    marginLeft: 4,
  },
  imageFrame: {
    height: 280,
    backgroundColor: '#0F172A',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  metaRow: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  previewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  infoText: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  formatTag: {
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formatTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryText,
  },
  privacyNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.successBg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.2)',
  },
  privacyNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    marginBottom: 2,
  },
  privacyNoticeText: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 17,
  },
});
