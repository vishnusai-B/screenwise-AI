import { SelectedImageMetadata, ImageValidationResult } from '../types';

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const SUPPORTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
export const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

/**
 * Format bytes into readable KB / MB string
 */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Extract clean filename from URI
 */
export const getFilenameFromUri = (uri: string): string => {
  if (!uri) return 'screenshot.png';
  const cleanUri = uri.split('?')[0];
  const parts = cleanUri.split('/');
  return parts[parts.length - 1] || 'screenshot.png';
};

/**
 * Determine file extension / format from URI or mimeType
 */
export const getImageFormat = (uri: string, mimeType?: string): string => {
  if (mimeType) {
    const mimeSub = mimeType.split('/')[1];
    if (mimeSub) return mimeSub.toLowerCase();
  }

  const filename = getFilenameFromUri(uri);
  const extParts = filename.split('.');
  if (extParts.length > 1) {
    return extParts[extParts.length - 1].toLowerCase();
  }

  return 'png';
};

/**
 * Validate an image asset against type and size limits
 */
export const validateImage = (
  uri: string,
  fileSize?: number,
  mimeType?: string,
  width?: number,
  height?: number
): ImageValidationResult => {
  if (!uri || typeof uri !== 'string') {
    return {
      isValid: false,
      error: 'Invalid image reference. Please choose a valid screenshot.',
    };
  }

  const format = getImageFormat(uri, mimeType);

  // Check supported format
  const isExtensionSupported = SUPPORTED_EXTENSIONS.includes(format);
  const isMimeSupported = mimeType
    ? SUPPORTED_MIME_TYPES.includes(mimeType.toLowerCase())
    : true;

  if (!isExtensionSupported && !isMimeSupported) {
    return {
      isValid: false,
      error: `Unsupported image format (.${format}). Please upload a JPG, JPEG, PNG, or WEBP screenshot.`,
    };
  }

  // Check file size limit (10MB)
  if (fileSize && fileSize > MAX_IMAGE_SIZE_BYTES) {
    return {
      isValid: false,
      error: `Image size (${formatFileSize(
        fileSize
      )}) exceeds the maximum allowed limit of 10 MB. Please choose a smaller image.`,
    };
  }

  const imageMetadata: SelectedImageMetadata = {
    uri,
    name: getFilenameFromUri(uri),
    fileSize,
    width,
    height,
    mimeType: mimeType || `image/${format === 'jpg' ? 'jpeg' : format}`,
    format,
  };

  return {
    isValid: true,
    image: imageMetadata,
  };
};

