import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenContainer,
  Header,
  EmptyState,
  RecentAnalysisCard,
} from '../../components';
import { useApp } from '../../context/AppContext';
import { HistoryService } from '../../services/historyService';
import { HistoryItem, HistorySortOption } from '../../types';
import { colors } from '../../constants/colors';
import { spacing, borderRadius, shadows } from '../../constants/theme';

const SORT_OPTIONS: { value: HistorySortOption; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'newest', label: 'Newest', icon: 'arrow-down-outline' },
  { value: 'oldest', label: 'Oldest', icon: 'arrow-up-outline' },
  { value: 'title_asc', label: 'Title A–Z', icon: 'text-outline' },
];

export default function HistoryScreen() {
  const router = useRouter();
  const {
    history,
    restoreHistoryItem,
    renameHistoryItem,
    removeHistoryItemScreenshot,
    removeAllHistoryScreenshots,
    deleteHistoryItem,
    clearHistory,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<HistorySortOption>('newest');

  // Rename state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState<string>('');
  const [renameError, setRenameError] = useState<string | null>(null);

  // Dynamically derive available categories from history
  const categories = useMemo(() => {
    const unique = new Set<string>(['All']);
    history.forEach((item) => {
      if (item.screenType) unique.add(item.screenType);
    });
    return Array.from(unique);
  }, [history]);

  // Filter & Sort using HistoryService
  const filteredHistory = useMemo(() => {
    return HistoryService.filterAndSortHistory(history, {
      query: searchQuery,
      category: selectedCategory,
      sortBy,
    });
  }, [history, searchQuery, selectedCategory, sortBy]);

  // Calculate Storage Management metrics
  const storageStats = useMemo(() => {
    return HistoryService.getStorageStats(history);
  }, [history]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleOpenSavedAnalysis = (item: HistoryItem) => {
    restoreHistoryItem(item);
    router.push('/results');
  };

  const handleStartRename = (item: HistoryItem) => {
    setEditingItemId(item.id);
    setEditingTitleText(item.title);
    setRenameError(null);
  };

  const handleSaveRename = async () => {
    if (!editingItemId) return;
    const trimmed = editingTitleText.trim();
    if (!trimmed) {
      setRenameError('Title cannot be empty.');
      return;
    }
    try {
      await renameHistoryItem(editingItemId, trimmed);
      setEditingItemId(null);
      setEditingTitleText('');
      setRenameError(null);
    } catch (err: unknown) {
      setRenameError(err instanceof Error ? err.message : 'Failed to rename item.');
    }
  };

  const handleRemoveScreenshot = (item: HistoryItem) => {
    if (Platform.OS === 'web') {
      removeHistoryItemScreenshot(item.id);
      return;
    }
    Alert.alert(
      'Remove Private Screenshot',
      `Remove the saved screenshot for "${item.title}" while keeping the text explanation and chat history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Screenshot',
          style: 'destructive',
          onPress: () => {
            removeHistoryItemScreenshot(item.id);
          },
        },
      ]
    );
  };

  const handleRemoveAllScreenshots = () => {
    if (storageStats.withScreenshots === 0) return;
    if (Platform.OS === 'web') {
      removeAllHistoryScreenshots();
      return;
    }
    Alert.alert(
      'Remove All Saved Screenshots',
      'This will delete all saved screenshot images to free up storage while keeping all text explanations, translations, and follow-up chats.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All Images',
          style: 'destructive',
          onPress: () => {
            removeAllHistoryScreenshots();
          },
        },
      ]
    );
  };

  const handleClearAllHistory = () => {
    if (history.length === 0) return;
    if (Platform.OS === 'web') {
      clearHistory();
      return;
    }
    Alert.alert(
      'Clear All Saved History',
      'Are you sure you want to permanently delete all saved screen analyses, chats, and private screenshots?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            clearHistory();
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer scrollable={history.length > 0}>
      <Header
        title="Analysis History"
        subtitle="Review your saved screen explanations & chats"
        rightAction={
          history.length > 0 ? (
            <TouchableOpacity onPress={handleClearAllHistory} style={styles.clearButton}>
              <Ionicons name="trash-outline" size={14} color={colors.error} style={{ marginRight: 4 }} />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {history.length > 0 && (
        <View style={styles.topControlsWrapper}>
          {/* Storage Management Summary Card */}
          <View style={styles.storageCard}>
            <View style={styles.storageHeaderRow}>
              <View style={styles.storageTitleRow}>
                <Ionicons name="server-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.storageTitle}>Storage & Privacy Summary</Text>
              </View>
              <Text style={styles.storageSizeBadge}>{formatBytes(storageStats.estimatedBytes)}</Text>
            </View>

            <View style={styles.storageMetricsRow}>
              <View style={styles.storageMetricItem}>
                <Text style={styles.storageMetricValue}>{storageStats.totalItems}</Text>
                <Text style={styles.storageMetricLabel}>Saved</Text>
              </View>
              <View style={styles.storageDivider} />
              <View style={styles.storageMetricItem}>
                <Text style={styles.storageMetricValue}>{storageStats.textOnly}</Text>
                <Text style={styles.storageMetricLabel}>Text Only</Text>
              </View>
              <View style={styles.storageDivider} />
              <View style={styles.storageMetricItem}>
                <Text style={styles.storageMetricValue}>{storageStats.withScreenshots}</Text>
                <Text style={styles.storageMetricLabel}>With Image</Text>
              </View>
              <View style={styles.storageDivider} />
              <View style={styles.storageMetricItem}>
                <Text style={styles.storageMetricValue}>{storageStats.totalChatMessages}</Text>
                <Text style={styles.storageMetricLabel}>Chat Msgs</Text>
              </View>
            </View>

            {storageStats.withScreenshots > 0 && (
              <TouchableOpacity
                style={styles.stripImagesBtn}
                onPress={handleRemoveAllScreenshots}
                activeOpacity={0.75}
              >
                <Ionicons name="images-outline" size={14} color={colors.warning} style={{ marginRight: 6 }} />
                <Text style={styles.stripImagesBtnText}>
                  Remove All Saved Images (Keep Text & Chats)
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Bar */}
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={18} color={colors.mutedText} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search title, category, summary, or chat..."
              placeholderTextColor={colors.mutedText}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.mutedText} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
            style={styles.categoryScroll}
          >
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryPill, isSelected && styles.categoryPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.categoryPillText, isSelected && styles.categoryPillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sort Bar */}
          <View style={styles.sortRow}>
            <Text style={styles.sortLabel}>
              Showing {filteredHistory.length} of {history.length}
            </Text>
            <View style={styles.sortPillsGroup}>
              {SORT_OPTIONS.map((opt) => {
                const active = sortBy === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sortPill, active && styles.sortPillActive]}
                    onPress={() => setSortBy(opt.value)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={12}
                      color={active ? colors.primary : colors.secondaryText}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Inline Rename Editor Box */}
          {editingItemId && (
            <View style={styles.renameCard}>
              <View style={styles.renameHeaderRow}>
                <Ionicons name="create-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.renameTitle}>Rename Saved Analysis</Text>
              </View>
              <TextInput
                style={styles.renameInput}
                value={editingTitleText}
                onChangeText={(t) => {
                  setEditingTitleText(t);
                  setRenameError(null);
                }}
                placeholder="Enter new title..."
                placeholderTextColor={colors.mutedText}
                maxLength={250}
                autoFocus
              />
              {renameError && <Text style={styles.renameErrorText}>{renameError}</Text>}
              <View style={styles.renameActionsRow}>
                <TouchableOpacity
                  style={styles.renameCancelBtn}
                  onPress={() => {
                    setEditingItemId(null);
                    setRenameError(null);
                  }}
                >
                  <Text style={styles.renameCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.renameSaveBtn} onPress={handleSaveRename}>
                  <Text style={styles.renameSaveBtnText}>Save Title</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={styles.content}>
        {history.length === 0 ? (
          <EmptyState
            icon="bookmark-outline"
            title="No Saved Analyses Yet"
            description="Analyses are never saved automatically. After analyzing a screenshot, tap 'Save Analysis to History' on the Results screen to keep it here."
            actionTitle="Explain a Screen Now"
            onActionPress={() => router.push('/upload')}
          />
        ) : filteredHistory.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No Matching Analyses"
            description={`No saved results matched "${searchQuery || selectedCategory}". Try clearing your search or category filter.`}
            actionTitle="Reset Filters"
            onActionPress={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
          />
        ) : (
          <View style={styles.listContainer}>
            {filteredHistory.map((item) => (
              <RecentAnalysisCard
                key={item.id}
                item={item}
                onPress={() => handleOpenSavedAnalysis(item)}
                onRename={() => handleStartRename(item)}
                onRemoveScreenshot={() => handleRemoveScreenshot(item)}
                onDelete={() => deleteHistoryItem(item.id)}
              />
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topControlsWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  storageCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  storageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  storageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  storageSizeBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  storageMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
  },
  storageMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  storageMetricValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
  },
  storageMetricLabel: {
    fontSize: 10,
    color: colors.secondaryText,
    marginTop: 2,
  },
  storageDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
  },
  stripImagesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    paddingVertical: 7,
    backgroundColor: colors.warningBg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  stripImagesBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.warning,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: colors.primaryText,
  },
  categoryScroll: {
    marginBottom: spacing.sm,
  },
  categoryScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  categoryPillTextActive: {
    color: colors.textInverse,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  sortPillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: '#BFDBFE',
  },
  sortPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  sortPillTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  renameCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadows.subtle,
  },
  renameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  renameTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
  },
  renameInput: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.primaryText,
  },
  renameErrorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: 4,
  },
  renameActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: spacing.sm,
  },
  renameCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceSubtle,
  },
  renameCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  renameSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
  },
  renameSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textInverse,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  listContainer: {
    paddingBottom: spacing.xxl,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.sm,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.error,
  },
});
