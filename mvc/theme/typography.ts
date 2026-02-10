// mvc/theme/typography.ts
import { Platform, TextStyle } from 'react-native';

const fontFamily = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  default: undefined,
});

// Type scale based on 4px grid
export const typography = {
  // Display - hero sections, landing page
  displayLarge: {
    fontSize: 40,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 48,
    letterSpacing: -0.5,
    fontFamily,
  },
  displaySmall: {
    fontSize: 32,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 40,
    letterSpacing: -0.25,
    fontFamily,
  },

  // Headings - page titles, section headers
  h1: {
    fontSize: 24,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 32,
    fontFamily,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 28,
    fontFamily,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 24,
    fontFamily,
  },

  // Body text
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 24,
    fontFamily,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
    fontFamily,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
    fontFamily,
  },

  // Labels and captions
  label: {
    fontSize: 14,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 20,
    fontFamily,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
    fontFamily,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 16,
    fontFamily,
  },

  // Buttons
  button: {
    fontSize: 14,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 20,
    fontFamily,
  },
  buttonSmall: {
    fontSize: 12,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 16,
    fontFamily,
  },
} as const;
