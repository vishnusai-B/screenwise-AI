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

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
}) => {
  const getVariantContainerStyle = (): ViewStyle => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryContainer;
      case 'outline':
        return styles.outlineContainer;
      case 'danger':
        return styles.dangerContainer;
      case 'ghost':
        return styles.ghostContainer;
      case 'primary':
      default:
        return styles.primaryContainer;
    }
  };

  const getVariantTextStyle = (): TextStyle => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryText;
      case 'outline':
        return styles.outlineText;
      case 'danger':
        return styles.dangerText;
      case 'ghost':
        return styles.ghostText;
      case 'primary':
      default:
        return styles.primaryText;
    }
  };

  const getSizeContainerStyle = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return styles.smContainer;
      case 'lg':
        return styles.lgContainer;
      case 'md':
      default:
        return styles.mdContainer;
    }
  };

  const getSizeTextStyle = (): TextStyle => {
    switch (size) {
      case 'sm':
        return styles.smText;
      case 'lg':
        return styles.lgText;
      case 'md':
      default:
        return styles.mdText;
    }
  };

  const iconColor = (): string => {
    switch (variant) {
      case 'secondary':
        return colors.primary;
      case 'outline':
        return colors.primary;
      case 'danger':
        return colors.textInverse;
      case 'ghost':
        return colors.secondaryText;
      case 'primary':
      default:
        return colors.textInverse;
    }
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.base,
        getVariantContainerStyle(),
        getSizeContainerStyle(),
        fullWidth ? styles.fullWidth : styles.autoWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor()} size="small" />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={iconColor()}
              style={styles.leftIcon}
            />
          )}
          <Text
            style={[
              styles.baseText,
              getVariantTextStyle(),
              getSizeTextStyle(),
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={iconSize}
              color={iconColor()}
              style={styles.rightIcon}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
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
    paddingHorizontal: spacing.lg,
  },
  disabled: {
    opacity: 0.55,
  },
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },

  // Variants
  primaryContainer: {
    backgroundColor: colors.primary,
    ...shadows.subtle,
  },
  primaryText: {
    color: colors.textInverse,
  },
  secondaryContainer: {
    backgroundColor: colors.primarySoft,
  },
  secondaryText: {
    color: colors.primary,
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  outlineText: {
    color: colors.primary,
  },
  dangerContainer: {
    backgroundColor: colors.error,
  },
  dangerText: {
    color: colors.textInverse,
  },
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.secondaryText,
  },

  // Sizes
  smContainer: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  smText: {
    fontSize: 13,
  },
  mdContainer: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  mdText: {
    fontSize: 15,
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

  // Icons
  leftIcon: {
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
});

