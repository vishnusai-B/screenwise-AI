import { APP_CONFIG } from '../constants/config';
import { ScreenAnalysisData } from '../types';
import { SupportedLanguageCode, isValidLanguageCode } from '../constants/languages';

const TRANSLATION_REQUEST_TIMEOUT_MS = 150000; // 150 seconds

export interface TranslateApiResponse {
  success: boolean;
  data?: ScreenAnalysisData;
  error?: string;
}

export class TranslationService {
  /**
   * Request translation of structured screen analysis into target language
   */
  public static async translateAnalysis(
    analysis: ScreenAnalysisData,
    targetLanguage: SupportedLanguageCode,
    externalSignal?: AbortSignal
  ): Promise<ScreenAnalysisData> {
    if (!analysis) {
      throw new Error('No analysis data provided for translation.');
    }

    if (!isValidLanguageCode(targetLanguage)) {
      throw new Error(`Unsupported target language code: ${targetLanguage}`);
    }

    // English source directly returns without network request
    if (targetLanguage === 'en') {
      return analysis;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, TRANSLATION_REQUEST_TIMEOUT_MS);

    // Forward external cancellation if user navigates away or cancels
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => {
        controller.abort();
      });
    }

    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/api/translate-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          analysis,
          targetLanguage,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const jsonResult = (await response.json()) as TranslateApiResponse;

      if (!response.ok || !jsonResult.success) {
        const errorMsg =
          jsonResult.error || `Translation request failed with HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      if (!jsonResult.data) {
        throw new Error('Translation response missing translated data.');
      }

      return jsonResult.data;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Translation request timed out or was cancelled. Please try again.');
        }
        if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
          throw new Error(
            `Unable to connect to ScreenWise backend at ${APP_CONFIG.apiUrl}. Please ensure the server is running.`
          );
        }
        throw err;
      }
      throw new Error('An unexpected network error occurred while translating explanation.');
    }
  }
}

