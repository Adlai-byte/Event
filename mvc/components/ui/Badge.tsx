// mvc/components/ui/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: colors.primary[50], text: colors.primary[500] },
  success: { bg: colors.success[50], text: colors.success[600] },
  warning: { bg: colors.warning[50], text: colors.warning[600] },
  error: { bg: colors.error[50], text: colors.error[600] },
  neutral: { bg: colors.neutral[100], text: colors.neutral[600] },
};

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const v = variantColors[variant];
  return (
    <View
      style={[styles.badge, { backgroundColor: v.bg }]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text style={[styles.text, { color: v.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.labelSmall,
  },
});
