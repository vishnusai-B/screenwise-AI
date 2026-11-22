import { APP_CONFIG } from '../constants/config';
import { ScreenAnalysisData, ChatMessage } from '../types';
import { SupportedLanguageCode, isValidLanguageCode } from '../constants/languages';

const CHAT_REQUEST_TIMEOUT_MS = 60000; // 60 seconds

export interface SendChatMessageParams {
  analysis: ScreenAnalysisData;
  question: string;
  messages?: ChatMessage[];
  mode?: 'original' | 'simple';
  language?: SupportedLanguageCode;
  signal?: AbortSignal;
}

export interface ChatServiceResponse {
  answer: string;
  suggestedQuestions?: string[];
}

export class ChatService {
  private static isRequestInFlight = false;

  /**
   * Send a follow-up question to the Gemini chat endpoint
   */
  public static async sendChatMessage(
    params: SendChatMessageParams
  ): Promise<ChatServiceResponse> {
    if (!params.analysis) {
      throw new Error('No screen analysis context provided for follow-up chat.');
    }

    if (!params.question || params.question.trim().length === 0) {
      throw new Error('Please enter a question to ask.');
    }

    if (params.language && !isValidLanguageCode(params.language)) {
      throw new Error(`Unsupported language code: ${params.language}`);
    }

    if (params.signal?.aborted) {
      throw new Error('Question request timed out or was cancelled. Please try again.');
    }

    if (this.isRequestInFlight) {
      throw new Error('A question is already being processed. Please wait for the response.');
    }

    this.isRequestInFlight = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, CHAT_REQUEST_TIMEOUT_MS);

    if (params.signal) {
      params.signal.addEventListener('abort', () => {
        controller.abort();
      });
    }

    const sanitizedMessages = (params.messages || [])
      .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim().length > 0)
      .slice(-10)
      .map((m) => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content.trim(),
        timestamp: m.timestamp,
        status: m.status,
      }));

    try {
      const response = await fetch(`${APP_CONFIG.apiUrl}/api/chat-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          analysis: params.analysis,
          question: params.question.trim(),
          messages: sanitizedMessages,
          mode: params.mode || 'original',
          language: params.language || 'en',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const jsonResult = await response.json();

      if (!response.ok || !jsonResult.success) {
        const errorMsg =
          jsonResult.error || `Chat request failed with HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      if (!jsonResult.data || typeof jsonResult.data.answer !== 'string' || jsonResult.data.answer.trim().length === 0) {
        throw new Error('Invalid chat response format returned by server.');
      }

      return jsonResult.data as ChatServiceResponse;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          throw new Error('Question request timed out or was cancelled. Please try again.');
        }
        if (err.message.includes('Network request failed') || err.message.includes('Failed to fetch')) {
          throw new Error(
            `Unable to connect to ScreenWise backend at ${APP_CONFIG.apiUrl}. Please ensure the server is running.`
          );
        }
        throw err;
      }
      throw new Error('An unexpected network error occurred while sending your question.');
    } finally {
      this.isRequestInFlight = false;
    }
  }
}

