# E-Vent Incremental Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Incrementally restructure the E-Vent application from a 67,000-line codebase with god-files, no design system, duplicated layouts, and a 9,560-line monolithic backend into a maintainable, consistent, and secure application - without breaking existing functionality.

**Architecture:** Layered refactor in 7 phases. Phase 1-2 (frontend foundation) and Phase 3 (backend) run in parallel. Phase 4 (router) unlocks Phase 5-6 (decomposition + state). Phase 7 (polish) comes last. Each phase produces a working app - no phase leaves things broken.

**Tech Stack:** React Native 0.81, Expo SDK 54, TypeScript, Express.js, MySQL, Firebase Auth, expo-router (new), TanStack React Query (new), Socket.io (new), Zod (new)

**Current State Audit:**
- 434 uses of `#FFFFFF` + 78 of `#ffffff` + 76 of `#fff` (same color, 3 spellings)
- 4 different "primary" purples: `#4a55e1` (158), `#6C63FF` (80), `#4f46e5` (38), `#6366F1` (24)
- 4 different "background" grays: `#F8FAFC`, `#F8F9FA`, `#F1F5F9`, `#F3F4F6`
- 25+ views each implementing their own sidebar (~150 lines duplicated per view)
- `server/index.js`: 9,560 lines, 80+ endpoints, zero auth middleware
- `App.tsx`: 1,675 lines, 34-value union type for manual routing
- Largest view: `user/DashboardView.tsx` at 4,416 lines

---

## Phase 1: Design System Foundation

**Goal:** Create the visual DNA so every future change is automatically consistent.
**No breaking changes.** New files only. Existing views unchanged until Phase 2+.

---

### Task 1.1: Create Color Tokens

**Files:**
- Create: `mvc/theme/colors.ts`

**Step 1: Create the color tokens file**

Consolidate the 30+ scattered hex values into a single source of truth. Map current colors to semantic names.

```typescript
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
```

**Step 2: Commit**

```bash
git add mvc/theme/colors.ts
git commit -m "feat(theme): add centralized color tokens

Consolidates 30+ scattered hex values into semantic color system.
Maps 4 different 'primary' purples, 4 'background' grays,
4 'border' colors, and 3 'text dark' values to single tokens."
```

---

### Task 1.2: Create Typography Scale

**Files:**
- Create: `mvc/theme/typography.ts`

**Step 1: Create the typography file**

```typescript
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
```

**Step 2: Commit**

```bash
git add mvc/theme/typography.ts
git commit -m "feat(theme): add typography scale

Standardizes font sizes, weights, and line heights.
Replaces inconsistent 18/20/22/32px headers and 14/15/16px body text."
```

---

### Task 1.3: Create Spacing Scale & Shadows

**Files:**
- Create: `mvc/theme/spacing.ts`
- Create: `mvc/theme/shadows.ts`

**Step 1: Create spacing file**

```typescript
// mvc/theme/spacing.ts

// 4px grid system
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
```

**Step 2: Create shadows file**

Build on existing `mvc/utils/shadowStyles.ts` but with preset levels.

```typescript
// mvc/theme/shadows.ts
import { Platform, ViewStyle } from 'react-native';

type ShadowLevel = 'sm' | 'md' | 'lg' | 'xl';

const shadowConfigs: Record<ShadowLevel, { opacity: number; radius: number; height: number }> = {
  sm: { opacity: 0.05, radius: 2, height: 1 },
  md: { opacity: 0.08, radius: 4, height: 2 },
  lg: { opacity: 0.1, radius: 8, height: 4 },
  xl: { opacity: 0.15, radius: 16, height: 8 },
};

export function shadow(level: ShadowLevel): ViewStyle {
  const { opacity, radius, height } = shadowConfigs[level];

  if (Platform.OS === 'web') {
    return {
      // @ts-ignore - web-only property
      boxShadow: `0 ${height}px ${radius * 2}px rgba(0, 0, 0, ${opacity})`,
    };
  }

  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation: radius + 1,
  };
}
```

**Step 3: Create theme barrel export**

