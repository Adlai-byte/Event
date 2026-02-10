// mvc/components/ui/Card.tsx
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { spacing, borderRadius } from '../../theme';
import { shadow } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  padding?: keyof typeof spacing;
  shadowLevel?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
}

export function Card({
  children,
  padding = 'lg',
  shadowLevel = 'md',
  style,
}: CardProps) {
  return (
    <View
      style={[
        styles.base,
        shadow(shadowLevel),
        { padding: spacing[padding] },
        style,
      ]}
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
