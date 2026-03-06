import { Platform, Alert } from 'react-native';
import { User } from '../models/User';
import { AuthState } from '../models/AuthState';
import { getApiBaseUrl } from '../services/api';
import { LoginFormData, RegisterFormData } from '../models/FormData';
import AuthService from '../services/AuthService';

// Helper function to add timeout to fetch requests
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 10000,
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timeout: Server is not responding', { cause: err });
    }
    throw err;
  }
};

// AuthController - Handles authentication business logic
export class AuthController {
  private authState: AuthState;
  private onStateChange: (state: AuthState) => void;

  constructor(onStateChange: (state: AuthState) => void) {
    this.authState = new AuthState();
    this.onStateChange = onStateChange;
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    this.updateState(this.authState.setLoading(true));

    // Listen to authentication state changes
    AuthService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const baseUser = User.fromFirebaseUser(firebaseUser);

        // Fetch user role and name from database (important for page reloads)
        if (firebaseUser.email) {
          try {
            const q = encodeURIComponent(firebaseUser.email);
            const resp = await fetchWithTimeout(
              `${getApiBaseUrl()}/api/users/by-email?email=${q}`,
              {},
              10000,
            );
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.ok && data.exists) {
                // Check if user is blocked
                if (data.blocked === true) {
                  // Sign out blocked user
                  await AuthService.logout();
                  this.updateState(this.authState.logout().setError("You've been blocked"));
                  return;
                }

                // Debug: Log the data structure

                // Create new User object with all properties from database
                const user = new User(
                  baseUser.uid,
                  baseUser.email,
                  baseUser.displayName,
                  baseUser.emailVerified,
                  baseUser.createdAt,
                  baseUser.lastLoginAt,
                  data.firstName || baseUser.firstName,
                  data.middleName || baseUser.middleName,
                  data.lastName || baseUser.lastName,
                  data.suffix || baseUser.suffix,
                  data.phone || baseUser.phone,
                  data.dateOfBirth || baseUser.dateOfBirth,
                  data.address || baseUser.address,
                  data.city || baseUser.city,
                  data.state || baseUser.state,
                  data.zipCode || baseUser.zipCode,
                  data.role &&
                    typeof data.role === 'string' &&
                    ['user', 'admin', 'provider'].includes(data.role)
                    ? data.role
                    : baseUser.role || 'user',
                  data.profilePicture || baseUser.profilePicture,
                );

                this.updateState(this.authState.setUser(user).setLoading(false));
                return;
              }
            }
          } catch (fetchError: any) {
            if (__DEV__)
              console.error('Error fetching user data on auth state change:', fetchError);
            // Get API URL first to check if it's a Cloudflare tunnel
            const apiUrl = getApiBaseUrl();
            const isCloudflareTunnel = apiUrl.includes('trycloudflare.com');

            // Log more details about the network error
            const isTimeout =
              fetchError?.message?.includes('timeout') ||
              fetchError?.message?.includes('Request timeout');
            const isDnsError =
              fetchError?.message?.includes('ERR_NAME_NOT_RESOLVED') ||
              fetchError?.message?.includes('Failed to resolve') ||
              fetchError?.message?.includes('getaddrinfo ENOTFOUND') ||
              (fetchError?.message?.includes('Failed to fetch') && isCloudflareTunnel);
            const isNetworkError =
              fetchError?.message?.includes('Network request failed') ||
              fetchError?.message?.includes('Failed to fetch') ||
              fetchError?.message?.includes('ERR_CONNECTION_TIMED_OUT') ||
              isTimeout ||
              isDnsError;

            if (isNetworkError) {
              const isEmulator = Platform.OS === 'android' && apiUrl.includes('10.0.2.2');
              const isPhysicalDevice =
                !isEmulator && (Platform.OS === 'android' || Platform.OS === 'ios');
              const isWeb = Platform.OS === 'web';

              if (__DEV__) console.error('🌐 Network Error Details:');
              if (__DEV__) console.error('  - API Base URL:', apiUrl);
              if (__DEV__) console.error('  - Platform:', Platform.OS);
              if (__DEV__) console.error('  - Error:', fetchError.message);

              if (
                isDnsError ||
                (isCloudflareTunnel && fetchError?.message?.includes('Failed to fetch'))
              ) {
                if (__DEV__)
                  console.error('  - ❌ DNS Resolution Failed: Cannot resolve domain name');
                if (__DEV__) console.error('  - ⚠️  Cloudflare Tunnel URL is not resolving');
                if (isWeb) {
                  if (__DEV__) console.error('  - 💡 Solution for Web/Vercel:');
                  if (__DEV__) console.error('     1. SSH to your VPS: ssh root@72.62.64.59');
                  if (__DEV__)
                    console.error('     2. Check tunnel status: pm2 list | grep cloudflare-tunnel');
                  if (__DEV__)
                    console.error(
                      '     3. Get new tunnel URL: pm2 logs cloudflare-tunnel --lines 200 --nostream | grep -i "https://.*trycloudflare.com" | tail -1',
                    );
                  if (__DEV__) console.error('     4. Update Vercel Environment Variable:');
                  if (__DEV__)
                    console.error(
                      '        - Go to Vercel Dashboard → Project → Settings → Environment Variables',
                    );
                  if (__DEV__)
                    console.error(
                      '        - Update EXPO_PUBLIC_API_BASE_URL with the new tunnel URL',
                    );
                  if (__DEV__) console.error('        - Redeploy your Vercel deployment');
                  if (__DEV__)
                    console.error(
                      '  - 📖 See FIX_ERR_NAME_NOT_RESOLVED.md for detailed instructions',
                    );
                } else {
                  if (__DEV__)
                    console.error(
                      '  - 💡 Solution: The Cloudflare tunnel URL has expired or stopped',
                    );
                  if (__DEV__)
                    console.error(
                      '     Contact your administrator to restart the tunnel and get a new URL',
                    );
                }
              } else if (isTimeout) {
                if (__DEV__) console.error('  - ⚠️  Connection Timeout: Server is not responding');
              }

              if (isEmulator) {
                if (__DEV__) console.error('  - ⚠️  Android Emulator Detected');
                if (__DEV__)
                  console.error('  - Solution: Make sure your server is running: npm run server');
                if (__DEV__)
                  console.error(
                    '  - Test server: Open http://localhost:3001/api/health in your browser',
                  );
                if (__DEV__)
                  console.error('  - If server is running, check Windows Firewall settings');
              } else if (isPhysicalDevice) {
                if (__DEV__) console.error('  - ⚠️  Physical Device Detected');
                if (__DEV__)
                  console.error(
                    '  - Solution: Set EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3001 in .env file',
                  );
                if (__DEV__)
                  console.error(
                    '  - Find your IP: Run "ipconfig" (Windows) or "ifconfig" (Mac/Linux)',
                  );
              } else if (!isDnsError && !isCloudflareTunnel) {
                if (__DEV__)
                  console.error('  - Solution: Make sure your server is running: npm run server');
              }
            }
            // Continue with default values if fetch fails
          }
        }

        this.updateState(this.authState.setUser(baseUser).setLoading(false));
      } else {
        this.updateState(this.authState.logout().setLoading(false));
      }
    });
  }

  private updateState(newState: AuthState): void {
    this.authState = newState;
    this.onStateChange(this.authState);
  }

  // Login method
  public async login(formData: LoginFormData): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateState(this.authState.setLoading(true).clearError());

      const errors = formData.getErrors();
      if (Object.keys(errors).length > 0) {
        this.updateState(this.authState.setError('Please fix the form errors'));
        return { success: false, error: 'Please fix the form errors' };
      }

      const result = await AuthService.login(formData.email, formData.password);

      if (result.success && result.user) {
        // Check MySQL blocked status and get user role and name
        const baseUser = User.fromFirebaseUser(result.user);
        let userRole: 'user' | 'admin' | 'provider' = 'user';
        let firstName: string | undefined;
        let middleName: string | undefined;
        let lastName: string | undefined;
        let profilePicture: string | undefined;

        try {
          const q = encodeURIComponent(formData.email);
          const apiUrl = `${getApiBaseUrl()}/api/users/by-email?email=${q}`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          const resp = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (resp.ok) {
            const data = await resp.json();

            if (data && data.ok && data.exists) {
              if (data.blocked === true) {
                // Sign out and surface error
                await AuthService.logout();
                this.updateState(this.authState.setError("You've been blocked").setLoading(false));
                return { success: false, error: "You've been blocked" };
              }
              // Get user role and name from database
              if (data.role) {
                userRole = data.role as 'user' | 'admin' | 'provider';
              } else {
                if (__DEV__) console.warn('⚠️ No role in response, defaulting to user');
              }
              if (data.firstName) {
                firstName = data.firstName;
              }
              if (data.middleName) {
                middleName = data.middleName;
              }
              if (data.lastName) {
                lastName = data.lastName;
              }
              if (data.profilePicture) {
                profilePicture = data.profilePicture;
              }
            } else {
              if (__DEV__) console.warn('⚠️ User not found in database or invalid response');
            }
          } else {
            if (__DEV__) console.error('❌ API response not OK:', resp.status, resp.statusText);
            const errorText = await resp.text();
            if (__DEV__) console.error('❌ Error response:', errorText);
          }
        } catch (error: any) {
          if (__DEV__) console.error('❌ [CRITICAL] Error fetching user role from API:', error);
          if (__DEV__)
            console.error('❌ [CRITICAL] Error details:', {
              message: error.message,
              stack: error.stack,
              apiUrl: getApiBaseUrl(),
              platform: Platform.OS,
              isDev: __DEV__,
            });

          // Retry once after 2 seconds
          try {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 10000); // 10 second timeout

            const retryApiUrl = `${getApiBaseUrl()}/api/users/by-email?email=${encodeURIComponent(formData.email)}`;
            const retryResp = await fetch(retryApiUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              signal: retryController.signal,
            });

            clearTimeout(retryTimeoutId);

            if (retryResp.ok) {
              const retryData = await retryResp.json();
              if (retryData && retryData.ok && retryData.exists) {
                if (retryData.blocked === true) {
                  await AuthService.logout();
                  this.updateState(
                    this.authState.setError("You've been blocked").setLoading(false),
                  );
                  return { success: false, error: "You've been blocked" };
                }
                if (retryData.role) {
                  userRole = retryData.role as 'user' | 'admin' | 'provider';
                }
                if (retryData.firstName) firstName = retryData.firstName;
                if (retryData.middleName) middleName = retryData.middleName;
                if (retryData.lastName) lastName = retryData.lastName;
                if (retryData.profilePicture) profilePicture = retryData.profilePicture;
              }
            }
          } catch (retryError: any) {
            if (__DEV__) console.error('❌ Retry also failed:', retryError);

            // Determine error type for better user message
            let errorMessage = error.message || 'Unknown error';
            if (error.name === 'AbortError' || error.message?.includes('timeout')) {
              errorMessage = 'Connection timeout. Please check your internet connection.';
            } else if (
              error.message?.includes('Network request failed') ||
              error.message?.includes('Failed to fetch')
            ) {
              errorMessage =
                'Cannot reach server. Please check:\n1. Your internet connection\n2. Server is running\n3. Firewall settings';
            }

            // In production, if API fails after retry, show alert to user
            if (!__DEV__) {
              Alert.alert(
                'Network Error',
                `Unable to verify user role.\n\nAPI URL: ${getApiBaseUrl()}\n\nError: ${errorMessage}\n\nPlease check your internet connection and try again.`,
                [{ text: 'OK' }],
              );
            }
            // Don't fail login if API call fails, but log the error
            // Role will default to 'user' which is handled below
          }
        }

        // Create new User object with all properties
        const user = new User(
          baseUser.uid,
          baseUser.email,
          baseUser.displayName,
          baseUser.emailVerified,
          baseUser.createdAt,
          baseUser.lastLoginAt,
          firstName || baseUser.firstName,
          middleName || baseUser.middleName,
          lastName || baseUser.lastName,
          baseUser.suffix,
          baseUser.phone,
          baseUser.dateOfBirth,
          baseUser.address,
          baseUser.city,
          baseUser.state,
          baseUser.zipCode,
          userRole,
          profilePicture || baseUser.profilePicture,
        );

        this.updateState(this.authState.setUser(user).setLoading(false));
        return { success: true };
      } else {
        this.updateState(this.authState.setError(result.error || 'Login failed').setLoading(false));
        return { success: false, error: result.error || 'Login failed' };
      }
    } catch (error: any) {
      this.updateState(this.authState.setError(error.message).setLoading(false));
      return { success: false, error: error.message };
    }
  }

  // Register method
  public async register(formData: RegisterFormData): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateState(this.authState.setLoading(true).clearError());

      const errors = formData.getErrors();
      if (Object.keys(errors).length > 0) {
        this.updateState(this.authState.setError('Please fix the form errors'));
        return { success: false, error: 'Please fix the form errors' };
      }

      // Check if email already exists in database BEFORE attempting Firebase registration
      try {
        const q = encodeURIComponent(formData.email);
        const checkResp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${q}`);
        if (checkResp.ok) {
          const checkData = await checkResp.json();
          if (checkData && checkData.ok && checkData.exists) {
            // Email already exists in database
            this.updateState(
              this.authState
                .setError(
                  'This email is already registered. Please use a different email or try logging in instead.',
                )
                .setLoading(false),
            );
            return {
              success: false,
              error:
                'This email is already registered. Please use a different email or try logging in instead.',
            };
          }
        }
      } catch (checkError) {
        if (__DEV__) console.error('Error checking email existence:', checkError);
        // Continue with registration if check fails (don't block registration due to check error)
      }

      const result = await AuthService.register(
        formData.email,
        formData.password,
        formData.getFullName(),
      );

      if (result.success && result.user) {
        // Insert into MySQL via local API
        try {
          const apiUrl = `${getApiBaseUrl()}/api/register`;

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: formData.firstName,
              middleName: formData.middleName,
              lastName: formData.lastName,
              suffix: formData.suffix,
              email: formData.email,
              password: formData.password,
            }),
          });

          let data;
          try {
            const responseText = await response.text();
            data = JSON.parse(responseText);
          } catch (parseErr) {
            if (__DEV__) console.error('❌ [REGISTER] Failed to parse response:', parseErr);
            throw new Error(
              `Server returned invalid response (${response.status}). Please try again.`,
              { cause: parseErr },
            );
          }

          if (!response.ok || !data.ok) {
            // If Firebase user was created but MySQL insert failed, clean up Firebase user
            const errorMessage =
              data.error || `Failed to save user to database (${response.status})`;
            const errorCode = data.errorCode || 'UNKNOWN_ERROR';

            if (__DEV__)
              console.error('❌ [REGISTER] API registration failed:', {
                status: response.status,
                error: errorMessage,
                errorCode: errorCode,
                details: data.details,
              });

            // Clean up Firebase user if MySQL insert failed
            try {
              await AuthService.logout();
            } catch (logoutErr) {
              if (__DEV__)
                console.error('❌ [REGISTER] Error cleaning up Firebase user:', logoutErr);
            }

            throw new Error(errorMessage);
          }
        } catch (dbErr: any) {
          if (__DEV__) console.error('❌ [REGISTER] Database registration error:', dbErr);
          if (__DEV__)
            console.error('❌ [REGISTER] Error details:', {
              message: dbErr.message,
              stack: dbErr.stack,
              apiUrl: getApiBaseUrl(),
            });

          // Clean up Firebase user if MySQL insert failed
          try {
            await AuthService.logout();
          } catch (logoutErr) {
            if (__DEV__) console.error('❌ [REGISTER] Error cleaning up Firebase user:', logoutErr);
          }

          const errorMessage =
            dbErr.message || 'Failed to complete registration. Please try again.';
          this.updateState(this.authState.setError(errorMessage).setLoading(false));
          return { success: false, error: errorMessage };
        }

        const user = User.fromFirebaseUser(result.user);
        this.updateState(this.authState.setUser(user).setLoading(false));
        return { success: true };
      } else {
        this.updateState(
          this.authState.setError(result.error || 'Registration failed').setLoading(false),
        );
        return { success: false, error: result.error || 'Registration failed' };
      }
    } catch (error: any) {
      this.updateState(this.authState.setError(error.message).setLoading(false));
      return { success: false, error: error.message };
    }
  }

  // Google login method
  public async loginWithGoogle(): Promise<boolean> {
    try {
      this.updateState(this.authState.setLoading(true).clearError());

      const result = await AuthService.loginWithGoogle();

      if (result.success && result.user) {
        // Check if user has password before allowing Google login
        if (result.user.email) {
          try {
            const q = encodeURIComponent(result.user.email);
            const resp = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${q}`);
            if (resp.ok) {
              const data = await resp.json();
              if (data && data.ok && data.exists) {
                // If user has a password, reject Google login
                if (data.hasPassword === true) {
                  await AuthService.logout();
                  this.updateState(
                    this.authState
                      .setError(
                        'This account is registered with email/password. Please use email and password to login instead.',
                      )
                      .setLoading(false),
                  );
                  return false;
                }

                if (data.blocked === true) {
                  await AuthService.logout();
                  this.updateState(
                    this.authState.setError("You've been blocked").setLoading(false),
                  );
                  return false;
                }
              }
            }
          } catch (error) {
            if (__DEV__) console.error('Error checking user password:', error);
          }
        }

        const baseUser = User.fromFirebaseUser(result.user);
        let userRole: 'user' | 'admin' | 'provider' = 'user';
        let firstName: string | undefined;
        let middleName: string | undefined;
        let lastName: string | undefined;
        let profilePicture: string | undefined;
        let userExists = false;

        // Check if user exists and get user data
        try {
          if (result.user.email) {
            const q = encodeURIComponent(result.user.email);
            const apiUrl = `${getApiBaseUrl()}/api/users/by-email?email=${q}`;
            const resp = await fetch(apiUrl, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            });

            if (resp.ok) {
              const data = await resp.json();
              if (data && data.ok && data.exists) {
                userExists = true; // User already exists in database
                if (data.role) userRole = data.role as 'user' | 'admin' | 'provider';
                if (data.firstName) firstName = data.firstName;
                if (data.middleName) middleName = data.middleName;
                if (data.lastName) lastName = data.lastName;
                if (data.profilePicture) profilePicture = data.profilePicture;
              }
            }
          }
        } catch (error: any) {
          if (__DEV__) console.error('Error fetching user role:', error);
        }

        const user = new User(
          baseUser.uid,
          baseUser.email,
          baseUser.displayName,
          baseUser.emailVerified,
          baseUser.createdAt,
          baseUser.lastLoginAt,
          firstName || baseUser.firstName,
          middleName || baseUser.middleName,
          lastName || baseUser.lastName,
          baseUser.suffix,
          baseUser.phone,
          baseUser.dateOfBirth,
          baseUser.address,
          baseUser.city,
          baseUser.state,
          baseUser.zipCode,
          userRole,
          profilePicture || baseUser.profilePicture,
        );

        // Only register if user doesn't exist in database (avoid 409 error)
        if (!userExists && result.user.email) {
          try {
            const displayName = result.user.displayName || '';
            const parts = displayName.trim().split(/\s+/);
            const firstName = parts[0] || '';
            const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

            const registerResponse = await fetch(`${getApiBaseUrl()}/api/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firstName,
                middleName: '',
                lastName,
                suffix: '',
                email: result.user.email,
              }),
            });

            if (registerResponse.ok) {
              // User registered successfully in database
            } else {
              const errorText = await registerResponse.text();
              if (__DEV__)
                console.error(
                  '❌ [Google Login] Registration failed:',
                  registerResponse.status,
                  errorText,
                );
              // Continue anyway - user is authenticated in Firebase
            }
          } catch (e: any) {
            if (__DEV__) console.error('❌ [Google Login] Registration error:', e);
            // Continue anyway - user is authenticated in Firebase
          }
        } else {
          // User already exists — skip registration
        }

        this.updateState(this.authState.setUser(user).setLoading(false));
        return true;
      } else {
        const errorMsg = result.error || 'Google login failed';
        this.updateState(this.authState.setError(errorMsg).setLoading(false));
        return false;
      }
    } catch (error: any) {
      if (__DEV__) console.error('Google login exception:', error);
      this.updateState(
        this.authState.setError(error.message || 'Google login failed').setLoading(false),
      );
      return false;
    }
  }

  // Password reset method
  public async resetPassword(email: string): Promise<boolean> {
    try {
      this.updateState(this.authState.setLoading(true).clearError());

      if (!email.trim()) {
        this.updateState(
          this.authState.setError('Please enter your email address').setLoading(false),
        );
        return false;
      }

      // Stricter email validation: requires proper domain and TLD (at least 2 characters)
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        this.updateState(
          this.authState.setError('Please enter a valid email address').setLoading(false),
        );
        return false;
      }

      const result = await AuthService.resetPassword(email);

      if (result.success) {
        this.updateState(this.authState.setLoading(false).clearError());
        return true;
      } else {
        this.updateState(
          this.authState.setError(result.error || 'Password reset failed').setLoading(false),
        );
        return false;
      }
    } catch (error: any) {
      this.updateState(this.authState.setError(error.message).setLoading(false));
      return false;
    }
  }

  // Logout method
  public async logout(): Promise<boolean> {
    try {
      await AuthService.logout();

      // Always reset the state to logged out, regardless of Firebase result
      this.updateState(new AuthState(false, null, false, null));

      return true; // Always return true since we're forcing logout
    } catch (error: any) {
      if (__DEV__) console.error('AuthController: Logout error:', error);
      // Even if there's an error, reset to logged out state
      this.updateState(new AuthState(false, null, false, null));
      return true;
    }
  }

  // Get current state
  public getState(): AuthState {
    return this.authState;
  }

  // Clear error
  public clearError(): void {
    this.updateState(this.authState.clearError());
  }

  // Send email verification
  public async sendEmailVerification(): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await AuthService.sendEmailVerification();

      if (result.success) {
        Alert.alert(
          'Verification Email Sent',
          'Please check your email inbox and click the verification link. After verifying, you may need to refresh or log out and log back in.',
        );
      }

      return result;
    } catch (error: any) {
      if (__DEV__) console.error('Send email verification error:', error);
      return { success: false, error: error.message || 'Failed to send verification email' };
    }
  }

  // Check and reload email verification status
  public async checkEmailVerification(): Promise<{
    success: boolean;
    verified: boolean;
    error?: string;
  }> {
    try {
      const result = await AuthService.reloadUser();

      if (result.success) {
        const firebaseUser = AuthService.getCurrentUser();
        if (firebaseUser) {
          const verified = firebaseUser.emailVerified;

          // Update the user in state if verification status changed
          if (this.authState.user) {
            const updatedUser = new User(
              this.authState.user.uid,
              this.authState.user.email,
              this.authState.user.displayName,
              verified,
              this.authState.user.createdAt,
              this.authState.user.lastLoginAt,
              this.authState.user.firstName,
              this.authState.user.middleName,
              this.authState.user.lastName,
              this.authState.user.suffix,
              this.authState.user.phone,
              this.authState.user.dateOfBirth,
              this.authState.user.address,
              this.authState.user.city,
              this.authState.user.state,
              this.authState.user.zipCode,
              this.authState.user.role,
              this.authState.user.profilePicture,
            );
            this.updateState(this.authState.setUser(updatedUser));
          }

          return { success: true, verified };
        }
      }

      return { success: false, verified: false, error: result.error };
    } catch (error: any) {
      if (__DEV__) console.error('Check email verification error:', error);
      return {
        success: false,
        verified: false,
        error: error.message || 'Failed to check verification status',
      };
    }
  }

  // Update email in Firebase Authentication
  public async updateUserEmail(
    newEmail: string,
  ): Promise<{ success: boolean; error?: string; message?: string }> {
    try {
      const result = await AuthService.updateUserEmail(newEmail);

      if (result.success) {
        // Reload user to get updated email
        await AuthService.reloadUser();

        // Update the user in state with new email
        if (this.authState.user) {
          const firebaseUser = AuthService.getCurrentUser();
          if (firebaseUser) {
            const updatedUser = new User(
              this.authState.user.uid,
              firebaseUser.email || this.authState.user.email,
              this.authState.user.displayName,
              firebaseUser.emailVerified,
              this.authState.user.createdAt,
              this.authState.user.lastLoginAt,
              this.authState.user.firstName,
              this.authState.user.middleName,
              this.authState.user.lastName,
              this.authState.user.suffix,
              this.authState.user.phone,
              this.authState.user.dateOfBirth,
              this.authState.user.address,
              this.authState.user.city,
              this.authState.user.state,
              this.authState.user.zipCode,
              this.authState.user.role,
              this.authState.user.profilePicture,
            );
            this.updateState(this.authState.setUser(updatedUser));
          }
        }
      }

      return result;
    } catch (error: any) {
      if (__DEV__) console.error('Update user email error:', error);
      return { success: false, error: error.message || 'Failed to update email' };
    }
  }
}
