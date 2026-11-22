import { APP_CONFIG } from '../constants/config';
import { ScreenAnalysisResult, ExplanationMode, LanguageCode } from '../types';

export interface HealthCheckResponse {
  success: boolean;
  service: string;
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  geminiConfigured: boolean;
  supabaseConfigured: boolean;
}

export class ApiService {
  private static baseUrl = APP_CONFIG.apiUrl;

  public static setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public static getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Health check to test backend connectivity
   */
  public static async checkHealth(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check returned status ${response.status}`);
      }

      return (await response.json()) as HealthCheckResponse;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to reach server';
      throw new Error(`ScreenWise API unreachable: ${errorMsg}`);
    }
  }

  /**
   * Placeholder for Phase 4 analyzeScreen endpoint call
   */
  public static async analyzeScreen(
    _imageUri: string,
    _mode: ExplanationMode = 'normal',
    _language: LanguageCode = 'en'
  ): Promise<ScreenAnalysisResult> {
    throw new Error('Screen analysis endpoint will be fully enabled in Phase 4.');
  }
}