```typescript
// mvc/theme/index.ts
export { colors, semantic } from './colors';
export { typography } from './typography';
export { spacing, borderRadius } from './spacing';
export { shadow } from './shadows';
```

**Step 4: Commit**

```bash
git add mvc/theme/spacing.ts mvc/theme/shadows.ts mvc/theme/index.ts
git commit -m "feat(theme): add spacing scale and shadow presets

Completes design system foundation: colors, typography, spacing, shadows.
All exported from mvc/theme/index.ts barrel."
```

---

### Task 1.4: Create Button Component

**Files:**
- Create: `mvc/components/ui/Button.tsx`

**Step 1: Create the Button component**

```tsx
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
import { colors, semantic } from '../../theme';
import { typography } from '../../theme';
import { spacing, borderRadius } from '../../theme';

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
```

**Step 2: Commit**

```bash
git add mvc/components/ui/Button.tsx
git commit -m "feat(ui): add Button component with variants

Supports primary, secondary, outline, ghost, destructive variants.
Three sizes (sm/md/lg), loading state, disabled state, full-width.
Includes accessibility labels and roles."
```

---

### Task 1.5: Create Card Component

**Files:**
- Create: `mvc/components/ui/Card.tsx`

**Step 1: Create the Card component**

```tsx
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
```

**Step 2: Commit**

```bash
git add mvc/components/ui/Card.tsx
git commit -m "feat(ui): add Card component with shadow presets"
```

---

### Task 1.6: Create Input Component

**Files:**
- Create: `mvc/components/ui/Input.tsx`

**Step 1: Create the Input component**

```tsx
// mvc/components/ui/Input.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { colors, semantic } from '../../theme';
import { typography } from '../../theme';
import { spacing, borderRadius } from '../../theme';

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

  const borderColor = error
    ? semantic.error
    : isFocused
    ? semantic.primary
    : semantic.border;

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
```

**Step 2: Commit**

```bash
git add mvc/components/ui/Input.tsx
git commit -m "feat(ui): add Input component with label, error, and focus states"
```

---

### Task 1.7: Create Badge, Spinner, EmptyState, Avatar Components

**Files:**
- Create: `mvc/components/ui/Badge.tsx`
- Create: `mvc/components/ui/Spinner.tsx`
- Create: `mvc/components/ui/EmptyState.tsx`
- Create: `mvc/components/ui/Avatar.tsx`
- Create: `mvc/components/ui/index.ts`

**Step 1: Create Badge**

```tsx
// mvc/components/ui/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { typography } from '../../theme';
import { spacing, borderRadius } from '../../theme';

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
    <View style={[styles.badge, { backgroundColor: v.bg }]}>
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
```

**Step 2: Create Spinner**

```tsx
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
```

**Step 3: Create EmptyState**

```tsx
// mvc/components/ui/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { typography } from '../../theme';
import { spacing } from '../../theme';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <Text style={styles.icon}>{icon}</Text>}
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} variant="outline" size="sm" style={styles.button} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.neutral[800],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.body,
    color: colors.neutral[500],
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: spacing.xl,
  },
  button: {
    marginTop: spacing.sm,
  },
});
```

**Step 4: Create Avatar**

```tsx
// mvc/components/ui/Avatar.tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { typography } from '../../theme';
import { borderRadius } from '../../theme';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
}

export function Avatar({ uri, name, size = 40 }: AvatarProps) {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        accessibilityLabel={name ? `${name}'s avatar` : 'User avatar'}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primary[100],
        },
      ]}
      accessibilityLabel={name ? `${name}'s avatar` : 'User avatar'}
    >
      <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.neutral[200],
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.primary[700],
    fontWeight: '600',
  },
});
```

**Step 5: Create barrel export for UI components**

```typescript
// mvc/components/ui/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export { Badge } from './Badge';
export { Spinner } from './Spinner';
export { EmptyState } from './EmptyState';
export { Avatar } from './Avatar';
```

**Step 6: Commit**

```bash
git add mvc/components/ui/
git commit -m "feat(ui): add Badge, Spinner, EmptyState, Avatar components

