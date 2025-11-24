import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  updateProfile,
  User as FirebaseUser
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
      console.log('=== FIREBASE CONNECTION TEST ===');
      console.log('Auth instance:', this.auth);
      console.log('Current user:', this.auth.currentUser);
      console.log('Firebase app:', this.auth.app.name);
      console.log('Auth domain:', this.auth.app.options.authDomain);
      console.log('Project ID:', this.auth.app.options.projectId);
      console.log('=== CONNECTION TEST COMPLETE ===');
    } catch (error) {
      console.error('Firebase connection test failed:', error);
    }
  }

  // Test registration with a simple account
  async testRegistration(): Promise<AuthResult> {
    try {
      console.log('=== TESTING REGISTRATION ===');
      const testEmail = `test${Date.now()}@example.com`;
      const testPassword = 'test123456';
      const testName = 'Test User';
      
      console.log('Test email:', testEmail);
      const result = await this.register(testEmail, testPassword, testName);
      console.log('Test result:', result);
      return result;
    } catch (error: any) {
      console.error('Test registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Login with email and password
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      console.log('Attempting login with email:', email);
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('Login successful:', userCredential.user.email);
      return {
        success: true,
        user: userCredential.user
      };
    } catch (error: any) {
      console.error('Login error:', error.code, error.message);
      
      // Handle specific login errors
      if (error.code === 'auth/user-not-found') {
        return {
          success: false,
          error: 'Account not found. Please check your email address or register for a new account.'
        };
      }
      
      if (error.code === 'auth/wrong-password') {
        return {
          success: false,
          error: 'Invalid password. Please try again.'
        };
      }
      
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }

  // Register with email, password, and name
  async register(email: string, password: string, name: string): Promise<AuthResult> {
    try {
      console.log('=== REGISTRATION ATTEMPT ===');
      console.log('Email:', email);
      console.log('Password length:', password.length);
      console.log('Name:', name);
      console.log('Firebase auth instance:', this.auth);
      console.log('Firebase app:', this.auth.app.name);
      
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('User created successfully:', userCredential.user.uid);
      
      // Update the user's display name (Firebase v9 modular API)
      await updateProfile(userCredential.user, { displayName: name });
      console.log('Display name updated successfully');

      console.log('=== REGISTRATION SUCCESS ===');
      return {
        success: true,
        user: userCredential.user
      };
    } catch (error: any) {
      console.error('=== REGISTRATION ERROR ===');
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      
      // Handle specific registration errors
      if (error.code === 'auth/email-already-in-use') {
        return {
          success: false,
          error: 'This email is already registered. Please use a different email or try logging in instead.'
        };
      }
      
      return {
        success: false,
        error: this.getErrorMessage(error.code)
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
              user: redirectResult.user
            };
          }
        } catch (redirectError: any) {
          // No redirect result, continue with new auth flow
          console.log('No redirect result, starting new auth flow');
        }

        // Try popup first (better UX)
        try {
          const provider = new GoogleAuthProvider();
          const result = await signInWithPopup(this.auth, provider);
          return {
            success: true,
            user: result.user
          };
        } catch (popupError: any) {
          // If popup fails (e.g., blocked by COOP policy or popup blocker), use redirect
          console.log('Popup failed, falling back to redirect:', popupError.message);
          
          // Check if it's a COOP-related error or popup blocked
          if (popupError.message?.includes('Cross-Origin-Opener-Policy') || 
              popupError.code === 'auth/popup-blocked' ||
              popupError.code === 'auth/popup-closed-by-user') {
            
            // Use redirect as fallback
            const provider = new GoogleAuthProvider();
            await signInWithRedirect(this.auth, provider);
            
            // The page will redirect, so return a pending state
            return {
              success: false,
              error: 'Redirecting to Google sign-in...'
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
      console.error('Google login error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code) || error.message || 'Google sign-in failed. Please try again.'
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
          user: result.user
        };
      } else {
        return {
          success: false,
          error: result.error || 'Google sign-in failed'
        };
      }
    } catch (error: any) {
      console.error('Mobile Google login error:', error);
      return {
        success: false,
        error: this.getGoogleMobileErrorMessage(error.code) || error.message || 'Google sign-in failed. Please try again.'
      };
    }
  }

  // Reset password
  async resetPassword(email: string): Promise<AuthResult> {
    try {
      console.log('Sending password reset email to:', email);
      await sendPasswordResetEmail(this.auth, email);
      console.log('Password reset email sent successfully');
      return {
        success: true,
        message: 'Password reset email sent!'
      };
    } catch (error: any) {
      console.error('Password reset error:', error.code, error.message);
      // Firebase doesn't reveal if email exists for security, but we can still handle other errors
      const errorMessage = error.code ? this.getErrorMessage(error.code) : 'Failed to send password reset email. Please try again.';
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  // Logout
  async logout(): Promise<AuthResult> {
    try {
      console.log('AuthService: Starting Firebase signOut...');
      console.log('AuthService: Current user before logout:', this.auth.currentUser?.uid);
      
      await signOut(this.auth);
      
      console.log('AuthService: Firebase signOut successful');
      console.log('AuthService: Current user after logout:', this.auth.currentUser?.uid);
      
      return {
        success: true,
        message: 'Logged out successfully!'
      };
    } catch (error: any) {
      console.error('AuthService: Firebase signOut error:', error);
      return {
        success: false,
        error: this.getErrorMessage(error.code)
      };
    }
  }

  // Get current user
  getCurrentUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  // Listen to authentication state changes
  onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const user: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified
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
