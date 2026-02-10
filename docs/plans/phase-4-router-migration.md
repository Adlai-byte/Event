# Phase 4: Router Migration (expo-router)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 1,730-line App.tsx with file-based routing via expo-router, eliminating ~30 duplicated `onNavigate` callbacks, complex auth routing useEffects, and state-based parameter passing.

**Prerequisite:** Phase 2-3 complete (AppLayout in use, backend routes extracted). ✅

**Current Problems:**
- `App.tsx` is 1,730 lines with a 31-value `MainView` union type
- Every view receives a duplicated `onNavigate` callback (~268 if-statements total)
- Auth routing logic spread across 3 `useEffect` hooks (~100 lines)
- `PersonalInfoView` `onSave` handler duplicated for user and provider (~100 lines each)
- Navigation params (`selectedServiceId`, `selectedProviderEmail`, `selectedConversationId`) stored as state

**After Phase 4:**
- `App.tsx` → deleted, replaced by `app/_layout.tsx` (~40 lines)
- Navigation via `router.push('/provider/services')` — no more callbacks
- Auth state via `useAuth()` hook — no more prop drilling
- Params via URL: `/user/service/123` — no more state management
- Each route file is a thin wrapper (~20-40 lines)

---

## File Structure

```
app/
  _layout.tsx             -- Root: AuthProvider + ErrorBoundary + Slot
  index.tsx               -- Smart redirect based on auth + role + platform

  login.tsx               -- Wraps LoginView
  register.tsx            -- Wraps RegisterView
  landing.tsx             -- Wraps LandingPage (desktop only)

  user/
    _layout.tsx           -- Auth guard + role guard + AppLayout(role='user') + Slot
    index.tsx             -- Redirect to /user/dashboard
    dashboard.tsx
    bookings.tsx
    messages.tsx
    hiring.tsx
    profile.tsx
    personal-info.tsx
    settings.tsx
    help-center.tsx
    payment-methods.tsx
    notifications.tsx
    service/[id].tsx      -- URL param for service ID
    provider/[email].tsx  -- URL param for provider email

  provider/
    _layout.tsx           -- Auth guard + role guard + AppLayout(role='provider') + Slot
    index.tsx             -- Redirect to /provider/dashboard
    dashboard.tsx
    services.tsx
    bookings.tsx
    proposals.tsx
    hiring.tsx
    messages.tsx
    analytics.tsx
    profile.tsx
    settings.tsx
    payment-setup.tsx
    personal-info.tsx
    notifications.tsx

  admin/
    _layout.tsx           -- Auth guard + role guard + AppLayout(role='admin') + Slot
    index.tsx             -- Redirect to /admin/dashboard
    dashboard.tsx
    users.tsx
    services.tsx
    bookings.tsx
    analytics.tsx
    messages.tsx
    provider-applications.tsx

mvc/
  contexts/
    AuthContext.tsx        -- Auth state + handlers context
  hooks/
    useUpdateUser.ts      -- Extracted PersonalInfoView save logic
```

---

## Task 4.1: Create AuthContext

**Files:**
- Create: `mvc/contexts/AuthContext.tsx`

Extract all auth state management from App.tsx into a React Context. This makes auth data available to any component without prop drilling, which is required for expo-router layouts to access auth state.

