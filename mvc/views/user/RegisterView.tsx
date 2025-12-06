import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  Image
} from 'react-native';
import { RegisterFormData } from '../../models/FormData';
import { AuthState } from '../../models/AuthState';

interface RegisterViewProps {
  authState: AuthState;
  onRegister: (formData: RegisterFormData) => Promise<{ success: boolean; error?: string }>;
  onLogin: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isMobile = screenWidth < 768;

export const RegisterView: React.FC<RegisterViewProps> = ({
  authState,
  onRegister,
  onLogin
}) => {
  const [formData, setFormData] = useState<RegisterFormData>(new RegisterFormData());
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleRegister = async (): Promise<void> => {
    const errors = formData.getErrors();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const result = await onRegister(formData);
    console.log('Register result:', result);
    if (result.success) {
      setFormData(new RegisterFormData());
      setFieldErrors({});
      Alert.alert(
        'Registration Successful',
        'Your account has been created and saved to the database.',
        [
          { text: 'OK', style: 'default', onPress: onLogin }
        ]
      );
    } else if (result.error) {
      console.log('Register error:', result.error);
      const msg = result.error.toLowerCase();
      // If email already exists, show inline error above First Name label
      if (msg.includes('already exists') || msg.includes('already in use') || msg.includes('already registered')) {
        setFieldErrors(prev => ({ ...prev, emailExists: 'Email already exists' }));
      } else {
        Alert.alert('Registration Error', result.error);
      }
    }
  };

  const isWeb = Platform.OS === 'web';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
          source={require('../../../assets/logo.png')} 
                style={styles.logoImage as any}
          resizeMode="contain"
        />
      </View>

      {/* Welcome Message */}
      <Text style={styles.welcomeText}>
        Create your account to get started.
      </Text>

      {/* Error Message for Already Registered Email */}
      {authState.error && authState.error.includes('already registered') && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorMessage}>
            This email is already registered. Please use a different email or try logging in instead.
          </Text>
        </View>
      )}

      {/* Login/Register Toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity 
          style={[styles.toggleButton]} 
          onPress={onLogin}
        >
          <Text style={styles.toggleText}>Login</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.toggleButton, styles.activeToggleButton]} 
                onPress={() => {}}
        >
          <Text style={[styles.toggleText, styles.activeToggleText]}>Register</Text>
        </TouchableOpacity>
      </View>

      {/* Name Inputs */}
      <View style={styles.inputGroup}>
        {fieldErrors.emailExists && (
          <Text style={styles.errorText}>{fieldErrors.emailExists}</Text>
        )}
        <Text style={styles.label}>
          First Name {fieldErrors.firstName && <Text style={styles.requiredAsterisk}>*</Text>}
        </Text>
        <View style={[styles.inputField, fieldErrors.firstName && styles.inputFieldError]}>
          <Text style={styles.inputIcon}>👤</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your first name"
            value={formData.firstName}
            onChangeText={(text: string) => {
              setFormData(new RegisterFormData(text, formData.middleName, formData.lastName, formData.suffix, formData.email, formData.password, formData.confirmPassword));
              clearFieldError('firstName');
            }}
            autoCapitalize="words"
          />
        </View>
        {fieldErrors.firstName && <Text style={styles.errorText}>{fieldErrors.firstName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Middle Name (optional)</Text>
        <View style={styles.inputField}>
          <Text style={styles.inputIcon}>👤</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your middle name"
            value={formData.middleName}
            onChangeText={(text: string) => {
              setFormData(new RegisterFormData(formData.firstName, text, formData.lastName, formData.suffix, formData.email, formData.password, formData.confirmPassword));
            }}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Last Name {fieldErrors.lastName && <Text style={styles.requiredAsterisk}>*</Text>}
        </Text>
        <View style={[styles.inputField, fieldErrors.lastName && styles.inputFieldError]}>
          <Text style={styles.inputIcon}>👤</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your last name"
            value={formData.lastName}
            onChangeText={(text: string) => {
              setFormData(new RegisterFormData(formData.firstName, formData.middleName, text, formData.suffix, formData.email, formData.password, formData.confirmPassword));
              clearFieldError('lastName');
            }}
            autoCapitalize="words"
          />
        </View>
        {fieldErrors.lastName && <Text style={styles.errorText}>{fieldErrors.lastName}</Text>}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Suffix (optional)</Text>
        <View style={styles.inputField}>
          <Text style={styles.inputIcon}>👤</Text>
          <TextInput
            style={styles.input}
            placeholder="Jr., Sr., III, etc."
            value={formData.suffix}
            onChangeText={(text: string) => {
              setFormData(new RegisterFormData(formData.firstName, formData.middleName, formData.lastName, text, formData.email, formData.password, formData.confirmPassword));
            }}
            autoCapitalize="characters"
          />
        </View>
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
              setFormData(new RegisterFormData(formData.firstName, formData.middleName, formData.lastName, formData.suffix, text, formData.password, formData.confirmPassword));
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
              setFormData(new RegisterFormData(formData.firstName, formData.middleName, formData.lastName, formData.suffix, formData.email, text, formData.confirmPassword));
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

      {/* Confirm Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          Confirm Password {fieldErrors.confirmPassword && <Text style={styles.requiredAsterisk}>*</Text>}
        </Text>
        <View style={[styles.inputField, fieldErrors.confirmPassword && styles.inputFieldError]}>
          <Text style={styles.inputIcon}>🔒</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChangeText={(text: string) => {
              setFormData(new RegisterFormData(formData.firstName, formData.middleName, formData.lastName, formData.suffix, formData.email, formData.password, text));
              clearFieldError('confirmPassword');
            }}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(prev => !prev)}>
            <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>
        {/* Password match indicator */}
        {formData.confirmPassword.length > 0 && !fieldErrors.confirmPassword && (
          <Text style={[
            styles.passwordMatchText,
            formData.password === formData.confirmPassword ? styles.passwordMatch : styles.passwordMismatch
          ]}>
            {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
          </Text>
        )}
        {fieldErrors.confirmPassword && <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>}
      </View>

      {/* Register Button */}
      <TouchableOpacity 
        style={[styles.registerButton, authState.isLoading && styles.disabledButton]} 
        onPress={handleRegister}
        disabled={authState.isLoading}
      >
        {authState.isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.registerButtonText}>Register</Text>
        )}
      </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {/* Mobile: Full Screen Layout */}
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../../assets/logo.png')} 
              style={styles.logoImage as any}
              resizeMode="contain"
            />
          </View>

          {/* Welcome Message */}
          <Text style={styles.welcomeText}>
            Create your account to get started.
          </Text>

          {/* Error Message for Already Registered Email */}
          {authState.error && authState.error.includes('already registered') && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorMessage}>
                This email is already registered. Please use a different email or try logging in instead.
              </Text>
            </View>
          )}

          {/* Login/Register Toggle */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleButton]} 
              onPress={onLogin}
            >
              <Text style={styles.toggleText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleButton, styles.activeToggleButton]} 
              onPress={() => {}}
            >
              <Text style={[styles.toggleText, styles.activeToggleText]}>Register</Text>
            </TouchableOpacity>
          </View>

          {/* Name Inputs */}
          <View style={styles.inputGroup}>
            {fieldErrors.emailExists && (
              <Text style={styles.errorText}>{fieldErrors.emailExists}</Text>
            )}
            <Text style={styles.label}>
              First Name {fieldErrors.firstName && <Text style={styles.requiredAsterisk}>*</Text>}
            </Text>
            <View style={[styles.inputField, fieldErrors.firstName && styles.inputFieldError]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your first name"
                value={formData.firstName}
                onChangeText={(text: string) => {
                  setFormData(new RegisterFormData(text, formData.middleName, formData.lastName, formData.suffix, formData.email, formData.password, formData.confirmPassword));
                  clearFieldError('firstName');
                }}
                autoCapitalize="words"
              />
            </View>
            {fieldErrors.firstName && <Text style={styles.errorText}>{fieldErrors.firstName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Middle Name (optional)</Text>
            <View style={styles.inputField}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your middle name"
                value={formData.middleName}
                onChangeText={(text: string) => {
                  setFormData(new RegisterFormData(formData.firstName, text, formData.lastName, formData.suffix, formData.email, formData.password, formData.confirmPassword));
                }}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Last Name {fieldErrors.lastName && <Text style={styles.requiredAsterisk}>*</Text>}
            </Text>
            <View style={[styles.inputField, fieldErrors.lastName && styles.inputFieldError]}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your last name"
                value={formData.lastName}
                onChangeText={(text: string) => {
                  setFormData(new RegisterFormData(formData.firstName, formData.middleName, text, formData.suffix, formData.email, formData.password, formData.confirmPassword));
                  clearFieldError('lastName');
                }}
                autoCapitalize="words"
              />
            </View>
            {fieldErrors.lastName && <Text style={styles.errorText}>{fieldErrors.lastName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Suffix (optional)</Text>
            <View style={styles.inputField}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Jr., Sr., III, etc."
                value={formData.suffix}
                onChangeText={(text: string) => {
                  setFormData(new RegisterFormData(formData.firstName, formData.middleName, formData.lastName, text, formData.email, formData.password, formData.confirmPassword));
                }}
                autoCapitalize="characters"
              />
            </View>
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
                  setFormData(new RegisterFormData(formData.firstName, formData.middleName, formData.lastName, formData.suffix, text, formData.password, formData.confirmPassword));
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
                  setFormData(new RegisterFormData(formData.firstName, formData.middleName, formData.lastName, formData.suffix, formData.email, text, formData.confirmPassword));
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

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Confirm Password {fieldErrors.confirmPassword && <Text style={styles.requiredAsterisk}>*</Text>}
            </Text>
            <View style={[styles.inputField, fieldErrors.confirmPassword && styles.inputFieldError]}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChangeText={(text: string) => {
                  setFormData(new RegisterFormData(formData.firstName, formData.middleName, formData.lastName, formData.suffix, formData.email, formData.password, text));
                  clearFieldError('confirmPassword');
                }}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowConfirmPassword(prev => !prev)}>
                <Text style={styles.eyeText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
            {/* Password match indicator */}
            {formData.confirmPassword.length > 0 && !fieldErrors.confirmPassword && (
              <Text style={[
                styles.passwordMatchText,
                formData.password === formData.confirmPassword ? styles.passwordMatch : styles.passwordMismatch
              ]}>
                {formData.password === formData.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
              </Text>
            )}
            {fieldErrors.confirmPassword && <Text style={styles.errorText}>{fieldErrors.confirmPassword}</Text>}
          </View>

          {/* Register Button */}
          <TouchableOpacity 
            style={[styles.registerButton, authState.isLoading && styles.disabledButton]} 
            onPress={handleRegister}
            disabled={authState.isLoading}
          >
            {authState.isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Register</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  scrollContent: {
    flexGrow: 1,
    padding: isMobile ? 16 : 0,
    paddingBottom: isMobile ? 40 : 20,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      justifyContent: 'center',
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
    width: '90%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginVertical: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
    } : {}),
  },
  webCardContent: {
    padding: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: isMobile ? 20 : 0,
    marginBottom: isMobile ? 16 : 20,
  },
  logoImage: {
    width: isMobile ? 100 : 120,
    height: isMobile ? 100 : 120,
  },
  welcomeText: {
    fontSize: isMobile ? 15 : 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: isMobile ? 16 : 20,
    fontWeight: '400',
    paddingHorizontal: isMobile ? 8 : 0,
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
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    fontSize: isMobile ? 16 : (isTablet ? 18 : 16),
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 0,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3), 0 2px 4px rgba(99, 102, 241, 0.2)',
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
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  disabledButton: {
    opacity: 0.6,
  },
  passwordMatchText: {
    fontSize: 12,
    marginTop: 5,
    marginLeft: 5,
    fontWeight: '500',
  },
  passwordMatch: {
    color: '#34C759',
  },
  passwordMismatch: {
    color: '#FF3B30',
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











