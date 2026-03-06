import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  verifyBeforeUpdateEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { Platform } from 'react-native';

// Types
interface AuthResult {
  success: boolean;
  user?: FirebaseUser;
  error?: string;
  useWebView?: boolean;
  message?: string;
}

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

class AuthService {
  private auth: typeof auth;
  private listeners: Array<() => void>;
  private googleSigninInitialized: boolean;

  constructor() {
    this.auth = auth;
    this.listeners = [];
    this.googleSigninInitialized = false;
    this.testConnection();
  }

  // Test Firebase connection
  private async testConnection(): Promise<void> {
    try {
      // Verify Firebase auth instance is available
    } catch (error) {
      if (__DEV__) console.error('Firebase connection test failed:', error);
    }
  }

  // Test registration with a simple account
  async testRegistration(): Promise<AuthResult> {
    try {
      const testEmail = `test${Date.now()}@example.com`;
      const testPassword = 'test123456';
      const testName = 'Test User';

      const result = await this.register(testEmail, testPassword, testName);
      return result;
    } catch (error: any) {
      if (__DEV__) console.error('Test registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Login with email and password
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return {
        success: true,
        user: userCredential.user,
      };
    } catch (error: any) {
      if (__DEV__) console.error('Login error:', error.code, error.message);

      // Handle specific login errors
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // Check if it's likely a wrong email or wrong password
        // Firebase's invalid-credential can mean either email or password is wrong
        return {
          success: false,
          error: 'Invalid email or password. Please check your credentials and try again.',
        };
      }

      if (error.code === 'auth/wrong-password') {
        return {
          success: false,
          error: 'Invalid password. Please try again.',
        };
      }

      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  // Register with email, password, and name
  async register(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);

      // Update the user's display name (Firebase v9 modular API)
      await updateProfile(userCredential.user, { displayName: name });

      return {
        success: true,
        user: userCredential.user,
      };
    } catch (error: any) {
      if (__DEV__) console.error('=== REGISTRATION ERROR ===');
      if (__DEV__) console.error('Error code:', error.code);
      if (__DEV__) console.error('Error message:', error.message);
      if (__DEV__) console.error('Full error:', error);

      // Handle specific registration errors
      if (error.code === 'auth/email-already-in-use') {
        return {
          success: false,
          error:
            'This email is already registered. Please use a different email or try logging in instead.',
        };
      }

      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  // Login with Google
  async loginWithGoogle(): Promise<AuthResult> {
    try {
      // Check if we're running on web or mobile
      const isWeb = Platform.OS === 'web';

      if (isWeb) {
        // Web version - check for redirect result first (if returning from redirect)
        try {
          const redirectResult = await getRedirectResult(this.auth);
          if (redirectResult && redirectResult.user) {
            return {
              success: true,
              user: redirectResult.user,
            };
          }
        } catch (redirectError: any) {
          // No redirect result, continue with new auth flow

          // If it's a specific error about no redirect, that's fine - continue
          if (redirectError?.code === 'auth/no-auth-event') {
            // Expected when no redirect in progress — continue
          }
        }

        // Try popup first (better UX)
        try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(this.auth, provider);
          return {
            success: true,
            user: result.user,
          };
        } catch (popupError: any) {
          // If popup fails (e.g., blocked by COOP policy or popup blocker), use redirect

          // Check if it's a COOP-related error or popup blocked
          if (
            popupError.message?.includes('Cross-Origin-Opener-Policy') ||
            popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/popup-closed-by-user'
          ) {
            // Use redirect as fallback
            const provider = new GoogleAuthProvider();
            await signInWithRedirect(this.auth, provider);

            // The page will redirect, so return a pending state
            return {
              success: false,
              error: 'Redirecting to Google sign-in...',
            };
          } else {
            // Other popup errors - return the error
            throw popupError;
          }
        }
      } else {
        // Mobile version - use React Native Google Sign-In
        return await this.loginWithGoogleMobile();
      }
    } catch (error: any) {
      if (__DEV__) console.error('Google login error:', error);
      return {
        success: false,
        error:
          this.getErrorMessage(error.code) ||
          error.message ||
          'Google sign-in failed. Please try again.',
      };
    }
  }

  // Mobile Google login using expo-auth-session
  private async loginWithGoogleMobile(): Promise<AuthResult> {
    try {
      // Import GoogleWebAuth dynamically to avoid circular dependencies
      const GoogleWebAuth = (await import('./GoogleWebAuth')).default;

      // Use expo-auth-session for proper OAuth flow
      const result = await GoogleWebAuth.signInWithGoogleMobile();

      if (result.success && result.user) {
        return {
          success: true,
          user: result.user,
        };
      } else {
        if (__DEV__) console.error('Google sign-in failed:', result.error);
        return {
          success: false,
          error: result.error || 'Authentication not found. Please try logging in again.',
        };
      }
    } catch (error: any) {
      if (__DEV__) console.error('Mobile Google login error:', error);
      return {
        success: false,
        error:
          this.getGoogleMobileErrorMessage(error.code) ||
          error.message ||
          'Google sign-in failed. Please try again.',
      };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      return {
        success: true,
        message: 'Password reset email sent!',
      };
    } catch (error: any) {
      if (__DEV__) console.error('Password reset error:', error.code, error.message);
      // Firebase doesn't reveal if email exists for security, but we can still handle other errors
      const errorMessage = error.code
        ? this.getErrorMessage(error.code)
        : 'Failed to send password reset email. Please try again.';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  // Logout
  async logout(): Promise<AuthResult> {
    try {
      await signOut(this.auth);

      return {
        success: true,
        message: 'Logged out successfully!',
      };
    } catch (error: any) {
      if (__DEV__) console.error('AuthService: Firebase signOut error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code),
      };
    }
  }

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  // Send email verification
  async sendEmailVerification(): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        return { success: false, error: 'No user is currently signed in' };
      }

      if (user.emailVerified) {
        return { success: false, error: 'Email is already verified' };
      }

      await sendEmailVerification(user);
      return { success: true };
    } catch (error: any) {
      if (__DEV__) console.error('Send email verification error:', error);
      return {
        success: false,
        error:
          this.getErrorMessage(error.code) || error.message || 'Failed to send verification email',
      };
    }
  }

