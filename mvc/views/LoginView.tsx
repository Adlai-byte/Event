import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { AuthState } from '../models/AuthState';
import { LoginFormData } from '../models/FormData';
import { useBreakpoints } from '../hooks/useBreakpoints';
import { Feather } from '@expo/vector-icons';

interface LoginViewProps {
  authState: AuthState;
  onLogin: (formData: LoginFormData) => Promise<{ success: boolean; error?: string }>;
  onRegister: () => void;
  onForgotPassword?: (email: string) => Promise<boolean>;
  onGoogleLogin?: () => Promise<boolean>;
}

export const LoginView: React.FC<LoginViewProps> = ({
  authState,
  onLogin,
  onRegister,
  onForgotPassword,
  onGoogleLogin,
}) => {
  const { screenWidth, screenHeight, isMobile } = useBreakpoints();
  const [formData, setFormData] = useState(new LoginFormData());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);

  const handleEmailChange = (text: string) => {
    setFormData(new LoginFormData(text, formData.password));
    if (errors.email) {
      const newErrors = { ...errors };
      delete newErrors.email;
      setErrors(newErrors);
    }
  };

  const handlePasswordChange = (text: string) => {
    setFormData(new LoginFormData(formData.email, text));
    if (errors.password) {
      const newErrors = { ...errors };
      delete newErrors.password;
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const formErrors = formData.getErrors();
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await onLogin(formData);
      if (!result.success && result.error) {
        setErrors({ submit: result.error });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    if (!forgotPasswordEmail.trim()) {
      setErrors({ forgotPassword: 'Please enter your email address' });
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(forgotPasswordEmail.trim())) {
      setErrors({ forgotPassword: 'Please enter a valid email address' });
      return;
    }

    if (!onForgotPassword) return;

    setForgotPasswordLoading(true);
    try {
      const success = await onForgotPassword(forgotPasswordEmail.trim());
      if (success) {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
        setErrors({});
      } else {
        setErrors({ forgotPassword: 'Failed to send password reset email. Please try again.' });
      }
    } catch (error: any) {
      setErrors({ forgotPassword: error.message || 'An error occurred. Please try again.' });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const _handleGoogleLogin = async () => {
    if (!onGoogleLogin) return;
    setIsSubmitting(true);
    try {
      await onGoogleLogin();
    } catch (error) {
      if (__DEV__) console.error('Google login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = authState.error || errors.submit;

  const styles = useMemo(() => {
    const cardMaxWidth = isMobile ? '100%' : 420;
    const px = isMobile ? (screenWidth < 360 ? 20 : 24) : 40;

    return StyleSheet.create({
      wrapper: {
        flex: 1,
        backgroundColor: 'transparent',
      },
      scroll: {
        flex: 1,
        backgroundColor: 'transparent',
      },
      scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: isMobile ? 48 : 64,
        paddingHorizontal: isMobile ? 16 : 24,
        minHeight: screenHeight,
        backgroundColor: 'transparent',
      },
      card: {
        width: '100%',
        maxWidth: cardMaxWidth,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: px,
        borderWidth: 1,
        borderColor: '#E2E8F0',
      },
      logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
      },
      logoDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2563EB',
        marginRight: 10,
      },
      logoText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        letterSpacing: -0.3,
      },
      header: {
        marginBottom: 28,
      },
      title: {
        fontSize: isMobile ? 24 : 28,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
        letterSpacing: -0.5,
      },
      subtitle: {
        fontSize: 15,
        color: '#64748B',
        lineHeight: 22,
      },
      errorContainer: {
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      },
      errorText: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
      },
      inputGroup: {
        marginBottom: 20,
      },
      label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#334155',
        marginBottom: 6,
      },
      input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0F172A',
        ...(Platform.OS === 'web'
          ? {
              outlineStyle: 'none' as any,
              transition: 'border-color 0.15s ease' as any,
            }
          : {}),
      },
      inputFocused: {
        borderColor: '#2563EB',
      },
      inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FFFBFB',
      },
      passwordWrapper: {
        position: 'relative',
      },
      passwordInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingRight: 48,
        paddingVertical: 12,
        fontSize: 15,
        color: '#0F172A',
        ...(Platform.OS === 'web'
          ? {
              outlineStyle: 'none' as any,
              transition: 'border-color 0.15s ease' as any,
            }
          : {}),
      },
      eyeButton: {
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: [{ translateY: -12 }],
        padding: 4,
      },
      fieldError: {
        color: '#EF4444',
        fontSize: 13,
        marginTop: 4,
        fontWeight: '500',
      },
      forgotRow: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        marginTop: -4,
      },
      forgotText: {
        color: '#2563EB',
        fontSize: 13,
        fontWeight: '600',
      },
      primaryButton: {
        backgroundColor: '#0F172A',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
        ...(Platform.OS === 'web'
          ? {
              cursor: 'pointer',
              transition: 'background-color 0.15s ease' as any,
            }
          : {}),
      },
      primaryButtonDisabled: {
        opacity: 0.5,
        ...(Platform.OS === 'web' ? { cursor: 'not-allowed' as any } : {}),
      },
      primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
      },
      divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 20,
      },
      dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
      },
      dividerText: {
        marginHorizontal: 12,
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
      },
      googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingVertical: 12,
        gap: 10,
        marginBottom: 24,
        ...(Platform.OS === 'web'
          ? {
              cursor: 'pointer',
              transition: 'border-color 0.15s ease, background-color 0.15s ease' as any,
            }
          : {}),
      },
      googleButtonText: {
        color: '#334155',
        fontSize: 14,
        fontWeight: '600',
      },
      footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        flexWrap: 'wrap',
      },
      footerText: {
        fontSize: 14,
        color: '#64748B',
      },
      footerLink: {
        fontSize: 14,
        color: '#2563EB',
        fontWeight: '600',
      },
      // Forgot password form
      fpTitle: {
        fontSize: isMobile ? 22 : 24,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 8,
      },
      fpSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 24,
        lineHeight: 22,
      },
      fpActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
      },
      fpActionBtn: {
        flex: 1,
      },
      secondaryButton: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        ...(Platform.OS === 'web'
          ? { cursor: 'pointer', transition: 'background-color 0.15s ease' as any }
          : {}),
      },
      secondaryButtonText: {
        color: '#334155',
        fontSize: 15,
        fontWeight: '600',
      },
    });
  }, [screenWidth, screenHeight, isMobile]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.wrapper}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoDot} />
            <Text style={styles.logoText}>E-VENT</Text>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to your account to continue</Text>
          </View>

          {/* Errors */}
          {displayError && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {errors.forgotPassword && !displayError && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{errors.forgotPassword}</Text>
            </View>
          )}

          {showForgotPassword ? (
            /* ── Forgot Password Form ── */
            <View>
              <Text style={styles.fpTitle}>Reset Password</Text>
              <Text style={styles.fpSubtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={[styles.input, errors.forgotPassword && styles.inputError]}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  value={forgotPasswordEmail}
                  onChangeText={(text) => {
                    setForgotPasswordEmail(text);
                    if (errors.forgotPassword) {
                      setErrors({ ...errors, forgotPassword: '' });
                    }
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!forgotPasswordLoading}
                  accessibilityLabel="Email address for password reset"
                />
              </View>
              <View style={styles.fpActions}>
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.fpActionBtn]}
                  onPress={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setErrors({});
                  }}
                  disabled={forgotPasswordLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel password reset"
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.fpActionBtn, { marginBottom: 0 }]}
                  onPress={handleForgotPasswordSubmit}
                  disabled={forgotPasswordLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Send password reset link"
                >
                  {forgotPasswordLoading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ── Login Form ── */
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  placeholder="you@example.com"
                  placeholderTextColor="#94A3B8"
                  value={formData.email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting && !authState.isLoading}
                  accessibilityLabel="Email address"
                />
                {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[styles.passwordInput, errors.password && styles.inputError]}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    value={formData.password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isSubmitting && !authState.isLoading}
                    accessibilityLabel="Password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Feather
                      name={showPassword ? 'eye' : 'eye-off'}
                      size={18}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
              </View>

              {onForgotPassword && (
                <TouchableOpacity
                  style={styles.forgotRow}
                  onPress={() => setShowForgotPassword(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Forgot password"
                >
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (isSubmitting || authState.isLoading) && styles.primaryButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || authState.isLoading}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                {isSubmitting || authState.isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Continue</Text>
                    <Feather name="arrow-right" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={onRegister}
                  disabled={isSubmitting || authState.isLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Go to sign up"
                >
                  <Text style={styles.footerLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
