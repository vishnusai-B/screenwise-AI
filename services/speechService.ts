import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

export type SpeechRate = 'slow' | 'normal' | 'fast';
export type SpeechPitch = 'low' | 'normal' | 'high';

export interface SpeechServiceOptions {
  rate?: SpeechRate;
  pitch?: SpeechPitch | number;
  voice?: string;
  language?: string;
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: (error: Error) => void;
}

export const SPEECH_RATE_VALUES: Record<SpeechRate, number> = {
  slow: 0.8,
  normal: 1.0,
  fast: 1.25,
};

export const SPEECH_PITCH_VALUES: Record<SpeechPitch, number> = {
  low: 0.85,
  normal: 1.0, // Natural default pitch
  high: 1.15,
};

export class SpeechService {
  private static isSpeakingCurrently = false;
  private static isPausedCurrently = false;

  /**
   * Check if Text-To-Speech is currently speaking
   */
  public static async isSpeaking(): Promise<boolean> {
    try {
      const nativeIsSpeaking = await Speech.isSpeakingAsync();
      return nativeIsSpeaking || this.isSpeakingCurrently;
    } catch {
      return this.isSpeakingCurrently;
    }
  }

  /**
   * Check if playback is currently paused (iOS / Web)
   */
  public static isPaused(): boolean {
    return this.isPausedCurrently;
  }

  /**
   * Speaks the supplied text out loud with options.
   * Always cancels any previous speech to prevent overlapping audio.
   */
  public static async speakText(
    text: string,
    options: SpeechServiceOptions = {}
  ): Promise<void> {
    if (!text || text.trim().length === 0) {
      return;
    }

    // Stop any ongoing speech before starting a new one to prevent audio overlapping
    await this.stopSpeech();

    const rateMultiplier = SPEECH_RATE_VALUES[options.rate || 'normal'];
    
    // Resolve pitch: numeric or preset
    let pitchValue = 1.0;
    if (typeof options.pitch === 'number') {
      pitchValue = options.pitch;
    } else if (typeof options.pitch === 'string' && SPEECH_PITCH_VALUES[options.pitch]) {
      pitchValue = SPEECH_PITCH_VALUES[options.pitch];
    }

    const language = options.language || 'en-US';

    this.isSpeakingCurrently = true;
    this.isPausedCurrently = false;

    Speech.speak(text, {
      language,
      rate: rateMultiplier,
      pitch: pitchValue,
      voice: options.voice,
      onStart: () => {
        this.isSpeakingCurrently = true;
        this.isPausedCurrently = false;
        if (options.onStart) {
          options.onStart();
        }
      },
      onDone: () => {
        this.isSpeakingCurrently = false;
        this.isPausedCurrently = false;
        if (options.onDone) {
          options.onDone();
        }
      },
      onStopped: () => {
        this.isSpeakingCurrently = false;
        this.isPausedCurrently = false;
        if (options.onStopped) {
          options.onStopped();
        }
      },
      onError: (err: Error) => {
        this.isSpeakingCurrently = false;
        this.isPausedCurrently = false;
        console.warn('[SpeechService] Error during speech synthesis:', err?.message || err);
        if (options.onError) {
          options.onError(err);
        }
      },
    });
  }

  /**
   * Stops current speech and resets state
   */
  public static async stopSpeech(): Promise<void> {
    try {
      await Speech.stop();
    } catch (err) {
      console.warn('[SpeechService] Error stopping speech:', err);
    } finally {
      this.isSpeakingCurrently = false;
      this.isPausedCurrently = false;
    }
  }

  /**
   * Pauses current speech if supported by platform (iOS, Web).
   * Note: On Android, pause is not natively supported by Android TextToSpeech.
   * Calling pause on Android does nothing and returns false.
   */
  public static async pauseSpeech(): Promise<boolean> {
    if (Platform.OS === 'android') {
      // Android does not support pausing mid-stream.
      return false;
    }

    try {
      await Speech.pause();
      this.isPausedCurrently = true;
      this.isSpeakingCurrently = false;
      return true;
    } catch (err) {
      console.warn('[SpeechService] Pause failed:', err);
      return false;
    }
  }

  /**
   * Resumes paused speech if supported by platform (iOS, Web).
   * On Android, this returns false because native pause/resume is unsupported.
   */
  public static async resumeSpeech(): Promise<boolean> {
    if (Platform.OS === 'android') {
      return false;
    }

    try {
      await Speech.resume();
      this.isPausedCurrently = false;
      this.isSpeakingCurrently = true;
      return true;
    } catch (err) {
      console.warn('[SpeechService] Resume failed:', err);
      this.isSpeakingCurrently = false;
      this.isPausedCurrently = false;
      return false;
    }
  }

  /**
   * Retrieves available device voices safely with graceful fallback
   */
  public static async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices || [];
    } catch {
      return [];
    }
  }

  /**
   * Returns whether platform natively supports pause/resume.
   * True on iOS and Web; False on Android.
   */
  public static supportsPauseResume(): boolean {
    return Platform.OS !== 'android';
  }
}
