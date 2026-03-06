import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useToast } from '../../contexts/ToastContext';
import { Feather } from '@expo/vector-icons';
import { User } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface ProfileViewProps {
  user: User;
  onLogout: () => Promise<boolean>;
  onNavigate?: (route: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ user, onLogout, onNavigate }) => {
  const { isMobile } = useBreakpoints();
  const styles = createStyles(isMobile);
  const { showToast } = useToast();

  const handleLogout = async (): Promise<void> => {
    try {
      const success = await onLogout();
      if (success) {
        showToast({ message: 'You have been logged out successfully!', type: 'success' });
      } else {
        Alert.alert('Error', 'Failed to logout. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'An error occurred during logout. Please try again.');
    }
  };

  const getImageUri = (): string | null => {
    if (!user.profilePicture) return null;

    // If it's already a full URL, return as is
    if (user.profilePicture.startsWith('http://') || user.profilePicture.startsWith('https://')) {
      return user.profilePicture;
    }

    // If it's a relative path, prepend the API base URL
    if (user.profilePicture.startsWith('/uploads/')) {
      return `${getApiBaseUrl()}${user.profilePicture}`;
    }

    // Return as is if it's a data URI or other format
    return user.profilePicture;
  };

  const renderMenuButton = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    showArrow: boolean = true,
    rightElement?: React.ReactNode,
  ) => (
    <TouchableOpacity style={styles.menuButton} onPress={onPress}>
      <View style={styles.menuButtonLeft}>
        <View style={styles.menuIconContainer}>
          <Feather name={icon as any} size={22} color="#6C63FF" />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={styles.menuTitle}>{title}</Text>
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.menuButtonRight}>
        {rightElement || (showArrow && <Feather name="chevron-right" size={20} color="#A4B0BE" />)}
      </View>
    </TouchableOpacity>
  );

  return (
    <AppLayout
      role="provider"
      activeRoute="profile"
      title="Profile"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout()}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={styles.contentWrapper}>
          <View style={styles.content}>
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                {getImageUri() ? (
                  <Image
                    source={{ uri: getImageUri()! }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                    onError={(error) => {
                      if (__DEV__) console.error('Image load error:', error.nativeEvent.error);
                      if (__DEV__) console.error('Failed to load image from:', getImageUri());
                    }}
                    onLoad={() => {}}
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="check-circle" size={12} color="#34C759" />
                      <Text style={styles.verifiedText}>Verified Provider</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Account Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account</Text>

              {renderMenuButton(
                'user',
                'Personal Information',
                'View and edit your personal details',
                () => onNavigate?.('personalInfo'),
              )}

              {renderMenuButton(
                'credit-card',
                'Payment Setup',
                'Set up your PayMongo payment link',
                () => onNavigate?.('paymentSetup'),
              )}
            </View>

            {/* Logout Button */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </View>
        </View>
      </ScrollView>
    </AppLayout>
  );
};

const createStyles = (isMobile: boolean) =>
  StyleSheet.create({
    scrollView: {
      flex: 1,
    },
    contentWrapper: {
      flex: 1,
      ...(Platform.OS === 'web'
        ? {
            alignItems: 'center',
            paddingVertical: 20,
          }
        : {}),
    },
    content: {
      ...(Platform.OS === 'web'
        ? {
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
            padding: isMobile ? 12 : 20,
          }
        : {}),
    },
    profileSection: {
      backgroundColor: '#ffffff',
      ...(Platform.OS === 'web'
        ? {
            margin: 0,
            marginBottom: isMobile ? 12 : 20,
            borderRadius: isMobile ? 12 : 12,
            shadowColor: 'transparent',
            shadowOpacity: 0,
            elevation: 0,
          }
        : {
            margin: isMobile ? 12 : 20,
            borderRadius: isMobile ? 12 : 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }),
      padding: isMobile ? 16 : 24,
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      width: isMobile ? 60 : 80,
      height: isMobile ? 60 : 80,
      borderRadius: isMobile ? 30 : 40,
      backgroundColor: '#6C63FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: isMobile ? 12 : 20,
    },
    avatarText: {
      fontSize: isMobile ? 24 : 32,
      fontWeight: 'bold',
      color: '#ffffff',
    },
    avatarImage: {
      width: isMobile ? 60 : 80,
      height: isMobile ? 60 : 80,
      borderRadius: isMobile ? 30 : 40,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: isMobile ? 18 : 24,
      fontWeight: 'bold',
      color: '#2D3436',
      marginBottom: 4,
    },
    userEmail: {
      fontSize: isMobile ? 13 : 16,
      color: '#636E72',
      marginBottom: 8,
    },
    verifiedBadge: {
      backgroundColor: '#E8F5E8',
      paddingHorizontal: isMobile ? 8 : 12,
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
      ...(Platform.OS === 'web'
        ? {
            marginHorizontal: 0,
          }
        : {
            marginHorizontal: isMobile ? 12 : 20,
          }),
      marginBottom: isMobile ? 12 : 20,
    },
    sectionTitle: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: 'bold',
      color: '#2D3436',
      marginBottom: isMobile ? 8 : 12,
      marginLeft: 4,
    },
    menuButton: {
      backgroundColor: '#ffffff',
      borderRadius: isMobile ? 8 : 12,
      padding: isMobile ? 12 : 16,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    menuButtonLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIcon: {
      fontSize: isMobile ? 20 : 24,
      marginRight: isMobile ? 12 : 16,
      width: 30,
      textAlign: 'center',
    },
    menuIconContainer: {
      width: 30,
      marginRight: isMobile ? 12 : 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    menuTextContainer: {
      flex: 1,
    },
    menuTitle: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: '#2D3436',
      marginBottom: 2,
    },
    menuSubtitle: {
      fontSize: isMobile ? 12 : 14,
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
      borderRadius: isMobile ? 8 : 12,
      padding: isMobile ? 14 : 16,
      alignItems: 'center',
      marginTop: isMobile ? 12 : 20,
    },
    logoutButtonText: {
      color: '#ffffff',
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
    },
    bottomSpacing: {
      height: 20,
    },
  });

export default ProfileView;
