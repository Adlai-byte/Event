// mvc/components/ui/Spinner.tsx
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, semantic } from '../../theme';
import { typography } from '../../theme';
import { spacing } from '../../theme';

interface SpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  fullPage?: boolean;
}

export function Spinner({ message, size = 'large', fullPage = false }: SpinnerProps) {
  return (
    <View style={[styles.container, fullPage && styles.fullPage]}>
      <ActivityIndicator size={size} color={semantic.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  fullPage: {
    flex: 1,
  },
  message: {
    ...typography.body,
    color: colors.neutral[500],
    marginTop: spacing.md,
  },
});
