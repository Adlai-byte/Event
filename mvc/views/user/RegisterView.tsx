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
import { AuthState } from '../../models/AuthState';
import { RegisterFormData } from '../../models/FormData';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { Feather } from '@expo/vector-icons';
import { colors, semantic } from '../../theme';

interface RegisterViewProps {
  authState: AuthState;
  onRegister: (formData: RegisterFormData) => Promise<{ success: boolean; error?: string }>;
  onLogin: () => void;
  onGoogleLogin?: () => Promise<boolean>;
}

export const RegisterView: React.FC<RegisterViewProps> = ({
  authState,
  onRegister,
  onLogin,
  onGoogleLogin,
}) => {
  const { screenWidth, screenHeight, isMobile, isTablet, isDesktop } = useBreakpoints();
  const stackNameFields = screenWidth < 400;
  const [formData, setFormData] = useState(new RegisterFormData());
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = (field: keyof RegisterFormData, value: string) => {
    const newFormData = new RegisterFormData(
      field === 'firstName' ? value : formData.firstName,
      field === 'middleName' ? value : formData.middleName,
      field === 'lastName' ? value : formData.lastName,
      field === 'suffix' ? value : formData.suffix,
      field === 'email' ? value : formData.email,
      field === 'password' ? value : formData.password,
      field === 'confirmPassword' ? value : formData.confirmPassword,
    );
    setFormData(newFormData);

    // Clear error for this field
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
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
      const result = await onRegister(formData);
      if (!result.success && result.error) {
        setErrors({ submit: result.error });
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const _handleGoogleLogin = async () => {
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: semantic.background },
        containerMobile: { flex: 1, position: 'relative', backgroundColor: 'transparent' },
        mobileGradientBg: {
          ...StyleSheet.absoluteFillObject,
          ...(Platform.OS === 'web'
            ? ({
                backgroundImage: 'linear-gradient(180deg, #2563EB 0%, #1D4ED8 40%, #1E40AF 100%)',
              } as any)
            : { backgroundColor: '#1D4ED8' }),
        },
        decoCircleMobile: {
          position: 'absolute',
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(255,255,255,0.06)',
          top: -60,
          right: -60,
        },
        scrollMobile: { flex: 1, backgroundColor: 'transparent' },
        scrollContentMobile: {
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'stretch',
          paddingTop: Platform.OS === 'ios' ? 56 : 48,
          paddingBottom: 32,
          paddingHorizontal: screenWidth <= 380 ? 12 : 24,
          minHeight: screenHeight,
          backgroundColor: 'transparent',
        },
        scrollContent: {
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: Platform.OS === 'web' ? 48 : 24,
          paddingHorizontal: isMobile ? 20 : 32,
          minHeight: Platform.OS === 'web' ? screenHeight : undefined,
        },
        card: {
          width: '100%',
          maxWidth: isMobile ? '100%' : isTablet ? 480 : 440,
          backgroundColor: isMobile ? 'transparent' : semantic.surface,
          borderRadius: isMobile ? 0 : 28,
          padding: isMobile ? (screenWidth <= 380 ? 16 : 24) : 40,
          borderWidth: isMobile ? 0 : 1,
          borderColor: 'rgba(226, 232, 240, 0.8)',
          ...(isMobile
            ? {}
            : Platform.OS === 'web'
              ? {
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
                }
              : {
                  shadowColor: colors.neutral[900],
                  shadowOffset: { width: 0, height: 12 },
                  shadowOpacity: 0.06,
                  shadowRadius: 24,
                  elevation: 8,
                }),
        },
        logoContainer: {
          alignItems: 'center',
          marginBottom: 24,
          ...(isMobile && {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
          }),
        },
        logoImage: { width: isMobile ? 110 : 130, height: isMobile ? 36 : 44 },
        header: { marginBottom: 28, alignItems: 'center' },
        title: {
          fontSize: isMobile ? 28 : 32,
          fontWeight: '800',
          color: isMobile ? semantic.surface : colors.neutral[900],
          marginBottom: 8,
          letterSpacing: -0.6,
        },
        subtitle: {
          fontSize: isMobile ? 15 : 16,
          color: isMobile ? 'rgba(255,255,255,0.9)' : colors.neutral[600],
          textAlign: 'center',
          lineHeight: 24,
          paddingHorizontal: 8,
        },
        errorContainer: {
          backgroundColor: '#FEF2F2',
          borderWidth: 1,
          borderColor: '#FECACA',
          borderRadius: 14,
          padding: 14,
          marginBottom: 20,
        },
        errorText: {
          color: colors.error[700],
          fontSize: isMobile ? 14 : 13,
          fontWeight: '600',
          textAlign: 'center',
        },
        row: {
          flexDirection: stackNameFields ? 'column' : 'row',
          width: '100%',
        },
        inputContainer: { marginBottom: 20, flex: 1 },
        halfWidth: { flex: 1 },
        label: {
          fontSize: isMobile ? 15 : 14,
          fontWeight: '600',
          color: isMobile ? semantic.surface : semantic.textPrimary,
          marginBottom: 8,
        },
        input: {
          backgroundColor: isMobile ? 'rgba(255,255,255,0.95)' : semantic.background,
          borderWidth: 2,
          borderColor: isMobile ? 'rgba(255,255,255,0.6)' : semantic.border,
          borderRadius: 14,
          paddingHorizontal: 18,
          paddingVertical: isMobile ? 16 : 14,
          fontSize: isMobile ? 17 : 16,
          color: colors.neutral[900],
          ...(isMobile && {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
          }),
          ...(Platform.OS === 'web'
            ? {
                outlineStyle: 'none' as any,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease' as any,
                ...(isMobile && { boxShadow: 'none' as any }),
              }
            : {}),
        },
        inputError: { borderColor: semantic.error, backgroundColor: '#FFFBFB' },
        passwordContainer: { position: 'relative' },
        passwordInput: {
          backgroundColor: isMobile ? 'rgba(255,255,255,0.95)' : semantic.background,
          borderWidth: 2,
          borderColor: isMobile ? 'rgba(255,255,255,0.6)' : semantic.border,
          borderRadius: 14,
          paddingHorizontal: 18,
          paddingRight: 52,
          paddingVertical: isMobile ? 16 : 14,
          fontSize: isMobile ? 17 : 16,
          color: colors.neutral[900],
          ...(isMobile && {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
          }),
          ...(Platform.OS === 'web'
            ? {
                outlineStyle: 'none' as any,
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease' as any,
                ...(isMobile && { boxShadow: 'none' as any }),
              }
            : {}),
        },
        eyeButton: {
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: [{ translateY: -14 }],
          padding: 8,
        },
        eyeButtonText: { fontSize: 22 },
        fieldError: {
          color: colors.error[700],
          fontSize: 13,
          marginTop: 6,
          marginLeft: 4,
          fontWeight: '500',
        },
        primaryButton: {
          backgroundColor: semantic.primary,
          borderRadius: 14,
          paddingVertical: isMobile ? 18 : 16,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
        },
        primaryButtonDisabled: {
          opacity: 0.6,
          ...(Platform.OS === 'web' ? { cursor: 'not-allowed' as any } : {}),
        },
        primaryButtonText: {
          color: semantic.surface,
          fontSize: isMobile ? 17 : 16,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
        divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
        dividerLine: { flex: 1, height: 1, backgroundColor: semantic.border },
        dividerText: { marginHorizontal: 16, fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
        googleButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: semantic.surface,
          borderWidth: 1,
          borderColor: semantic.border,
          borderRadius: 12,
          paddingVertical: Platform.OS === 'web' ? 16 : 18,
          marginBottom: 24,
          ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } : {}),
        },
        googleButtonIcon: { fontSize: 20, marginRight: 12 },
        googleButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
        loginContainer: {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 4,
          flexWrap: 'wrap',
        },
        loginText: {
          fontSize: isMobile ? 15 : 14,
          color: isMobile ? 'rgba(255,255,255,0.9)' : colors.neutral[600],
        },
        loginLink: {
          fontSize: isMobile ? 15 : 14,
          color: isMobile ? colors.primary[100] : semantic.primary,
          fontWeight: '700',
        },
      }),
    [screenWidth, screenHeight, isMobile, isTablet, isDesktop, stackNameFields],
  );

  if (isMobile) {
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
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to get started with your account</Text>
            </View>

            {/* Error Message */}
            {displayError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{displayError}</Text>
              </View>
            )}

            {/* Name Fields Row */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth, { marginRight: 8 }]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  placeholder="John"
                  placeholderTextColor={semantic.textMuted}
                  value={formData.firstName}
                  onChangeText={(text) => handleFieldChange('firstName', text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting && !authState.isLoading}
                  accessibilityLabel="First name"
                />
                {errors.firstName && <Text style={styles.fieldError}>{errors.firstName}</Text>}
              </View>

              <View style={[styles.inputContainer, styles.halfWidth, { marginLeft: 8 }]}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  placeholder="Doe"
                  placeholderTextColor={semantic.textMuted}
                  value={formData.lastName}
                  onChangeText={(text) => handleFieldChange('lastName', text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting && !authState.isLoading}
                  accessibilityLabel="Last name"
                />
                {errors.lastName && <Text style={styles.fieldError}>{errors.lastName}</Text>}
              </View>
            </View>

            {/* Middle Name and Suffix Row */}
            <View style={styles.row}>
              <View style={[styles.inputContainer, styles.halfWidth, { marginRight: 8 }]}>
                <Text style={styles.label}>Middle Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Middle (optional)"
                  placeholderTextColor={semantic.textMuted}
                  value={formData.middleName}
                  onChangeText={(text) => handleFieldChange('middleName', text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting && !authState.isLoading}
                  accessibilityLabel="Middle name"
                />
              </View>

              <View style={[styles.inputContainer, styles.halfWidth, { marginLeft: 8 }]}>
                <Text style={styles.label}>Suffix</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Jr., Sr., etc. (optional)"
                  placeholderTextColor={semantic.textMuted}
                  value={formData.suffix}
                  onChangeText={(text) => handleFieldChange('suffix', text)}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!isSubmitting && !authState.isLoading}
                  accessibilityLabel="Name suffix"
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="john.doe@example.com"
                placeholderTextColor={semantic.textMuted}
                value={formData.email}
                onChangeText={(text) => handleFieldChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting && !authState.isLoading}
                accessibilityLabel="Email address"
              />
              {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={semantic.textMuted}
                  value={formData.password}
                  onChangeText={(text) => handleFieldChange('password', text)}
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
                  <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={semantic.textMuted}
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleFieldChange('confirmPassword', text)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isSubmitting && !authState.isLoading}
                  accessibilityLabel="Confirm password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                  }
                >
                  <Feather
                    name={showConfirmPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (isSubmitting || authState.isLoading) && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || authState.isLoading}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {isSubmitting || authState.isLoading ? (
                <ActivityIndicator color={semantic.surface} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={onLogin}
                disabled={isSubmitting || authState.isLoading}
                accessibilityRole="button"
                accessibilityLabel="Go to sign in"
              >
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started with your account</Text>
          </View>
          {displayError && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth, { marginRight: 8 }]}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                placeholder="John"
                placeholderTextColor={semantic.textMuted}
                value={formData.firstName}
                onChangeText={(text) => handleFieldChange('firstName', text)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting && !authState.isLoading}
                accessibilityLabel="First name"
              />
              {errors.firstName && <Text style={styles.fieldError}>{errors.firstName}</Text>}
            </View>
            <View style={[styles.inputContainer, styles.halfWidth, { marginLeft: 8 }]}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                placeholder="Doe"
                placeholderTextColor={semantic.textMuted}
                value={formData.lastName}
                onChangeText={(text) => handleFieldChange('lastName', text)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting && !authState.isLoading}
                accessibilityLabel="Last name"
              />
              {errors.lastName && <Text style={styles.fieldError}>{errors.lastName}</Text>}
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth, { marginRight: 8 }]}>
              <Text style={styles.label}>Middle Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Middle (optional)"
                placeholderTextColor={semantic.textMuted}
                value={formData.middleName}
                onChangeText={(text) => handleFieldChange('middleName', text)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting && !authState.isLoading}
                accessibilityLabel="Middle name"
              />
            </View>
            <View style={[styles.inputContainer, styles.halfWidth, { marginLeft: 8 }]}>
              <Text style={styles.label}>Suffix</Text>
              <TextInput
                style={styles.input}
                placeholder="Jr., Sr., etc. (optional)"
                placeholderTextColor={semantic.textMuted}
                value={formData.suffix}
                onChangeText={(text) => handleFieldChange('suffix', text)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting && !authState.isLoading}
                accessibilityLabel="Name suffix"
              />
            </View>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="john.doe@example.com"
              placeholderTextColor={semantic.textMuted}
              value={formData.email}
              onChangeText={(text) => handleFieldChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isSubmitting && !authState.isLoading}
              accessibilityLabel="Email address"
            />
            {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, errors.password && styles.inputError]}
                placeholder="At least 6 characters"
                placeholderTextColor={semantic.textMuted}
                value={formData.password}
                onChangeText={(text) => handleFieldChange('password', text)}
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
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder="Re-enter your password"
                placeholderTextColor={semantic.textMuted}
                value={formData.confirmPassword}
                onChangeText={(text) => handleFieldChange('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSubmitting && !authState.isLoading}
                accessibilityLabel="Confirm password"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                }
              >
                <Feather name={showConfirmPassword ? 'eye' : 'eye-off'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (isSubmitting || authState.isLoading) && styles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || authState.isLoading}
            accessibilityRole="button"
            accessibilityLabel="Create account"
          >
            {isSubmitting || authState.isLoading ? (
              <ActivityIndicator color={isMobile ? '#1D4ED8' : semantic.surface} size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={onLogin}
              disabled={isSubmitting || authState.isLoading}
              accessibilityRole="button"
              accessibilityLabel="Go to sign in"
            >
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
