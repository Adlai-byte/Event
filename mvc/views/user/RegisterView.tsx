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
import { AuthState } from '../../models/AuthState';
import { RegisterFormData } from '../../models/FormData';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { Feather } from '@expo/vector-icons';

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
  const { screenWidth, screenHeight, isMobile } = useBreakpoints();
  const stackNameFields = screenWidth < 420;
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
      if (__DEV__) console.error('Google login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = authState.error || errors.submit;

  const styles = useMemo(() => {
    const cardMaxWidth = isMobile ? '100%' : 480;
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
      row: {
        flexDirection: stackNameFields ? 'column' : 'row',
        gap: stackNameFields ? 0 : 12,
      },
      inputGroup: {
        marginBottom: 20,
        flex: 1,
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
    });
  }, [screenWidth, screenHeight, isMobile, stackNameFields]);

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
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started with your account</Text>
          </View>

          {/* Error */}
          {displayError && (
            <View style={styles.errorContainer}>
              <Feather name="alert-circle" size={16} color="#DC2626" />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {/* Name Fields */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={[styles.input, errors.firstName && styles.inputError]}
                placeholder="John"
                placeholderTextColor="#94A3B8"
                value={formData.firstName}
                onChangeText={(text) => handleFieldChange('firstName', text)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting && !authState.isLoading}
                accessibilityLabel="First name"
              />
              {errors.firstName && <Text style={styles.fieldError}>{errors.firstName}</Text>}
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={[styles.input, errors.lastName && styles.inputError]}
                placeholder="Doe"
                placeholderTextColor="#94A3B8"
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

          {/* Middle Name and Suffix */}
          <View style={styles.row}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Middle Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Middle (optional)"
                placeholderTextColor="#94A3B8"
                value={formData.middleName}
                onChangeText={(text) => handleFieldChange('middleName', text)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting && !authState.isLoading}
                accessibilityLabel="Middle name"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Suffix</Text>
              <TextInput
                style={styles.input}
                placeholder="Jr., Sr., etc. (optional)"
                placeholderTextColor="#94A3B8"
                value={formData.suffix}
                onChangeText={(text) => handleFieldChange('suffix', text)}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isSubmitting && !authState.isLoading}
                accessibilityLabel="Name suffix"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="john.doe@example.com"
              placeholderTextColor="#94A3B8"
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

          {/* Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.passwordInput, errors.password && styles.inputError]}
                placeholder="At least 6 characters"
                placeholderTextColor="#94A3B8"
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
                <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.passwordInput, errors.confirmPassword && styles.inputError]}
                placeholder="Re-enter your password"
                placeholderTextColor="#94A3B8"
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
                  size={18}
                  color="#94A3B8"
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword && (
              <Text style={styles.fieldError}>{errors.confirmPassword}</Text>
            )}
          </View>

          {/* Submit */}
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
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Create Account</Text>
                <Feather name="arrow-right" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity
              onPress={onLogin}
              disabled={isSubmitting || authState.isLoading}
              accessibilityRole="button"
              accessibilityLabel="Go to sign in"
            >
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