Completes Phase 1 design system: theme tokens + 7 base components.
All exported from mvc/components/ui/index.ts barrel."
```

---

## Phase 2: Shared Layout System

**Goal:** One sidebar, one header, one bottom nav. Delete ~4,000-5,000 duplicated lines.

---

### Task 2.1: Create Sidebar Component

**Files:**
- Create: `mvc/components/layout/Sidebar.tsx`

**Step 1: Create the shared sidebar**

Study the current sidebar pattern in any provider view (e.g., `mvc/views/provider/DashboardView.tsx` lines ~130-300) and extract it into a shared component. The sidebar should:

- Accept `role` prop ('user' | 'provider' | 'admin') to determine which nav items show
- Accept `activeRoute` to highlight the current item
- Accept `onNavigate` callback
- Accept `user` for displaying user info at top
- Show unread message badge count
- Handle `sidebarVisible` toggle for mobile
- Render the logo, nav items, and logout button

Nav items per role:

```
User: Dashboard, Bookings, Messages, Hiring, Profile, Settings, Notifications
Provider: Dashboard, Services, Bookings, Proposals, Hiring, Messages, Analytics, Profile, Settings
Admin: Dashboard, Users, Services, Bookings, Analytics, Messages, Applications
```

```tsx
// mvc/components/layout/Sidebar.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, semantic, typography, spacing, shadow, borderRadius } from '../../theme';
import { Avatar } from '../ui/Avatar';

type Role = 'user' | 'provider' | 'admin';

interface NavItem {
  key: string;
  label: string;
  icon: string;
}

interface SidebarProps {
  role: Role;
  activeRoute: string;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  unreadMessages?: number;
  onNavigate: (route: string) => void;
  onLogout: () => void;
  onClose?: () => void;
}

