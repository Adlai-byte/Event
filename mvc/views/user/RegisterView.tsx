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
  Alert
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
          onPress={() => {}} // Already in register mode
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
  registerButton: {
    backgroundColor: '#4a55e1',
    paddingVertical: isTablet ? 18 : 15,
    borderRadius: 8,
    marginBottom: isTablet ? 30 : 25,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: isTablet ? 20 : 18,
    fontWeight: '600',
    textAlign: 'center',
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











