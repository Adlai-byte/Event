import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions
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

  return (
    <View style={styles.container}>
      {/* Background Design */}
      <View style={styles.backgroundContainer}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />
        <View style={styles.backgroundGradient} />
      </View>
      
      {/* Logo */}
      <View style={styles.logo}>
        <Text style={styles.calendarIcon}>📅</Text>
        <Text style={styles.logoText}>
          <Text style={styles.ePart}>E</Text><Text style={styles.ventPart}>-vent</Text>
        </Text>
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
          onPress={() => {}} // Already in login mode
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    position: 'relative',
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
    backgroundColor: 'linear-gradient(135deg, #f0f2f5 0%, #e8f0fe 100%)',
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isTablet ? 35 : 25,
  },
  calendarIcon: {
    fontSize: isTablet ? 48 : 36,
    marginRight: 10,
  },
  logoText: {
    fontSize: isTablet ? 44 : 36,
    fontWeight: '700',
    color: '#333',
  },
  ePart: {
    fontWeight: '400',
  },
  ventPart: {
    fontWeight: '700',
  },
  welcomeText: {
    fontSize: isTablet ? 22 : 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: isTablet ? 30 : 20,
    fontWeight: '400',
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
    borderRadius: 8,
    padding: 4,
    marginBottom: isTablet ? 30 : 25,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#4a55e1',
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
  },
  inputGroup: {
    marginBottom: isTablet ? 25 : 20,
  },
  label: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: isTablet ? 10 : 8,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: isTablet ? 20 : 15,
    paddingVertical: isTablet ? 16 : 10,
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
    fontSize: isTablet ? 18 : 16,
    color: '#333',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -10,
    marginBottom: 25,
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
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#4a55e1',
    paddingVertical: isTablet ? 18 : 15,
    borderRadius: 8,
    marginBottom: isTablet ? 30 : 25,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  orSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  orText: {
    color: '#999',
    marginHorizontal: 15,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2f5',
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 30,
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 10,
    color: '#333',
  },
  googleButtonText: {
    fontSize: 16,
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











