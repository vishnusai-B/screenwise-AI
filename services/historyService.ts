import { Platform } from 'react-native';
import {
  File as ExpoFile,
  Directory as ExpoDirectory,
  Paths as ExpoPaths,
} from 'expo-file-system';
import {
  HistoryItem,
  HistorySortOption,
  HistorySyncStatus,
  SaveAnalysisInput,
  ScreenAnalysisData,
  ScreenAnalysisResult,
  ConfidenceLevel,
  ChatMessage,
  LanguageCode,
} from '../types';
import {
  supabase,
  isSupabaseConfigured,
  getOrCreateAnonymousUserId,
  generateUuidV4,
} from './supabase';

const PRIVATE_SCREENSHOT_BUCKET = 'screenshots';
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour private signed URL
const LOCAL_HISTORY_DIR_NAME = 'screenwise_history';
const WEB_HISTORY_STORAGE_PREFIX = 'screenwise_history_v1_';

export interface StorageStats {
  totalItems: number;
  withScreenshots: number;
  textOnly: number;
  totalChatMessages: number;
  estimatedBytes: number;
}

export interface HistoryFilterOptions {
  query?: string;
  category?: string;
  sortBy?: HistorySortOption;
}

/**
 * Helper to adapt ScreenAnalysisData into ScreenAnalysisResult format
 * for backward compatibility with Phase 2/3 UI cards.
 */
export function adaptAiDataToResult(
  id: string,
  aiData: ScreenAnalysisData,
  createdAt: string
): ScreenAnalysisResult {
  return {
    id,
    screenTitle: aiData.screenTitle,
    screenType: aiData.screenCategory || 'General Information',
    confidence: 'high',
    summary: aiData.summary,
    importantInformation: (aiData.importantItems || []).map(
      (i) => `${i.label}: ${i.explanation}`
    ),
    detectedErrors: (aiData.importantItems || []).map((i) => ({
      message: i.label,
      explanation: i.explanation,
      suggestedSolution: 'Refer to recommended steps',
    })),
    nextSteps: (aiData.recommendedSteps || []).map((s) => ({
      step: s.step,
      title: s.title,
      description: s.description,
    })),
    warnings: aiData.warnings || [],
    createdAt,
  };
}

// In-memory cache scoped by anonymous userId, backed by persistent disk storage
const userHistoryStore = new Map<string, HistoryItem[]>();

function sanitizeUserIdForStorage(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function isValidPersistedHistoryItem(item: unknown): item is HistoryItem {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Partial<HistoryItem>;
  return (
    typeof candidate.id === 'string' &&
    candidate.id.length > 0 &&
    typeof candidate.title === 'string' &&
    typeof candidate.createdAt === 'string' &&
    Boolean(candidate.analysis)
  );
}

function parsePersistedHistoryJson(raw: string | null): HistoryItem[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn('[HistoryService] Corrupted local history format (expected array); resetting.');
      return [];
    }
    return parsed.filter(isValidPersistedHistoryItem);
  } catch (err) {
    console.warn('[HistoryService] Failed to parse persisted local history; ignoring corrupted data:', err);
    return [];
  }
}

async function readLocalHistory(userId: string): Promise<HistoryItem[]> {
  const cached = userHistoryStore.get(userId);
  if (cached) {
    return [...cached];
  }

  const safeId = sanitizeUserIdForStorage(userId);
  let loaded: HistoryItem[] = [];

  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        loaded = parsePersistedHistoryJson(
          localStorage.getItem(`${WEB_HISTORY_STORAGE_PREFIX}${safeId}`)
        );
      }
    } else {
      const dir = new ExpoDirectory(ExpoPaths.document, LOCAL_HISTORY_DIR_NAME);
      const file = new ExpoFile(dir, `${safeId}.json`);
      if (file.exists) {
        const raw = await file.text();
        loaded = parsePersistedHistoryJson(raw);
      }
    }
  } catch (err) {
    console.warn('[HistoryService] Unable to read local history from device storage:', err);
    loaded = [];
  }

  userHistoryStore.set(userId, loaded);
  return [...loaded];
}

