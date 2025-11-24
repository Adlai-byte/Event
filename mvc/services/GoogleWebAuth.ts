import { GoogleAuthProvider, signInWithCredential, OAuthCredential } from 'firebase/auth';
import { auth } from './firebase';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

// Complete the auth session properly
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Web Client ID
// IMPORTANT: Get this from Firebase Console:
// 1. Go to Firebase Console > Authentication > Sign-in method > Google
// 2. Click on the Web SDK configuration
// 3. Copy the "Web client ID" (not the client secret)
// Format: XXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX.apps.googleusercontent.com
// 
// Then either:
// - Set EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID environment variable, OR
// - Replace the value below with your actual Web Client ID
const GOOGLE_OAUTH_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || 
  '491966036189-3f1e5ff7ae9fe214d8c334.apps.googleusercontent.com'; // TODO: Replace with your actual Web Client ID from Firebase

// Validate client ID format
if (!GOOGLE_OAUTH_CLIENT_ID.includes('.apps.googleusercontent.com')) {
  console.warn('⚠️ WARNING: Google OAuth Client ID may be incorrect. Please verify it in Firebase Console.');
}

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
      this.discovery = await AuthSession.fetchDiscoveryAsync(
        'https://accounts.google.com'
      );
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

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_OAUTH_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      redirectUri,
      extraParams: {},
      additionalParameters: {},
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
      const tokenResponse = await AuthSession.exchangeCodeAsync(
        {
          clientId: GOOGLE_OAUTH_CLIENT_ID,
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
      console.log('Starting Google OAuth flow...');
      console.log('Client ID:', GOOGLE_OAUTH_CLIENT_ID);
      
      const discovery = await this.getDiscovery();
      console.log('Discovery document fetched:', discovery?.authorizationEndpoint);
      
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'com.event', // This matches the scheme in app.json
        path: 'oauth',
      });
      console.log('Redirect URI:', redirectUri);
      console.log('⚠️ IMPORTANT: Make sure this redirect URI is added to your Google OAuth client in Google Cloud Console!');
      console.log('   Go to: Google Cloud Console > APIs & Services > Credentials > Your OAuth Client > Authorized redirect URIs');
      console.log('   Add:', redirectUri);

      // Generate a random state for security
      const state = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString()
      );

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_OAUTH_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.Code,
        redirectUri,
        state,
        extraParams: {},
        additionalParameters: {},
      });

      console.log('Starting OAuth prompt...');
      // Start the authentication flow
      const result = await request.promptAsync(discovery, {
        showInRecents: true,
      });

      console.log('OAuth result type:', result.type);
      console.log('OAuth result params:', result.params);

      if (result.type === 'success' && result.params.code) {
        console.log('Authorization code received, exchanging for tokens...');
        try {
          // Exchange code for tokens
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId: GOOGLE_OAUTH_CLIENT_ID,
              code: result.params.code,
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
            console.log('Signing in to Firebase...');
            const userCredential = await signInWithCredential(auth, credential);
            console.log('Firebase sign-in successful:', userCredential.user.email);
            
            return {
              success: true,
              user: userCredential.user
            };
          } else {
            console.error('No ID token in response:', tokenResponse);
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
            throw new Error('Redirect URI mismatch. Please add the redirect URI to your Google OAuth client configuration.');
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
        console.error('OAuth error:', result.error);
        const errorMessage = result.error?.message || result.params?.error || 'Authentication failed';
        throw new Error(errorMessage);
      } else {
        console.error('Unexpected OAuth result:', result);
        throw new Error(result.params?.error || result.error?.message || 'Authentication failed');
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



