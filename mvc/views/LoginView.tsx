import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Image
} from 'react-native';
import { LoginFormData } from '../models/FormData';
import { AuthState } from '../models/AuthState';

interface LoginViewProps {
  authState: AuthState;
  onLogin: (formData: LoginFormData) => Promise<{ success: boolean; error?: string }>;
  onRegister: () => void;
  onForgotPassword: (email: string) => Promise<boolean>;
  onGoogleLogin: () => Promise<boolean>;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isMobile = screenWidth < 768;
const isMobileWeb = Platform.OS === 'web' && screenWidth < 768;

export const LoginView: React.FC<LoginViewProps> = ({
  authState,
  onLogin,
  onRegister,
  onForgotPassword,
  onGoogleLogin
}) => {
  const [formData, setFormData] = useState<LoginFormData>(new LoginFormData());
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Clear field errors when user starts typing
  const clearFieldError = (fieldName: string): void => {
    if (fieldErrors[fieldName]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleLogin = async (): Promise<void> => {
    const errors = formData.getErrors();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const result = await onLogin(formData);
    console.log('Login result:', result);
    if (result.success) {
      setFormData(new LoginFormData());
      setFieldErrors({});
    } else if (result.error) {
      console.log('Login error:', result.error);
      // Show specific error messages as popups
      if (result.error.includes('Account not found')) {
        Alert.alert(
          'Account Not Found',
          'No account found with this email address. Please check your email or register for a new account.',
          [
            { text: 'OK', style: 'default' },
            { text: 'Register', style: 'default', onPress: onRegister }
          ]
        );
      } else if (result.error.includes('Invalid password')) {
        Alert.alert('Invalid Password', 'The password you entered is incorrect. Please try again.');
      } else {
        Alert.alert('Login Error', result.error);
      }
    }
  };

  const handleForgotPassword = async (): Promise<void> => {
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsResettingPassword(true);
    try {
      const success = await onForgotPassword(formData.email.trim());
      if (success) {
        Alert.alert(
          'Password Reset Email Sent',
          'Check your inbox for instructions to reset your password. If you don\'t see the email, check your spam folder.',
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        // Error message will be shown in the error container from authState
        if (!authState.error) {
          Alert.alert(
            'Password Reset Failed',
            'Unable to send password reset email. Please check your email address and try again.'
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'An error occurred while sending the password reset email. Please try again.'
      );
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    const success = await onGoogleLogin();
    if (!success && authState.error) {
      Alert.alert('Google Login', authState.error);
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.container}>
      {/* Background Design */}
      <View style={styles.backgroundContainer}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />
        {isWeb ? (
          <View style={styles.backgroundGradientWeb} />
        ) : (
        <View style={styles.backgroundGradient} />
        )}
      </View>
      
      {/* Web: Centered Card Container */}
      {isWeb ? (
        <View style={styles.webCardContainer}>
          <View style={styles.webCardContent}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/logo.png')} 
                style={styles.logoImage as any}
          resizeMode="contain"
        />
      </View>

      {/* Welcome Message */}
      <Text style={styles.welcomeText}>
        Welcome back! Please log in to your account.
      </Text>

      {/* Error Message for Login Errors */}
      {authState.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorMessage}>
            {authState.error.includes('Account not found') 
              ? 'No account found with this email address. Please check your email or register for a new account.'
              : authState.error.includes('Invalid password')
              ? 'Invalid password. Please check your password and try again.'
              : authState.error
            }
          </Text>
        </View>
      )}

      {/* Login/Register Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton, styles.activeToggleButton]} 
                onPress={() => {}}
        >
          <Text style={[styles.toggleText, styles.activeToggleText]}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton]} 
          onPress={onRegister}
        >
          <Text style={styles.toggleText}>Register</Text>
        </TouchableOpacity>
      </View>

      {/* Email Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Email {fieldErrors.email && <Text style={styles.requiredAsterisk}>*</Text>}
        </Text>
        <View style={[styles.inputField, fieldErrors.email && styles.inputFieldError]}>
          <Text style={styles.inputIcon}>✉️</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            value={formData.email}
            onChangeText={(text: string) => {
              setFormData(new LoginFormData(text, formData.password));
              clearFieldError('email');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}
      </View>

      {/* Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Password {fieldErrors.password && <Text style={styles.requiredAsterisk}>*</Text>}
        </Text>
        <View style={[styles.inputField, fieldErrors.password && styles.inputFieldError]}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={formData.password}
            onChangeText={(text: string) => {
              setFormData(new LoginFormData(formData.email, text));
              clearFieldError('password');
            }}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(prev => !prev)}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}
      </View>

      {/* Forgot Password */}
      <TouchableOpacity 
        style={[styles.forgotPassword, isResettingPassword && styles.forgotPasswordDisabled]} 
        onPress={handleForgotPassword}
        disabled={isResettingPassword}
      >
        {isResettingPassword ? (
          <View style={styles.forgotPasswordLoading}>
            <ActivityIndicator size="small" color="#4a55e1" style={styles.loadingSpinner} />
            <Text style={styles.forgotPasswordText}>Sending reset email...</Text>
          </View>
        ) : (
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        )}
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity 
        style={styles.loginButton} 
        onPress={handleLogin}
      >
        <Text style={styles.loginButtonText}>Log In</Text>
      </TouchableOpacity>

      {/* OR Separator */}
      <View style={styles.orSeparator}>
        <View style={styles.separatorLine} />
        <Text style={styles.orText}>OR CONTINUE WITH</Text>
        <View style={styles.separatorLine} />
      </View>

      {/* Google Button */}
      <TouchableOpacity 
        style={styles.googleButton} 
        onPress={handleGoogleLogin}
      >
        <Text style={styles.googleIcon}>G</Text>
        <Text style={styles.googleButtonText}>Google</Text>
      </TouchableOpacity>

          </View>
        </View>
      ) : (
        <>
          {/* Mobile: Full Screen Layout */}
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo.png')} 
              style={styles.logoImage as any}
              resizeMode="contain"
            />
          </View>

          {/* Welcome Message */}
          <Text style={styles.welcomeText}>
            Welcome back! Please log in to your account.
          </Text>

          {/* Error Message for Login Errors */}
          {authState.error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorMessage}>
                {authState.error.includes('Account not found') 
                  ? 'No account found with this email address. Please check your email or register for a new account.'
                  : authState.error.includes('Invalid password')
                  ? 'Invalid password. Please check your password and try again.'
                  : authState.error
                }
              </Text>
            </View>
          )}

          {/* Login/Register Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleButton, styles.activeToggleButton]} 
              onPress={() => {}}
            >
              <Text style={[styles.toggleText, styles.activeToggleText]}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton]} 
              onPress={onRegister}
            >
              <Text style={styles.toggleText}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Email {fieldErrors.email && <Text style={styles.requiredAsterisk}>*</Text>}
            </Text>
            <View style={[styles.inputField, fieldErrors.email && styles.inputFieldError]}>
              <Text style={styles.inputIcon}>✉️</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                value={formData.email}
                onChangeText={(text: string) => {
                  setFormData(new LoginFormData(text, formData.password));
                  clearFieldError('email');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Password {fieldErrors.password && <Text style={styles.requiredAsterisk}>*</Text>}
            </Text>
            <View style={[styles.inputField, fieldErrors.password && styles.inputFieldError]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={formData.password}
                onChangeText={(text: string) => {
                  setFormData(new LoginFormData(formData.email, text));
                  clearFieldError('password');
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(prev => !prev)}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}
          </View>

          {/* Forgot Password */}
          <TouchableOpacity 
            style={[styles.forgotPassword, isResettingPassword && styles.forgotPasswordDisabled]} 
            onPress={handleForgotPassword}
            disabled={isResettingPassword}
          >
            {isResettingPassword ? (
              <View style={styles.forgotPasswordLoading}>
                <ActivityIndicator size="small" color="#4a55e1" style={styles.loadingSpinner} />
                <Text style={styles.forgotPasswordText}>Sending reset email...</Text>
              </View>
            ) : (
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            )}
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLogin}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>

          {/* OR Separator */}
          <View style={styles.orSeparator}>
            <View style={styles.separatorLine} />
            <Text style={styles.orText}>OR CONTINUE WITH</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleLogin}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Google</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: isMobile ? 16 : 0,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      justifyContent: isMobileWeb ? 'flex-start' : 'center',
      alignItems: 'center',
      minHeight: screenHeight,
    } : {}),
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  backgroundCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(74, 85, 225, 0.1)',
    top: -50,
    right: -50,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(74, 85, 225, 0.15)',
    bottom: 100,
    left: -30,
  },
  backgroundCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(74, 85, 225, 0.08)',
    top: '40%',
    right: 20,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f2f5',
  },
  backgroundGradientWeb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'linear-gradient(135deg, #f0f2f5 0%, #e8f0fe 100%)',
    } : {}),
  },
  webCardContainer: {
    width: isMobileWeb ? '100%' : '90%',
    maxWidth: isMobileWeb ? '100%' : 480,
    backgroundColor: '#fff',
    borderRadius: isMobileWeb ? 0 : 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb ? 'none' : '0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
    } : {}),
  },
  webCardContent: {
    padding: isMobileWeb ? 24 : 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: isMobile || isMobileWeb ? 20 : 0,
    marginBottom: isMobile || isMobileWeb ? 16 : 20,
  },
  logoImage: {
    width: isMobile || isMobileWeb ? 100 : 120,
    height: isMobile || isMobileWeb ? 100 : 120,
  },
  welcomeText: {
    fontSize: isMobile || isMobileWeb ? 15 : 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: isMobile || isMobileWeb ? 16 : 20,
    fontWeight: '400',
    paddingHorizontal: isMobile || isMobileWeb ? 8 : 0,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: isTablet ? 15 : 12,
    marginBottom: isTablet ? 20 : 15,
  },
  errorIcon: {
    fontSize: isTablet ? 20 : 18,
    marginRight: isTablet ? 12 : 10,
  },
  errorMessage: {
    flex: 1,
    fontSize: isTablet ? 16 : 14,
    color: '#856404',
    fontWeight: '500',
    lineHeight: isTablet ? 22 : 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f2f5',
    borderRadius: 10,
    padding: 4,
    marginBottom: isMobileWeb ? 16 : 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: isMobileWeb ? 8 : 10,
    paddingHorizontal: isMobileWeb ? 12 : 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#4a55e1',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: isMobileWeb ? 12 : 14,
    paddingVertical: isMobileWeb ? 10 : 12,
    backgroundColor: '#f9f9f9',
  },
  inputIcon: {
    fontSize: 16,
    marginRight: 10,
    color: '#aaa',
  },
  eyeButton: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  eyeText: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    flex: 1,
    fontSize: isMobile || isMobileWeb ? 16 : (isTablet ? 18 : 16),
    color: '#333',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 20,
  },
  forgotPasswordDisabled: {
    opacity: 0.6,
  },
  forgotPasswordLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    marginRight: 8,
  },
  forgotPasswordText: {
    color: '#4a55e1',
    fontSize: 13,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#6366F1',
    paddingVertical: isMobileWeb ? 12 : 14,
    borderRadius: 10,
    marginBottom: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb ? '0 2px 8px rgba(99, 102, 241, 0.25)' : '0 4px 12px rgba(99, 102, 241, 0.3), 0 2px 4px rgba(99, 102, 241, 0.2)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    }),
  },
  loginButtonText: {
    color: '#fff',
    fontSize: isMobileWeb ? 15 : 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  orSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  orText: {
    color: '#999',
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ddd',
    paddingVertical: isMobileWeb ? 10 : 12,
    borderRadius: 10,
    marginBottom: 0,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  googleIcon: {
    fontSize: isMobileWeb ? 18 : 20,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#333',
  },
  googleButtonText: {
    fontSize: isMobile || isMobileWeb ? 15 : 16,
    fontWeight: '600',
    color: '#333',
  },
  disabledButton: {
    opacity: 0.6,
  },
  requiredAsterisk: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputFieldError: {
    borderColor: '#FF3B30',
    borderWidth: 2,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
    fontWeight: '500',
  },
});











