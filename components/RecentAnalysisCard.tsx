import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Image,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { borderRadius, shadows, spacing } from '../constants/theme';
import { HistoryItem } from '../types';
import { formatTimestamp } from '../utils/formatters';

interface RecentAnalysisCardProps {
  item: HistoryItem;
  onPress: () => void;
  onRename?: () => void;
  onRemoveScreenshot?: () => void;
  onDelete?: () => void;
  style?: ViewStyle;
}

export const RecentAnalysisCard: React.FC<RecentAnalysisCardProps> = ({
  item,
  onPress,
  onRename,
  onRemoveScreenshot,
  onDelete,
  style,
}) => {
  const hasSavedScreenshot = Boolean(item.includeScreenshot && item.imageUrl);
  const chatCount = item.chatMessages ? item.chatMessages.length : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <View style={styles.thumbnailContainer}>
        {hasSavedScreenshot ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Ionicons name="document-text-outline" size={24} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.categoryBadge} numberOfLines={1}>
            {item.aiData?.screenCategory || item.screenType}
          </Text>
          <Text style={styles.timestamp}>{formatTimestamp(item.createdAt)}</Text>
        </View>

        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.summary} numberOfLines={2}>
          {item.summary}
        </Text>

        <View style={styles.metaBadgesRow}>
          <View
            style={[
              styles.metaBadge,
              hasSavedScreenshot ? styles.metaBadgeImage : styles.metaBadgeTextOnly,
            ]}
          >
            <Ionicons
              name={hasSavedScreenshot ? 'lock-closed-outline' : 'document-outline'}
              size={11}
              color={hasSavedScreenshot ? colors.primary : colors.secondaryText}
              style={{ marginRight: 3 }}
            />
            <Text
              style={[
                styles.metaBadgeLabel,
                hasSavedScreenshot && { color: colors.primary },
              ]}
            >
              {hasSavedScreenshot ? 'Private Image' : 'Text Only'}
            </Text>
          </View>

          {chatCount > 0 && (
            <View style={styles.metaBadge}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={11}
                color={colors.primary}
                style={{ marginRight: 3 }}
              />
              <Text style={[styles.metaBadgeLabel, { color: colors.primary }]}>
                {chatCount} {chatCount === 1 ? 'msg' : 'msgs'}
              </Text>
            </View>
          )}

          {item.activeLanguage && item.activeLanguage !== 'en' && (
            <View style={styles.metaBadge}>
              <Ionicons
                name="language-outline"
                size={11}
                color={colors.secondaryText}
                style={{ marginRight: 3 }}
              />
              <Text style={styles.metaBadgeLabel}>{item.activeLanguage.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {onRename || onRemoveScreenshot || onDelete ? (
        <View style={styles.actionsColumn}>
          {onRename && (
            <TouchableOpacity
              onPress={onRename}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionIconBtn}
              accessibilityLabel="Rename analysis"
            >
              <Ionicons name="create-outline" size={17} color={colors.primary} />
            </TouchableOpacity>
          )}
          {onRemoveScreenshot && hasSavedScreenshot && (
            <TouchableOpacity
              onPress={onRemoveScreenshot}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionIconBtn}
              accessibilityLabel="Remove saved screenshot"
            >
              <Ionicons name="image-outline" size={17} color={colors.warning} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.actionIconBtn}
              accessibilityLabel="Delete saved analysis"
            >
              <Ionicons name="trash-outline" size={17} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.mutedText} style={styles.chevron} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.subtle,
  },
  thumbnailContainer: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
    marginRight: spacing.xs,
  },
  timestamp: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
  },
  summary: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 16,
  },
  metaBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaBadgeImage: {
    backgroundColor: colors.primarySoft,
    borderColor: '#BFDBFE',
  },
  metaBadgeTextOnly: {
    backgroundColor: colors.surfaceSubtle,
  },
  metaBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  actionsColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    gap: 6,
  },
  actionIconBtn: {
    padding: 5,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceSubtle,
  },
  chevron: {
    marginLeft: spacing.xs,
  },
});
