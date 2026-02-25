import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { User } from '../../models/User';
import { styles } from '../../views/user/ProfileView.styles';

interface ProfileMenuListProps {
  user: User;
  providerStatus: string | null;
  rejectionReason: string | null;
  onNavigateToPersonalInfo?: () => void;
  onNavigateToHelpCenter?: () => void;
  onApplyProviderPress: () => void;
  onShowRejectionModal: () => void;
}

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
      {rightElement || (showArrow && <Text style={styles.modernArrowIcon}>{'\u203A'}</Text>)}
    </View>
  </TouchableOpacity>
);

export const ProfileMenuList: React.FC<ProfileMenuListProps> = ({
  user,
  providerStatus,
  rejectionReason,
  onNavigateToPersonalInfo,
  onNavigateToHelpCenter,
  onApplyProviderPress,
  onShowRejectionModal,
}) => {
  const renderAccountSection = () => (
    <View style={styles.modernSection}>
      <Text style={styles.modernSectionTitle}>Account</Text>
      <View style={styles.modernSectionCard}>
        {renderMenuButton(
          '\u{1F464}',
          'Personal Information',
          'View and edit your personal details',
          onNavigateToPersonalInfo || (() => {})
        )}

        {user.role !== 'provider' && user.role !== 'admin' && (
          <>
            {providerStatus === 'pending' && (
              <View style={styles.modernPendingNotice}>
                <View style={styles.modernPendingIconContainer}>
                  <Text style={styles.modernPendingIcon}>{'\u231B'}</Text>
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
                onPress={onShowRejectionModal}
                activeOpacity={0.7}
              >
                <View style={styles.modernRejectionIconContainer}>
                  <Text style={styles.modernRejectionIcon}>{'\u26A0\uFE0F'}</Text>
                </View>
                <View style={styles.modernRejectionTextContainer}>
                  <Text style={styles.modernRejectionTitle}>Application Rejected</Text>
                  <Text style={styles.modernRejectionSubtitle}>Tap to view rejection reason</Text>
                </View>
                <Text style={styles.modernArrowIcon}>{'\u203A'}</Text>
              </TouchableOpacity>
            )}

            {providerStatus !== 'pending' && providerStatus !== 'rejected' && (
              <TouchableOpacity
                style={styles.modernApplyProviderButton}
                onPress={onApplyProviderPress}
                activeOpacity={0.7}
              >
                <View style={styles.modernApplyProviderIconContainer}>
                  <Text style={styles.modernApplyProviderIcon}>{'\u{1F680}'}</Text>
                </View>
                <View style={styles.modernApplyProviderTextContainer}>
                  <Text style={styles.modernApplyProviderTitle}>Apply as Provider</Text>
                  <Text style={styles.modernApplyProviderSubtitle}>Submit your documents to become a provider</Text>
                </View>
                <Text style={styles.modernArrowIcon}>{'\u203A'}</Text>
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
          '\u{1F4A1}',
          'Tips',
          'Get helpful tips and guidance',
          onNavigateToHelpCenter || (() => {})
        )}
      </View>
    </View>
  );

  return (
    <>
      {renderAccountSection()}
      {renderSupportSection()}
    </>
  );
};
