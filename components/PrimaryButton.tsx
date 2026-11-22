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
import { borderRadius, shadows, spacing } from '../constants/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  size = 'md',
  style,
  textStyle,
}) => {
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.container,
        fullWidth ? styles.fullWidth : styles.autoWidth,
        size === 'sm' && styles.smContainer,
        size === 'lg' && styles.lgContainer,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.textInverse} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={colors.textInverse}
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
              color={colors.textInverse}
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
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.subtle,
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
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  smContainer: {
    paddingVertical: spacing.xs + 3,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  smText: {
    fontSize: 13,
  },
  lgContainer: {
    paddingVertical: spacing.lg - 2,
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

