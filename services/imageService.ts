import * as ImagePicker from 'expo-image-picker';
import { SelectedImageMetadata } from '../types';
import { validateImage } from '../utils/imageValidation';

export interface PermissionStatusResult {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

export class ImageService {
  /**
   * Check and request photo library access
   */
  public static async requestMediaLibraryPermission(): Promise<PermissionStatusResult> {
    try {
      const { status, canAskAgain } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== ImagePicker.PermissionStatus.GRANTED) {
        return {
          granted: false,
          canAskAgain,
          message:
            'ScreenWise AI requires access to your photo library to select screenshots for AI analysis.',
        };
      }

      return { granted: true, canAskAgain: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Permission check failed';
      return { granted: false, canAskAgain: false, message: msg };
    }
  }

  /**
   * Check and request camera access
   */
  public static async requestCameraPermission(): Promise<PermissionStatusResult> {
    try {
      const { status, canAskAgain } =
        await ImagePicker.requestCameraPermissionsAsync();

      if (status !== ImagePicker.PermissionStatus.GRANTED) {
        return {
          granted: false,
          canAskAgain,
          message:
            'ScreenWise AI requires access to your camera to capture physical computer screens or printed documents.',
        };
      }

      return { granted: true, canAskAgain: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Camera permission check failed';
      return { granted: false, canAskAgain: false, message: msg };
    }
  }

  /**
   * Select a screenshot from the device gallery
   */
  public static async pickFromGallery(): Promise<SelectedImageMetadata | null> {
    const permission = await this.requestMediaLibraryPermission();
    if (!permission.granted) {
      throw new Error(
        permission.message ||
          'Permission denied. Please grant photo library access in your device settings.'
      );
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const validation = validateImage(
      asset.uri,
      asset.fileSize,
      asset.mimeType,
      asset.width,
      asset.height
    );

    if (!validation.isValid || !validation.image) {
      throw new Error(validation.error || 'Failed to validate selected image.');
    }

    return validation.image;
  }

  /**
   * Capture a screen or document directly using the camera
   */
  public static async captureFromCamera(): Promise<SelectedImageMetadata | null> {
    const permission = await this.requestCameraPermission();
    if (!permission.granted) {
      throw new Error(
        permission.message ||
          'Camera permission denied. Please enable camera access in your device settings.'
      );
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    const validation = validateImage(
      asset.uri,
      asset.fileSize,
      asset.mimeType,
      asset.width,
      asset.height
    );

    if (!validation.isValid || !validation.image) {
      throw new Error(validation.error || 'Failed to validate captured image.');
    }

    return validation.image;
  }
}

