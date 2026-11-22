import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import { APP_CONFIG } from '../constants/config';
import { ScreenAnalysisData, SelectedImageMetadata } from '../types';

export interface AnalysisApiResponse {
  success: boolean;
  data?: ScreenAnalysisData;
  error?: string;
}

export class AnalysisService {
  private static baseUrl = APP_CONFIG.apiUrl;
  public static readonly REQUEST_TIMEOUT_MS = 180000; // 180 seconds to accommodate Gemini vision + up to 2 transient retries

  public static setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public static getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Upload screenshot to backend for Gemini Multimodal AI analysis
   * @param image Selected image metadata with file URI
   * @param externalSignal Optional AbortSignal from calling component for user cancellation
   */
  public static async analyzeScreen(
    image: SelectedImageMetadata,
    externalSignal?: AbortSignal
  ): Promise<ScreenAnalysisData> {
    if (!image || !image.uri) {
      throw new Error('No valid image provided for analysis.');
    }

    const endpoint = `${this.baseUrl}/api/analyze-screen`;

    // Construct multipart FormData compatible with Expo SDK 58 (Native & Web)
    const formData = new FormData();

    // Determine clean filename and MIME type
    const filename = image.name || 'screenshot.jpg';
    const mimeType =
      image.mimeType ||
      (filename.toLowerCase().endsWith('.png')
        ? 'image/png'
        : filename.toLowerCase().endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg');

    try {
      if (Platform.OS === 'web') {
        const fileResponse = await fetch(image.uri);
        if (!fileResponse.ok) {
          throw new Error(`Unable to read screenshot file (status ${fileResponse.status}).`);
        }
        const blob = await fileResponse.blob();
        if (!blob || blob.size === 0) {
          throw new Error('The selected screenshot file is empty or unreadable.');
        }
        formData.append('image', blob, filename);
      } else {
        // Native (Android & iOS): ExpoFile implements Blob and is natively supported by FormData in Expo SDK 58
        const expoFile = new ExpoFile(image.uri);
        if (!expoFile.exists || expoFile.size === 0) {
          throw new Error('The selected screenshot file is empty or unreadable.');
        }
        formData.append('image', expoFile, filename);
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'Unknown file read error';
      throw new Error(
        `Failed to prepare screenshot for upload (${detail}). Please re-select the image and try again.`
      );
    }

    // Timeout controller (180 seconds)
    const abortController = new AbortController();
    let isTimedOut = false;

    const timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      abortController.abort();
    }, this.REQUEST_TIMEOUT_MS);

    const handleExternalAbort = () => {
      abortController.abort();
    };

    // Forward external cancellation signal if provided
    if (externalSignal) {
      if (externalSignal.aborted) {
        clearTimeout(timeoutTimer);
        throw new Error('Analysis request was cancelled. Please keep the app on the Analyzing screen and try again.');
      }
      externalSignal.addEventListener('abort', handleExternalAbort);
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
          // Note: Do not explicitly set Content-Type header with multipart/form-data
          // React Native fetch will automatically set it along with the multipart boundary
        },
        signal: abortController.signal,
      });

      clearTimeout(timeoutTimer);

      const jsonText = await response.text();
      let result: AnalysisApiResponse;

      try {
        result = JSON.parse(jsonText);
      } catch {
        throw new Error(
          `Server returned an unparseable response (HTTP ${response.status}). Please check server logs.`
        );
      }

      if (!response.ok || !result.success || !result.data) {
        const errorMsg =
          result.error || `Server returned error status HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      return result.data;
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);

      if (err instanceof Error) {
        const msgLower = err.message.toLowerCase();
        const isAbortOrCancel =
          err.name === 'AbortError' ||
          msgLower.includes('fetch request has been canceled') ||
          msgLower.includes('aborted');

        if (isAbortOrCancel) {
          if (isTimedOut) {
            throw new Error(
              'The analysis request timed out after 180 seconds. Gemini AI may be experiencing high demand — please wait a moment and try again.'
            );
          }
          throw new Error(
            'Analysis request was cancelled before completion. Please stay on the Analyzing screen and tap Retry.'
          );
        }
        if (
          msgLower.includes('network request failed') ||
          msgLower.includes('connectexception') ||
          msgLower.includes('failed to connect')
        ) {
          throw new Error(
            `Unable to connect to the backend server at ${this.baseUrl}. Please verify your Wi-Fi hotspot connection and backend server status.`
          );
        }
        throw err;
      }

      throw new Error('Failed to analyze screenshot due to an unexpected connection error.');
    } finally {
      if (externalSignal) {
        externalSignal.removeEventListener('abort', handleExternalAbort);
      }
    }
  }

  /**
   * Request Simple Language rewrite of existing structured analysis
   * @param analysis The original ScreenAnalysisData
   * @param externalSignal Optional AbortSignal for cancellation
   */
  public static async simplifyAnalysis(
    analysis: ScreenAnalysisData,
    externalSignal?: AbortSignal
  ): Promise<ScreenAnalysisData> {
    if (!analysis) {
      throw new Error('No analysis data provided for simplification.');
    }

    const endpoint = `${this.baseUrl}/api/simplify-analysis`;

    const abortController = new AbortController();
    let isTimedOut = false;

    const timeoutTimer = setTimeout(() => {
      isTimedOut = true;
      abortController.abort();
    }, 120000); // 120 seconds timeout

    if (externalSignal) {
      externalSignal.addEventListener('abort', () => {
        abortController.abort();
      });
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ analysis }),
        signal: abortController.signal,
      });

      clearTimeout(timeoutTimer);

      const jsonText = await response.text();
      let result: AnalysisApiResponse;

      try {
        result = JSON.parse(jsonText);
      } catch {
        throw new Error(
          `Server returned an unparseable response (HTTP ${response.status}). Please check server logs.`
        );
      }

      if (!response.ok || !result.success || !result.data) {
        const errorMsg =
          result.error || `Server returned error status HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      return result.data;
    } catch (err: unknown) {
      clearTimeout(timeoutTimer);

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          if (isTimedOut) {
            throw new Error(
              'The simplification request timed out. Please check your network and try again.'
            );
          }
          throw new Error('Simplification request was cancelled.');
        }
        if (err.message.includes('Network request failed')) {
          throw new Error(
            `Unable to connect to the backend server at ${this.baseUrl}. Please check your connection.`
          );
        }
        throw err;
      }

      throw new Error('Failed to simplify explanation due to an unexpected connection error.');
    }
  }
}