async function writeLocalHistory(userId: string, items: HistoryItem[]): Promise<void> {
  userHistoryStore.set(userId, items);

  const safeId = sanitizeUserIdForStorage(userId);
  // Never persist secrets or ephemeral error flags in local history files
  const serializableItems: HistoryItem[] = items.map((item) => ({
    ...item,
    syncStatus: item.syncStatus || 'local_only',
  }));
  const payload = JSON.stringify(serializableItems);

  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`${WEB_HISTORY_STORAGE_PREFIX}${safeId}`, payload);
      }
    } else {
      const dir = new ExpoDirectory(ExpoPaths.document, LOCAL_HISTORY_DIR_NAME);
      if (!dir.exists) {
        dir.create({ intermediates: true, idempotent: true });
      }
      const file = new ExpoFile(dir, `${safeId}.json`);
      if (!file.exists) {
        file.create({ intermediates: true, overwrite: true });
      }
      await file.write(payload);
    }
  } catch (err) {
    console.warn('[HistoryService] Failed to persist local history to device storage:', err);
  }
}

function mapConfidenceToLevel(raw: unknown): ConfidenceLevel {
  if (typeof raw === 'number') {
    if (raw >= 0.75) return 'high';
    if (raw >= 0.45) return 'medium';
    return 'low';
  }
  if (raw === 'low' || raw === 'medium' || raw === 'high') {
    return raw;
  }
  return 'high';
}

function resolveScreenshotFormat(
  imageUri: string,
  explicitMimeType?: string
): { contentType: 'image/png' | 'image/jpeg' | 'image/webp'; ext: 'png' | 'jpg' | 'webp' } {
  const mime = (explicitMimeType || '').toLowerCase();
  const lowerUri = imageUri.toLowerCase();
  if (mime === 'image/jpeg' || mime === 'image/jpg' || lowerUri.endsWith('.jpg') || lowerUri.endsWith('.jpeg')) {
    return { contentType: 'image/jpeg', ext: 'jpg' };
  }
  if (mime === 'image/webp' || lowerUri.endsWith('.webp')) {
    return { contentType: 'image/webp', ext: 'webp' };
  }
  return { contentType: 'image/png', ext: 'png' };
}

function formatSupabaseError(operation: string, error: { message?: string } | null | undefined): string {
  const detail = error?.message || 'Unknown Supabase error';
  return `${operation}: ${detail}`;
}

export class HistoryService {
  /**
   * Ensure we always operate under the current user's isolated anonymous ID.
   */
  static async getCurrentUserId(): Promise<string> {
    return getOrCreateAnonymousUserId();
  }

  /**
   * Verifies that a record belongs to the current user (defense-in-depth alongside Supabase RLS).
   */
  static verifyOwnership(recordUserId: string | undefined, currentUserId: string): boolean {
    if (!recordUserId || !currentUserId) return false;
    return recordUserId === currentUserId;
  }