const navItemsByRole: Record<Role, NavItem[]> = {
  user: [
    { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { key: 'bookings', label: 'Bookings', icon: '📅' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'hiring', label: 'Hiring', icon: '💼' },
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'notifications', label: 'Notifications', icon: '🔔' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ],
  provider: [
    { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { key: 'services', label: 'Services', icon: '🛠️' },
    { key: 'bookings', label: 'Bookings', icon: '📅' },
    { key: 'proposals', label: 'Proposals', icon: '📝' },
    { key: 'hiring', label: 'Hiring', icon: '💼' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
    { key: 'profile', label: 'Profile', icon: '👤' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ],
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { key: 'user', label: 'Users', icon: '👥' },
    { key: 'services', label: 'Services', icon: '🛠️' },
    { key: 'bookings', label: 'Bookings', icon: '📅' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'providerApplications', label: 'Applications', icon: '📋' },
  ],
};

export function Sidebar({
  role,
  activeRoute,
  user,
  unreadMessages = 0,
  onNavigate,
  onLogout,
  onClose,
}: SidebarProps) {
  const items = navItemsByRole[role];
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>E-VENT</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close menu">
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* User info */}
      {user && (
        <View style={styles.userSection}>
          <Avatar uri={user.profilePicture} name={displayName} size={36} />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
          </View>
        </View>
      )}

      {/* Navigation */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const isActive = activeRoute === item.key;
          const showBadge = item.key === 'messages' && unreadMessages > 0;

          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onNavigate(item.key)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
            >
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} accessibilityLabel="Log out">
        <Text style={styles.navIcon}>🚪</Text>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 250,
    backgroundColor: semantic.sidebarBg,
    paddingVertical: spacing.lg,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  logo: {
    ...typography.h1,
    color: colors.neutral[0],
  },
  closeButton: {
    color: colors.neutral[400],
    fontSize: 20,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.dark[800],
  },
  userInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  userName: {
    ...typography.label,
    color: colors.neutral[0],
  },
  userEmail: {
    ...typography.caption,
    color: colors.neutral[400],
  },
  nav: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  navItemActive: {
    backgroundColor: semantic.sidebarActive,
  },
  navIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  navLabel: {
    ...typography.body,
    color: colors.neutral[400],
    flex: 1,
    marginLeft: spacing.sm,
  },
  navLabelActive: {
    color: colors.neutral[0],
    fontWeight: '600',
  },
  badge: {
    backgroundColor: colors.error[500],
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    ...typography.caption,
    color: colors.neutral[0],
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.dark[800],
    marginTop: spacing.sm,
  },
  logoutText: {
    ...typography.body,
    color: colors.neutral[400],
    marginLeft: spacing.sm,
  },
});
```

**Step 2: Commit**

```bash
git add mvc/components/layout/Sidebar.tsx
git commit -m "feat(layout): add shared Sidebar component

Role-aware navigation sidebar supporting user/provider/admin.
Replaces ~25 duplicate sidebar implementations."
```

---

### Task 2.2: Create Header and BottomNav Components

**Files:**
- Create: `mvc/components/layout/Header.tsx`
- Create: `mvc/components/layout/BottomNav.tsx`

**Step 1: Create Header component**

The header shows the current page title, notification bell, and hamburger menu (mobile only).

```tsx
// mvc/components/layout/Header.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { colors, semantic, typography, spacing, shadow } from '../../theme';

interface HeaderProps {
  title: string;
  notificationCount?: number;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  showMenu?: boolean;
}

export function Header({
  title,
  notificationCount = 0,
  onMenuPress,
  onNotificationPress,
  showMenu = false,
}: HeaderProps) {
  return (
    <View style={[styles.container, shadow('sm')]}>
      <View style={styles.left}>
        {showMenu && (
          <TouchableOpacity
            onPress={onMenuPress}
            style={styles.menuButton}
            accessibilityLabel="Open menu"
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.right}>
        <TouchableOpacity
          onPress={onNotificationPress}
          style={styles.notifButton}
          accessibilityLabel={`Notifications${notificationCount > 0 ? `, ${notificationCount} unread` : ''}`}
        >
          <Text style={styles.notifIcon}>🔔</Text>
          {notificationCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral[0],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    ...(Platform.OS === 'web' ? { position: 'sticky' as any, top: 0, zIndex: 100 } : {}),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    marginRight: spacing.md,
    padding: spacing.xs,
  },
  menuIcon: {
    fontSize: 22,
    color: colors.neutral[800],
  },
  title: {
    ...typography.h2,
    color: colors.neutral[800],
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifButton: {
    padding: spacing.sm,
    position: 'relative',
  },
  notifIcon: {
    fontSize: 20,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.error[500],
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.neutral[0],
  },
});
```

**Step 2: Create BottomNav component**

Mobile bottom tab navigation.

```tsx
// mvc/components/layout/BottomNav.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, semantic, typography, spacing, shadow } from '../../theme';

interface BottomNavItem {
  key: string;
  label: string;
  icon: string;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeRoute: string;
  unreadMessages?: number;
  onNavigate: (route: string) => void;
}

export function BottomNav({ items, activeRoute, unreadMessages = 0, onNavigate }: BottomNavProps) {
  return (
    <View style={[styles.container, shadow('md')]}>
      {items.map((item) => {
        const isActive = activeRoute === item.key;
        const showBadge = item.key === 'messages' && unreadMessages > 0;

        return (
          <TouchableOpacity
            key={item.key}
            style={styles.tab}
            onPress={() => onNavigate(item.key)}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: isActive }}
          >
            <View style={styles.iconContainer}>
              <Text style={[styles.icon, isActive && styles.iconActive]}>{item.icon}</Text>
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.neutral[0],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
    paddingBottom: spacing.xs,
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  icon: {
    fontSize: 20,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  labelActive: {
    color: semantic.primary,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error[500],
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.neutral[0],
  },
});
```

**Step 3: Commit**

```bash
git add mvc/components/layout/Header.tsx mvc/components/layout/BottomNav.tsx
git commit -m "feat(layout): add Header and BottomNav components

Header: sticky on web, notification bell with badge, hamburger menu.
BottomNav: mobile tab bar with unread message badge."
```

---

### Task 2.3: Create AppLayout Wrapper

**Files:**
- Create: `mvc/components/layout/AppLayout.tsx`
- Create: `mvc/components/layout/index.ts`

**Step 1: Create the AppLayout that ties everything together**

This is the master layout wrapper. Every authenticated view wraps its content in `<AppLayout>`. It handles:
- Showing sidebar on desktop, bottom nav on mobile
- Hamburger toggle for mobile sidebar
- Fetching unread message count (once, shared)
- Responsive behavior

```tsx
// mvc/components/layout/AppLayout.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { colors, semantic, spacing } from '../../theme';
import { getApiBaseUrl } from '../../services/api';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

type Role = 'user' | 'provider' | 'admin';

interface AppLayoutProps {
  children: React.ReactNode;
  role: Role;
  activeRoute: string;
  title: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    profilePicture?: string;
  };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

const mobileNavItems: Record<Role, { key: string; label: string; icon: string }[]> = {
  user: [
    { key: 'dashboard', label: 'Home', icon: '🏠' },
    { key: 'bookings', label: 'Bookings', icon: '📅' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'hiring', label: 'Hiring', icon: '💼' },
    { key: 'profile', label: 'Profile', icon: '👤' },
  ],
  provider: [
    { key: 'dashboard', label: 'Home', icon: '🏠' },
    { key: 'services', label: 'Services', icon: '🛠️' },
    { key: 'bookings', label: 'Bookings', icon: '📅' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'profile', label: 'Profile', icon: '👤' },
  ],
  admin: [
    { key: 'dashboard', label: 'Home', icon: '🏠' },
    { key: 'user', label: 'Users', icon: '👥' },
    { key: 'services', label: 'Services', icon: '🛠️' },
    { key: 'messages', label: 'Messages', icon: '💬' },
    { key: 'providerApplications', label: 'Apps', icon: '📋' },
  ],
};

export function AppLayout({
  children,
  role,
  activeRoute,
  title,
  user,
  onNavigate,
  onLogout,
}: AppLayoutProps) {
  const { isMobile } = useBreakpoints();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  // Shared unread message count - fetched ONCE here instead of in every view
  const loadUnreadMessages = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/user/messages/count?email=${encodeURIComponent(user.email)}`
      );
      const data = await res.json();
      if (data.ok) setUnreadMessages(data.count || 0);
    } catch {}
  }, [user?.email]);

  const loadNotificationCount = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/notifications/unread-count?email=${encodeURIComponent(user.email)}`
      );
      const data = await res.json();
      if (data.ok) setNotificationCount(data.count || 0);
    } catch {}
  }, [user?.email]);

  useEffect(() => {
    loadUnreadMessages();
    loadNotificationCount();
    const interval = setInterval(() => {
      loadUnreadMessages();
      loadNotificationCount();
    }, 30000); // Poll every 30s instead of 2-3s
    return () => clearInterval(interval);
  }, [loadUnreadMessages, loadNotificationCount]);

  const handleNavigate = (route: string) => {
    setSidebarOpen(false);
    onNavigate(route);
  };

  // Desktop: sidebar + content
  if (!isMobile) {
    return (
      <View style={styles.desktopContainer}>
        <Sidebar
          role={role}
          activeRoute={activeRoute}
          user={user}
          unreadMessages={unreadMessages}
          onNavigate={handleNavigate}
          onLogout={onLogout}
        />
        <View style={styles.desktopContent}>
          <Header
            title={title}
            notificationCount={notificationCount}
            onNotificationPress={() => handleNavigate('notifications')}
          />
          <View style={styles.pageContent}>
            {children}
          </View>
        </View>
      </View>
    );
  }

  // Mobile: header + content + bottom nav (+ drawer sidebar)
  return (
    <View style={styles.mobileContainer}>
      <Header
        title={title}
        showMenu
        notificationCount={notificationCount}
        onMenuPress={() => setSidebarOpen(true)}
        onNotificationPress={() => handleNavigate('notifications')}
      />
      <View style={styles.mobileContent}>
        {children}
      </View>
      <BottomNav
        items={mobileNavItems[role]}
        activeRoute={activeRoute}
        unreadMessages={unreadMessages}
        onNavigate={handleNavigate}
      />

      {/* Mobile sidebar drawer */}
      <Modal visible={sidebarOpen} transparent animationType="none">
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setSidebarOpen(false)} />
          <Sidebar
            role={role}
            activeRoute={activeRoute}
            user={user}
            unreadMessages={unreadMessages}
            onNavigate={handleNavigate}
            onLogout={onLogout}
            onClose={() => setSidebarOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: semantic.background,
  },
  desktopContent: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    padding: spacing.xl,
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: semantic.background,
  },
  mobileContent: {
    flex: 1,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
```

**Step 2: Create barrel export**

```typescript
// mvc/components/layout/index.ts
export { AppLayout } from './AppLayout';
export { Sidebar } from './Sidebar';
export { Header } from './Header';
export { BottomNav } from './BottomNav';
```

**Step 3: Commit**

```bash
git add mvc/components/layout/
git commit -m "feat(layout): add AppLayout master wrapper

Handles sidebar (desktop), bottom nav (mobile), header, drawer menu.
Fetches unread messages once instead of in each view.
Eliminates ~4,000-5,000 lines of duplicated layout code."
```

---

### Task 2.4: Migrate Provider DashboardView to AppLayout (Pilot)

**Files:**
- Modify: `mvc/views/provider/DashboardView.tsx`

**Step 1: Refactor Provider DashboardView**

This is the pilot migration. Remove all sidebar/header/bottom nav code from the view and wrap content in `<AppLayout>`. Delete:
- `sidebarVisible` state
- `unreadMessagesCount` state
- `loadUnreadMessagesCount()` function
- All sidebar JSX rendering
- All header JSX rendering
- Bottom nav rendering

Replace with:

```tsx
import { AppLayout } from '../../components/layout';

export const DashboardView = ({ user, onNavigate, onLogout }) => {
  // ... keep business logic (stats, activities, etc.)
  // ... remove sidebar/header state and JSX

  return (
    <AppLayout
      role="provider"
      activeRoute="dashboard"
      title="Dashboard"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      {/* Only the dashboard-specific content here */}
      <ScrollView>
        {/* Stats cards, activity feed, etc. */}
      </ScrollView>
    </AppLayout>
  );
};
```

**Step 2: Verify the app still works**

Run: `npm start` and navigate to provider dashboard. Verify sidebar, header, and bottom nav render correctly.

**Step 3: Commit**

```bash
git add mvc/views/provider/DashboardView.tsx
git commit -m "refactor(provider): migrate DashboardView to AppLayout

Pilot migration. Removed ~150 lines of duplicated sidebar/header code.
View now uses shared AppLayout wrapper."
```

---

### Task 2.5: Migrate Remaining Provider Views

**Files to modify (one at a time, same pattern as Task 2.4):**
- `mvc/views/provider/ServicesView.tsx`
- `mvc/views/provider/BookingsView.tsx`
- `mvc/views/provider/ProposalsView.tsx`
- `mvc/views/provider/HiringView.tsx`
- `mvc/views/provider/MessagingView.tsx`
- `mvc/views/provider/AnalyticsView.tsx`
- `mvc/views/provider/ProfileView.tsx`
- `mvc/views/provider/PaymentSetupView.tsx`
- `mvc/views/provider/SettingsView.tsx`

For each: remove sidebar/header/nav code, wrap in `<AppLayout role="provider">`.

**Commit after each view** with message format:
```bash
git commit -m "refactor(provider): migrate [ViewName] to AppLayout"
```

---

### Task 2.6: Migrate Admin and User Views

Same pattern as Task 2.5 for admin views (7 files) and user views (13 files).

**Admin views:** Use `role="admin"`.
**User views:** Use `role="user"`.

**Commit after each view.**

---

## Phase 3: Backend Split & Security

**Goal:** Break the 9,560-line monolith. Add auth middleware. Runs in parallel with Phase 1-2.

---

### Task 3.1: Create Backend File Structure

**Step 1: Create directories and middleware files**

```bash
mkdir -p server/routes server/middleware server/schemas
```

**Step 2: Create auth middleware**

```javascript
// server/middleware/auth.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK (if not already)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'No authentication token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: 'Invalid or expired token' });
  }
}

// Optional auth - sets req.user if token present, continues if not
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split('Bearer ')[1];
      const decoded = await admin.auth().verifyIdToken(token);
      req.user = { uid: decoded.uid, email: decoded.email };
    } catch {}
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };
```

**Step 3: Create error handler middleware**

```javascript
// server/middleware/errorHandler.js

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function errorHandler(err, req, res, next) {
  if (err.isOperational) {
    return res.status(err.statusCode).json({ ok: false, error: err.message });
  }

  console.error('Unexpected error:', err);
  res.status(500).json({ ok: false, error: 'Internal server error' });
}

