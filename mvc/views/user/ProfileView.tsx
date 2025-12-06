import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isMobile = screenWidth < 768;

interface ProfileViewProps {
  user: User;
  authState: AuthState;
  onLogout: () => Promise<boolean>;
  onNavigateToPersonalInfo?: () => void;
  onNavigateToHelpCenter?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToPaymentMethods?: () => void;
  onBack: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  authState,
  onLogout,
  onNavigateToPersonalInfo,
  onNavigateToHelpCenter,
  onNavigateToSettings,
  onNavigateToPaymentMethods,
  onBack
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
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

  const handleNotificationToggle = (value: boolean): void => {
    setNotificationsEnabled(value);
    if (!value) {
      setEmailNotifications(false);
      setPushNotifications(false);
    }
  };

  const handleEmailNotificationToggle = (value: boolean): void => {
    setEmailNotifications(value);
    if (value && !notificationsEnabled) {
      setNotificationsEnabled(true);
    }
  };

  const handlePushNotificationToggle = (value: boolean): void => {
    setPushNotifications(value);
    if (value && !notificationsEnabled) {
      setNotificationsEnabled(true);
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
    <View style={styles.profileSection}>
      <View style={styles.avatarContainer}>
        {getProfileImageUri() ? (
          <Image
            source={{ uri: getProfileImageUri()! }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        ) : (
          <Text style={styles.avatarText}>{user.getInitials()}</Text>
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.getFullName()}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>
        {user.emailVerified && (
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✓ Verified</Text>
          </View>
        )}
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
    <TouchableOpacity style={styles.menuButton} onPress={onPress}>
      <View style={styles.menuButtonLeft}>
        <Text style={styles.menuIcon}>{icon}</Text>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.menuButtonRight}>
        {rightElement || (showArrow && <Text style={styles.arrowIcon}>›</Text>)}
      </View>
    </TouchableOpacity>
  );

  const renderNotificationSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notifications</Text>
      
      {renderMenuButton(
        '🔔',
        'Notifications',
        'Manage your notification preferences',
        () => {},
        true,
        <Switch
          value={notificationsEnabled}
          onValueChange={handleNotificationToggle}
          trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
          thumbColor={notificationsEnabled ? '#FFFFFF' : '#FFFFFF'}
        />
      )}

      {notificationsEnabled && (
        <>
          {renderMenuButton(
            '📧',
            'Email Notifications',
            'Receive notifications via email',
            () => {},
            true,
            <Switch
              value={emailNotifications}
              onValueChange={handleEmailNotificationToggle}
              trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
              thumbColor={emailNotifications ? '#FFFFFF' : '#FFFFFF'}
            />
          )}

          {renderMenuButton(
            '📱',
            'Push Notifications',
            'Receive push notifications on your device',
            () => {},
            true,
            <Switch
              value={pushNotifications}
              onValueChange={handlePushNotificationToggle}
              trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
              thumbColor={pushNotifications ? '#FFFFFF' : '#FFFFFF'}
            />
          )}
        </>
      )}
    </View>
  );

  const renderAccountSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account</Text>
      
      {renderMenuButton(
        '👤',
        'Personal Information',
        'View and edit your personal details',
        onNavigateToPersonalInfo || (() => {})
      )}

      {renderMenuButton(
        '⚙️',
        'Settings',
        'App preferences and configuration',
        onNavigateToSettings || (() => {})
      )}

      {renderMenuButton(
        '💳',
        'Payment Methods',
        'Manage your payment information',
        onNavigateToPaymentMethods || (() => {})
      )}

      {user.role !== 'provider' && user.role !== 'admin' && (
        <>
          {providerStatus === 'pending' && (
            <View style={styles.pendingNotice}>
              <Text style={styles.pendingIcon}>⏳</Text>
              <View style={styles.pendingTextContainer}>
                <Text style={styles.pendingTitle}>Application Pending</Text>
                <Text style={styles.pendingSubtitle}>Your application is under review. Please wait for admin approval.</Text>
              </View>
            </View>
          )}
          
          {providerStatus === 'rejected' && rejectionReason && (
            <TouchableOpacity 
              style={styles.rejectionNotice}
              onPress={() => setShowRejectionModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.rejectionIcon}>⚠️</Text>
              <View style={styles.rejectionTextContainer}>
                <Text style={styles.rejectionTitle}>Application Rejected</Text>
                <Text style={styles.rejectionSubtitle}>Tap to view rejection reason</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          )}
          
          {providerStatus !== 'pending' && providerStatus !== 'rejected' && (
            <TouchableOpacity 
              style={styles.applyProviderButton}
              onPress={handleApplyProviderPress}
              activeOpacity={0.7}
            >
              <Text style={styles.applyProviderIcon}>🚀</Text>
              <View style={styles.applyProviderTextContainer}>
                <Text style={styles.applyProviderTitle}>Apply as Provider</Text>
                <Text style={styles.applyProviderSubtitle}>Submit your documents to become a provider</Text>
              </View>
              <Text style={styles.arrowIcon}>›</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  const renderSupportSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Support</Text>
      
      {renderMenuButton(
        '❓',
        'Help Center',
        'Get help and find answers',
        onNavigateToHelpCenter || (() => {})
      )}
    </View>
  );


  return (
    <View style={styles.container}>
      {/* Background Design */}
      <View style={styles.backgroundContainer}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />
        <View style={styles.backgroundGradient} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Profile Section */}
        {renderProfileSection()}

        {/* Notifications Section */}
        {renderNotificationSection()}

        {/* Account Section */}
        {renderAccountSection()}

        {/* Support Section */}
        {renderSupportSection()}

        {/* Logout Button */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => {
              console.log('=== LOGOUT BUTTON TOUCHED ===');
              handleLogout();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    position: 'relative',
    paddingTop: 10,
    paddingBottom: 10,
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    pointerEvents: 'none',
  },
  backgroundCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    top: -50,
    right: -50,
  },
  backgroundCircle2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(108, 99, 255, 0.08)',
    bottom: 200,
    left: -30,
  },
  backgroundCircle3: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(108, 99, 255, 0.06)',
    top: '60%',
    right: 20,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: isMobile ? 12 : 20,
    paddingTop: isMobile ? 50 : 50,
    paddingBottom: isMobile ? 12 : 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: isMobile ? 14 : 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  headerRight: {
    width: 60,
  },
  scrollView: {
    flex: 1,
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
  section: {
    marginHorizontal: isMobile ? 12 : 20,
    marginBottom: isMobile ? 16 : 20,
  },
  sectionTitle: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
    marginLeft: 4,
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
    marginBottom: 20,
    alignItems: 'center',
  },
  documentPreviewContainer: {
    marginBottom: 12,
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











