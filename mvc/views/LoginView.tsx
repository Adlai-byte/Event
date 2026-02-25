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
  Image,
} from 'react-native';
import { AuthState } from '../models/AuthState';
import { LoginFormData } from '../models/FormData';
import { getShadowStyle } from '../utils/shadowStyles';
import { useBreakpoints } from '../hooks/useBreakpoints';

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
  const { screenWidth, screenHeight, isMobile, isTablet, isDesktop } = useBreakpoints();
  const showSplitLayout = screenWidth >= 1024 && Platform.OS === 'web';
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

  const handleGoogleLogin = async () => {
    if (!onGoogleLogin) return;
    setIsSubmitting(true);
    try {
      await onGoogleLogin();
    } catch (error) {
      console.error('Google login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = authState.error || errors.submit;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: 'row',
    },
    splitRow: {
      flex: 1,
      flexDirection: 'row',
      minHeight: screenHeight,
    },
    formSection: {
      flex: 1,
      maxWidth: isTablet ? 480 : 520,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
    },
    welcomeSection: {
      flex: 1,
    },
    welcomePanel: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 48,
      ...(Platform.OS === 'web' ? {
        backgroundImage: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #6D28D9 100%)',
      } : {
        backgroundColor: '#7C3AED',
      }),
    },
    decoCircle1: {
      position: 'absolute', width: 280, height: 280, borderRadius: 140,
      backgroundColor: 'rgba(255,255,255,0.08)', top: '10%', right: '-10%',
    },
    decoCircle2: {
      position: 'absolute', width: 160, height: 160, borderRadius: 80,
      backgroundColor: 'rgba(255,255,255,0.06)', bottom: '25%', left: '-5%',
    },
    decoCircle3: {
      position: 'absolute', width: 80, height: 80, borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.1)', top: '40%', left: '15%',
    },
    decoRing: {
      position: 'absolute', width: 320, height: 320, borderRadius: 160,
      borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
      top: '50%', left: '50%', marginLeft: -160, marginTop: -160,
    },
    welcomeContent: { zIndex: 1, alignItems: 'center', maxWidth: 380 },
    welcomeTitle: {
      fontSize: isTablet ? 28 : 32, fontWeight: '800', color: '#FFFFFF',
      marginBottom: 16, textAlign: 'center', letterSpacing: -0.5,
    },
    welcomeSubtitle: {
      fontSize: isTablet ? 16 : 18, color: 'rgba(255,255,255,0.9)',
      textAlign: 'center', lineHeight: 28,
    },
    containerMobile: { flex: 1, position: 'relative', backgroundColor: 'transparent' },
    mobileGradientBg: {
      ...StyleSheet.absoluteFillObject,
      ...(Platform.OS === 'web' ? {
        backgroundImage: 'linear-gradient(180deg, #EC4899 0%, #A855F7 40%, #6D28D9 100%)',
      } as any : { backgroundColor: '#7C3AED' }),
    },
    decoCircleMobile: {
      position: 'absolute', width: 200, height: 200, borderRadius: 100,
      backgroundColor: 'rgba(255,255,255,0.06)', top: -60, right: -60,
    },
    scrollMobile: { flex: 1, backgroundColor: 'transparent' },
    scrollContentMobile: {
      flexGrow: 1, justifyContent: 'center', alignItems: 'stretch',
      paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingBottom: 32,
      paddingHorizontal: 24, minHeight: screenHeight, backgroundColor: 'transparent',
    },
    scrollContent: {
      flexGrow: 1, justifyContent: 'center', alignItems: 'center',
      paddingVertical: 40, paddingHorizontal: 32, minHeight: screenHeight,
    },
    card: {
      width: '100%', maxWidth: isMobile ? '100%' : 440,
      backgroundColor: isMobile ? 'transparent' : '#FFFFFF',
      borderRadius: isMobile ? 0 : 28,
      padding: isMobile ? 24 : 40,
      borderWidth: isMobile ? 0 : 1,
      borderColor: 'rgba(226, 232, 240, 0.8)',
      ...(isMobile ? {} : Platform.OS === 'web' ? {
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
      } : {
        shadowColor: '#0f172a', shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06, shadowRadius: 24, elevation: 8,
      }),
    },
    logoContainer: {
      alignItems: 'center', marginBottom: 24,
      ...(isMobile && { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 }),
    },
    logoImage: { width: isMobile ? 110 : 130, height: isMobile ? 36 : 44 },
    header: { marginBottom: 28, alignItems: 'center' },
    title: {
      fontSize: isMobile ? 28 : 32, fontWeight: '800',
      color: isMobile ? '#FFFFFF' : '#0F172A', marginBottom: 8, letterSpacing: -0.6,
    },
    subtitle: {
      fontSize: isMobile ? 15 : 16, color: isMobile ? 'rgba(255,255,255,0.9)' : '#475569',
      textAlign: 'center', lineHeight: 24, paddingHorizontal: 8,
    },
    errorContainer: {
      backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
      borderRadius: 14, padding: 14, marginBottom: 20,
    },
    errorText: { color: '#B91C1C', fontSize: isMobile ? 14 : 13, fontWeight: '600', textAlign: 'center' },
    inputContainer: { marginBottom: 20 },
    label: {
      fontSize: isMobile ? 15 : 14, fontWeight: '600',
      color: isMobile ? '#FFFFFF' : '#1E293B', marginBottom: 8,
    },
    input: {
      backgroundColor: isMobile ? 'rgba(255,255,255,0.95)' : '#F8FAFC',
      borderWidth: 2, borderColor: isMobile ? 'rgba(255,255,255,0.6)' : '#E2E8F0',
      borderRadius: 14, paddingHorizontal: 18,
      paddingVertical: isMobile ? 16 : 14, fontSize: isMobile ? 17 : 16, color: '#0F172A',
      ...(isMobile && { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 }),
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' as any, ...(isMobile && { boxShadow: 'none' as any }) } : {}),
    },
    inputError: { borderColor: '#EF4444', backgroundColor: '#FFFBFB' },
    passwordContainer: { position: 'relative' },
    passwordInput: {
      backgroundColor: isMobile ? 'rgba(255,255,255,0.95)' : '#F8FAFC',
      borderWidth: 2, borderColor: isMobile ? 'rgba(255,255,255,0.6)' : '#E2E8F0',
      borderRadius: 14, paddingHorizontal: 18, paddingRight: 52,
      paddingVertical: isMobile ? 16 : 14, fontSize: isMobile ? 17 : 16, color: '#0F172A',
      ...(isMobile && { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 }),
      ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' as any, ...(isMobile && { boxShadow: 'none' as any }) } : {}),
    },
    eyeButton: { position: 'absolute', right: 14, top: '50%', transform: [{ translateY: -14 }], padding: 8 },
    eyeButtonText: { fontSize: 22 },
    fieldError: { color: '#B91C1C', fontSize: 13, marginTop: 6, marginLeft: 4, fontWeight: '500' },
    forgotPasswordLink: { alignSelf: 'flex-end', marginBottom: 22, marginTop: -2 },
    forgotPasswordLinkText: { color: isMobile ? '#FFFFFF' : '#A855F7', fontSize: isMobile ? 15 : 14, fontWeight: '600' },
    primaryButton: {
      backgroundColor: isMobile ? '#FFFFFF' : '#7C3AED',
      borderRadius: 14, paddingVertical: isMobile ? 18 : 16,
      alignItems: 'center', justifyContent: 'center', marginBottom: 20,
      ...(isMobile && { shadowColor: 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0, shadowRadius: 0, elevation: 0 }),
      ...(Platform.OS === 'web' && !isMobile ? { cursor: 'pointer', transition: 'all 0.2s ease', backgroundImage: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)', backgroundColor: 'transparent' } : {}),
      ...(Platform.OS === 'web' && isMobile ? { boxShadow: 'none' as any } : {}),
    },
    primaryButtonDisabled: { opacity: 0.6, ...(Platform.OS === 'web' ? { cursor: 'not-allowed' as any } : {}) },
    primaryButtonText: { color: isMobile ? '#7C3AED' : '#FFFFFF', fontSize: isMobile ? 17 : 16, fontWeight: '700', letterSpacing: 0.3 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
    dividerText: { marginHorizontal: 16, fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
    googleButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
      paddingVertical: Platform.OS === 'web' ? 16 : 18, marginBottom: 24,
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
    },
    googleButtonIcon: { fontSize: 20, marginRight: 12 },
    googleButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
    registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
    registerText: { fontSize: isMobile ? 15 : 14, color: isMobile ? 'rgba(255,255,255,0.9)' : '#475569' },
    registerLink: { fontSize: isMobile ? 15 : 14, color: isMobile ? '#FFFFFF' : '#A855F7', fontWeight: '700' },
    forgotPasswordContainer: { marginTop: 8 },
    forgotPasswordTitle: { fontSize: isMobile ? 22 : 24, fontWeight: '700', color: '#0F172A', marginBottom: 8, textAlign: 'center' },
    forgotPasswordSubtitle: { fontSize: isMobile ? 15 : 14, color: '#475569', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
    forgotPasswordActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    forgotPasswordButton: { flex: 1 },
    secondaryButton: {
      backgroundColor: '#F1F5F9', borderRadius: 14, paddingVertical: isMobile ? 18 : 16,
      alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0',
      ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
    },
    secondaryButtonText: { color: '#1E293B', fontSize: isMobile ? 17 : 16, fontWeight: '600' },
  }), [screenWidth, screenHeight, isMobile, isTablet, isDesktop]);

  const formCardContent = (
    <View style={styles.card}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue to your account</Text>
      </View>

      {displayError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{displayError}</Text>
        </View>
      )}

      {errors.forgotPassword && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errors.forgotPassword}</Text>
        </View>
      )}

      {showForgotPassword ? (
        <View style={styles.forgotPasswordContainer}>
          <Text style={styles.forgotPasswordTitle}>Reset Password</Text>
          <Text style={styles.forgotPasswordSubtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, errors.forgotPassword && styles.inputError]}
              placeholder="Enter your email"
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
          <View style={styles.forgotPasswordActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.forgotPasswordButton]}
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
              style={[styles.primaryButton, styles.forgotPasswordButton]}
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
        <>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="Enter your email"
              placeholderTextColor="#94A3B8"
              value={formData.email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting && !authState.isLoading}
              accessibilityLabel="Email address"
            />
            {errors.email && (
              <Text style={styles.fieldError}>{errors.email}</Text>
            )}
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
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
                <Text style={styles.eyeButtonText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text style={styles.fieldError}>{errors.password}</Text>
            )}
          </View>
          {onForgotPassword && (
            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => setShowForgotPassword(true)}
              accessibilityRole="button"
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgotPasswordLinkText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.primaryButton, (isSubmitting || authState.isLoading) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || authState.isLoading}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            {isSubmitting || authState.isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onRegister} disabled={isSubmitting || authState.isLoading} accessibilityRole="button" accessibilityLabel="Go to sign up">
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const WelcomePanel = () => (
    <View style={styles.welcomePanel}>
      {/* Decorative shapes */}
      <View style={styles.decoCircle1} />
      <View style={styles.decoCircle2} />
      <View style={styles.decoCircle3} />
      <View style={styles.decoRing} />
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeTitle}>Welcome to E-VENT</Text>
        <Text style={styles.welcomeSubtitle}>Sign in to access your account and discover events and services near you.</Text>
      </View>
    </View>
  );

  if (!showSplitLayout) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.containerMobile}
      >
        <View style={styles.mobileGradientBg} pointerEvents="none" />
        <View style={styles.decoCircleMobile} pointerEvents="none" />
        <ScrollView
          style={styles.scrollMobile}
          contentContainerStyle={styles.scrollContentMobile}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {formCardContent}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.splitRow}>
        <View style={styles.formSection}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {formCardContent}
          </ScrollView>
        </View>
        <View style={styles.welcomeSection}>
          <WelcomePanel />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
