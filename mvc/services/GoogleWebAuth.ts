import { GoogleAuthProvider, signInWithCredential, OAuthCredential } from 'firebase/auth';
import { auth } from './firebase';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

// Complete the auth session properly
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs
// IMPORTANT: Different client IDs for different platforms
// 
// Web Client ID: For web platform OAuth
// Android Client ID: For mobile (Android/iOS) OAuth - accepts custom URL schemes
//
// Get these from Google Cloud Console:
// 1. Web Client: APIs & Services > Credentials > OAuth 2.0 Client IDs > Web client
// 2. Android Client: APIs & Services > Credentials > OAuth 2.0 Client IDs > Android client

// Web Client ID (for web platform)
const GOOGLE_OAUTH_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_WEB_CLIENT_ID || 
  '491966036189-6ulchqr6k0e0da1ibbu62jj3n0efnoek.apps.googleusercontent.com';

// Android Client ID (for mobile platforms - accepts custom URL schemes like com.event://)
const GOOGLE_OAUTH_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ANDROID_CLIENT_ID || 
  '491966036189-e4267fbeuf9vi2mval0qp3cra8besmti.apps.googleusercontent.com';

// Get the appropriate client ID based on platform
const getGoogleOAuthClientId = (): string => {
  if (Platform.OS === 'web') {
    return GOOGLE_OAUTH_WEB_CLIENT_ID;
  }
  // For mobile (Android/iOS), use Android Client ID
  // Android OAuth clients accept custom URL schemes
  return GOOGLE_OAUTH_ANDROID_CLIENT_ID;
};

// For backward compatibility, export the function result
const GOOGLE_OAUTH_CLIENT_ID = getGoogleOAuthClientId();

// Validate client IDs format
if (!GOOGLE_OAUTH_WEB_CLIENT_ID.includes('.apps.googleusercontent.com')) {
  console.warn('⚠️ WARNING: Google OAuth Web Client ID may be incorrect.');
}
if (!GOOGLE_OAUTH_ANDROID_CLIENT_ID.includes('.apps.googleusercontent.com')) {
  console.warn('⚠️ WARNING: Google OAuth Android Client ID may be incorrect.');
}

// Log client IDs on module load (for debugging)
console.log('🔑 Google OAuth Client IDs configured:');
console.log('   Web:', GOOGLE_OAUTH_WEB_CLIENT_ID.substring(0, 30) + '...');
console.log('   Android:', GOOGLE_OAUTH_ANDROID_CLIENT_ID.substring(0, 30) + '...');
console.log('   Using for', Platform.OS + ':', getGoogleOAuthClientId().substring(0, 30) + '...');

// Types
interface AuthCallbackResult {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  idToken?: string;
  accessToken?: string;
}

interface GoogleSignInResult {
  success: boolean;
  user?: any;
  error?: string;
}

class GoogleWebAuth {
  private provider: GoogleAuthProvider;
  private discovery: AuthSession.DiscoveryDocument | null = null;

  constructor() {
    this.provider = new GoogleAuthProvider();
  }

  // Initialize OAuth discovery document for mobile
  private async getDiscovery(): Promise<AuthSession.DiscoveryDocument> {
    if (!this.discovery) {
      try {
        console.log('Fetching Google OAuth discovery document...');
        this.discovery = await AuthSession.fetchDiscoveryAsync(
          'https://accounts.google.com'
        );
        
        if (!this.discovery) {
          throw new Error('Failed to fetch discovery document');
        }
        
        console.log('Discovery document fetched successfully');
        console.log('Authorization endpoint:', this.discovery.authorizationEndpoint);
        console.log('Token endpoint:', this.discovery.tokenEndpoint);
        
        // Validate the discovery document
        if (!this.discovery.authorizationEndpoint) {
          throw new Error('Discovery document missing authorization endpoint');
        }
      } catch (error: any) {
        console.error('Error fetching discovery document:', error);
        throw new Error(`Failed to fetch Google OAuth discovery document: ${error.message}`);
      }
    }
    return this.discovery;
  }

