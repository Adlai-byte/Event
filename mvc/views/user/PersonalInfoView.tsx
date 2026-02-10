import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

interface PersonalInfoViewProps {
  user: User;
  onNavigate: (route: string) => void;
  onLogout: () => void;
  onSave?: (updatedUser: Partial<User>) => Promise<boolean | { success: boolean; error?: string; message?: string }>;
  onSendVerificationEmail?: () => Promise<{ success: boolean; error?: string }>;
  onCheckVerification?: () => Promise<{ success: boolean; verified: boolean; error?: string }>;
}

export const PersonalInfoView: React.FC<PersonalInfoViewProps> = ({
  user,
  onNavigate,
  onLogout,
  onSave,
  onSendVerificationEmail,
  onCheckVerification
}) => {
  const [sendingVerification, setSendingVerification] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(user.profilePicture || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showErrorTooltip, setShowErrorTooltip] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSuccessTooltip, setShowSuccessTooltip] = useState(false);

  // Update profile picture when user prop changes (after save)
  React.useEffect(() => {
    // Always sync with user prop, even if it's null/undefined
    setProfilePicture(user.profilePicture || null);
  }, [user.profilePicture]);
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    middleName: user.middleName || '',
    lastName: user.lastName || '',
    suffix: user.suffix || '',
    email: user.email || '',
    phone: user.phone || '',
    dateOfBirth: user.dateOfBirth || '',
    address: user.address || '',
    city: user.city || '',
    state: user.state || '',
    zipCode: user.zipCode || ''
  });

  const handleSave = async (): Promise<void> => {
    setErrorMessage(null);
    setShowErrorTooltip(false);
    setSuccessMessage(null);
    setShowSuccessTooltip(false);
    
    if (onSave) {
      const updatedData = {
        ...formData,
        profilePicture: profilePicture || undefined
      };
      const result = await onSave(updatedData);
      
      // Handle both boolean and object return types
      if (result === null || result === undefined) {
        setErrorMessage('Failed to save. Please try again.');
        setShowErrorTooltip(true);
        return;
      }
      
      type ResultType = boolean | { success: boolean; error?: string; message?: string };
      const typedResult = result as ResultType;
      
      const success = typeof typedResult === 'boolean' ? typedResult : (typedResult && typeof typedResult === 'object' && 'success' in typedResult ? typedResult.success : false);
      const error = typeof typedResult === 'object' && typedResult !== null && 'error' in typedResult ? typedResult.error : null;
      const message = typeof typedResult === 'object' && typedResult !== null && 'message' in typedResult ? typedResult.message : null;
      
      // Check if email verification was sent (this is actually a success)
      const emailChanged = formData.email && formData.email.trim() !== user.email.trim();
      if (emailChanged && message && message.toLowerCase().includes('verification email')) {
        // Verification email was sent - this is success
        setIsEditing(false);
        if (Platform.OS === 'web') {
          // Show success message as tooltip
          setSuccessMessage(message);
          setShowSuccessTooltip(true);
          setTimeout(() => {
            setShowSuccessTooltip(false);
          }, 8000);
        } else {
          Alert.alert('Verification Email Sent', message);
        }
        return;
      }
      
      if (success) {
        setIsEditing(false);
        if (Platform.OS === 'web') {
          // Show success tooltip on web
          setSuccessMessage('Successfully updated!');
          setShowSuccessTooltip(true);
          setTimeout(() => {
            setShowSuccessTooltip(false);
          }, 3000);
        } else {
        Alert.alert('Success', 'Personal information updated successfully!');
        }
      } else {
        // Set error message for tooltip
        let errorMsg = error || 'Failed to update personal information';
        
        // Check if error is related to email verification
        if (errorMsg.toLowerCase().includes('verify') || errorMsg.toLowerCase().includes('verification')) {
          // Keep the original message if it's about verification
          errorMsg = errorMsg;
        } else if (errorMsg.toLowerCase().includes('email')) {
          // Check if email is verified before suggesting verification
          const emailChanged = formData.email && formData.email.trim() !== user.email.trim();
          if (emailChanged && !user.emailVerified) {
            // If email was changed and not verified, suggest verification
            errorMsg = 'Please verify your current email address before changing it. Check your inbox for a verification email, or use the "Send Verification Email" button in your Account Information section.';
          } else if (emailChanged && user.emailVerified) {
            // If email was changed and already verified, show the actual error
            errorMsg = errorMsg || 'Failed to update email. Please try again.';
          } else {
            // If it's an email-related error but not specifically about verification, show the actual error
            errorMsg = errorMsg;
          }
        } else {
          // For other errors, check if email was changed
          const emailChanged = formData.email && formData.email.trim() !== user.email.trim();
          if (emailChanged && !user.emailVerified) {
            errorMsg = 'Please verify your current email address before changing it. Check your inbox for a verification email, or use the "Send Verification Email" button in your Account Information section.';
          }
        }
        
        setErrorMessage(errorMsg);
        
        if (Platform.OS === 'web') {
          setShowErrorTooltip(true);
          // Auto-hide after 5 seconds
          setTimeout(() => {
            setShowErrorTooltip(false);
          }, 5000);
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } else {
      setIsEditing(false);
      if (Platform.OS === 'web') {
        setErrorMessage(null);
        setShowErrorTooltip(false);
      } else {
      Alert.alert('Success', 'Personal information updated successfully!');
      }
    }
  };

  const handleCancel = (): void => {
    setFormData({
      firstName: user.firstName || '',
      middleName: user.middleName || '',
      lastName: user.lastName || '',
      suffix: user.suffix || '',
      email: user.email || '',
      phone: user.phone || '',
      dateOfBirth: user.dateOfBirth || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      zipCode: user.zipCode || ''
    });
    setProfilePicture(user.profilePicture || null);
    setIsEditing(false);
  };

  // Update profile picture when user prop changes (after save)
  React.useEffect(() => {
    if (user.profilePicture !== undefined) {
      setProfilePicture(user.profilePicture || null);
    }
  }, [user.profilePicture]);

  const handlePickImage = async (): Promise<void> => {
    if (!isEditing) return;

    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        // Web implementation
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
              Alert.alert('Error', 'Image size must be less than 5MB');
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              setProfilePicture(base64String);
            };
            reader.onerror = () => {
              Alert.alert('Error', 'Failed to read image file');
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        // Mobile implementation using expo-image-picker
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'We need access to your photos to upload a profile picture.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          // Check file size (5MB limit)
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            Alert.alert('Error', 'Image size must be less than 5MB');
            return;
          }
          // Convert to base64 if we have the data
          if (asset.base64) {
            const base64String = `data:image/${asset.uri.split('.').pop()?.toLowerCase() || 'jpeg'};base64,${asset.base64}`;
            setProfilePicture(base64String);
          } else {
            // If base64 is not available, try to fetch and convert the image
            // This ensures the image can be sent to the server for saving to server/uploads/images
            Alert.alert('Warning', 'Image processing failed. Please try selecting the image again.');
            console.warn('Base64 data not available for image:', asset.uri);
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const getImageUri = (): string | null => {
    if (!profilePicture) return null;
    // If it's a base64 string, return it as is
    if (profilePicture.startsWith('data:image')) {
      return profilePicture;
    }
    // If it's a URL path, prepend the API base URL
    if (profilePicture.startsWith('/uploads/')) {
      const apiUrl = getApiBaseUrl();
      // Ensure the path doesn't have double slashes
      const cleanPath = profilePicture.startsWith('/') ? profilePicture : `/${profilePicture}`;
      const cleanApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      const imageUrl = `${cleanApiUrl}${cleanPath}`;
      console.log('🔍 Profile picture URL:', imageUrl);
      console.log('🔍 Profile picture path:', profilePicture);
      console.log('🔍 API base URL:', apiUrl);
      return imageUrl;
    }
    // If it's already a full URL or local file URI, return as is
    return profilePicture;
  };

  const renderField = (
    label: string,
    value: string,
    key: keyof typeof formData,
    placeholder: string,
    keyboardType: 'default' | 'email-address' | 'phone-pad' | 'numeric' = 'default'
  ) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={formData[key]}
        onChangeText={(text) => setFormData(prev => ({ ...prev, [key]: text }))}
        placeholder={placeholder}
        keyboardType={keyboardType}
        editable={isEditing}
        placeholderTextColor="#A4B0BE"
      />
    </View>
  );

  return (
    <AppLayout role="user" activeRoute="profile" title="Personal Info" user={user} onNavigate={onNavigate} onLogout={onLogout}>
    <View style={styles.container}>
      {/* Success Tooltip for Web */}
      {Platform.OS === 'web' && showSuccessTooltip && successMessage && (
        <View style={styles.successTooltip}>
          <View style={styles.successTooltipContent}>
            <Text style={styles.successTooltipIcon}>✓</Text>
            <Text style={styles.successTooltipText}>{successMessage}</Text>
            <TouchableOpacity
              style={styles.successTooltipClose}
              onPress={() => setShowSuccessTooltip(false)}
            >
              <Text style={styles.successTooltipCloseText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error Tooltip for Web */}
      {Platform.OS === 'web' && showErrorTooltip && errorMessage && (
        <View style={styles.errorTooltip}>
          <View style={styles.errorTooltipContent}>
            <Text style={styles.errorTooltipIcon}>⚠️</Text>
            <Text style={styles.errorTooltipText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.errorTooltipClose}
              onPress={() => setShowErrorTooltip(false)}
            >
              <Text style={styles.errorTooltipCloseText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          <View style={styles.content}>
          {/* Edit Button - Inside Card */}
          <View style={styles.editButtonContainer}>
        <TouchableOpacity
          onPress={isEditing ? handleSave : () => setIsEditing(true)}
              style={styles.editButton}
        >
              <Text style={styles.editButtonText}>
            {isEditing ? 'Save' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

          {/* Profile Picture Section */}
          <View style={styles.profilePictureSection}>
            <TouchableOpacity
              onPress={isEditing ? handlePickImage : undefined}
              disabled={!isEditing}
              activeOpacity={isEditing ? 0.7 : 1}
            >
              <View style={styles.avatarContainer}>
                {getImageUri() ? (
                  <Image
                    source={{ uri: getImageUri()! }}
                    style={styles.avatarImage as any}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error('❌ Image load error:', error.nativeEvent.error);
                      console.error('❌ Failed to load image from:', getImageUri());
                      // Fallback to initials if image fails to load
                      setProfilePicture(null);
                    }}
                    onLoad={() => {
                      console.log('✅ Image loaded successfully:', getImageUri());
                    }}
                  />
                ) : (
                  <Text style={styles.avatarText}>{user.getInitials()}</Text>
                )}
              </View>
            </TouchableOpacity>
            {isEditing && (
              <TouchableOpacity style={styles.changePhotoButton} onPress={handlePickImage}>
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Personal Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Details</Text>
            
            {renderField('First Name', formData.firstName, 'firstName', 'Enter your first name')}
            {renderField('Middle Name (Optional)', formData.middleName, 'middleName', 'Enter your middle name (optional)')}
            {renderField('Last Name', formData.lastName, 'lastName', 'Enter your last name')}
            {renderField('Suffix (Optional)', formData.suffix, 'suffix', 'Enter suffix (e.g., Jr., Sr., III) - optional')}
            {/* Email Field - Not Editable */}
            <View style={styles.fieldContainer}>
              <View style={styles.emailFieldHeader}>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={styles.readOnlyBadge}>
                  <Text style={styles.readOnlyBadgeText}>Read Only</Text>
                </View>
              </View>
              <View style={styles.emailInputContainer}>
                <TextInput
                  style={[styles.fieldInput, styles.emailInputDisabled]}
                  value={formData.email}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  editable={false}
                  placeholderTextColor="#A4B0BE"
                />
                <View style={styles.emailInfoIcon}>
                  <Text style={styles.emailInfoText}>ℹ️</Text>
                </View>
              </View>
              <Text style={styles.emailHelperText}>
                Email cannot be changed. Contact support if you need to update your email address.
              </Text>
            </View>
            {renderField('Phone', formData.phone, 'phone', 'Enter your phone number', 'phone-pad')}
            {renderField('Date of Birth', formData.dateOfBirth, 'dateOfBirth', 'MM/DD/YYYY')}
          </View>

          {/* Address Information */}
          <View style={[styles.section, { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' }]}>
            <Text style={styles.sectionTitle}>Address Information</Text>
            
            {renderField('Address', formData.address, 'address', 'Enter your address')}
            {renderField('City', formData.city, 'city', 'Enter your city')}
            {renderField('State', formData.state, 'state', 'Enter your state')}
            {renderField('ZIP Code', formData.zipCode, 'zipCode', 'Enter your ZIP code', 'numeric')}
          </View>

          {/* Account Information */}
          <View style={styles.accountSection}>
            <View style={styles.accountHeader}>
              <View style={styles.accountIconContainer}>
                <Text style={styles.accountIcon}>📋</Text>
              </View>
              <Text style={styles.accountTitle}>Account Information</Text>
            </View>
            
            <View style={styles.accountCard}>
              {/* Account Created */}
              <View style={styles.accountInfoItem}>
                <View style={styles.accountInfoLeft}>
                  <View style={styles.accountInfoIconContainer}>
                    <Text style={styles.accountInfoIcon}>📅</Text>
                  </View>
                  <Text style={styles.accountInfoLabel}>Account Created</Text>
                </View>
                <Text style={styles.accountInfoValue}>
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  }) : 'N/A'}
              </Text>
            </View>
            
              {/* Email Verified */}
              <View style={styles.accountInfoItem}>
                <View style={styles.accountInfoLeft}>
                  <View style={[styles.accountInfoIconContainer, { backgroundColor: user.emailVerified ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={styles.accountInfoIcon}>{user.emailVerified ? '✓' : '✗'}</Text>
                  </View>
                  <Text style={styles.accountInfoLabel}>Email Verified</Text>
                </View>
                <View style={styles.accountInfoRight}>
                  <View style={[styles.statusBadge, { backgroundColor: user.emailVerified ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={[styles.statusBadgeText, { color: user.emailVerified ? '#059669' : '#DC2626' }]}>
                      {user.emailVerified ? 'Verified' : 'Not Verified'}
              </Text>
                  </View>
                </View>
            </View>
            
              {/* Verification Actions */}
              {!user.emailVerified && (
                <View style={styles.verificationActions}>
                  {onSendVerificationEmail && (
                    <TouchableOpacity
                      style={[styles.modernVerifyButton, sendingVerification && styles.modernVerifyButtonDisabled]}
                      onPress={async () => {
                        setSendingVerification(true);
                        try {
                          const result = await onSendVerificationEmail();
                          if (result.success) {
                            Alert.alert(
                              'Verification Email Sent',
                              'Please check your email inbox and click the verification link. After verifying, tap "Check Verification" to update your status.'
                            );
                          } else {
                            Alert.alert('Error', result.error || 'Failed to send verification email');
                          }
                        } catch (error: any) {
                          Alert.alert('Error', error.message || 'Failed to send verification email');
                        } finally {
                          setSendingVerification(false);
                        }
                      }}
                      disabled={sendingVerification}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modernVerifyButtonIcon}>✉️</Text>
                      <Text style={styles.modernVerifyButtonText}>
                        {sendingVerification ? 'Sending...' : 'Send Verification Email'}
              </Text>
                    </TouchableOpacity>
                  )}
                  {onCheckVerification && (
                    <TouchableOpacity
                      style={[styles.modernCheckButton, checkingVerification && styles.modernCheckButtonDisabled]}
                      onPress={async () => {
                        setCheckingVerification(true);
                        try {
                          const result = await onCheckVerification();
                          if (result.success) {
                            if (result.verified) {
                              Alert.alert('Success', 'Your email has been verified!');
                            } else {
                              Alert.alert('Not Verified', 'Your email is not yet verified. Please check your inbox and click the verification link.');
                            }
                          } else {
                            Alert.alert('Error', result.error || 'Failed to check verification status');
                          }
                        } catch (error: any) {
                          Alert.alert('Error', error.message || 'Failed to check verification status');
                        } finally {
                          setCheckingVerification(false);
                        }
                      }}
                      disabled={checkingVerification}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.modernCheckButtonIcon}>🔄</Text>
                      <Text style={styles.modernCheckButtonText}>
                        {checkingVerification ? 'Checking...' : 'Check Verification'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              {/* Profile Complete */}
              <View style={styles.accountInfoItem}>
                <View style={styles.accountInfoLeft}>
                  <View style={[styles.accountInfoIconContainer, { backgroundColor: user.isProfileComplete() ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={styles.accountInfoIcon}>{user.isProfileComplete() ? '✓' : '✗'}</Text>
                  </View>
                  <Text style={styles.accountInfoLabel}>Profile Complete</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: user.isProfileComplete() ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Text style={[styles.statusBadgeText, { color: user.isProfileComplete() ? '#059669' : '#DC2626' }]}>
                    {user.isProfileComplete() ? 'Complete' : 'Incomplete'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          {isEditing && (
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom Colored Section */}
          <View style={styles.bottomColoredSection}>
            <View style={styles.bottomColoredContent}>
              <Text style={styles.bottomColoredText}>💡 Tip: Keep your information up to date for better service experience</Text>
            </View>
          </View>
          </View>
        </View>
      </ScrollView>
    </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  successTooltip: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      pointerEvents: 'none',
    } : {}),
  },
  successTooltipContent: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 600,
    width: '100%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
      pointerEvents: 'auto',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  successTooltipIcon: {
    fontSize: 20,
    marginRight: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  successTooltipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  successTooltipClose: {
    marginLeft: 12,
    padding: 4,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  successTooltipCloseText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  errorTooltip: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 60,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      pointerEvents: 'none',
    } : {}),
  },
  errorTooltipContent: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 600,
    width: '100%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
      pointerEvents: 'auto',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  errorTooltipIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  errorTooltipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  errorTooltipClose: {
    marginLeft: 12,
    padding: 4,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  errorTooltipCloseText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  editButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? {
      marginTop: 10,
    } : {}),
  },
  editButton: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {}),
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    ...(Platform.OS === 'web' ? {
      alignItems: 'center',
      paddingVertical: 20,
    } : {}),
  },
  content: {
    padding: 20,
    paddingTop: 10,
    ...(Platform.OS === 'web' ? {
      paddingBottom: 20,
      width: '100%',
      maxWidth: 800,
      backgroundColor: '#ffffff',
      borderRadius: 12,
      marginHorizontal: 'auto',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      marginTop: 20,
      marginBottom: 20,
    } : {}),
  },
  profilePictureSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    marginHorizontal: -20,
    marginTop: -10,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  changePhotoButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#6C63FF',
  },
  changePhotoText: {
    color: '#6C63FF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2D3436',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  emailFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  readOnlyBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  readOnlyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  emailInputContainer: {
    position: 'relative',
  },
  emailInputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
    borderColor: '#D1D5DB',
    opacity: 0.7,
  },
  emailInfoIcon: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  emailInfoText: {
    fontSize: 16,
  },
  emailHelperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
  // Modern Account Information Styles
  accountSection: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#FEF3F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  accountIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountIcon: {
    fontSize: 20,
  },
  accountTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }),
  },
  accountInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  accountInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountInfoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountInfoIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
  accountInfoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  accountInfoRight: {
    alignItems: 'flex-end',
  },
  accountInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  verificationActions: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  modernVerifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6C63FF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: '#5B52E6',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(108, 99, 255, 0.3)',
      },
    } : {}),
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    } : {}),
  },
  modernVerifyButtonDisabled: {
    opacity: 0.6,
    ...(Platform.OS === 'web' ? {
      cursor: 'not-allowed' as any,
      ':hover': {
        backgroundColor: '#6C63FF',
        transform: 'none',
        boxShadow: 'none',
      },
    } as any : {}),
  },
  modernVerifyButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  modernVerifyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  modernCheckButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: '#059669',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
      },
    } : {}),
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    } : {}),
  },
  modernCheckButtonDisabled: {
    opacity: 0.6,
    ...(Platform.OS === 'web' ? {
      cursor: 'not-allowed' as any,
      ':hover': {
        backgroundColor: '#10B981',
        transform: 'none',
        boxShadow: 'none',
      },
    } as any : {}),
  },
  modernCheckButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  modernCheckButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cancelButtonText: {
    color: '#636E72',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomColoredSection: {
    marginTop: 30,
    borderRadius: 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      marginBottom: 0,
      boxShadow: '0 2px 8px rgba(108, 99, 255, 0.15)',
    } : {
      marginBottom: 20,
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  bottomColoredContent: {
    backgroundColor: '#F0F4FF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  bottomColoredText: {
    fontSize: 14,
    color: '#6C63FF',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
  bottomSpacing: {
    height: 20,
  },
});