```typescript
// mvc/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useRef, useContext, useCallback } from 'react';
import { Platform, Alert, Dimensions } from 'react-native';
import { AuthController } from '../controllers/AuthController';
import { AuthState } from '../models/AuthState';
import { User } from '../models/User';
import { getApiBaseUrl } from '../services/api';
import AuthService from '../services/AuthService';
import { PushNotificationService } from '../services/PushNotificationService';

interface AuthContextValue {
  authState: AuthState;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (formData: any) => Promise<{ success: boolean; error?: string }>;
  register: (formData: any) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  logoutVoid: () => Promise<void>;
  sendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  checkEmailVerification: () => Promise<{ success: boolean; verified?: boolean; error?: string }>;
  updateUserEmail: (newEmail: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  refreshUser: (updatedUser: Partial<User>) => Promise<boolean>;
  authController: AuthController | null;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(new AuthState());
  const authStateRef = useRef<AuthState>(authState);
  const [authController, setAuthController] = useState<AuthController | null>(null);

  useEffect(() => { authStateRef.current = authState; }, [authState]);

  // Initialize auth controller
  useEffect(() => {
    const controller = new AuthController(setAuthState);
    setAuthController(controller);
  }, []);

  // Register push notifications when authenticated
  useEffect(() => {
    if (authState.isAuthenticated && authState.user?.role) {
      const delayMs = Platform.OS !== 'web' ? 2500 : 1000;
      const timeout = setTimeout(() => {
        try {
          const userId = authState.user!.uid || '';
          const userEmail = authState.user!.email || '';
          if (userId && userEmail) {
            PushNotificationService.registerForPushNotificationsAsync(userId, userEmail).catch(() => {});
          }
        } catch {}
      }, delayMs);
      return () => clearTimeout(timeout);
    }
  }, [authState.isAuthenticated, authState.user?.id, authState.user?.email, authState.user?.role]);

  // Setup notification listeners (mobile only)
  useEffect(() => {
    if (authState.isAuthenticated && authState.user?.role && Platform.OS !== 'web') {
      try {
        const sub = PushNotificationService.setupNotificationListeners(
          () => {},
          () => {} // Navigation is handled by router now, not notification tap handlers here
        );
        return () => { try { sub.remove(); } catch {} };
      } catch {}
    }
  }, [authState.isAuthenticated, authState.user]);

  // Suppress Datadog warnings
  useEffect(() => {
    if (typeof window !== 'undefined' && window.console) {
      const origWarn = console.warn;
      console.warn = (...args: any[]) => {
        if (args.join(' ').includes('Datadog Browser SDK')) return;
        origWarn.apply(console, args);
      };
      return () => { console.warn = origWarn; };
    }
  }, []);

  const login = useCallback(async (formData: any) => {
    if (!authController) return { success: false, error: 'Controller not initialized' };
    const result = await authController.login(formData);
    if (result.success && Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem('justLoggedIn', 'true');
      setTimeout(() => window.location.reload(), 100);
    }
    return result;
  }, [authController]);

  const register = useCallback(async (formData: any) => {
    if (!authController) return { success: false, error: 'Controller not initialized' };
    return await authController.register(formData);
  }, [authController]);

  const loginWithGoogle = useCallback(async () => {
    if (!authController) return false;
    return await authController.loginWithGoogle();
  }, [authController]);

  const forgotPassword = useCallback(async (email: string) => {
    if (!authController) return false;
    return await authController.resetPassword(email);
  }, [authController]);

  const logout = useCallback(async () => {
    if (!authController) return false;
    try {
      const success = await authController.logout();
      return success;
    } catch {
      return false;
    }
  }, [authController]);

  const logoutVoid = useCallback(async () => { await logout(); }, [logout]);

  const sendVerificationEmail = useCallback(async () => {
    if (!authController) return { success: false, error: 'Controller not available' };
    return await authController.sendEmailVerification();
  }, [authController]);

  const checkEmailVerification = useCallback(async () => {
    if (!authController) return { success: false, verified: false, error: 'Controller not available' };
    return await authController.checkEmailVerification();
  }, [authController]);

  const updateUserEmail = useCallback(async (newEmail: string) => {
    if (!authController) return { success: false, error: 'Controller not available' };
    return await authController.updateUserEmail(newEmail);
  }, [authController]);

  // Shared user update logic (extracted from the duplicated PersonalInfoView onSave)
  const refreshUser = useCallback(async (updatedUser: Partial<User>) => {
    try {
      if (!authState.user?.email) return false;
      const refreshResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${encodeURIComponent(authState.user.email)}`);
      if (refreshResp.ok) {
        const data = await refreshResp.json();
        if (data.ok && data.exists) {
          const firebaseUser = AuthService.getCurrentUser();
          const updatedObj = new User(
            authState.user.uid,
            firebaseUser?.email || authState.user.email,
            authState.user.displayName,
            firebaseUser?.emailVerified ?? authState.user.emailVerified,
            authState.user.createdAt,
            authState.user.lastLoginAt,
            data.firstName || authState.user.firstName,
            data.middleName || authState.user.middleName,
            data.lastName || authState.user.lastName,
            data.suffix || '',
            data.phone || authState.user.phone,
            data.dateOfBirth || authState.user.dateOfBirth,
            data.address || authState.user.address,
            data.city || authState.user.city,
            data.state || authState.user.state,
            data.zipCode || authState.user.zipCode,
            data.role || authState.user.role,
            data.profilePicture || authState.user.profilePicture
          );
          setAuthState(prev => prev.setUser(updatedObj));
          return true;
        }
      }
      return false;
    } catch { return false; }
  }, [authState.user]);

  const value: AuthContextValue = {
    authState,
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    logout,
    logoutVoid,
    sendVerificationEmail,
    checkEmailVerification,
    updateUserEmail,
    refreshUser,
    authController,
    setAuthState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**Verification:** App still compiles. Context is created but not yet used.

---

## Task 4.2: Create useUpdateUser hook

**Files:**
- Create: `mvc/hooks/useUpdateUser.ts`

Extract the ~100-line duplicated `onSave` handler for PersonalInfoView into a reusable hook. Both the user and provider PersonalInfoView route files will use this hook.

```typescript
// mvc/hooks/useUpdateUser.ts
import { useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { getApiBaseUrl } from '../services/api';
import { User } from '../models/User';
import AuthService from '../services/AuthService';
import { useAuth } from '../contexts/AuthContext';

export function useUpdateUser() {
  const { authState, authController, setAuthState, updateUserEmail, checkEmailVerification } = useAuth();

  const saveUser = useCallback(async (updatedUser: any): Promise<boolean | { success: boolean; error?: string }> => {
    try {
      if (!authState.user?.email) {
        if (Platform.OS === 'web') return { success: false, error: 'User email not found' };
        Alert.alert('Error', 'User email not found');
        return false;
      }

      const emailChanged = updatedUser.email && updatedUser.email.trim() !== authState.user.email.trim();

      if (emailChanged) {
        const result = await updateUserEmail(updatedUser.email.trim());
        if (!result.success) {
          if (Platform.OS === 'web') return { success: false, error: result.error || 'Failed to update email' };
          Alert.alert('Error', result.error || 'Failed to update email');
          return false;
        }
        if (result.message?.includes('verification email') && Platform.OS !== 'web') {
          Alert.alert('Verification Email Sent', result.message);
        }
      }

      const emailQuery = encodeURIComponent(emailChanged ? updatedUser.email.trim() : authState.user.email);
      const userResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${emailQuery}`);
      if (!userResp.ok) throw new Error('Failed to fetch user ID');
      const userData = await userResp.json();
      if (!userData.ok || !userData.exists || !userData.id) throw new Error('User not found');

      const updateResp = await fetch(`${getApiBaseUrl()}/api/users/${userData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: updatedUser.firstName || authState.user.firstName || '',
          middleName: updatedUser.middleName || authState.user.middleName || '',
          lastName: updatedUser.lastName || authState.user.lastName || '',
          suffix: updatedUser.suffix || '',
          email: updatedUser.email || authState.user.email || '',
          phone: updatedUser.phone || authState.user.phone || '',
          dateOfBirth: updatedUser.dateOfBirth || authState.user.dateOfBirth || '',
          address: updatedUser.address || authState.user.address || '',
          city: updatedUser.city || authState.user.city || '',
          state: updatedUser.state || authState.user.state || '',
          zipCode: updatedUser.zipCode || authState.user.zipCode || '',
          profilePicture: updatedUser.profilePicture || undefined,
        }),
      });

      if (!updateResp.ok) {
        const errData = await updateResp.json();
        throw new Error(errData.error || 'Failed to update user');
      }

      const updateData = await updateResp.json();

      // Refresh auth state with updated user data
      if (emailChanged) await checkEmailVerification();

      const refreshEmail = emailChanged ? updatedUser.email.trim() : authState.user.email;
      const refreshResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${encodeURIComponent(refreshEmail)}`);
      if (refreshResp.ok) {
        const refreshData = await refreshResp.json();
        if (refreshData.ok && refreshData.exists) {
          const firebaseUser = AuthService.getCurrentUser();
          const finalEmail = firebaseUser?.email || refreshEmail;
          const profilePic = refreshData.profilePicture || updateData.profilePicture ||
            (updatedUser.profilePicture?.startsWith?.('/uploads/') ? updatedUser.profilePicture : undefined);
          const updatedObj = new User(
            authState.user!.uid, finalEmail, authState.user!.displayName,
            firebaseUser?.emailVerified ?? authState.user!.emailVerified,
            authState.user!.createdAt, authState.user!.lastLoginAt,
            refreshData.firstName || updatedUser.firstName,
            refreshData.middleName || updatedUser.middleName,
            refreshData.lastName || updatedUser.lastName,
            refreshData.suffix || updatedUser.suffix,
            updatedUser.phone || refreshData.phone,
            updatedUser.dateOfBirth || refreshData.dateOfBirth,
            updatedUser.address || refreshData.address,
            updatedUser.city || refreshData.city,
            updatedUser.state || refreshData.state,
            updatedUser.zipCode || refreshData.zipCode,
            refreshData.role || authState.user!.role,
            profilePic
          );
          setAuthState(prev => prev.setUser(updatedObj));
        }
      }
      return true;
    } catch (error: any) {
      const msg = error.message || 'Failed to update personal information';
      if (Platform.OS === 'web') return { success: false, error: msg };
      Alert.alert('Error', msg);
      return false;
    }
  }, [authState.user, authController, updateUserEmail, checkEmailVerification, setAuthState]);

  return { saveUser };
}
```

**Verification:** Hook compiles. Not yet wired up.

---

## Task 4.3: Install and configure expo-router

**Files:**
- Modify: `package.json` (change `"main"` field)
- Modify: `app.json` (add `scheme`, `web.bundler`, `web.output`)
- Modify: `tsconfig.json` (add path alias for typed routes)
- Create: `metro.config.js` (if not exists)
- Delete: `index.js` (expo-router provides its own entry)

**Step 1: Install dependencies**

```bash
npx expo install expo-router expo-linking expo-constants react-native-safe-area-context react-native-screens
```

Note: `expo-constants` is already installed. `react-native-safe-area-context` and `react-native-screens` may already be transitive deps.

**Step 2: Update package.json**

Change `"main"` from `"index.js"` to `"expo-router/entry"`:

```json
{
  "main": "expo-router/entry",
  ...
}
```

**Step 3: Update app.json**

Add web output and bundler config:

```json
{
  "expo": {
    "scheme": "e-vent",
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/favicon.png"
    },
    ...
  }
}
```

**Step 4: Update tsconfig.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "extends": "expo/tsconfig.base"
}
```

