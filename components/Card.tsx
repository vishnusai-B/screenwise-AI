import React, { ReactNode } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
  Text,
} from 'react-native';
import { colors } from '../constants/colors';
import { borderRadius, shadows, spacing } from '../constants/theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  title?: string;
  subtitle?: string;
  headerRight?: ReactNode;
  variant?: 'elevated' | 'outlined' | 'subtle';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  title,
  subtitle,
  headerRight,
  variant = 'elevated',
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'outlined':
        return styles.outlined;
      case 'subtle':
        return styles.subtle;
      case 'elevated':
      default:
        return styles.elevated;
    }
  };

  const content = (
    <View style={[styles.card, getVariantStyle(), style]}>
      {(title || subtitle || headerRight) && (
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {title && <Text style={styles.title}>{title}</Text>}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
          {headerRight && <View style={styles.headerRight}>{headerRight}</View>}
        </View>
      )}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.touchable}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  touchable: {
    width: '100%',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  elevated: {
    ...shadows.card,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.7)',
  },
  outlined: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  subtle: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    marginLeft: spacing.sm,
  },
});