module.exports = { AppError, errorHandler };
```

**Step 4: Create rate limiter middleware**

```javascript
// server/middleware/rateLimiter.js
const rateLimit = {};

function rateLimiter(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimit[ip]) {
      rateLimit[ip] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    if (now > rateLimit[ip].resetTime) {
      rateLimit[ip] = { count: 1, resetTime: now + windowMs };
      return next();
    }

    rateLimit[ip].count++;
    if (rateLimit[ip].count > maxRequests) {
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }

    next();
  };
}

module.exports = { rateLimiter };
```

**Step 5: Commit**

```bash
git add server/middleware/
git commit -m "feat(server): add auth, error handler, and rate limiter middleware

Auth middleware verifies Firebase ID tokens.
Error handler centralizes error responses.
Rate limiter prevents API abuse."
```

---

### Task 3.2: Extract Admin Routes (Smallest First)

**Files:**
- Create: `server/routes/admin.js`
- Modify: `server/index.js` - remove admin endpoints, mount admin router

**Step 1: Create admin route module**

Extract the 3 admin endpoints from `server/index.js` into `server/routes/admin.js`. Find them by searching for `/api/admin/` in index.js.

```javascript
// server/routes/admin.js
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/admin/provider-applications
router.get('/provider-applications', authMiddleware, async (req, res, next) => {
  // ... move existing logic from index.js
});