**Step 5: Delete index.js**

The old entry point (`registerRootComponent(App)`) is replaced by expo-router's automatic entry which reads from the `app/` directory.

**Verification:** `npx expo start --web` boots without errors (no routes yet, shows 404 — that's expected).

---

## Task 4.4: Create root layout and auth routes

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/index.tsx`
- Create: `app/login.tsx`
- Create: `app/register.tsx`
- Create: `app/landing.tsx`

### `app/_layout.tsx` — Root layout

Wraps the entire app with AuthProvider and ErrorBoundary. Uses `Slot` to render the current route.

```tsx
// app/_layout.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../mvc/contexts/AuthContext';
import { ToastNotification } from '../mvc/components/ToastNotification';
import { BannerNotification } from '../mvc/components/BannerNotification';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
            May nangyaring error
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: '#5bb92e', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Subukan muli</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StatusBar style="auto" />
        <Slot />
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

### `app/index.tsx` — Smart redirect

Redirects based on auth state, role, and platform.

```tsx
// app/index.tsx
import { Redirect } from 'expo-router';
import { Platform, Dimensions, ActivityIndicator, View } from 'react-native';
import { useAuth } from '../mvc/contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading while auth initializes
  if (isLoading || (isAuthenticated && !user?.role)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#5bb92e" />
      </View>
    );
  }

  // Not authenticated: desktop → landing, mobile → login
  if (!isAuthenticated) {
    const isMobile = Platform.OS !== 'web' || Dimensions.get('window').width < 768;
    return <Redirect href={isMobile ? '/login' : '/landing'} />;
  }

  // Authenticated: redirect by role
  if (user?.role === 'admin') return <Redirect href="/admin/dashboard" />;
  if (user?.role === 'provider') return <Redirect href="/provider/dashboard" />;
  return <Redirect href="/user/dashboard" />;
}
```

### `app/login.tsx`, `app/register.tsx`, `app/landing.tsx`

Thin wrappers around existing views.

```tsx
// app/login.tsx
import { ScrollView, View, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useBreakpoints } from '../mvc/hooks/useBreakpoints';
import { LoginView } from '../mvc/views/LoginView';
import { useAuth } from '../mvc/contexts/AuthContext';
import { Redirect } from 'expo-router';

export default function Login() {
  const { authState, isAuthenticated, login, forgotPassword, loginWithGoogle } = useAuth();
  const router = useRouter();

  if (isAuthenticated) return <Redirect href="/" />;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
      <LoginView
        authState={authState}
        onLogin={login}
        onRegister={() => router.push('/register')}
        onForgotPassword={forgotPassword}
        onGoogleLogin={loginWithGoogle}
      />
    </ScrollView>
  );
}
```

```tsx
// app/register.tsx
import { ScrollView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';
import { RegisterView } from '../mvc/views/user/RegisterView';
import { useAuth } from '../mvc/contexts/AuthContext';

export default function Register() {
  const { authState, isAuthenticated, register } = useAuth();
  const router = useRouter();

  if (isAuthenticated) return <Redirect href="/" />;

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
      <RegisterView
        authState={authState}
        onRegister={register}
        onLogin={() => router.push('/login')}
      />
    </ScrollView>
  );
}
```

```tsx
// app/landing.tsx
import { Redirect, useRouter } from 'expo-router';
import { useAuth } from '../mvc/contexts/AuthContext';
import { LandingPage } from '../mvc/views/LandingPage';

export default function Landing() {
  const { authState, isAuthenticated, login, register, forgotPassword, loginWithGoogle } = useAuth();
  const router = useRouter();

  if (isAuthenticated) return <Redirect href="/" />;

  return (
    <LandingPage
      onLogin={() => router.push('/login')}
      onRegister={() => router.push('/register')}
      authState={authState}
      onLoginSubmit={login}
      onRegisterSubmit={register}
      onForgotPassword={forgotPassword}
      onGoogleLogin={loginWithGoogle}
      onNavigateToService={() => router.push('/login')}
    />
  );
}
```

**Verification:** App starts, unauthenticated routes work (landing, login, register).

---

## Task 4.5: Create role layouts with AppLayout integration

**Files:**
- Create: `app/user/_layout.tsx`
- Create: `app/user/index.tsx`
- Create: `app/provider/_layout.tsx`
- Create: `app/provider/index.tsx`
- Create: `app/admin/_layout.tsx`
- Create: `app/admin/index.tsx`

Each role layout wraps content in AppLayout and guards by role.

### Helper: Route-to-title mapping

Each layout derives `activeRoute` and `title` from the current URL path.

### `app/provider/_layout.tsx` (example — others follow same pattern)

```tsx
// app/provider/_layout.tsx
import { Slot, Redirect, usePathname } from 'expo-router';
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AppLayout } from '../../mvc/components/layout/AppLayout';
import { useAuth } from '../../mvc/contexts/AuthContext';

const routeTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  services: 'My Services',
  bookings: 'Bookings',
  proposals: 'Proposals',
  hiring: 'Hiring',
  messages: 'Messages',
  analytics: 'Analytics',
  profile: 'Profile',
  settings: 'Settings',
  'payment-setup': 'Payment Setup',
  'personal-info': 'Personal Information',
  notifications: 'Notifications',
};

export default function ProviderLayout() {
  const { user, isAuthenticated, isLoading, logoutVoid } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  if (isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  if (!isAuthenticated) return <Redirect href="/login" />;
  if (user?.role !== 'provider') return <Redirect href="/" />;

  // Derive active route from pathname: "/provider/services" → "services"
  const segments = pathname.split('/').filter(Boolean);
  const activeRoute = segments[1] || 'dashboard';
  const title = routeTitles[activeRoute] || 'Dashboard';

  const handleNavigate = (route: string) => {
    // Map route keys to router paths
    router.push(`/provider/${route}` as any);
  };

  return (
    <AppLayout
      role="provider"
      activeRoute={activeRoute}
      title={title}
      user={user || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    >
      <Slot />
    </AppLayout>
  );
}
```

### `app/provider/index.tsx`

```tsx
import { Redirect } from 'expo-router';
export default function ProviderIndex() {
  return <Redirect href="/provider/dashboard" />;
}
```

The `app/user/_layout.tsx` and `app/admin/_layout.tsx` follow the exact same pattern with their respective role, route titles, and path prefix.

**Verification:** Navigating to `/provider/` shows the AppLayout with sidebar. Content area is empty (no route files yet).

---

## Task 4.6: Migrate provider routes (priority)

**Files:**
- Create: 12 route files in `app/provider/`

Each route file is a thin wrapper that imports the existing view and provides props from useAuth() and useRouter(). The views keep their current props interface — no changes to view files.

### Example: `app/provider/dashboard.tsx`

```tsx
import { useRouter } from 'expo-router';
import { DashboardView } from '../../mvc/views/provider/DashboardView';
import { useAuth } from '../../mvc/contexts/AuthContext';

export default function ProviderDashboard() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  return (
    <DashboardView
      user={user || undefined}
      onLogout={logoutVoid}
      onNavigate={(route: string) => router.push(`/provider/${route}` as any)}
    />
  );
}
```

### Route files to create:

| File | View Import | Special Props |
|------|-------------|---------------|
| `dashboard.tsx` | `provider/DashboardView` | — |
| `services.tsx` | `provider/ServicesView` | — |
| `bookings.tsx` | `provider/BookingsView` | — |
| `proposals.tsx` | `provider/ProposalsView` | — |
| `hiring.tsx` | `provider/HiringView` | — |
| `messages.tsx` | `provider/MessagingView` | `userId={user?.uid}` |
| `analytics.tsx` | `provider/AnalyticsView` | — |
| `profile.tsx` | `provider/ProfileView` | `onNavigate` maps 'paymentSetup'→'/provider/payment-setup', 'personalInfo'→'/provider/personal-info' |
| `settings.tsx` | `provider/SettingsView` | — |
| `payment-setup.tsx` | `provider/PaymentSetupView` | — |
| `personal-info.tsx` | `provider/PersonalInfoView` | Uses `useUpdateUser()` for `onSave`, plus `sendVerificationEmail`/`checkEmailVerification` from `useAuth()` |
| `notifications.tsx` | `user/NotificationView` | Reuses user's NotificationView with provider nav mapping |

**Verification:** All provider routes render correctly. Sidebar navigation works.

---

## Task 4.7: Migrate admin routes

**Files:**
- Create: 7 route files in `app/admin/`

| File | View Import |
|------|-------------|
| `dashboard.tsx` | `admin/DashboardView` |
| `users.tsx` | `admin/User` |
| `services.tsx` | `admin/ServicesView` |
| `bookings.tsx` | `admin/BookingsView` |
| `analytics.tsx` | `admin/AnalyticsView` |
| `messages.tsx` | `admin/MessagingView` (needs `userId={user?.uid}`) |
| `provider-applications.tsx` | `admin/ProviderApplicationsView` |

Same thin-wrapper pattern as provider routes.

Note: Admin sidebar route keys map to: `dashboard`, `user`→`users`, `services`, `bookings`, `analytics`, `messages`, `providerApplications`→`provider-applications`.

The Sidebar nav item keys need to match the URL segments. **This requires updating Sidebar's admin nav items** to use hyphenated keys matching the file names, or having the layout transform the keys.

**Approach:** The admin layout's `handleNavigate` maps old keys to new paths:
```tsx
const handleNavigate = (route: string) => {
  const routeMap: Record<string, string> = {
    user: 'users',
    providerApplications: 'provider-applications',
  };
  router.push(`/admin/${routeMap[route] || route}` as any);
};
```

**Verification:** All admin routes render correctly.

---

## Task 4.8: Migrate user routes

**Files:**
- Create: 12 route files in `app/user/`

| File | View Import | Special Props |
|------|-------------|---------------|
| `dashboard.tsx` | `user/DashboardView` | Many navigation callbacks — see below |
| `bookings.tsx` | `user/BookingView` | `userId`, `userEmail`, `onNavigateToMessages` |
| `messages.tsx` | `user/MessagingView` | `userId`, `userEmail`, `conversationId` from search params |
| `hiring.tsx` | `user/HiringView` | `userId`, `userEmail`, `userType="client"` |
| `profile.tsx` | `user/ProfileView` | `onNavigateToPersonalInfo`, `onNavigateToHelpCenter` |
| `personal-info.tsx` | `user/PersonalInfoView` | Uses `useUpdateUser()` for `onSave` |
| `settings.tsx` | `user/SettingsView` | — |
| `help-center.tsx` | `user/HelpCenterView` | — |
| `payment-methods.tsx` | `user/PaymentMethodsView` | — |
| `notifications.tsx` | `user/NotificationView` | `userEmail` |
| `service/[id].tsx` | `user/ServiceDetailsView` | `serviceId` from URL params, `onBookNow` |
| `provider/[email].tsx` | `user/ProviderProfileView` | `providerEmail` from URL params |

### DashboardView special handling

DashboardView has many callback props. The route file maps them to router calls:

```tsx
// app/user/dashboard.tsx
import { useRouter } from 'expo-router';
import { DashboardView } from '../../mvc/views/user/DashboardView';
import { useAuth } from '../../mvc/contexts/AuthContext';

export default function UserDashboard() {
  const { user, authState, logout } = useAuth();
  const router = useRouter();

  return (
    <DashboardView
      user={user!}
      authState={authState}
      onLogout={logout}
      onNavigate={(route: string) => router.push(`/user/${route}` as any)}
      onNavigateToBookings={() => router.push('/user/bookings')}
      onNavigateToMessages={() => router.push('/user/messages')}
      onNavigateToHiring={() => router.push('/user/hiring')}
      onNavigateToProfile={() => router.push('/user/profile')}
      onNavigateToNotifications={() => router.push('/user/notifications')}
      onNavigateToLikes={() => {}}
      onNavigateToFeatured={() => {}}
      onNavigateToNearby={() => {}}
      onNavigateToPhotography={() => {}}
      onNavigateToVenues={() => {}}
      onNavigateToMusic={() => {}}
      onNavigateToEventDetails={(id: string) => router.push(`/user/service/${id}` as any)}
      onNavigateToProviderProfile={(email: string) => router.push(`/user/provider/${email}` as any)}
      onNavigateToPersonalInfo={() => router.push('/user/personal-info')}
      serviceIdToBook={null}
      onBookingModalClosed={() => {}}
    />
  );
}
```

### Dynamic routes

```tsx
// app/user/service/[id].tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ServiceDetailsView } from '../../../mvc/views/user/ServiceDetailsView';
import { useAuth } from '../../../mvc/contexts/AuthContext';

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  return (
    <ServiceDetailsView
      serviceId={id}
      user={user || undefined}
      onNavigate={(route: string) => {
        if (route === 'dashboard') router.push('/user/dashboard');
        else router.push(`/user/${route}` as any);
      }}
      onLogout={logoutVoid}
      onNavigateToProviderProfile={(email: string) => router.push(`/user/provider/${email}` as any)}
      onBookNow={(serviceId: string) => {
        // Navigate to dashboard with booking trigger
        router.push(`/user/dashboard?bookServiceId=${serviceId}` as any);
      }}
    />
  );
}
```

**Verification:** All user routes render. Dynamic routes work with URL params.

---

## Task 4.9: Update AppLayout for router-native navigation

**Files:**
- Modify: `mvc/components/layout/Sidebar.tsx`
- Modify: `mvc/components/layout/BottomNav.tsx`
- Modify: `mvc/components/layout/Header.tsx`
- Modify: `mvc/components/layout/AppLayout.tsx`

**Goal:** Make AppLayout optionally router-aware. If no `onNavigate` prop is provided, use `router.push()` directly. This allows the layout to work in both the old and new routing systems during transition.

### Sidebar changes

Add optional `useRouter` import. If router is available and no `onNavigate` is passed, use router directly:

```tsx
// In Sidebar.tsx - update nav item press handler
const handleNavPress = (key: string) => {
  onNavigate(key); // Layout's handleNavigate already maps to router.push()
  onClose?.(); // Close mobile drawer
};
```

No change needed in Sidebar itself — the role layout's `handleNavigate` already translates keys to router paths. The Sidebar just emits route keys.

### Header changes

The notification bell should navigate to the notifications route. Currently this is handled by `onNavigate('notifications')` which the layout maps correctly.

### AppLayout changes

Make `onNavigate` and `onLogout` optional. If not provided, read from AuthContext and use router:

```tsx
// In AppLayout.tsx - make navigation context-aware
import { useAuth } from '../../contexts/AuthContext';
// Only import router if expo-router is installed
let useRouterSafe: any;
try { useRouterSafe = require('expo-router').useRouter; } catch {}

// In component:
const auth = useAuth?.() ?? null; // Safe access
const effectiveLogout = onLogout ?? auth?.logoutVoid ?? (() => {});
const effectiveNavigate = onNavigate ?? ((route: string) => {
  // Fallback navigation via router if available
});
```

**Note:** This is a gradual approach. The full router-native conversion happens after all routes are confirmed working.

**Verification:** AppLayout works with both prop-based and router-based navigation.

---

## Task 4.10: Delete old App.tsx and clean up

**Files:**
- Delete: `App.tsx` (replaced by `app/_layout.tsx` + route files)
- Delete: `index.js` (replaced by expo-router entry)
- Clean up: Remove any unused imports across the codebase

The old `App.tsx` (1,730 lines) and `index.js` (8 lines) are fully replaced by:
- `app/_layout.tsx` (~40 lines)
- `app/index.tsx` (~20 lines)
- 3 auth route files (~30 lines each)
- 3 role layouts (~50 lines each)
- ~31 thin route files (~20-40 lines each)

**Total new code:** ~1,200 lines spread across ~40 focused files
**Total deleted code:** ~1,740 lines from 2 monolithic files
**Net change:** ~540 lines less, but far more maintainable

**Verification:**
1. `npx tsc --noEmit` — no new TypeScript errors
2. `npx expo start --web` — web version loads, routing works
3. Test each role: login → correct dashboard → navigate between all views
4. Test dynamic routes: service details, provider profile
5. Test logout → redirects to login
6. Test deep linking: entering `/provider/services` directly in browser

---

## Implementation Order

| Task | Description | New Files | Modified Files |
|------|-------------|-----------|----------------|
| 4.1 | AuthContext | 1 | 0 |
| 4.2 | useUpdateUser hook | 1 | 0 |
| 4.3 | Install expo-router | 1 | 3 + delete index.js |
| 4.4 | Root layout + auth routes | 5 | 0 |
| 4.5 | Role layouts | 6 | 0 |
| 4.6 | Provider routes | 12 | 0 |
| 4.7 | Admin routes | 7 | 0 |
| 4.8 | User routes | 12 | 0 |
| 4.9 | Router-native AppLayout | 0 | 4 |
| 4.10 | Delete old App.tsx | 0 | delete 2 |

**Total: ~45 new files, 7 modified files, 3 deleted files**

Each task leaves the app in a working state. Tasks 4.1-4.2 can be done first without affecting the current app. Tasks 4.3-4.8 set up the new routing. Task 4.9 makes the layout router-native. Task 4.10 removes the old code.

---

## Risk Mitigation

1. **expo-router compatibility with Expo SDK 54**: Verify the expo-router version is compatible. Use `npx expo install expo-router` which selects the correct version.

2. **Web platform**: expo-router uses React Navigation under the hood. Web support should work with `"web": { "bundler": "metro", "output": "single" }` in app.json.

3. **Auth state timing**: The root `index.tsx` redirect needs to handle the case where auth is still loading (show spinner). The role layouts need the same guard.

4. **Notification tap navigation**: Currently handled in App.tsx by setting `mainView`. With expo-router, the notification tap handler in AuthContext should use `router.push()`. This may need a ref to the router object since AuthContext mounts before the router is available.

5. **`serviceIdToBook` pattern**: Currently, when a user clicks "Book Now" from ServiceDetailsView, it navigates to dashboard and triggers a booking modal via state. With expo-router, this becomes a URL param: `/user/dashboard?bookServiceId=123`. DashboardView reads this from search params.
