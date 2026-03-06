// mvc/components/ui/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing, borderRadius, shadow } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  padding?: keyof typeof spacing;
  shadowLevel?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Card({
  children,
  padding = 'lg',
  shadowLevel = 'md',
  style,
  accessibilityLabel,
}: CardProps) {
  return (
    <View
      style={[styles.base, shadow(shadowLevel), { padding: spacing[padding] }, style]}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
  },
});
