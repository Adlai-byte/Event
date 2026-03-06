import React from 'react';
import { TextInput, Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

interface DateTimeInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: ViewStyle | TextStyle;
  type?: 'datetime' | 'date';
  accessibilityLabel?: string;
  placeholderTextColor?: string;
}

/**
 * Cross-platform date/time input.
 * On web: renders native HTML input (type="datetime-local" or "date").
 * On native: renders TextInput with format placeholder.
 */
export const DateTimeInput: React.FC<DateTimeInputProps> = ({
  value,
  onChange,
  placeholder,
  style,
  type = 'datetime',
  accessibilityLabel,
  placeholderTextColor,
}) => {
  if (Platform.OS === 'web') {
    const inputType = type === 'date' ? 'date' : 'datetime-local';
    // Convert "YYYY-MM-DD HH:MM" → "YYYY-MM-DDTHH:MM" for HTML input
    const htmlValue = value ? value.replace(' ', 'T') : '';
    return (
      <TextInput
        style={[webStyles.input, style]}
        value={htmlValue}
        onChangeText={(text) => {
          // Convert back: "YYYY-MM-DDTHH:MM" → "YYYY-MM-DD HH:MM"
          onChange(text.replace('T', ' '));
        }}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        accessibilityLabel={accessibilityLabel}
        // @ts-expect-error — web-only prop for HTML input type
        {...(Platform.OS === 'web' ? { type: inputType } : {})}
      />
    );
  }

  // Native fallback: plain TextInput with format hint
  return (
    <TextInput
      style={style}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder || (type === 'date' ? 'YYYY-MM-DD' : 'YYYY-MM-DD HH:MM')}
      placeholderTextColor={placeholderTextColor}
      accessibilityLabel={accessibilityLabel}
    />
  );
};

const webStyles = StyleSheet.create({
  input: {
    // Ensures native HTML date picker renders properly on web
  },
});