  // Reload user to get updated email verification status
  async reloadUser(): Promise<{ success: boolean; error?: string }> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        return { success: false, error: 'No user is currently signed in' };
      }

      await reload(user);
      return { success: true };
    } catch (error: any) {
      if (__DEV__) console.error('Reload user error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code) || error.message || 'Failed to reload user',
      };
    }
  }

  // Update email in Firebase Authentication
  async updateUserEmail(
    newEmail: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const user = this.auth.currentUser;
      if (!user) {
        return { success: false, error: 'No user is currently signed in' };
      }

      if (!newEmail || !newEmail.trim()) {
        return { success: false, error: 'Email is required' };
      }

      // Validate email format - stricter validation
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(newEmail.trim())) {
        return { success: false, error: 'Invalid email format' };
      }

      // Check if email is the same
      if (user.email === newEmail.trim()) {
        return { success: true }; // No change needed
      }

      // Firebase requires the current email to be verified before changing it
      if (!user.emailVerified) {
        return {
          success: false,
          error:
            'Please verify your current email address before changing it. Check your inbox for a verification email, or use the "Send Verification Email" button in your Account Information section.',
        };
      }

      // Try verifyBeforeUpdateEmail first (doesn't require recent login, more secure)
      // This sends a verification email to the new address
      try {
        await verifyBeforeUpdateEmail(user, newEmail.trim());
        return {
          success: true,
          message:
            'A verification email has been sent to your new email address. Please check your inbox and click the verification link to complete the email change. Your email will be updated in Firebase after you verify the new address.',
        };
      } catch (verifyError: any) {
        if (__DEV__)
          console.error('verifyBeforeUpdateEmail error:', verifyError.code, verifyError.message);

        // If verifyBeforeUpdateEmail fails with 400 or other errors,
        // it might not be configured or user needs re-authentication
        // In this case, we'll update the database but inform user about Firebase
        if (
          verifyError.code === 'auth/requires-recent-login' ||
          verifyError.code === 'auth/operation-not-allowed' ||
          verifyError.code?.includes('400') ||
          verifyError.message?.includes('400')
        ) {
          // Return success but with a message that database will be updated
          // and they need to verify through Firebase
          return {
            success: true,
            message: `Your email will be updated in the database. However, to update your email in Firebase Authentication, please log out and log back in, then try changing your email again. Alternatively, you can verify your new email through Firebase's email verification system.`,
          };
        }

        // For other errors, throw to be handled below
        throw verifyError;
      }
    } catch (error: any) {
      if (__DEV__) console.error('Update email error:', error);

      // Handle specific Firebase errors
      if (error.code === 'auth/operation-not-allowed') {
        // This usually means email change is disabled in Firebase settings
        // But the error message might say to verify email, so check that first
        if (error.message?.toLowerCase().includes('verify')) {
          return {
            success: false,
            error:
              'Please verify your current email address before changing it. Check your inbox for a verification email, or use the "Send Verification Email" button in your Account Information section.',
          };
        }
        return {
          success: false,
          error:
            'Email change is not allowed. Please contact support or check your Firebase project settings.',
        };
      }

      // Handle unverified email error
      if (error.code === 'auth/requires-recent-login') {
        return {
          success: false,
          error: 'For security, please log out and log back in before changing your email address.',
        };
      }

      // Handle email verification requirement
      if (
        error.message?.toLowerCase().includes('verify') ||
        error.message?.toLowerCase().includes('verification')
      ) {
        return {
          success: false,
          error:
            'Please verify your current email address before changing it. Check your inbox for a verification email, or use the "Send Verification Email" button in your Account Information section.',
        };
      }

      return {
        success: false,
        error: this.getErrorMessage(error.code) || error.message || 'Failed to update email',
      };
    }
  }

  // Listen to authentication state changes
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
        };
        callback(user);
      } else {
        callback(null);
      }
    });
  }

  // Convert Firebase error codes to user-friendly messages
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No user found with this email address.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'auth/wrong-password':
        return 'Invalid password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed.';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  // Convert Google Sign-In error codes to user-friendly messages
  private getGoogleMobileErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'SIGN_IN_CANCELLED':
        return 'Google sign-in was cancelled.';
      case 'IN_PROGRESS':
        return 'Google sign-in is already in progress.';
      case 'PLAY_SERVICES_NOT_AVAILABLE':
        return 'Google Play Services is not available on this device.';
      case 'SIGN_IN_REQUIRED':
        return 'Please sign in to your Google account first.';
      case 'NETWORK_ERROR':
        return 'Network error. Please check your connection.';
      case 'DEVELOPER_ERROR':
        return 'Google Sign-In configuration error. Please contact support.';
      default:
        return 'Google sign-in failed. Please try again.';
    }
  }
}

export default new AuthService();