  /**
   * Read local image bytes reliably on Android/iOS (Expo SDK 58 File API) and Web.
   */
  private static async readLocalImageBytes(imageUri: string): Promise<Uint8Array> {
    if (!imageUri || !imageUri.trim()) {
      throw new Error('No screenshot URI provided for upload.');
    }

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Unable to read screenshot file (status ${response.status}).`);
      }
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      if (bytes.byteLength === 0) {
        throw new Error('Selected screenshot file is empty.');
      }
      return bytes;
    }

    const expoFile = new ExpoFile(imageUri);
    const bytes = await expoFile.bytes();
    if (!bytes || bytes.byteLength === 0) {
      throw new Error('Selected screenshot file is empty or unreadable.');
    }
    return bytes;
  }

  /**
   * Upload a screenshot to the private Supabase Storage bucket ONLY when explicit consent is true.
   * Storage path is strictly scoped to `{userId}/{analysisId}.{ext}` to satisfy storage RLS policies.
   * Never returns a storagePath unless the upload actually succeeded.
   */
  private static async uploadPrivateScreenshot(
    userId: string,
    analysisId: string,
    imageUri: string,
    mimeType?: string
  ): Promise<{ storagePath: string; signedUrl?: string }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase cloud storage is not configured.');
    }

    const { contentType, ext } = resolveScreenshotFormat(imageUri, mimeType);
    const storagePath = `${userId}/${analysisId}.${ext}`;
    const bytes = await this.readLocalImageBytes(imageUri);

    const { error: uploadError } = await supabase.storage
      .from(PRIVATE_SCREENSHOT_BUCKET)
      .upload(storagePath, bytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(formatSupabaseError('Screenshot upload failed', uploadError));
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from(PRIVATE_SCREENSHOT_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);

    if (signedError) {
      console.warn('[HistoryService] Screenshot uploaded, but signed URL generation failed:', signedError.message);
    }

    return {
      storagePath,
      signedUrl: signedData?.signedUrl,
    };
  }

  /**
   * Delete a private screenshot from Supabase Storage bucket.
   */
  private static async deletePrivateScreenshot(
    userId: string,
    storagePath?: string
  ): Promise<void> {
    if (!storagePath) return;
    // Enforce user folder ownership before attempting deletion
    if (!storagePath.startsWith(`${userId}/`)) {
      throw new Error('Unauthorized storage path access denied.');
    }

    if (isSupabaseConfigured()) {
      const { error: removeError } = await supabase.storage
        .from(PRIVATE_SCREENSHOT_BUCKET)
        .remove([storagePath]);

      if (removeError) {
        throw new Error(formatSupabaseError('Failed to remove private screenshot from cloud storage', removeError));
      }
    }
  }

  /**
   * Load all saved analyses for the current user (cloud-first when configured, backed by persistent local storage).
   */
  static async loadHistory(): Promise<HistoryItem[]> {
    const userId = await this.getCurrentUserId();
    const localItems = await readLocalHistory(userId);

    if (isSupabaseConfigured()) {
      try {
        const { data: rows, error } = await supabase
          .from('saved_analyses')
          .select('*, saved_chat_messages(*)')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('[HistoryService] Cloud load failed, using persisted local history:', error.message);
          return localItems;
        }

        if (Array.isArray(rows)) {
          const loadedCloudItems: HistoryItem[] = await Promise.all(
            rows
              .filter((row: any) => this.verifyOwnership(row.user_id, userId))
              .map(async (row: any) => {
                const aiData: ScreenAnalysisData = row.original_analysis;
                const createdAt = row.created_at || new Date().toISOString();
                const includeScreenshot = Boolean(row.include_screenshot);
                const storagePath: string | undefined = includeScreenshot
                  ? row.screenshot_storage_path || undefined
                  : undefined;

                let signedImageUrl: string | undefined = undefined;
                if (includeScreenshot && storagePath) {
                  const { data: signed, error: signedError } = await supabase.storage
                    .from(PRIVATE_SCREENSHOT_BUCKET)
                    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
                  if (signedError) {
                    console.warn('[HistoryService] Signed URL warning:', signedError.message);
                  }
                  signedImageUrl = signed?.signedUrl;
                }

                const chatMessages: ChatMessage[] = Array.isArray(row.saved_chat_messages)
                  ? row.saved_chat_messages
                      .sort(
                        (a: any, b: any) =>
                          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                      )
                      .map((m: any) => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        timestamp: m.created_at,
                        status: 'sent' as const,
                      }))
                  : [];

                const adapted = adaptAiDataToResult(row.id, aiData, createdAt);
                adapted.screenTitle = row.title || aiData.screenTitle;

                const confidenceVal = mapConfidenceToLevel(row.confidence);

                return {
                  id: row.id,
                  userId: row.user_id,
                  title: row.title || aiData.screenTitle,
                  screenType: adapted.screenType,
                  summary: row.summary || aiData.summary,
                  imageUrl: includeScreenshot ? signedImageUrl : undefined,
                  includeScreenshot,
                  screenshotStoragePath: includeScreenshot ? storagePath : undefined,
                  confidence: confidenceVal,
                  createdAt,
                  updatedAt: row.updated_at || createdAt,
                  analysis: adapted,
                  aiData,
                  simplifiedAiData: row.simplified_analysis || null,
                  translatedCache: row.translated_cache || {},
                  activeMode: row.active_mode === 'simple' ? 'simple' : 'original',
                  activeLanguage: (row.active_language as LanguageCode) || 'en',
                  chatMessages,
                  syncStatus: 'synced' as const,
                };
              })
          );

          // Preserve unsynced local-only items that do not yet exist in cloud rows
          const cloudIds = new Set(loadedCloudItems.map((item) => item.id));
          const unsyncedLocalItems = localItems.filter(
            (item) => item.syncStatus === 'local_only' && !cloudIds.has(item.id)
          );
          const merged = [...unsyncedLocalItems, ...loadedCloudItems].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          await writeLocalHistory(userId, merged);
          return merged;
        }
      } catch (err) {
        console.warn('[HistoryService] Cloud load exception, falling back to local storage:', err);
      }
    }

    return localItems;
  }

  /**
   * Save a new analysis or update an existing saved analysis.
   * STRICT PRIVACY RULE: Never saves screenshot unless `input.includeScreenshot === true`.
   * Returns `syncStatus: 'synced'` only when all Supabase writes succeed; otherwise falls back
   * to persistent local storage with `syncStatus: 'local_only'` and `syncError`.
   */
  static async saveAnalysis(
    input: SaveAnalysisInput,
    existingId?: string
  ): Promise<HistoryItem> {
    const userId = await this.getCurrentUserId();
    const now = new Date().toISOString();
    const currentItems = await readLocalHistory(userId);
    const existingItem = existingId ? currentItems.find((i) => i.id === existingId) : undefined;

    if (existingItem && !this.verifyOwnership(existingItem.userId, userId)) {
      throw new Error('Unauthorized: Cannot modify an analysis owned by another user.');
    }

    const analysisId = existingItem ? existingItem.id : existingId || generateUuidV4();
    const createdAt = existingItem ? existingItem.createdAt : now;

    const cleanTitle = (input.title || input.aiData.screenTitle || 'Untitled Screen Analysis')
      .trim()
      .slice(0, 250);

    if (!cleanTitle) {
      throw new Error('Analysis title cannot be empty.');
    }

    // Enforce explicit screenshot consent
    const explicitConsent = input.includeScreenshot === true;
    let imageUrl: string | undefined = undefined;
    let screenshotStoragePath: string | undefined = undefined;
    let syncStatus: HistorySyncStatus = 'local_only';
    let syncError: string | undefined = undefined;

    if (explicitConsent && input.screenshotUri) {
      if (isSupabaseConfigured()) {
        // Upload to private storage first; throws a clear error if upload fails so we never pretend it succeeded
        const uploadResult = await this.uploadPrivateScreenshot(
          userId,
          analysisId,
          input.screenshotUri,
          input.screenshotMimeType
        );
        screenshotStoragePath = uploadResult.storagePath;
        imageUrl = uploadResult.signedUrl;
      } else {
        // Local-only mode: keep local URI, never fabricate a remote screenshot_storage_path
        imageUrl = input.screenshotUri;
        screenshotStoragePath = undefined;
      }
    } else if (!explicitConsent && existingItem?.screenshotStoragePath) {
      // User revoked screenshot consent on update -> delete previously saved remote screenshot
      try {
        await this.deletePrivateScreenshot(userId, existingItem.screenshotStoragePath);
      } catch (err) {
        console.warn('[HistoryService] Could not remove revoked remote screenshot:', err);
      }
    }

    const adapted = adaptAiDataToResult(analysisId, input.aiData, createdAt);
    adapted.screenTitle = cleanTitle;

    // Only persist valid sent chat messages
    const cleanChatMessages: ChatMessage[] = (input.chatMessages || [])
      .filter(
        (m) =>
          (m.role === 'user' || m.role === 'assistant') &&
          m.content.trim().length > 0 &&
          m.status !== 'failed'
      )
      .map((m) => ({
        ...m,
        status: 'sent' as const,
      }));

    if (isSupabaseConfigured()) {
      try {
        const dbRow = {
          id: analysisId,
          user_id: userId,
          title: cleanTitle,
          screen_category: input.aiData.screenCategory,
          summary: input.aiData.summary,
          confidence: 0.95,
          original_analysis: input.aiData,
          simplified_analysis: input.simplifiedAiData || null,
          translated_cache: input.translatedCache || {},
          active_mode: input.activeMode || 'original',
          active_language: input.activeLanguage || 'en',
          include_screenshot: explicitConsent,
          screenshot_storage_path: explicitConsent ? screenshotStoragePath || null : null,
          created_at: createdAt,
          updated_at: now,
        };

        const { error: upsertError } = await supabase
          .from('saved_analyses')
          .upsert(dbRow, { onConflict: 'id' });

        if (upsertError) {
          throw new Error(formatSupabaseError('Cloud analysis save rejected', upsertError));
        }

        // Sync chat messages for this analysis
        const { error: deleteChatError } = await supabase
          .from('saved_chat_messages')
          .delete()
          .eq('analysis_id', analysisId)
          .eq('user_id', userId);

        if (deleteChatError) {
          throw new Error(formatSupabaseError('Cloud chat cleanup failed', deleteChatError));
        }

        if (cleanChatMessages.length > 0) {
          const chatRows = cleanChatMessages.map((msg) => ({
            analysis_id: analysisId,
            user_id: userId,
            role: msg.role,
            content: msg.content,
            language: input.activeLanguage || 'en',
            explanation_mode: input.activeMode || 'original',
            created_at: msg.timestamp || now,
          }));
          const { error: insertChatError } = await supabase
            .from('saved_chat_messages')
            .insert(chatRows);

          if (insertChatError) {
            throw new Error(formatSupabaseError('Cloud chat sync failed', insertChatError));
          }
        }

        syncStatus = 'synced';
        syncError = undefined;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Cloud sync failed.';
        console.warn('[HistoryService] Cloud save failed, preserving local copy:', message);
        syncStatus = 'local_only';
        syncError = message;
      }
    }

    const savedItem: HistoryItem = {
      id: analysisId,
      userId,
      title: cleanTitle,
      screenType: adapted.screenType,
      summary: input.aiData.summary,
      imageUrl: explicitConsent ? imageUrl : undefined,
      includeScreenshot: explicitConsent,
      screenshotStoragePath: explicitConsent ? screenshotStoragePath : undefined,
      confidence: 'high',
      createdAt,
      updatedAt: now,
      analysis: adapted,
      aiData: input.aiData,
      simplifiedAiData: input.simplifiedAiData || null,
      translatedCache: input.translatedCache || {},
      activeMode: input.activeMode || 'original',
      activeLanguage: input.activeLanguage || 'en',
      chatMessages: cleanChatMessages,
      syncStatus,
      syncError,
    };

    const updatedList = existingItem
      ? currentItems.map((item) => (item.id === analysisId ? savedItem : item))
      : [savedItem, ...currentItems];

    await writeLocalHistory(userId, updatedList);
    return savedItem;
  }

  /**
   * Rename a saved analysis title.
   */
  static async renameAnalysis(id: string, newTitle: string): Promise<HistoryItem> {
    const userId = await this.getCurrentUserId();
    const trimmed = newTitle.trim().slice(0, 250);
    if (!trimmed) {
      throw new Error('Title cannot be empty.');
    }

    const currentItems = await readLocalHistory(userId);
    const target = currentItems.find((item) => item.id === id);
    if (!target) {
      throw new Error('Saved analysis not found.');
    }
    if (!this.verifyOwnership(target.userId, userId)) {
      throw new Error('Unauthorized: You do not own this saved analysis.');
    }

    const now = new Date().toISOString();
    let syncStatus: HistorySyncStatus = isSupabaseConfigured() ? 'synced' : 'local_only';
    let syncError: string | undefined = undefined;

    if (isSupabaseConfigured()) {
      try {
        const { error: updateError } = await supabase
          .from('saved_analyses')
          .update({ title: trimmed, updated_at: now })
          .eq('id', id)
          .eq('user_id', userId);

        if (updateError) {
          throw new Error(formatSupabaseError('Cloud rename failed', updateError));
        }
      } catch (err) {
        syncStatus = 'local_only';
        syncError = err instanceof Error ? err.message : 'Cloud rename failed.';
        console.warn('[HistoryService] Cloud rename failed, keeping local update:', syncError);
      }
    }

    const updatedItem: HistoryItem = {
      ...target,
      title: trimmed,
      updatedAt: now,
      analysis: {
        ...target.analysis,
        screenTitle: trimmed,
      },
      syncStatus,
      syncError,
    };

    await writeLocalHistory(
      userId,
      currentItems.map((item) => (item.id === id ? updatedItem : item))
    );
    return updatedItem;
  }

  /**
   * Remove only the private screenshot from a saved analysis while keeping all text and chat history.
   */
  static async removeScreenshotFromAnalysis(id: string): Promise<HistoryItem> {
    const userId = await this.getCurrentUserId();
    const currentItems = await readLocalHistory(userId);
    const target = currentItems.find((item) => item.id === id);
    if (!target) {
      throw new Error('Saved analysis not found.');
    }
    if (!this.verifyOwnership(target.userId, userId)) {
      throw new Error('Unauthorized: You do not own this saved analysis.');
    }

    let syncStatus: HistorySyncStatus = isSupabaseConfigured() ? 'synced' : 'local_only';
    let syncError: string | undefined = undefined;

    if (target.screenshotStoragePath) {
      try {
        await this.deletePrivateScreenshot(userId, target.screenshotStoragePath);
      } catch (err) {
        syncStatus = 'local_only';
        syncError = err instanceof Error ? err.message : 'Failed to delete remote screenshot.';
        console.warn('[HistoryService] Remote screenshot deletion warning:', syncError);
      }
    }

    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const { error: updateError } = await supabase
          .from('saved_analyses')
          .update({
            include_screenshot: false,
            screenshot_storage_path: null,
            updated_at: now,
          })
          .eq('id', id)
          .eq('user_id', userId);

        if (updateError) {
          throw new Error(formatSupabaseError('Cloud screenshot removal failed', updateError));
        }
      } catch (err) {
        syncStatus = 'local_only';
        syncError = err instanceof Error ? err.message : 'Cloud screenshot removal failed.';
        console.warn('[HistoryService] Cloud screenshot removal failed:', syncError);
      }
    }

    const updatedItem: HistoryItem = {
      ...target,
      imageUrl: undefined,
      includeScreenshot: false,
      screenshotStoragePath: undefined,
      updatedAt: now,
      syncStatus,
      syncError,
    };

    await writeLocalHistory(
      userId,
      currentItems.map((item) => (item.id === id ? updatedItem : item))
    );
    return updatedItem;
  }

  /**
   * Delete an entire saved analysis (and its private screenshot + chat messages).
   */
  static async deleteAnalysis(id: string): Promise<void> {
    const userId = await this.getCurrentUserId();
    const currentItems = await readLocalHistory(userId);
    const target = currentItems.find((item) => item.id === id);

    if (target) {
      if (!this.verifyOwnership(target.userId, userId)) {
        throw new Error('Unauthorized: You do not own this saved analysis.');
      }
      if (target.screenshotStoragePath) {
        try {
          await this.deletePrivateScreenshot(userId, target.screenshotStoragePath);
        } catch (err) {
          console.warn('[HistoryService] Cloud screenshot delete warning:', err);
        }
      }
    }

    if (isSupabaseConfigured()) {
      const { error: deleteError } = await supabase
        .from('saved_analyses')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (deleteError) {
        console.warn('[HistoryService] Cloud delete failed:', deleteError.message);
      }
    }

    await writeLocalHistory(
      userId,
      currentItems.filter((item) => item.id !== id)
    );
  }

  /**
   * Remove all saved screenshots across the user's history while preserving text explanations and chat.
   */
  static async removeAllScreenshots(): Promise<HistoryItem[]> {
    const userId = await this.getCurrentUserId();
    const currentItems = await readLocalHistory(userId);
    const now = new Date().toISOString();
    let syncStatus: HistorySyncStatus = isSupabaseConfigured() ? 'synced' : 'local_only';
    let syncError: string | undefined = undefined;

    for (const item of currentItems) {
      if (item.screenshotStoragePath && this.verifyOwnership(item.userId, userId)) {
        try {
          await this.deletePrivateScreenshot(userId, item.screenshotStoragePath);
        } catch (err) {
          syncStatus = 'local_only';
          syncError = err instanceof Error ? err.message : 'Failed to delete remote screenshot.';
          console.warn('[HistoryService] Cloud remove screenshot warning:', syncError);
        }
      }
    }

    if (isSupabaseConfigured()) {
      try {
        const { error: updateError } = await supabase
          .from('saved_analyses')
          .update({
            include_screenshot: false,
            screenshot_storage_path: null,
            updated_at: now,
          })
          .eq('user_id', userId);

        if (updateError) {
          throw new Error(formatSupabaseError('Cloud remove all screenshots failed', updateError));
        }
      } catch (err) {
        syncStatus = 'local_only';
        syncError = err instanceof Error ? err.message : 'Cloud remove all screenshots failed.';
        console.warn('[HistoryService] Cloud remove all screenshots failed:', syncError);
      }
    }

    const updated: HistoryItem[] = currentItems.map((item) => ({
      ...item,
      imageUrl: undefined,
      includeScreenshot: false,
      screenshotStoragePath: undefined,
      updatedAt: now,
      syncStatus,
      syncError,
    }));

    await writeLocalHistory(userId, updated);
    return updated;
  }

  /**
   * Clear all saved analyses and private screenshots for the current user.
   */
  static async clearAllHistory(): Promise<void> {
    const userId = await this.getCurrentUserId();
    const currentItems = await readLocalHistory(userId);

    for (const item of currentItems) {
      if (item.screenshotStoragePath && this.verifyOwnership(item.userId, userId)) {
        try {
          await this.deletePrivateScreenshot(userId, item.screenshotStoragePath);
        } catch (err) {
          console.warn('[HistoryService] Cloud clear screenshot warning:', err);
        }
      }
    }

    if (isSupabaseConfigured()) {
      const { error: deleteError } = await supabase
        .from('saved_analyses')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.warn('[HistoryService] Cloud clear history failed:', deleteError.message);
      }
    }

    await writeLocalHistory(userId, []);
  }

  /**
   * Search, filter by category, and sort history items.
   */
  static filterAndSortHistory(
    items: HistoryItem[],
    options: HistoryFilterOptions = {}
  ): HistoryItem[] {
    const { query = '', category = 'All', sortBy = 'newest' } = options;
    const normalizedQuery = query.trim().toLowerCase();

    const filtered = items.filter((item) => {
      // Category filter
      if (category && category !== 'All') {
        const matchesScreenType = item.screenType.toLowerCase() === category.toLowerCase();
        const matchesAiCategory =
          item.aiData?.screenCategory?.toLowerCase() === category.toLowerCase();
        if (!matchesScreenType && !matchesAiCategory) {
          return false;
        }
      }

      // Search query filter across title, category, summary, whatItMeans, and chat messages
      if (!normalizedQuery) return true;

      const inTitle = item.title.toLowerCase().includes(normalizedQuery);
      const inType = item.screenType.toLowerCase().includes(normalizedQuery);
      const inAiCategory =
        item.aiData?.screenCategory?.toLowerCase().includes(normalizedQuery) || false;
      const inSummary = item.summary.toLowerCase().includes(normalizedQuery);
      const inWhatItMeans = Array.isArray(item.aiData?.whatItMeans)
        ? item.aiData!.whatItMeans.some((w) => w.toLowerCase().includes(normalizedQuery))
        : false;
      const inChat =
        item.chatMessages?.some((m) => m.content.toLowerCase().includes(normalizedQuery)) ||
        false;

      return inTitle || inType || inAiCategory || inSummary || inWhatItMeans || inChat;
    });

    // Sort
    return [...filtered].sort((a, b) => {
      if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
      }
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (sortBy === 'oldest') {
        return timeA - timeB;
      }
      // Default: 'newest'
      return timeB - timeA;
    });
  }

  /**
   * Calculate storage usage metrics for Storage Management views.
   */
  static getStorageStats(items: HistoryItem[]): StorageStats {
    let withScreenshots = 0;
    let totalChatMessages = 0;
    let estimatedBytes = 0;

    for (const item of items) {
      if (item.includeScreenshot && (item.imageUrl || item.screenshotStoragePath)) {
        withScreenshots += 1;
        estimatedBytes += 245 * 1024; // ~245 KB average compressed screenshot estimate
      }
      const msgCount = item.chatMessages?.length || 0;
      totalChatMessages += msgCount;

      // Estimate JSON payload size for text + translations + chat
      const jsonSize = JSON.stringify({
        title: item.title,
        summary: item.summary,
        aiData: item.aiData,
        simplifiedAiData: item.simplifiedAiData,
        translatedCache: item.translatedCache,
        chatMessages: item.chatMessages,
      }).length;
      estimatedBytes += jsonSize;
    }

    return {
      totalItems: items.length,
      withScreenshots,
      textOnly: items.length - withScreenshots,
      totalChatMessages,
      estimatedBytes,
    };
  }
}
