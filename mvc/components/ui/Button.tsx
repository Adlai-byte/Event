// mvc/components/ui/Button.tsx
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, semantic, typography, spacing, borderRadius } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const variantStyles: Record<ButtonVariant, { bg: string; text: string; border?: string }> = {
  primary: { bg: semantic.primary, text: colors.neutral[0] },
  secondary: { bg: colors.neutral[100], text: colors.neutral[800] },
  outline: { bg: 'transparent', text: semantic.primary, border: semantic.primary },
  ghost: { bg: 'transparent', text: colors.neutral[500] },
  destructive: { bg: semantic.error, text: colors.neutral[0] },
};

const sizeStyles: Record<ButtonSize, { height: number; px: number; textStyle: TextStyle }> = {
  sm: { height: 32, px: spacing.md, textStyle: typography.buttonSmall },
  md: { height: 40, px: spacing.lg, textStyle: typography.button },
  lg: { height: 48, px: spacing.xl, textStyle: typography.button },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.base,
        {
          backgroundColor: v.bg,
          height: s.height,
          paddingHorizontal: s.px,
          borderColor: v.border || 'transparent',
          borderWidth: v.border ? 1 : 0,
          opacity: isDisabled ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={v.text} />
      ) : (
        <>
          {icon}
          <Text style={[s.textStyle, { color: v.text, marginLeft: icon ? spacing.sm : 0 }]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  fullWidth: {
    width: '100%',
  },
});
