import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Platform, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';
import { PersonalInfoForm, PersonalInfoFormData } from '../../components/profile/PersonalInfoForm';
import { styles } from './PersonalInfoView.styles';

interface PersonalInfoViewProps {
  user: User;
  onNavigate: (route: string) => void;
  onLogout: () => void;
  onSave?: (
    updatedUser: Partial<User>,
  ) => Promise<boolean | { success: boolean; error?: string; message?: string }>;
  onSendVerificationEmail?: () => Promise<{ success: boolean; error?: string }>;
  onCheckVerification?: () => Promise<{ success: boolean; verified: boolean; error?: string }>;
}

export const PersonalInfoView: React.FC<PersonalInfoViewProps> = ({
  user,
  onNavigate,
  onLogout,
  onSave,
  onSendVerificationEmail,
  onCheckVerification,
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
  const [formData, setFormData] = useState<PersonalInfoFormData>({
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
    zipCode: user.zipCode || '',
  });

  const handleChangeField = (key: keyof PersonalInfoFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (): Promise<void> => {
    setErrorMessage(null);
    setShowErrorTooltip(false);
    setSuccessMessage(null);
    setShowSuccessTooltip(false);

    if (onSave) {
      const updatedData = {
        ...formData,
        profilePicture: profilePicture || undefined,
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

      const success =
        typeof typedResult === 'boolean'
          ? typedResult
          : typedResult && typeof typedResult === 'object' && 'success' in typedResult
            ? typedResult.success
            : false;
      const error =
        typeof typedResult === 'object' && typedResult !== null && 'error' in typedResult
          ? typedResult.error
          : null;
      const message =
        typeof typedResult === 'object' && typedResult !== null && 'message' in typedResult
          ? typedResult.message
          : null;

      // Check if email verification was sent (this is actually a success)
      const emailChanged = formData.email && formData.email.trim() !== (user.email ?? '').trim();
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
        if (
          errorMsg.toLowerCase().includes('verify') ||
          errorMsg.toLowerCase().includes('verification')
        ) {
          // Keep the original message if it's about verification
          // keep original message about verification
        } else if (errorMsg.toLowerCase().includes('email')) {
          // Check if email is verified before suggesting verification
          const emailChanged =
            formData.email && formData.email.trim() !== (user.email ?? '').trim();
          if (emailChanged && !user.emailVerified) {
            // If email was changed and not verified, suggest verification
            errorMsg =
              'Please verify your current email address before changing it. Check your inbox for a verification email, or use the "Send Verification Email" button in your Account Information section.';
          } else if (emailChanged && user.emailVerified) {
            // If email was changed and already verified, show the actual error
            errorMsg = errorMsg ? errorMsg : 'Failed to update email. Please try again.';
          } else {
            // keep the actual error as-is
          }
        } else {
          // For other errors, check if email was changed
          const emailChanged =
            formData.email && formData.email.trim() !== (user.email ?? '').trim();
          if (emailChanged && !user.emailVerified) {
            errorMsg =
              'Please verify your current email address before changing it. Check your inbox for a verification email, or use the "Send Verification Email" button in your Account Information section.';
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
      zipCode: user.zipCode || '',
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
          Alert.alert(
            'Permission Required',
            'We need access to your photos to upload a profile picture.',
          );
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
            Alert.alert(
              'Warning',
              'Image processing failed. Please try selecting the image again.',
            );
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
      console.log('Profile picture URL:', imageUrl);
      console.log('Profile picture path:', profilePicture);
      console.log('API base URL:', apiUrl);
      return imageUrl;
    }
    // If it's already a full URL or local file URI, return as is
    return profilePicture;
  };

  return (
    <AppLayout
      role="user"
      activeRoute="profile"
      title="Personal Info"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
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
                accessibilityRole="button"
                accessibilityLabel="Dismiss success message"
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
                accessibilityRole="button"
                accessibilityLabel="Dismiss error message"
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
                  accessibilityRole="button"
                  accessibilityLabel={isEditing ? 'Save personal info' : 'Edit personal info'}
                >
                  <Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
                </TouchableOpacity>
              </View>

              {/* Profile Picture Section */}
              <View style={styles.profilePictureSection}>
                <TouchableOpacity
                  onPress={isEditing ? handlePickImage : undefined}
                  disabled={!isEditing}
                  activeOpacity={isEditing ? 0.7 : 1}
                  accessibilityRole="button"
                  accessibilityLabel="Change profile picture"
                >
                  <View style={styles.avatarContainer}>
                    {getImageUri() ? (
                      <Image
                        source={{ uri: getImageUri()! }}
                        style={styles.avatarImage as any}
                        resizeMode="cover"
                        onError={(error) => {
                          console.error('Image load error:', error.nativeEvent.error);
                          console.error('Failed to load image from:', getImageUri());
                          // Fallback to initials if image fails to load
                          setProfilePicture(null);
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', getImageUri());
                        }}
                      />
                    ) : (
                      <Text style={styles.avatarText}>{user.getInitials()}</Text>
                    )}
                  </View>
                </TouchableOpacity>
                {isEditing && (
                  <TouchableOpacity
                    style={styles.changePhotoButton}
                    onPress={handlePickImage}
                    accessibilityRole="button"
                    accessibilityLabel="Change profile photo"
                  >
                    <Text style={styles.changePhotoText}>Change Photo</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Personal Details & Address Form */}
              <PersonalInfoForm
                formData={formData}
                isEditing={isEditing}
                onChangeField={handleChangeField}
              />

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
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'N/A'}
                    </Text>
                  </View>

                  {/* Email Verified */}
                  <View style={styles.accountInfoItem}>
                    <View style={styles.accountInfoLeft}>
                      <View
                        style={[
                          styles.accountInfoIconContainer,
                          { backgroundColor: user.emailVerified ? '#D1FAE5' : '#FEE2E2' },
                        ]}
                      >
                        <Text style={styles.accountInfoIcon}>{user.emailVerified ? '✓' : '✗'}</Text>
                      </View>
                      <Text style={styles.accountInfoLabel}>Email Verified</Text>
                    </View>
                    <View style={styles.accountInfoRight}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: user.emailVerified ? '#D1FAE5' : '#FEE2E2' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: user.emailVerified ? '#059669' : '#DC2626' },
                          ]}
                        >
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
                          style={[
                            styles.modernVerifyButton,
                            sendingVerification && styles.modernVerifyButtonDisabled,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Send verification email"
                          onPress={async () => {
                            setSendingVerification(true);
                            try {
                              const result = await onSendVerificationEmail();
                              if (result.success) {
                                Alert.alert(
                                  'Verification Email Sent',
                                  'Please check your email inbox and click the verification link. After verifying, tap "Check Verification" to update your status.',
                                );
                              } else {
                                Alert.alert(
                                  'Error',
                                  result.error || 'Failed to send verification email',
                                );
                              }
                            } catch (error: any) {
                              Alert.alert(
                                'Error',
                                error.message || 'Failed to send verification email',
                              );
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
                          style={[
                            styles.modernCheckButton,
                            checkingVerification && styles.modernCheckButtonDisabled,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel="Check email verification status"
                          onPress={async () => {
                            setCheckingVerification(true);
                            try {
                              const result = await onCheckVerification();
                              if (result.success) {
                                if (result.verified) {
                                  Alert.alert('Success', 'Your email has been verified!');
                                } else {
                                  Alert.alert(
                                    'Not Verified',
                                    'Your email is not yet verified. Please check your inbox and click the verification link.',
                                  );
                                }
                              } else {
                                Alert.alert(
                                  'Error',
                                  result.error || 'Failed to check verification status',
                                );
                              }
                            } catch (error: any) {
                              Alert.alert(
                                'Error',
                                error.message || 'Failed to check verification status',
                              );
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
                      <View
                        style={[
                          styles.accountInfoIconContainer,
                          { backgroundColor: user.isProfileComplete() ? '#D1FAE5' : '#FEE2E2' },
                        ]}
                      >
                        <Text style={styles.accountInfoIcon}>
                          {user.isProfileComplete() ? '✓' : '✗'}
                        </Text>
                      </View>
                      <Text style={styles.accountInfoLabel}>Profile Complete</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: user.isProfileComplete() ? '#D1FAE5' : '#FEE2E2' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: user.isProfileComplete() ? '#059669' : '#DC2626' },
                        ]}
                      >
                        {user.isProfileComplete() ? 'Complete' : 'Incomplete'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              {isEditing && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing"
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                    accessibilityRole="button"
                    accessibilityLabel="Save changes"
                  >
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Bottom Colored Section */}
              <View style={styles.bottomColoredSection}>
                <View style={styles.bottomColoredContent}>
                  <Text style={styles.bottomColoredText}>
                    💡 Tip: Keep your information up to date for better service experience
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </AppLayout>
  );
};
