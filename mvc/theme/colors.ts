// mvc/theme/colors.ts

export const colors = {
  // Primary brand — clean single-hue blue
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB', // Main primary blue
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#172554',
  },

  // Semantic colors
  success: {
    50: '#D1FAE5',
    100: '#A7F3D0',
    200: '#6EE7B7',
    500: '#10b981', // Main success green
    600: '#059669',
    700: '#047857',
    800: '#065F46',
  },
  warning: {
    50: '#FEF3C7',
    100: '#FDE68A',
    300: '#FCD34D',
    500: '#f59e0b', // Main warning amber
    600: '#D97706',
    800: '#92400E',
  },
  error: {
    50: '#FEE2E2',
    100: '#FECACA',
    500: '#ef4444', // Main error red
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
  },

  // Neutrals (text, backgrounds, borders)
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC', // Page background
    100: '#F1F5F9',
    200: '#E2E8F0', // Borders
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B', // Secondary text
    600: '#475569',
    700: '#334155',
    800: '#1E293B', // Primary text
    900: '#0F172A',
  },

  // Sidebar / dark surfaces — deeper neutral slate
  dark: {
    700: '#1E293B', // Sidebar bg
    800: '#0F172A', // Sidebar active
    900: '#020617',
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
