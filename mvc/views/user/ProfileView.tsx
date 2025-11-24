import React, { useState } from 'react';
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
  Modal
} from 'react-native';
import { User } from '../../models/User';
import { AuthState } from '../../models/AuthState';
import { getApiBaseUrl } from '../../services/api';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const [applyingProvider, setApplyingProvider] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [businessDocument, setBusinessDocument] = useState<string | null>(null);
  const [validIdDocument, setValidIdDocument] = useState<string | null>(null);

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

  const handleImagePick = (type: 'business' | 'validId') => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
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
            if (type === 'business') {
              setBusinessDocument(base64String);
            } else {
              setValidIdDocument(base64String);
            }
          };
          reader.onerror = () => {
            Alert.alert('Error', 'Failed to read image file');
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      Alert.alert('Image Upload', 'Image picker not implemented for mobile. Please use web version.');
    }
  };

  const handleRemoveImage = (type: 'business' | 'validId') => {
    if (type === 'business') {
      setBusinessDocument(null);
    } else {
      setValidIdDocument(null);
    }
  };

  const handleOpenProviderModal = () => {
    // Check if user is already a provider
    if (user.role === 'provider') {
      Alert.alert('Already a Provider', 'You are already registered as a provider.');
      return;
    }
    setShowProviderModal(true);
  };

  const handleSubmitProviderApplication = async (): Promise<void> => {
    if (!businessDocument) {
      Alert.alert('Required', 'Please upload a business/company document as proof of ownership.');
      return;
    }
    if (!validIdDocument) {
      Alert.alert('Required', 'Please upload a valid ID document.');
      return;
    }

    setApplyingProvider(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/users/apply-provider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          businessDocument: businessDocument,
          validIdDocument: validIdDocument
        })
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        Alert.alert(
          'Success',
          'Your provider application has been submitted! Please wait for admin approval. You will be notified once your application is reviewed.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowProviderModal(false);
                setBusinessDocument(null);
                setValidIdDocument(null);
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Failed to submit application. Please try again.');
      }
    } catch (error) {
      console.error('Apply provider error:', error);
      Alert.alert('Error', 'An error occurred while submitting your application. Please try again.');
    } finally {
      setApplyingProvider(false);
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
        '🔒',
        'Privacy & Security',
        'Manage your privacy and security settings',
        () => {}
      )}

      {renderMenuButton(
        '💳',
        'Payment Methods',
        'Manage your payment information',
        onNavigateToPaymentMethods || (() => {})
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

      {renderMenuButton(
        '📞',
        'Contact Support',
        'Get in touch with our support team',
        () => {}
      )}

      {renderMenuButton(
        '📝',
        'Feedback',
        'Share your feedback with us',
        () => {}
      )}

      {renderMenuButton(
        'ℹ️',
        'About',
        'App version and information',
        () => {}
      )}
    </View>
  );

  const renderStatsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Activity</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Events Booked</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={styles.statLabel}>Events Created</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Reviews Given</Text>
        </View>
      </View>
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

        {/* Stats Section */}
        {renderStatsSection()}

        {/* Notifications Section */}
        {renderNotificationSection()}

        {/* Account Section */}
        {renderAccountSection()}

        {/* Apply as Provider Section - Only show if user is not already a provider */}
        {user.role !== 'provider' && user.role !== 'admin' && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.applyProviderButton, applyingProvider && styles.applyProviderButtonDisabled]}
              onPress={handleOpenProviderModal}
              disabled={applyingProvider}
              activeOpacity={0.7}
            >
              <Text style={styles.applyProviderButtonText}>
                {applyingProvider ? 'Applying...' : '🚀 Apply as Provider'}
              </Text>
              <Text style={styles.applyProviderButtonSubtext}>
                Start offering your services to clients
              </Text>
            </TouchableOpacity>
          </View>
        )}

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

      {/* Provider Application Modal */}
      <Modal
        visible={showProviderModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProviderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply as Provider</Text>
              <TouchableOpacity
                onPress={() => setShowProviderModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDescription}>
                Please upload the required documents to apply as a provider:
              </Text>

              {/* Business Document */}
              <View style={styles.documentSection}>
                <Text style={styles.documentLabel}>
                  Business/Company Documents <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.documentHint}>
                  Upload proof of business ownership (Business Permit, DTI Certificate, etc.)
                </Text>
                {businessDocument ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: businessDocument }}
                      style={styles.imagePreview}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage('business')}
                    >
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => handleImagePick('business')}
                  >
                    <Text style={styles.uploadButtonText}>📄 Choose Business Document</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Valid ID Document */}
              <View style={styles.documentSection}>
                <Text style={styles.documentLabel}>
                  Valid ID <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.documentHint}>
                  Upload a valid government-issued ID (Driver's License, Passport, National ID, etc.)
                </Text>
                {validIdDocument ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: validIdDocument }}
                      style={styles.imagePreview}
                      resizeMode="contain"
                    />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage('validId')}
                    >
                      <Text style={styles.removeImageText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => handleImagePick('validId')}
                  >
                    <Text style={styles.uploadButtonText}>🆔 Choose Valid ID</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowProviderModal(false);
                  setBusinessDocument(null);
                  setValidIdDocument(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, applyingProvider && styles.submitButtonDisabled]}
                onPress={handleSubmitProviderApplication}
                disabled={applyingProvider}
              >
                <Text style={styles.submitButtonText}>
                  {applyingProvider ? 'Submitting...' : 'Submit Application'}
                </Text>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
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
    margin: 20,
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: '#636E72',
    marginBottom: 8,
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
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
    marginLeft: 4,
  },
  statsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
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
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6C63FF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#636E72',
    textAlign: 'center',
  },
  menuButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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
  applyProviderButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 8px rgba(108, 99, 255, 0.3)',
    } : {
      shadowColor: '#6C63FF',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  applyProviderButtonDisabled: {
    opacity: 0.6,
  },
  applyProviderButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  applyProviderButtonSubtext: {
    color: '#ffffff',
    fontSize: 14,
    opacity: 0.9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
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
    color: '#1E293B',
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
  modalDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  documentSection: {
    marginBottom: 24,
  },
  documentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  documentHint: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#6C63FF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  uploadButtonText: {
    color: '#6C63FF',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    marginTop: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  removeImageButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 14,
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
});











