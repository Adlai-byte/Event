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
  '950286370545-9n9f7nkm4kt21onhp40r4vqbsc1bghsg.apps.googleusercontent.com'; // Web Client ID from Google Cloud Console

// Validate client ID format
if (!GOOGLE_OAUTH_CLIENT_ID.includes('.apps.googleusercontent.com')) {
  console.warn('⚠️ WARNING: Google OAuth Client ID may be incorrect. Please verify it in Firebase Console.');
}

// Log client ID on module load (for debugging)
console.log('🔑 Google OAuth Client ID configured:', GOOGLE_OAUTH_CLIENT_ID.substring(0, 20) + '...');

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

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_OAUTH_CLIENT_ID,
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
      console.log('Platform:', Platform.OS);
      
      const discovery = await this.getDiscovery();
      console.log('Discovery document fetched:', discovery?.authorizationEndpoint);
      
      // Validate discovery document
      if (!discovery || !discovery.authorizationEndpoint) {
        throw new Error('Invalid Google OAuth discovery document. Please check your network connection.');
      }
      
      // For mobile OAuth, Google Cloud Console requires HTTPS redirect URIs
      // Manually construct HTTPS proxy URI since useProxy doesn't work in development
      // Format: https://auth.expo.io/@projectId/slug
      const projectId = '829882ad-1d3e-4e96-a69f-50a779b1fdc8'; // From app.json extra.eas.projectId
      const projectSlug = 'Event'; // From app.json expo.slug
      const httpsProxyUri = `https://auth.expo.io/@${projectId}/${projectSlug}`;
      
      // Try to get redirect URI from makeRedirectUri first
      let redirectUri = AuthSession.makeRedirectUri({
        scheme: 'com.event',
        path: 'oauth',
        useProxy: true,
      });
      
      // If we got exp:// or custom scheme, use HTTPS proxy instead
      if (!redirectUri.startsWith('https://')) {
        console.log('⚠️ makeRedirectUri returned non-HTTPS URI, using manual HTTPS proxy URI');
        redirectUri = httpsProxyUri;
      }
      
      // Log what type of URI we got
      if (redirectUri.startsWith('https://')) {
        console.log('✅ Using HTTPS proxy redirect URI (works with Google Cloud Console)');
      } else {
        console.warn('⚠️ Using non-HTTPS URI - this may not work with Google Cloud Console');
        console.warn('⚠️ Falling back to HTTPS proxy URI');
        redirectUri = httpsProxyUri;
      }
      
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔗 REDIRECT URI CONFIGURATION');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📋 Redirect URI being used:', redirectUri);
      console.log('');
      
      if (redirectUri.startsWith('https://')) {
        console.log('✅ This is an HTTPS URI - PERFECT for Google Cloud Console!');
        console.log('');
        console.log('📝 HAKBANG-HAKBANG:');
        console.log('1. Pumunta sa: https://console.cloud.google.com/apis/credentials');
        console.log('2. Piliin ang project: e-vent-aa93e (dropdown sa taas)');
        console.log('3. Hanapin ang "Web client 1" (OAuth 2.0 Client ID)');
        console.log('4. I-click ang EDIT (pencil icon)');
        console.log('5. Scroll sa "Authorized redirect URIs"');
        console.log('6. I-click ang + ADD URI');
        console.log('7. Idagdag ang EXACT na URI na ito:');
        console.log('   ', redirectUri);
        console.log('8. I-click ang SAVE');
        console.log('');
        console.log('🔐 OAuth Consent Screen (IMPORTANTE!):');
        console.log('1. Pumunta sa: https://console.cloud.google.com/apis/credentials/consent');
        console.log('2. Piliin ang project: e-vent-aa93e');
        console.log('3. I-check kung naka-configure na:');
        console.log('   - User Type: External (o Internal kung G Suite)');
        console.log('   - App name: "Event"');
        console.log('   - User support email: I-lagay ang email mo');
        console.log('   - Developer contact: I-lagay ang email mo');
        console.log('4. Kung "Testing" mode, i-add ang email mo sa "Test users"');
        console.log('5. I-click ang SAVE');
        console.log('');
        console.log('9. Maghintay ng 2-3 minuto');
        console.log('10. Subukan ulit ang Google login');
      } else {
        console.log('⚠️ WARNING: Using custom scheme - Google Cloud Console requires HTTPS!');
        console.log('⚠️ You need to set up a custom HTTPS redirect server or use Expo EAS');
        console.log('⚠️ For now, try using Expo Go which provides HTTPS proxy automatically');
      }
      
      console.log('');
      console.log('🔑 Your Web Client ID:', GOOGLE_OAUTH_CLIENT_ID);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      
      // Store redirect URI for error messages
      (this as any)._currentRedirectUri = redirectUri;

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
      });

      console.log('Starting OAuth prompt...');
      
      // Build and log the authorization URL for debugging
      try {
        const authUrl = await request.makeAuthUrlAsync(discovery);
        console.log('🔗 Full Authorization URL:', authUrl);
        console.log('📋 OAuth Parameters:');
        console.log('  - Client ID:', GOOGLE_OAUTH_CLIENT_ID);
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
      
      // Log the full authorization URL for debugging (truncated for security)
      console.log('🔗 Full Authorization URL:', authUrl.substring(0, 150) + '...');
      console.log('🔗 Redirect URI in URL:', redirectUri);
      
      // CRITICAL: Verify redirect URI is in the authorization URL
      if (!authUrl.includes(encodeURIComponent(redirectUri))) {
        console.error('❌ ERROR: Redirect URI mismatch!');
        console.error('Expected redirect URI:', redirectUri);
        console.error('Check the authorization URL above');
        throw new Error('Redirect URI mismatch in OAuth request');
      }
      
      console.log('🌐 Starting OAuth authentication...');
      console.log('📱 Using Expo proxy for OAuth flow (handles redirects automatically)');
      console.log('📱 After authentication, you will be redirected back to the app');
      console.log('');
      console.log('⚠️ IMPORTANT: If you get a 404 error, make sure this EXACT redirect URI is in Google Cloud Console:');
      console.log('   ', redirectUri);
      console.log('');
      
      // Use AuthRequest.promptAsync() for better Expo proxy support
      // This automatically handles Expo proxy redirects (https://auth.expo.io/...)
      // WebBrowser.openAuthSessionAsync doesn't handle proxy redirects as well
      const result = await request.promptAsync(discovery, {
        showInRecents: true,
        // Use external browser for better user experience
        useProxy: true, // This ensures Expo proxy is used
      });

      console.log('📱 OAuth result type:', result.type);
      console.log('📱 OAuth result:', JSON.stringify(result, null, 2));
      
      // Log detailed information for debugging
      if (result.type === 'cancel') {
        console.log('❌ User cancelled the OAuth flow');
      } else if (result.type === 'dismiss') {
        console.log('❌ User dismissed the OAuth flow');
      } else if (result.type === 'success') {
        console.log('✅ OAuth flow completed successfully');
      } else {
        console.log('⚠️ Unexpected OAuth result type:', result.type);
        // Check for error params
        if ('params' in result && result.params) {
          const params = result.params as any;
          if (params.error) {
            console.error('❌ OAuth Error:', params.error);
            console.error('❌ Error Description:', params.error_description || 'No description');
            console.error('❌ Error URI:', params.error_uri || 'No URI');
          }
        }
      }

      // Handle the result from promptAsync - it might return tokens directly or a callback URL
      if (result.type === 'success') {
        // Check if promptAsync already returned tokens (some configurations do this)
        if ('authentication' in result && result.authentication) {
          console.log('✅ promptAsync returned tokens directly');
          const auth = result.authentication;
          
          if (auth.idToken) {
            console.log('Creating Firebase credential from ID token...');
            const credential = GoogleAuthProvider.credential(auth.idToken);
            
            if (!credential) {
              throw new Error('Failed to create authentication credential.');
            }
            
            console.log('Signing in to Firebase...');
            const userCredential = await signInWithCredential(this.auth, credential);
            
            return {
              success: true,
              user: userCredential.user
            };
          }
        }
        
        // Otherwise, handle callback URL (manual token exchange)
        // promptAsync returns params with code, or url with callback
        if (result.params && result.params.code) {
          // Extract code from params
          const code = result.params.code as string;
          const error = result.params.error as string | undefined;
          
          if (error) {
            throw new Error(`Google authentication failed: ${error}`);
          }
          
          console.log('✅ Authorization code received from promptAsync, exchanging for tokens...');
          console.log('🔑 Using redirect URI for token exchange:', redirectUri);
          
          try {
            const tokenResponse = await AuthSession.exchangeCodeAsync(
              {
                clientId: GOOGLE_OAUTH_CLIENT_ID,
                code: code,
                redirectUri,
                extraParams: {},
              },
              discovery
            );
            
            if (tokenResponse.idToken) {
              console.log('Creating Firebase credential...');
              const credential = GoogleAuthProvider.credential(tokenResponse.idToken);
              
              if (!credential) {
                throw new Error('Failed to create authentication credential.');
              }
              
              console.log('Signing in to Firebase...');
              const userCredential = await signInWithCredential(this.auth, credential);
              
              return {
                success: true,
                user: userCredential.user
              };
            }
          } catch (exchangeError: any) {
            console.error('Token exchange error:', exchangeError);
            throw exchangeError;
          }
        } else if (result.url) {
          console.log('✅ Received callback URL from OAuth flow');
          console.log('🔗 Callback URL:', result.url);
          console.log('🔗 Original Redirect URI used:', redirectUri);
          
          // Check if callback URL is from Expo proxy
          if (result.url.includes('auth.expo.io')) {
            console.log('📋 Callback is from Expo proxy (auth.expo.io)');
            console.log('📋 This means Google successfully redirected to Expo proxy');
            console.log('📋 Expo proxy should now redirect to your app...');
          }
          
          // Parse the callback URL to extract the authorization code
          // Handle both http/https URLs and deep link URLs (com.event://)
          let code: string | null = null;
        let error: string | null = null;
        let errorDescription: string | null = null;
        
        try {
          // Try to parse as standard URL first
          const url = new URL(result.url);
          code = url.searchParams.get('code');
          error = url.searchParams.get('error');
          errorDescription = url.searchParams.get('error_description');
          
          console.log('📋 Parsed URL parameters:');
          console.log('  - Code:', code ? '✅ Present' : '❌ Missing');
          console.log('  - Error:', error || 'None');
          console.log('  - Error Description:', errorDescription || 'None');
        } catch (urlError) {
          // If URL parsing fails, it might be a deep link (com.event://oauth?code=...)
          // Parse manually using string methods
          console.log('⚠️ Standard URL parsing failed, trying deep link format...');
          console.log('URL parsing error:', urlError);
          
          // Extract query parameters from deep link
          const queryString = result.url.split('?')[1] || result.url.split('#')[1] || '';
          const params = new URLSearchParams(queryString);
          code = params.get('code');
          error = params.get('error');
          errorDescription = params.get('error_description');
          
          console.log('📋 Parsed deep link parameters:');
          console.log('  - Code:', code ? '✅ Present' : '❌ Missing');
          console.log('  - Error:', error || 'None');
        }
        
        if (error) {
          console.error('❌ OAuth error from Google:', error);
          console.error('Error description:', errorDescription);
          throw new Error(`Google authentication failed: ${errorDescription || error}`);
        }
        
        if (!code) {
          console.error('❌ No authorization code in callback URL');
          console.error('Full callback URL:', result.url);
          console.error('This might mean:');
          console.error('  1. The redirect URI in Google Cloud Console doesn\'t match');
          console.error('  2. The OAuth consent screen is not configured');
          console.error('  3. The user cancelled the authentication');
          throw new Error('No authorization code received. Please check your Google Cloud Console configuration.');
        }
        
        console.log('✅ Authorization code received, exchanging for tokens...');
        console.log('🔑 Using redirect URI for token exchange:', redirectUri);
        try {
          // Exchange code for tokens
          // IMPORTANT: Use the EXACT same redirectUri that was used in the authorization request
          const tokenResponse = await AuthSession.exchangeCodeAsync(
            {
              clientId: GOOGLE_OAUTH_CLIENT_ID,
              code: code,
              redirectUri, // Must match the redirect URI used in authorization request
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
            const currentUri = (this as any)._currentRedirectUri || redirectUri;
            throw new Error(
              `❌ 404 Error: Redirect URI not configured!\n\n` +
              `📋 Add this EXACT redirect URI to Google Cloud Console:\n` +
              `${currentUri}\n\n` +
              `🔧 HAKBANG-HAKBANG:\n` +
              `1. Pumunta sa: https://console.cloud.google.com/apis/credentials\n` +
              `2. Piliin ang project: e-vent-aa93e\n` +
              `3. Hanapin ang OAuth 2.0 Client ID (Web Client ID mula sa Firebase)\n` +
              `4. I-click ang EDIT\n` +
              `5. Scroll sa "Authorized redirect URIs"\n` +
              `6. I-click ang + ADD URI\n` +
              `7. Idagdag ang EXACT na URI na ito: ${currentUri}\n` +
              `8. I-click ang SAVE\n` +
              `9. Maghintay ng 2-3 minuto, tapos subukan ulit\n\n` +
              `💡 TIP: Kopyahin ang EXACT na URI mula sa console logs.`
            );
          } else if (exchangeError.message?.includes('404') || 
                     exchangeError.errorDescription?.includes('404') ||
                     exchangeError.errorDescription?.includes('not found')) {
            const currentUri = (this as any)._currentRedirectUri || redirectUri;
            throw new Error(
              `❌ 404 Error: Redirect URI not found!\n\n` +
              `📋 Add this EXACT redirect URI to Google Cloud Console:\n` +
              `${currentUri}\n\n` +
              `🔧 HAKBANG-HAKBANG:\n` +
              `1. Pumunta sa: https://console.cloud.google.com/apis/credentials\n` +
              `2. Piliin ang project: e-vent-aa93e\n` +
              `3. Hanapin ang OAuth 2.0 Client ID (Web Client ID)\n` +
              `4. I-click ang EDIT\n` +
              `5. Scroll sa "Authorized redirect URIs"\n` +
              `6. I-click ang + ADD URI\n` +
              `7. Idagdag ang EXACT na URI: ${currentUri}\n` +
              `8. I-click ang SAVE\n` +
              `9. Maghintay ng 2-3 minuto, tapos subukan ulit\n\n` +
              `💡 TIP: Kopyahin ang EXACT na URI mula sa console logs.`
            );
          } else {
            throw new Error(exchangeError.errorDescription || exchangeError.message || 'Token exchange failed');
          }
        }
        } // Close the else if (result.url) block
      } // Close the if (result.type === 'success') block
      
      else if (result.type === 'cancel') {
        console.log('User cancelled OAuth flow in Chrome browser');
        return {
          success: false,
          error: 'Google sign-in was cancelled.'
        };
      } else if (result.type === 'dismiss') {
        console.log('User dismissed OAuth flow in Chrome browser');
        return {
          success: false,
          error: 'Google sign-in was dismissed.'
        };
      } else {
        console.error('Unexpected OAuth result type:', result.type);
        console.error('Error params:', errorParams);
        
        // Check for specific error types
        if (errorParams && typeof errorParams === 'object' && 'error' in errorParams && errorParams.error === 'access_denied') {
          throw new Error('Google sign-in was denied. Please try again.');
        } else if (errorParams && typeof errorParams === 'object' && 'error' in errorParams && errorParams.error === 'redirect_uri_mismatch') {
          const currentUri = (this as any)._currentRedirectUri || redirectUri;
          throw new Error(
            `❌ 404 Error: Redirect URI not configured!\n\n` +
            `📋 Add this EXACT redirect URI to Google Cloud Console:\n` +
            `${currentUri}\n\n` +
            `🔧 HAKBANG-HAKBANG:\n` +
            `1. Pumunta sa: https://console.cloud.google.com/apis/credentials\n` +
            `2. Piliin ang project: e-vent-aa93e\n` +
            `3. Hanapin ang OAuth 2.0 Client ID (Web Client ID)\n` +
            `4. I-click ang EDIT\n` +
            `5. Scroll sa "Authorized redirect URIs"\n` +
            `6. I-click ang + ADD URI\n` +
            `7. Idagdag ang EXACT na URI: ${currentUri}\n` +
            `8. I-click ang SAVE\n` +
            `9. Maghintay ng 2-3 minuto, tapos subukan ulit\n\n` +
            `💡 TIP: Kopyahin ang EXACT na URI mula sa console logs.`
          );
        } else if (errorParams && typeof errorParams === 'object' && 'error' in errorParams && errorParams.error === 'invalid_client') {
          throw new Error('Invalid OAuth client ID. Please check your Google OAuth configuration in Firebase Console.');
        } else if ((errorParams && typeof errorParams === 'object' && 'error_description' in errorParams && 
                   (typeof errorParams.error_description === 'string' && (errorParams.error_description.includes('404') || errorParams.error_description.includes('not found')))) ||
                   (errorObj && typeof errorObj === 'object' && 'message' in errorObj && typeof errorObj.message === 'string' && errorObj.message.includes('404'))) {
          // Specific 404 error handling
          const currentUri = (this as any)._currentRedirectUri || redirectUri;
          throw new Error(
            `❌ 404 Error: Redirect URI not found!\n\n` +
            `📋 Add this EXACT redirect URI to Google Cloud Console:\n` +
            `${currentUri}\n\n` +
            `🔧 HAKBANG-HAKBANG:\n` +
            `1. Pumunta sa: https://console.cloud.google.com/apis/credentials\n` +
            `2. Piliin ang project: e-vent-aa93e\n` +
            `3. Hanapin ang OAuth 2.0 Client ID (Web Client ID)\n` +
            `4. I-click ang EDIT\n` +
            `5. Scroll sa "Authorized redirect URIs"\n` +
            `6. I-click ang + ADD URI\n` +
            `7. Idagdag ang EXACT na URI: ${currentUri}\n` +
            `8. I-click ang SAVE\n` +
            `9. Maghintay ng 2-3 minuto, tapos subukan ulit\n\n` +
            `💡 TIP: Kopyahin ang EXACT na URI mula sa console logs.`
          );
        }
        
        const errorMessage = (errorObj && typeof errorObj === 'object' && 'message' in errorObj ? errorObj.message : null) ||
                            (errorParams && typeof errorParams === 'object' && 'error_description' in errorParams ? errorParams.error_description : null) ||
                            (errorParams && typeof errorParams === 'object' && 'error' in errorParams ? errorParams.error : null) ||
                            'Authentication failed';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Authentication failed');
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



