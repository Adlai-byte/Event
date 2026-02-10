// mvc/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useRef, useContext, useCallback } from 'react';
import { Platform } from 'react-native';
import { AuthController } from '../controllers/AuthController';
import { AuthState } from '../models/AuthState';
import { User } from '../models/User';
import { LoginFormData, RegisterFormData } from '../models/FormData';
import { getApiBaseUrl } from '../services/api';
import AuthService from '../services/AuthService';
import { PushNotificationService } from '../services/PushNotificationService';

interface AuthContextValue {
  authState: AuthState;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (formData: LoginFormData) => Promise<{ success: boolean; error?: string }>;
  register: (formData: RegisterFormData) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  logoutVoid: () => Promise<void>;
  clearError: () => void;
  sendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
  checkEmailVerification: () => Promise<{ success: boolean; verified?: boolean; error?: string }>;
  updateUserEmail: (newEmail: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  refreshUser: () => Promise<boolean>;
  authController: AuthController | null;
  setAuthState: React.Dispatch<React.SetStateAction<AuthState>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(new AuthState());
  const authStateRef = useRef<AuthState>(authState);
  const [authController, setAuthController] = useState<AuthController | null>(null);

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

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
            PushNotificationService.registerForPushNotificationsAsync(userId, userEmail)
              .then((token) => {
                if (token) {
                  console.log('Push notifications registered successfully');
                }
              })
              .catch((error) => {
                console.error('Failed to register push notifications (non-critical):', error);
              });
          }
        } catch (error) {
          console.error('Error in push notification registration (non-critical):', error);
        }
      }, delayMs);
      return () => clearTimeout(timeout);
    }
  }, [authState.isAuthenticated, authState.user?.id, authState.user?.email, authState.user?.role]);

  // Setup notification listeners (mobile only)
  useEffect(() => {
    if (authState.isAuthenticated && authState.user?.role && Platform.OS !== 'web') {
      try {
        const subscription = PushNotificationService.setupNotificationListeners(
          (notification) => {
            console.log('Notification received in foreground:', notification);
          },
          (response) => {
            // Notification tap navigation is handled by individual route files
            // or a dedicated notification handler — not here
            console.log('Notification tapped:', response.notification.request.content.data);
          }
        );
        return () => {
          try { subscription.remove(); } catch {}
        };
      } catch (error) {
        console.error('Failed to setup notification listeners (non-critical):', error);
      }
    }
  }, [authState.isAuthenticated, authState.user]);

  // Suppress Datadog Browser SDK warnings from third-party services
  useEffect(() => {
    if (typeof window !== 'undefined' && window.console) {
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args.join(' ');
        if (message.includes('Datadog Browser SDK') && message.includes('Application ID is not configured')) {
          return;
        }
        originalWarn.apply(console, args);
      };
      return () => {
        console.warn = originalWarn;
      };
    }
  }, []);

  const login = useCallback(async (formData: LoginFormData) => {
    if (!authController) return { success: false, error: 'Controller not initialized' };
    const result = await authController.login(formData);
    if (result.success && Platform.OS === 'web' && typeof window !== 'undefined') {
      localStorage.setItem('justLoggedIn', 'true');
      setTimeout(() => window.location.reload(), 100);
    }
    return result;
  }, [authController]);

  const register = useCallback(async (formData: RegisterFormData) => {
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
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }, [authController]);

  const logoutVoid = useCallback(async () => {
    await logout();
  }, [logout]);

  const clearError = useCallback(() => {
    if (authController) authController.clearError();
  }, [authController]);

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

  // Refresh current user data from the server
  const refreshUser = useCallback(async () => {
    try {
      if (!authState.user?.email) return false;
      const refreshResp = await fetch(
        `${getApiBaseUrl()}/api/users/by-email?email=${encodeURIComponent(authState.user.email)}`
      );
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
    } catch {
      return false;
    }
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
    clearError,
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
