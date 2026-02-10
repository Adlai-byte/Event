// mvc/theme/colors.ts

export const colors = {
  // Primary brand
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#4a55e1',    // Main primary (was #4a55e1, #4f46e5, #6C63FF, #6366F1)
    600: '#4338CA',
    700: '#3730A3',
    800: '#312E81',
    900: '#1E1B4E',
  },

  // Semantic colors
  success: {
    50: '#D1FAE5',
    100: '#A7F3D0',
    500: '#10b981',    // Main success green
    600: '#059669',
    700: '#047857',
  },
  warning: {
    50: '#FEF3C7',
    100: '#FDE68A',
    500: '#f59e0b',    // Main warning amber
    600: '#D97706',
  },
  error: {
    50: '#FEE2E2',
    100: '#FECACA',
    500: '#ef4444',    // Main error red (was #ef4444, #EF4444, #FF3B30)
    600: '#DC2626',
    700: '#B91C1C',
  },

  // Neutrals (text, backgrounds, borders)
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',     // Page background (was #F8FAFC, #F8F9FA, #F1F5F9, #F3F4F6)
    100: '#F1F5F9',
    200: '#E2E8F0',    // Borders (was #E2E8F0, #E9ECEF, #E5E7EB, #DFE7EF)
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',    // Secondary text (was #64748B, #636E72, #6B7280)
    600: '#475569',
    700: '#334155',
    800: '#1E293B',    // Primary text (was #1E293B, #2D3436, #111827)
    900: '#0F172A',
  },

  // Sidebar / dark surfaces
  dark: {
    700: '#1F3B57',    // Sidebar bg (was #1F3B57, #102A43)
    800: '#102A43',
    900: '#0A1929',
  },
} as const;

// Semantic aliases for quick access
export const semantic = {
  background: colors.neutral[50],
  surface: colors.neutral[0],
  textPrimary: colors.neutral[800],
  textSecondary: colors.neutral[500],
  textMuted: colors.neutral[400],
  border: colors.neutral[200],
  borderLight: colors.neutral[100],
  primary: colors.primary[500],
  primaryLight: colors.primary[50],
  success: colors.success[500],
  successLight: colors.success[50],
  warning: colors.warning[500],
  warningLight: colors.warning[50],
  error: colors.error[500],
  errorLight: colors.error[50],
  sidebarBg: colors.dark[700],
  sidebarActive: colors.dark[800],
} as const;
