import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { borderRadius, spacing } from '../constants/theme';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: 'soft' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  variant = 'soft',
  size = 'md',
  style,
  textStyle,
}) => {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.container,
        variant === 'outline' ? styles.outlineContainer : styles.softContainer,
        fullWidth ? styles.fullWidth : styles.autoWidth,
        size === 'sm' && styles.smContainer,
        size === 'lg' && styles.lgContainer,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={colors.primary}
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.text,
              size === 'sm' && styles.smText,
              size === 'lg' && styles.lgText,
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={colors.primary}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md - 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  softContainer: {
    backgroundColor: colors.primarySoft,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  autoWidth: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xl,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  smContainer: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  smText: {
    fontSize: 13,
  },
  lgContainer: {
    paddingVertical: spacing.lg - 3,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
  },
  lgText: {
    fontSize: 16,
    fontWeight: '700',
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
});

