// mvc/components/ui/Input.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { colors, semantic, typography, spacing, borderRadius } from '../../theme';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  helperText,
  required = false,
  containerStyle,
  ...textInputProps
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const borderColor = error ? semantic.error : isFocused ? semantic.primary : semantic.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <TextInput
        {...textInputProps}
        onFocus={(e) => {
          setIsFocused(true);
          textInputProps.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          textInputProps.onBlur?.(e);
        }}
        placeholderTextColor={colors.neutral[400]}
        style={[styles.input, { borderColor }]}
        accessibilityLabel={label}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {!error && helperText && <Text style={styles.helper}>{helperText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.label,
    color: colors.neutral[800],
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error[500],
  },
  input: {
    ...typography.body,
    color: colors.neutral[800],
    backgroundColor: colors.neutral[0],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    height: 44,
  },
  error: {
    ...typography.bodySmall,
    color: colors.error[500],
    marginTop: spacing.xs,
  },
  helper: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    marginTop: spacing.xs,
  },
});
