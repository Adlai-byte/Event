import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  Modal,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { User } from '../../models/User';
import { AuthState } from '../../models/AuthState';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileMenuList } from '../../components/profile/ProfileMenuList';
import { styles } from './ProfileView.styles';

interface ProfileViewProps {
  user: User;
  authState: AuthState;
  onLogout: () => Promise<boolean>;
  onNavigateToPersonalInfo?: () => void;
  onNavigateToHelpCenter?: () => void;
  onNavigate: (route: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  authState,
  onLogout,
  onNavigateToPersonalInfo,
  onNavigateToHelpCenter,
  onNavigate
}) => {
  const [showApplyProviderModal, setShowApplyProviderModal] = useState(false);
  const [businessDocument, setBusinessDocument] = useState<string | null>(null);
  const [validIdDocument, setValidIdDocument] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    // Load user provider status and rejection reason
    const loadProviderStatus = async () => {
      if (!user.email) return;

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/users/by-email?email=${encodeURIComponent(user.email)}`);
        const data = await response.json();

        if (data.ok && data.exists) {
          // Fetch full user data including provider status
          const userResponse = await fetch(`${getApiBaseUrl()}/api/user/provider-status?email=${encodeURIComponent(user.email)}`);
          const userData = await userResponse.json();

          if (userData.ok) {
            setProviderStatus(userData.status || null);
            setRejectionReason(userData.rejectionReason || null);
          }
        }
      } catch (error) {
        console.error('Error loading provider status:', error);
      }
    };

    loadProviderStatus();
  }, [user.email]);

  const handleLogout = async (): Promise<void> => {
    console.log('=== LOGOUT BUTTON PRESSED ===');
    try {
      console.log('Calling onLogout function directly...');
      const success = await onLogout();
      console.log('=== LOGOUT RESULT ===', success);

      if (success) {
        console.log('Logout successful!');
        Alert.alert('Success', 'You have been logged out successfully!');
      } else {
        console.log('Logout failed!');
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    } catch (error) {
      console.error('=== LOGOUT ERROR ===', error);
      Alert.alert('Error', 'An error occurred during logout. Please try again.');
    }
  };

  const handleApplyProviderPress = (): void => {
    // Check if user is already a provider
    if (user.role === 'provider') {
      Alert.alert('Already a Provider', 'You are already a provider.');
      return;
    }

    // Check if user has a pending application
    if (providerStatus === 'pending') {
      Alert.alert(
        'Pending Application',
        'You already have a pending provider application. Please wait for admin approval before submitting a new application.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if user has a rejected application (they can reapply)
    if (providerStatus === 'rejected') {
      // Show rejection reason if available
      if (rejectionReason) {
        Alert.alert(
          'Previous Application Rejected',
          `Your previous application was rejected.\n\nReason: ${rejectionReason}\n\nYou can reapply with updated documents.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reapply',
              onPress: () => setShowApplyProviderModal(true)
            }
          ]
        );
        return;
      }
    }

    setShowApplyProviderModal(true);
  };

  const handlePickDocument = async (documentType: 'business' | 'validId'): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            // Validate file size (25MB limit)
            if (file.size > 25 * 1024 * 1024) {
              Alert.alert('Error', 'Document size must be less than 25MB');
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              if (documentType === 'business') {
                setBusinessDocument(base64String);
              } else {
                setValidIdDocument(base64String);
              }
            };
            reader.onerror = () => {
              Alert.alert('Error', 'Failed to read document file');
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        // Mobile implementation using expo-image-picker
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'We need access to your photos to upload a document.');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.9,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          // Check file size (25MB limit)
          if (asset.fileSize && asset.fileSize > 25 * 1024 * 1024) {
            Alert.alert('Error', 'Document size must be less than 25MB');
            return;
          }
          // Convert to base64 if we have the data
          if (asset.base64) {
            const base64String = `data:image/${asset.uri.split('.').pop()?.toLowerCase() || 'jpeg'};base64,${asset.base64}`;
            if (documentType === 'business') {
              setBusinessDocument(base64String);
            } else {
              setValidIdDocument(base64String);
            }
          } else {
            Alert.alert('Error', 'Failed to read document. Please try again.');
          }
        }
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  const handleSubmitApplication = async (): Promise<void> => {
    if (!businessDocument) {
      Alert.alert('Error', 'Please upload a business/company document');
      return;
    }

    if (!validIdDocument) {
      Alert.alert('Error', 'Please upload a valid ID document');
      return;
    }

    if (!user.email) {
      Alert.alert('Error', 'Email is required to submit application');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/users/apply-provider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          businessDocument: businessDocument,
          validIdDocument: validIdDocument,
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        // Clear the documents first
        setBusinessDocument(null);
        setValidIdDocument(null);

        // Reload provider status to get updated date
        const statusResponse = await fetch(`${getApiBaseUrl()}/api/user/provider-status?email=${encodeURIComponent(user.email || '')}`);
        const statusData = await statusResponse.json();
        if (statusData.ok) {
          setProviderStatus(statusData.status || null);
          setRejectionReason(statusData.rejectionReason || null);
        }

        // Close the modal immediately
        setShowApplyProviderModal(false);

        // Show success alert
        Alert.alert(
          'Success',
          'Your provider application has been submitted successfully. Waiting for admin approval.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to submit application. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      Alert.alert('Error', 'An error occurred while submitting your application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = (): void => {
    if (!isSubmitting) {
      setShowApplyProviderModal(false);
      setBusinessDocument(null);
      setValidIdDocument(null);
    }
  };

  return (
    <AppLayout role="user" activeRoute="profile" title="Profile" user={user} onNavigate={onNavigate} onLogout={onLogout}>
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.content}>
        {/* Profile Section */}
        <ProfileHeader user={user} />

        {/* Account & Support Sections */}
        <ProfileMenuList
          user={user}
          providerStatus={providerStatus}
          rejectionReason={rejectionReason}
          onNavigateToPersonalInfo={onNavigateToPersonalInfo}
          onNavigateToHelpCenter={onNavigateToHelpCenter}
          onApplyProviderPress={handleApplyProviderPress}
          onShowRejectionModal={() => setShowRejectionModal(true)}
        />

        {/* Logout Button */}
            <View style={styles.modernSection}>
          <TouchableOpacity
                style={styles.modernLogoutButton}
            onPress={() => {
              console.log('=== LOGOUT BUTTON TOUCHED ===');
              handleLogout();
            }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Logout"
          >
                <Text style={styles.modernLogoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
          </View>
        </View>
      </ScrollView>

      {/* Apply as Provider Modal */}
      <Modal
        visible={showApplyProviderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply as Provider</Text>
              <TouchableOpacity
                onPress={handleCloseModal}
                style={styles.closeButton}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Close provider application modal"
              >
                <Text style={styles.closeButtonText}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>
                To apply as a provider, please upload photos of your business/company document and valid identification document.
                Both documents must be clear and readable.
              </Text>

              <Text style={styles.modalNote}>
                Maximum file size per document: 25MB
              </Text>

              {/* Business Document Section */}
              <View style={styles.documentSection}>
                <Text style={styles.documentSectionTitle}>Business/Company Document *</Text>
                {businessDocument ? (
                  <View style={styles.documentPreviewContainer}>
                    <Image
                      source={{ uri: businessDocument }}
                      style={styles.documentPreview}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={styles.removeDocumentButton}
                      onPress={() => setBusinessDocument(null)}
                      disabled={isSubmitting}
                      accessibilityRole="button"
                      accessibilityLabel="Remove business document"
                    >
                      <Text style={styles.removeDocumentText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadButton, isSubmitting && styles.uploadButtonDisabled]}
                    onPress={() => handlePickDocument('business')}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Upload business document"
                  >
                    <Text style={styles.uploadButtonText}>Select Business Document</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Valid ID Document Section */}
              <View style={styles.documentSection}>
                <Text style={styles.documentSectionTitle}>Valid ID Document *</Text>
                {validIdDocument ? (
                  <View style={styles.documentPreviewContainer}>
                    <Image
                      source={{ uri: validIdDocument }}
                      style={styles.documentPreview}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={styles.removeDocumentButton}
                      onPress={() => setValidIdDocument(null)}
                      disabled={isSubmitting}
                      accessibilityRole="button"
                      accessibilityLabel="Remove valid ID document"
                    >
                      <Text style={styles.removeDocumentText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.uploadButton, isSubmitting && styles.uploadButtonDisabled]}
                    onPress={() => handlePickDocument('validId')}
                    disabled={isSubmitting}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Upload valid ID document"
                  >
                    <Text style={styles.uploadButtonText}>Select Valid ID Document</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, isSubmitting && styles.buttonDisabled]}
                onPress={handleCloseModal}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Cancel application"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!businessDocument || !validIdDocument || isSubmitting) && styles.submitButtonDisabled
                ]}
                onPress={handleSubmitApplication}
                disabled={!businessDocument || !validIdDocument || isSubmitting}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Submit provider application"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Application</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </Modal>

        {/* Rejection Reason Modal */}
        <Modal
          visible={showRejectionModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowRejectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.rejectionModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Application Rejected</Text>
                <TouchableOpacity
                  onPress={() => setShowRejectionModal(false)}
                  style={styles.closeButton}
                  accessibilityRole="button"
                  accessibilityLabel="Close rejection details"
                >
                  <Text style={styles.closeButtonText}>{'\u2715'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.rejectionModalBody}>
                <Text style={styles.rejectionModalDescription}>
                  Your provider application has been rejected. Please review the reason below.
                </Text>

                <View style={styles.rejectionReasonBox}>
                  <Text style={styles.rejectionReasonLabel}>Rejection Reason:</Text>
                  <Text style={styles.rejectionReasonText}>{rejectionReason}</Text>
                </View>

                <Text style={styles.rejectionModalNote}>
                  You can reapply at any time by submitting a new application with updated documents.
                </Text>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.closeModalButton}
                  onPress={() => setShowRejectionModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close rejection details"
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reapplyButton}
                  onPress={() => {
                    setShowRejectionModal(false);
                    // Directly open the application modal without showing Alert
                    setShowApplyProviderModal(true);
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Reapply as provider"
                >
                  <Text style={styles.reapplyButtonIcon}>{'\u{1F504}'}</Text>
                  <Text style={styles.reapplyButtonText}>Reapply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
    </View>
    </AppLayout>
  );
};