  // Create Google OAuth URL for mobile using expo-auth-session
  async getGoogleAuthUrl(): Promise<string> {
    if (Platform.OS === 'web') {
      // Web version - use Firebase's built-in Google auth URL
      return `https://authflow-1gvkb.firebaseapp.com/__/auth/handler`;
    }

    // Mobile version - use expo-auth-session
    const discovery = await this.getDiscovery();
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'com.event', // This matches the scheme in app.json
      path: 'oauth',
    });

      const clientId = getGoogleOAuthClientId();
      const request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        extraParams: {},
      });

    // Get the authorization URL
    const authUrl = await request.makeAuthUrlAsync(discovery);
    return authUrl;
  }

  // Handle OAuth callback and exchange code for token (Mobile)
  async handleAuthCallbackMobile(code: string, redirectUri: string): Promise<AuthCallbackResult> {
    try {
      console.log('Handling mobile auth callback with code:', code);
      
      const discovery = await this.getDiscovery();
      
      // Exchange authorization code for tokens
          const clientId = getGoogleOAuthClientId();
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId: clientId,
              code,
              redirectUri,
              extraParams: {},
            },
            discovery
          );

      if (tokenResponse.idToken) {
        // Create Firebase credential from Google ID token
        const credential = GoogleAuthProvider.credential(tokenResponse.idToken);
        const result = await signInWithCredential(auth, credential);
        
        return {
          success: true,
          message: 'Google authentication successful!',
          idToken: tokenResponse.idToken,
          accessToken: tokenResponse.accessToken || undefined,
        };
      } else {
        throw new Error('No ID token received from Google');
      }
    } catch (error: any) {
      console.error('Mobile auth callback error:', error);
      return {
        success: false,
        error: error.message || 'Authentication failed'
      };
    }
  }

  // Handle OAuth callback from WebView (legacy - for web)
  async handleAuthCallback(url: string): Promise<AuthCallbackResult> {
    try {
      console.log('Handling auth callback:', url);
      
      // Extract authorization code from URL
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const code = urlParams.get('code');
      const error = urlParams.get('error');
      
      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }
      
      if (!code) {
        throw new Error('No authorization code received');
      }

      // For web, we'd need to exchange the code server-side or use Firebase's handler
      return {
        success: true,
        message: 'Google authentication successful!',
        code: code
      };
    } catch (error: any) {
      console.error('Auth callback error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Perform Google Sign-In using expo-auth-session (Mobile)
  async signInWithGoogleMobile(): Promise<GoogleSignInResult> {
    try {
      // Get the appropriate client ID for this platform
      const clientId = getGoogleOAuthClientId();
      
      console.log('Starting Google OAuth flow...');
      console.log('Platform:', Platform.OS);
      console.log('Client ID:', clientId);
      console.log('Client Type:', Platform.OS === 'web' ? 'Web' : 'Android (supports custom schemes)');
      
      const discovery = await this.getDiscovery();
      console.log('Discovery document fetched:', discovery?.authorizationEndpoint);
      
      // Validate discovery document
      if (!discovery || !discovery.authorizationEndpoint) {
        throw new Error('Invalid Google OAuth discovery document. Please check your network connection.');
      }
      
      // IMPORTANT: Android OAuth clients require a custom URL scheme (com.event://oauth)
      // They do NOT accept exp:// URLs from Expo Go
      // We must force the use of com.event://oauth scheme
      
      // Force use of custom scheme - Android OAuth clients require this
      // Even in Expo Go, we need to use com.event://oauth (not exp://)
      const redirectUri = 'com.event://oauth';
      
      console.log('✅ Using custom URL scheme (required for Android OAuth client):', redirectUri);
      console.log('💡 Android OAuth clients require custom schemes like com.event://oauth');
      console.log('   This scheme is configured in app.json and AndroidManifest.xml');
      
      // Store redirect URI for error messages
      (this as any)._currentRedirectUri = redirectUri;

      // Generate a random state for security
      const state = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString()
      );
      
      const request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        state,
        extraParams: {},
      });

      console.log('Starting OAuth prompt...');
      
      // Build and log the authorization URL for debugging
      try {
        const authUrl = await request.makeAuthUrlAsync(discovery);
        console.log('🔗 Full Authorization URL:', authUrl);
        console.log('📋 OAuth Parameters:');
        console.log('  - Client ID:', clientId);
        console.log('  - Redirect URI:', redirectUri);
        console.log('  - Scopes:', ['openid', 'profile', 'email'].join(' '));
        console.log('  - Response Type:', AuthSession.ResponseType.Code);
        console.log('  - Authorization Endpoint:', discovery.authorizationEndpoint);
        
        // Validate the URL
        if (!authUrl || !authUrl.startsWith('https://')) {
          throw new Error(`Invalid authorization URL generated: ${authUrl}`);
        }
        
        if (!authUrl.includes('client_id=')) {
          throw new Error('Authorization URL missing client_id parameter');
        }
        
        if (!authUrl.includes('redirect_uri=')) {
          throw new Error('Authorization URL missing redirect_uri parameter');
        }
        
        console.log('✅ Authorization URL validated successfully');
      } catch (urlError: any) {
        console.error('❌ Error building/validating authorization URL:', urlError);
        console.error('Error details:', {
          message: urlError.message,
          stack: urlError.stack
        });
        throw new Error(`Failed to build OAuth URL: ${urlError.message}`);
      }
      
      // Build the authorization URL first
      const authUrl = await request.makeAuthUrlAsync(discovery);
      console.log('🔗 Opening OAuth URL in Chrome:', authUrl.substring(0, 100) + '...');
      
      // Configure browser options - ALWAYS use Chrome on Android
      const browserOptions: any = {
        showInRecents: true,
        preferEphemeralSession: false, // Allow browser to handle redirects properly
        createTask: true, // Create a new task (important for Chrome)
      };
      
      // On Android, ALWAYS explicitly use Chrome browser
      if (Platform.OS === 'android') {
        // Force Chrome browser package
        browserOptions.browserPackage = 'com.android.chrome';
        browserOptions.browserArguments = []; // Clear any default arguments
        console.log('🔵 FORCING Chrome browser (com.android.chrome) for OAuth on Android');
        
        // Set browser controls color for better UX
        browserOptions.controlsColor = '#4a55e1';
        
          // Try to open Chrome directly first as a fallback
        try {
          // Check if we can use WebBrowser.openBrowserAsync directly with Chrome
          const canOpen = await WebBrowser.getCustomTabsSupportingBrowsersAsync();
          console.log('Available browsers:', canOpen);
          
          if (canOpen && Object.keys(canOpen).length > 0) {
            console.log('✅ Custom tabs supported, using Chrome');
          }
        } catch (browserCheckError) {
          console.log('Browser check error (continuing anyway):', browserCheckError);
        }
      }
      
      // Start the authentication flow - this will open Chrome on Android
      console.log('🚀 Opening OAuth in browser with options:', {
        browserPackage: browserOptions.browserPackage || 'default',
        showInRecents: browserOptions.showInRecents,
        preferEphemeralSession: browserOptions.preferEphemeralSession
      });
      
      const result = await request.promptAsync(discovery, browserOptions);

      console.log('OAuth result type:', result.type);
      console.log('OAuth result:', result);

      if (result.type === 'success' && 'params' in result && result.params && 'code' in result.params && result.params.code) {
        console.log('Authorization code received, exchanging for tokens...');
        try {
          // Exchange code for tokens
          const code = typeof result.params.code === 'string' ? result.params.code : String(result.params.code);
          const clientId = getGoogleOAuthClientId();
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId: clientId,
              code: code,
              redirectUri,
              extraParams: {},
            },
            discovery
          );

          console.log('Token response received:', {
            hasIdToken: !!tokenResponse.idToken,
            hasAccessToken: !!tokenResponse.accessToken,
            tokenType: tokenResponse.tokenType
          });

          if (tokenResponse.idToken) {
            console.log('Creating Firebase credential...');
            // Create Firebase credential from Google ID token
            const credential = GoogleAuthProvider.credential(tokenResponse.idToken);
            
            if (!credential) {
              console.error('Failed to create credential from ID token');
              throw new Error('Failed to create authentication credential. Please try again.');
            }
            
            console.log('Signing in to Firebase...');
            const userCredential = await signInWithCredential(auth, credential);
            
            if (!userCredential || !userCredential.user) {
              console.error('Firebase sign-in returned no user');
              throw new Error('Authentication not found. Please try logging in again.');
            }
            
            console.log('Firebase sign-in successful:', userCredential.user.email);
            
            return {
              success: true,
              user: userCredential.user
            };
          } else {
            console.error('No ID token in response:', tokenResponse);
            console.error('Token response keys:', Object.keys(tokenResponse));
            throw new Error('No ID token received from Google. Please check your OAuth client configuration.');
          }
        } catch (exchangeError: any) {
          console.error('Token exchange error:', exchangeError);
          console.error('Error details:', {
            message: exchangeError.message,
            code: exchangeError.code,
            error: exchangeError.error,
            errorDescription: exchangeError.errorDescription
          });
          
          // Provide more specific error messages
          if (exchangeError.error === 'invalid_client') {
            throw new Error('Invalid OAuth client ID. Please check your Google OAuth configuration.');
          } else if (exchangeError.error === 'invalid_grant') {
            throw new Error('Invalid authorization code. The code may have expired. Please try again.');
          } else if (exchangeError.error === 'redirect_uri_mismatch') {
            throw new Error(
              `❌ Redirect URI Mismatch!\n\n` +
              `The redirect URI is not registered in Google Cloud Console.\n\n` +
              `📋 SOLUTION: Verify this redirect URI exists:\n` +
              `https://e-vent-aa93e.firebaseapp.com/__/auth/handler\n\n` +
              `🔧 Steps:\n` +
              `1. Go to: https://console.cloud.google.com/apis/credentials\n` +
              `2. Project: e-vent-aa93e\n` +
              `3. Find OAuth Client: ${getGoogleOAuthClientId().substring(0, 30)}...\n` +
              `4. Click Edit → Check "Authorized redirect URIs"\n` +
              `5. Ensure this URI exists: https://e-vent-aa93e.firebaseapp.com/__/auth/handler\n` +
              `6. If missing, add it and SAVE → Wait 1-2 minutes → Try again`
            );
          } else if (exchangeError.message?.includes('404') || 
                     exchangeError.errorDescription?.includes('404') ||
                     exchangeError.errorDescription?.includes('not found')) {
            throw new Error(
              `❌ 404 Error: Redirect URI Not Found!\n\n` +
              `Verify this redirect URI exists in Google Cloud Console:\n` +
              `https://e-vent-aa93e.firebaseapp.com/__/auth/handler\n\n` +
              `🔧 Quick Fix:\n` +
              `1. https://console.cloud.google.com/apis/credentials\n` +
              `2. Project: e-vent-aa93e → OAuth Client → Edit\n` +
              `3. Check "Authorized redirect URIs" section\n` +
              `4. Ensure this URI exists: https://e-vent-aa93e.firebaseapp.com/__/auth/handler\n` +
              `5. If missing, add it → Save → Wait 1-2 min → Retry`
            );
          } else {
            throw new Error(exchangeError.errorDescription || exchangeError.message || 'Token exchange failed');
          }
        }
      } else if (result.type === 'cancel') {
        console.log('User cancelled OAuth flow');
        return {
          success: false,
          error: 'Google sign-in was cancelled.'
        };
      } else if (result.type === 'error') {
        const errorParams = 'params' in result ? result.params : null;
        const errorObj = 'error' in result ? result.error : null;
        console.error('OAuth error:', errorObj);
        console.error('Error params:', errorParams);
        
        // Check for OAuth 2.0 policy compliance errors
        if (errorParams && typeof errorParams === 'object' && 'error' in errorParams) {
          const errorCode = errorParams.error;
          if (errorCode === 'invalid_request' || 
              (typeof errorCode === 'string' && errorCode.includes('policy'))) {
            throw new Error(
              '❌ OAuth 2.0 Policy Compliance Error\n\n' +
              'Your app needs to be configured in Google Cloud Console OAuth consent screen.\n\n' +
              '🔧 Fix Steps:\n' +
              '1. Go to: https://console.cloud.google.com/apis/credentials/consent\n' +
              '2. Select project: e-vent-aa93e\n' +
              '3. Configure OAuth consent screen:\n' +
              '   - User Type: External (for testing) or Internal (for Google Workspace)\n' +
              '   - App name: E-Vent (or your app name)\n' +
              '   - User support email: Your email\n' +
              '   - Developer contact: Your email\n' +
              '4. Add scopes: email, profile, openid\n' +
              '5. Add test users (if External): Add your email (kylealonzo276@gmail.com)\n' +
              '6. Save and continue\n' +
              '7. Wait a few minutes, then try again\n\n' +
              '💡 For production, you may need to submit for verification.'
            );
          }
        }
        
        // Check for specific error types
        if (errorParams && typeof errorParams === 'object' && 'error' in errorParams && errorParams.error === 'access_denied') {
          throw new Error('Google sign-in was denied. Please try again.');
        } else if (errorParams && typeof errorParams === 'object' && 'error' in errorParams && errorParams.error === 'redirect_uri_mismatch') {
          throw new Error(
            `❌ Redirect URI Mismatch!\n\n` +
            `Verify this redirect URI exists:\n` +
            `https://e-vent-aa93e.firebaseapp.com/__/auth/handler\n\n` +
            `🔧 Fix: https://console.cloud.google.com/apis/credentials\n` +
            `   → Project: e-vent-aa93e → OAuth Client → Edit\n` +
            `   → Check "Authorized redirect URIs"\n` +
            `   → Ensure: https://e-vent-aa93e.firebaseapp.com/__/auth/handler exists`
          );
        } else if (errorParams && typeof errorParams === 'object' && 'error' in errorParams && errorParams.error === 'invalid_client') {
          throw new Error('Invalid OAuth client ID. Please check your Google OAuth configuration in Firebase Console.');
        } else if ((errorParams && typeof errorParams === 'object' && 'error_description' in errorParams && 
                   (typeof errorParams.error_description === 'string' && (errorParams.error_description.includes('404') || errorParams.error_description.includes('not found')))) ||
                   (errorObj && typeof errorObj === 'object' && 'message' in errorObj && typeof errorObj.message === 'string' && errorObj.message.includes('404'))) {
          // Specific 404 error handling
          throw new Error(
            `❌ 404 Error: Redirect URI Not Found!\n\n` +
            `Verify this redirect URI exists:\n` +
            `https://e-vent-aa93e.firebaseapp.com/__/auth/handler\n\n` +
            `🔧 Steps:\n` +
            `1. https://console.cloud.google.com/apis/credentials\n` +
            `2. Project: e-vent-aa93e → OAuth Client → Edit\n` +
            `3. Check "Authorized redirect URIs"\n` +
            `4. Ensure: https://e-vent-aa93e.firebaseapp.com/__/auth/handler exists\n` +
            `5. If missing, add it → Save → Wait 1-2 min → Retry`
          );
        }
        
        const errorMessage = (errorObj && typeof errorObj === 'object' && 'message' in errorObj ? errorObj.message : null) ||
                            (errorParams && typeof errorParams === 'object' && 'error_description' in errorParams ? errorParams.error_description : null) ||
                            (errorParams && typeof errorParams === 'object' && 'error' in errorParams ? errorParams.error : null) ||
                            'Authentication failed';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Authentication failed');
      } else if (result.type === 'dismiss') {
        console.log('OAuth flow was dismissed');
        return {
          success: false,
          error: 'Google sign-in was cancelled.'
        };
      } else {
        console.error('Unexpected OAuth result:', result);
        console.error('Result type:', result.type);
        
        const errorParams = 'params' in result ? result.params : null;
        const errorObj = 'error' in result ? result.error : null;
        console.error('Result params:', errorParams);
        console.error('Result error:', errorObj);
        
        // Check if there's a specific error in params
        if (errorParams && typeof errorParams === 'object' && 'error' in errorParams) {
          const errorMsg = ('error_description' in errorParams ? errorParams.error_description : null) || 
                          (errorParams.error || null);
          throw new Error((typeof errorMsg === 'string' ? errorMsg : null) || 'Authentication failed. Please check your OAuth configuration.');
        }
        
        const errorMessage = (errorObj && typeof errorObj === 'object' && 'message' in errorObj ? errorObj.message : null) ||
                            (errorParams && typeof errorParams === 'object' && 'error' in errorParams ? errorParams.error : null) ||
                            'Authentication not found. Please try again.';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Authentication not found. Please try again.');
      }
    } catch (error: any) {
      console.error('Mobile Google sign-in error:', error);
      console.error('Error stack:', error.stack);
      return {
        success: false,
        error: error.message || 'Google sign-in failed. Please try again.'
      };
    }
  }

  // Alternative: Use Firebase's web SDK (for web browsers only)
  async signInWithGoogleWeb(): Promise<GoogleSignInResult> {
    try {
      // This will work in web browsers but not in WebView
      const { signInWithPopup } = await import('firebase/auth');
      const result = await signInWithPopup(auth, this.provider);
      
      return {
        success: true,
        user: result.user
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new GoogleWebAuth();