// POST /api/admin/provider-applications/:id/approve
router.post('/provider-applications/:id/approve', authMiddleware, async (req, res, next) => {
  // ... move existing logic from index.js
});

// POST /api/admin/provider-applications/:id/reject
router.post('/provider-applications/:id/reject', authMiddleware, async (req, res, next) => {
  // ... move existing logic from index.js
});

module.exports = router;
```

**Step 2: Mount in index.js**

Add near the top of `server/index.js`:
```javascript
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
```

Remove the extracted endpoints from index.js.

**Step 3: Test**

```bash
curl -s http://localhost:3001/api/admin/provider-applications
```
Expected: 401 Unauthorized (auth middleware working) or existing behavior if no auth header sent.

**Step 4: Commit**

```bash
git add server/routes/admin.js server/index.js
git commit -m "refactor(server): extract admin routes to separate module

First route extraction. 3 endpoints moved to server/routes/admin.js.
Added auth middleware protection."
```

---

### Task 3.3: Extract Remaining Route Modules

**Extract one module at a time**, following the same pattern as Task 3.2:

| Order | File | Endpoints | Source search in index.js |
|-------|------|-----------|--------------------------|
| 1 | `routes/analytics.js` | ~3 | `/api/dashboard/stats`, `/api/admin/analytics` |
| 2 | `routes/notifications.js` | ~9 | `/api/notifications` |
| 3 | `routes/messaging.js` | ~8 | `/api/user/messages`, `/api/conversations` |
| 4 | `routes/users.js` | ~6 | `/api/users` |
| 5 | `routes/services.js` | ~14 | `/api/services` |
| 6 | `routes/packages.js` | ~12 | `/api/packages`, `/api/categories`, `/api/items` |
| 7 | `routes/hiring.js` | ~15 | `/api/hiring`, `/api/job-postings`, `/api/job-applications` |
| 8 | `routes/bookings.js` | ~28 | `/api/bookings`, `/api/payments` |

**For each module:**
1. Create the route file
2. Move the endpoints from index.js
3. Add `authMiddleware` to protected routes (all except health, public service listing)
4. Mount in index.js with `app.use('/api/...', routeModule)`
5. Test the endpoints still work
6. Commit with message: `refactor(server): extract [domain] routes to separate module`

**After all extractions, index.js should be ~50-100 lines:**

```javascript
// server/index.js (final state)
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(rateLimiter());

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/analytics'));
app.use('/api', require('./routes/notifications'));
app.use('/api', require('./routes/messaging'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/services'));
app.use('/api', require('./routes/packages'));
app.use('/api', require('./routes/hiring'));
app.use('/api', require('./routes/bookings'));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// Error handler (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ ok: false, error: `Route not found: ${req.method} ${req.originalUrl}` });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
```

---

## Phase 4: Router Migration

**Goal:** Replace manual setState routing with expo-router.
**Prerequisite:** Phase 2 complete (AppLayout in use).

---

### Task 4.1: Install and Configure expo-router

**Step 1: Install dependencies**

```bash
npx expo install expo-router expo-linking expo-constants
```

**Step 2: Update app.json**

Add `"scheme": "e-vent"` and configure web entry point.

**Step 3: Create initial app/ directory structure**

Create the file-based routing structure as outlined in Phase 4 of the design doc. Start with `app/_layout.tsx` (root layout with auth check) and `app/index.tsx` (landing page redirect).

**Step 4: Migrate one role at a time**

Start with provider (priority). Each view file in `app/(provider)/` imports the existing view component and wraps it. Gradually move logic into the route file and simplify the view.

**Detailed implementation will be planned in a sub-plan when Phase 2-3 are complete**, as the exact migration depends on the state of the codebase after those phases.

---

## Phase 5: Component Decomposition

**Prerequisite:** Phase 4 complete (router in place).

Break the remaining god-files per the design doc:
- `user/DashboardView.tsx` (4,416 lines → ~8 files)
- `provider/ServicesView.tsx` (3,129 lines → ~6 files)
- `provider/HiringView.tsx` (3,738 lines → ~7 files)
- `BookingModal.tsx` (2,418 lines → ~5 files)
- Other views over 1,000 lines

**Detailed sub-plan for each decomposition will be created when Phase 4 is complete.**

---

## Phase 6: State Management & Data Fetching

**Prerequisite:** Phase 4 complete.

### Task 6.1: Install TanStack React Query

```bash
npm install @tanstack/react-query
```

### Task 6.2: Create Auth Context

Replace prop drilling with React Context for auth state.

### Task 6.3: Create Custom Hooks

One hook per domain: `useServices`, `useBookings`, `usePackages`, `useMessages`, `useStats`.

**Detailed sub-plan will be created when Phase 5 is complete.**

---

## Phase 7: Real-time & Polish

**Prerequisite:** Phase 6 complete.

### Task 7.1: Add Socket.io for Real-time Messaging

Replace polling with WebSocket connections.

### Task 7.2: Accessibility Pass

Add accessibilityLabel, accessibilityRole, keyboard navigation.

### Task 7.3: Skeleton Loading Screens

Replace spinners with content-aware skeleton placeholders.

**Detailed sub-plan will be created when Phase 6 is complete.**

---

## Execution Order Summary

```
Week 1-2:  Phase 1 (Design System)     + Phase 3.1-3.2 (Backend middleware + first extraction)
Week 2-3:  Phase 2 (Shared Layout)     + Phase 3.3 (Remaining backend extractions)
Week 3-4:  Phase 4 (Router Migration)
Week 4-5:  Phase 5 (Component Decomposition)
Week 5-6:  Phase 6 (State + Data Fetching)
Week 6-7:  Phase 7 (Real-time + Polish)
```

Phases 1-3 have complete implementation code above.
Phases 4-7 have detailed sub-plans created when their prerequisites are met.
Each phase produces a fully working app - no phase leaves things broken.
