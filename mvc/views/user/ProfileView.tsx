import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isMobile = screenWidth < 768;

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


  const getProfileImageUri = (): string | null => {
    if (!user.profilePicture) return null;
    // If it's a base64 string, return it as is
    if (user.profilePicture.startsWith('data:image')) {
      return user.profilePicture;
    }
    // If it's a URL path, prepend the API base URL
    if (user.profilePicture.startsWith('/uploads/')) {
      return `${getApiBaseUrl()}${user.profilePicture}`;
    }
    // If it's already a full URL or local file URI, return as is
    return user.profilePicture;
  };

  const renderProfileSection = () => (
    <View style={styles.modernProfileSection}>
      <View style={styles.modernAvatarContainer}>
        {getProfileImageUri() ? (
          <Image
            source={{ uri: getProfileImageUri()! }}
            style={styles.modernAvatarImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.modernAvatarPlaceholder}>
            <Text style={styles.modernAvatarText}>{user.getInitials()}</Text>
      </View>
        )}
        {user.emailVerified && (
          <View style={styles.modernVerifiedBadge}>
            <Text style={styles.modernVerifiedIcon}>✓</Text>
          </View>
        )}
      </View>
      <View style={styles.modernUserInfo}>
        <Text style={styles.modernUserName}>{user.getFullName()}</Text>
        <View style={styles.modernUserEmailContainer}>
          <Text style={styles.modernUserEmailIcon}>📧</Text>
          <Text style={styles.modernUserEmail}>{user.email}</Text>
        </View>
      </View>
    </View>
  );

  const renderMenuButton = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    showArrow: boolean = true,
    rightElement?: React.ReactNode
  ) => (
    <TouchableOpacity 
      style={styles.modernMenuButton} 
      onPress={onPress}
      activeOpacity={0.7}
      {...(Platform.OS === 'web' ? {
        onMouseEnter: (e: any) => {
          e.currentTarget.style.backgroundColor = '#F8FAFC';
        },
        onMouseLeave: (e: any) => {
          e.currentTarget.style.backgroundColor = '#FFFFFF';
        },
      } : {})}
    >
      <View style={styles.modernMenuButtonLeft}>
        <View style={styles.modernMenuIconContainer}>
          <Text style={styles.modernMenuIcon}>{icon}</Text>
        </View>
        <View style={styles.modernMenuTextContainer}>
          <Text style={styles.modernMenuTitle}>{title}</Text>
          <Text style={styles.modernMenuSubtitle}>{subtitle}</Text>
      </View>
      </View>
      <View style={styles.modernMenuButtonRight}>
        {rightElement || (showArrow && <Text style={styles.modernArrowIcon}>›</Text>)}
      </View>
    </TouchableOpacity>
  );


  const renderAccountSection = () => (
    <View style={styles.modernSection}>
      <Text style={styles.modernSectionTitle}>Account</Text>
      <View style={styles.modernSectionCard}>
      {renderMenuButton(
        '👤',
        'Personal Information',
        'View and edit your personal details',
        onNavigateToPersonalInfo || (() => {})
      )}

      {user.role !== 'provider' && user.role !== 'admin' && (
        <>
          {providerStatus === 'pending' && (
              <View style={styles.modernPendingNotice}>
                <View style={styles.modernPendingIconContainer}>
                  <Text style={styles.modernPendingIcon}>⏳</Text>
                </View>
                <View style={styles.modernPendingTextContainer}>
                  <Text style={styles.modernPendingTitle}>Application Pending</Text>
                  <Text style={styles.modernPendingSubtitle}>Your application is under review. Please wait for admin approval.</Text>
              </View>
            </View>
          )}
          
          {providerStatus === 'rejected' && rejectionReason && (
            <TouchableOpacity 
                style={styles.modernRejectionNotice}
              onPress={() => setShowRejectionModal(true)}
              activeOpacity={0.7}
            >
                <View style={styles.modernRejectionIconContainer}>
                  <Text style={styles.modernRejectionIcon}>⚠️</Text>
              </View>
                <View style={styles.modernRejectionTextContainer}>
                  <Text style={styles.modernRejectionTitle}>Application Rejected</Text>
                  <Text style={styles.modernRejectionSubtitle}>Tap to view rejection reason</Text>
                </View>
                <Text style={styles.modernArrowIcon}>›</Text>
            </TouchableOpacity>
          )}
          
          {providerStatus !== 'pending' && providerStatus !== 'rejected' && (
            <TouchableOpacity 
                style={styles.modernApplyProviderButton}
              onPress={handleApplyProviderPress}
              activeOpacity={0.7}
            >
                <View style={styles.modernApplyProviderIconContainer}>
                  <Text style={styles.modernApplyProviderIcon}>🚀</Text>
              </View>
                <View style={styles.modernApplyProviderTextContainer}>
                  <Text style={styles.modernApplyProviderTitle}>Apply as Provider</Text>
                  <Text style={styles.modernApplyProviderSubtitle}>Submit your documents to become a provider</Text>
                </View>
                <Text style={styles.modernArrowIcon}>›</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      </View>
    </View>
  );

  const renderSupportSection = () => (
    <View style={styles.modernSection}>
      <Text style={styles.modernSectionTitle}>Support</Text>
      <View style={styles.modernSectionCard}>
      {renderMenuButton(
        '💡',
        'Tips',
        'Get helpful tips and guidance',
        onNavigateToHelpCenter || (() => {})
      )}
      </View>
    </View>
  );


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
        {renderProfileSection()}

        {/* Account Section */}
        {renderAccountSection()}

        {/* Support Section */}
        {renderSupportSection()}

        {/* Logout Button */}
            <View style={styles.modernSection}>
          <TouchableOpacity 
                style={styles.modernLogoutButton}
            onPress={() => {
              console.log('=== LOGOUT BUTTON TOUCHED ===');
              handleLogout();
            }}
                activeOpacity={0.8}
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
              >
                <Text style={styles.closeButtonText}>✕</Text>
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
                >
                  <Text style={styles.closeButtonText}>✕</Text>
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
                >
                  <Text style={styles.reapplyButtonIcon}>🔄</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    ...(Platform.OS === 'web' ? {
      width: '100%',
      maxWidth: 800,
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 24,
      marginHorizontal: 'auto',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    } : {
      width: '100%',
    }),
  },
  modernProfileSection: {
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#FFFFFF',
    margin: Platform.OS === 'web' ? 0 : isMobile ? 12 : 20,
    marginBottom: Platform.OS === 'web' ? 24 : isMobile ? 12 : 20,
    borderRadius: Platform.OS === 'web' ? 0 : 20,
    padding: Platform.OS === 'web' ? 0 : isMobile ? 20 : 24,
    flexDirection: Platform.OS === 'web' ? 'row' : isMobile ? 'column' : 'row',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {} : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  modernAvatarContainer: {
    position: 'relative',
    marginRight: Platform.OS === 'web' ? 24 : isMobile ? 0 : 20,
    marginBottom: Platform.OS === 'web' ? 0 : isMobile ? 16 : 0,
  },
  modernAvatarPlaceholder: {
    width: Platform.OS === 'web' ? 100 : isMobile ? 80 : 90,
    height: Platform.OS === 'web' ? 100 : isMobile ? 80 : 90,
    borderRadius: Platform.OS === 'web' ? 50 : isMobile ? 40 : 45,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  modernAvatarText: {
    fontSize: Platform.OS === 'web' ? 40 : 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modernAvatarImage: {
    width: Platform.OS === 'web' ? 100 : isMobile ? 80 : 90,
    height: Platform.OS === 'web' ? 100 : isMobile ? 80 : 90,
    borderRadius: Platform.OS === 'web' ? 50 : isMobile ? 40 : 45,
  },
  modernVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: Platform.OS === 'web' ? 32 : 28,
    height: Platform.OS === 'web' ? 32 : 28,
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernVerifiedIcon: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  modernUserInfo: {
    flex: 1,
    alignItems: Platform.OS === 'web' ? 'flex-start' : isMobile ? 'center' : 'flex-start',
  },
  modernUserName: {
    fontSize: Platform.OS === 'web' ? 28 : isMobile ? 22 : 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
    letterSpacing: Platform.OS === 'web' ? -0.5 : 0,
  },
  modernUserEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernUserEmailIcon: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    marginRight: 6,
  },
  modernUserEmail: {
    fontSize: Platform.OS === 'web' ? 16 : isMobile ? 14 : 15,
    color: '#64748B',
    fontWeight: '500',
  },
  profileSection: {
    backgroundColor: '#ffffff',
    margin: isMobile ? 12 : 20,
    borderRadius: 16,
    padding: isMobile ? 16 : 24,
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'center' : 'center',
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
  avatarContainer: {
    width: isMobile ? 70 : 80,
    height: isMobile ? 70 : 80,
    borderRadius: isMobile ? 35 : 40,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isMobile ? 0 : 20,
    marginBottom: isMobile ? 12 : 0,
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
    textAlign: isMobile ? 'center' : 'left',
  },
  userEmail: {
    fontSize: isMobile ? 14 : 16,
    color: '#636E72',
    marginBottom: 8,
    textAlign: isMobile ? 'center' : 'left',
  },
  verifiedBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  verifiedText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  modernSection: {
    marginHorizontal: Platform.OS === 'web' ? 0 : isMobile ? 16 : 24,
    marginBottom: Platform.OS === 'web' ? 32 : isMobile ? 24 : 32,
    marginTop: Platform.OS === 'web' ? 24 : isMobile ? 16 : 24,
  },
  modernSectionTitle: {
    fontSize: Platform.OS === 'web' ? 24 : isMobile ? 20 : 22,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: Platform.OS === 'web' ? 12 : 10,
    borderBottomWidth: 3,
    borderBottomColor: '#4a55e1',
    alignSelf: 'flex-start',
    paddingRight: Platform.OS === 'web' ? 24 : 20,
    marginLeft: Platform.OS === 'web' ? 0 : 0,
    letterSpacing: Platform.OS === 'web' ? -0.4 : -0.2,
  },
  modernSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    padding: Platform.OS === 'web' ? 4 : 8,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    }),
  },
  section: {
    marginHorizontal: isMobile ? 16 : 24,
    marginBottom: isMobile ? 24 : 32,
    marginTop: isMobile ? 16 : 24,
    paddingHorizontal: isMobile ? 20 : 24,
    paddingVertical: isMobile ? 20 : 24,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  sectionTitle: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: Platform.OS === 'web' ? 12 : 10,
    borderBottomWidth: 3,
    borderBottomColor: '#4a55e1',
    alignSelf: 'flex-start',
    paddingRight: Platform.OS === 'web' ? 24 : 20,
    letterSpacing: Platform.OS === 'web' ? -0.3 : -0.2,
  },
  modernApplyProviderButton: {
    backgroundColor: '#6366F1',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    padding: Platform.OS === 'web' ? 20 : 16,
    marginTop: Platform.OS === 'web' ? 8 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: '#4F46E5',
        boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
        transform: 'translateY(-1px)',
      },
    } : {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  modernApplyProviderIconContainer: {
    width: Platform.OS === 'web' ? 48 : 44,
    height: Platform.OS === 'web' ? 48 : 44,
    borderRadius: Platform.OS === 'web' ? 24 : 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'web' ? 16 : 14,
  },
  modernApplyProviderIcon: {
    fontSize: Platform.OS === 'web' ? 24 : 22,
  },
  modernApplyProviderTextContainer: {
    flex: 1,
  },
  modernApplyProviderTitle: {
    fontSize: Platform.OS === 'web' ? 18 : isMobile ? 15 : 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: Platform.OS === 'web' ? 4 : 2,
  },
  modernApplyProviderSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  applyProviderButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(108, 99, 255, 0.3)',
    } : {
      shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
    }),
  },
  applyProviderIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  applyProviderTextContainer: {
    flex: 1,
  },
  applyProviderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  applyProviderSubtitle: {
    fontSize: 14,
    color: '#E0E0FF',
  },
  modernMenuButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    padding: Platform.OS === 'web' ? 18 : isMobile ? 14 : 16,
    marginBottom: Platform.OS === 'web' ? 4 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  modernMenuButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernMenuIconContainer: {
    width: Platform.OS === 'web' ? 48 : 44,
    height: Platform.OS === 'web' ? 48 : 44,
    borderRadius: Platform.OS === 'web' ? 24 : 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'web' ? 16 : 14,
  },
  modernMenuIcon: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
  },
  modernMenuTextContainer: {
    flex: 1,
  },
  modernMenuTitle: {
    fontSize: Platform.OS === 'web' ? 17 : isMobile ? 15 : 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: Platform.OS === 'web' ? 4 : 2,
  },
  modernMenuSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#64748B',
    lineHeight: Platform.OS === 'web' ? 20 : 18,
  },
  modernMenuButtonRight: {
    marginLeft: 12,
  },
  modernArrowIcon: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    color: '#CBD5E1',
    fontWeight: 'bold',
  },
  menuButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
    } : {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    }),
  },
  menuButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 30,
    textAlign: 'center',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#636E72',
  },
  menuButtonRight: {
    marginLeft: 12,
  },
  arrowIcon: {
    fontSize: 20,
    color: '#A4B0BE',
    fontWeight: 'bold',
  },
  modernLogoutButton: {
    backgroundColor: '#EF4444',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    padding: Platform.OS === 'web' ? 18 : 16,
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 0 : 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: '#DC2626',
        boxShadow: '0 6px 16px rgba(239, 68, 68, 0.4)',
      },
    } : {
      shadowColor: '#EF4444',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  modernLogoutButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 17 : 16,
    fontWeight: '600',
    letterSpacing: Platform.OS === 'web' ? 0.3 : 0,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Math.max(10, screenWidth * 0.05),
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: Math.min(500, screenWidth * 0.95),
    maxHeight: '90%',
    marginHorizontal: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3436',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
    maxHeight: screenHeight * 0.6,
  },
  documentSection: {
    marginBottom: 24,
  },
  documentSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 12,
  },
  modalNote: {
    fontSize: 12,
    color: '#6C63FF',
    fontWeight: '600',
    marginBottom: 20,
  },
  documentPreviewContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  documentPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  removeDocumentButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  removeDocumentText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modernRejectionNotice: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    padding: Platform.OS === 'web' ? 18 : 16,
    marginTop: Platform.OS === 'web' ? 8 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(245, 158, 11, 0.1)',
      ':hover': {
        backgroundColor: '#FEF3C7',
        borderColor: '#FCD34D',
      },
    } : {}),
  },
  modernRejectionIconContainer: {
    width: Platform.OS === 'web' ? 44 : 40,
    height: Platform.OS === 'web' ? 44 : 40,
    borderRadius: Platform.OS === 'web' ? 22 : 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'web' ? 16 : 14,
  },
  modernRejectionIcon: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
  },
  modernRejectionTextContainer: {
    flex: 1,
  },
  modernRejectionTitle: {
    fontSize: Platform.OS === 'web' ? 17 : isMobile ? 15 : 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: Platform.OS === 'web' ? 4 : 2,
  },
  modernRejectionSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#B45309',
    lineHeight: Platform.OS === 'web' ? 20 : 18,
  },
  rejectionNotice: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFC107',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rejectionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  rejectionTextContainer: {
    flex: 1,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 2,
  },
  rejectionSubtitle: {
    fontSize: 14,
    color: '#856404',
    opacity: 0.8,
  },
  rejectionModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 10,
    }),
  },
  rejectionModalBody: {
    padding: 20,
  },
  rejectionModalDescription: {
    fontSize: 14,
    color: '#636E72',
    lineHeight: 20,
    marginBottom: 20,
  },
  rejectionReasonBox: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFC107',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  rejectionReasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  rejectionModalNote: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  closeModalButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 12,
  },
  closeModalButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
  },
  reapplyButton: {
    flex: 1,
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(108, 99, 255, 0.4)',
    } : {
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  reapplyButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  reapplyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modernPendingNotice: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    padding: Platform.OS === 'web' ? 18 : 16,
    marginTop: Platform.OS === 'web' ? 8 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(59, 130, 246, 0.1)',
    } : {}),
  },
  modernPendingIconContainer: {
    width: Platform.OS === 'web' ? 44 : 40,
    height: Platform.OS === 'web' ? 44 : 40,
    borderRadius: Platform.OS === 'web' ? 22 : 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'web' ? 16 : 14,
  },
  modernPendingIcon: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
  },
  modernPendingTextContainer: {
    flex: 1,
  },
  modernPendingTitle: {
    fontSize: Platform.OS === 'web' ? 17 : isMobile ? 15 : 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: Platform.OS === 'web' ? 4 : 2,
  },
  modernPendingSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#3B82F6',
    lineHeight: Platform.OS === 'web' ? 20 : 18,
  },
  pendingNotice: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#2196F3',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  pendingTextContainer: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 2,
  },
  pendingSubtitle: {
    fontSize: 14,
    color: '#1976D2',
    opacity: 0.8,
  },
});











