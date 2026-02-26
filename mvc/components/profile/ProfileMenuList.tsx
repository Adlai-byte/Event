import React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { User } from '../../models/User';
import { createStyles } from '../../views/user/ProfileView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface ProfileMenuListProps {
  user: User;
  providerStatus: string | null;
  rejectionReason: string | null;
  onNavigateToPersonalInfo?: () => void;
  onNavigateToHelpCenter?: () => void;
  onApplyProviderPress: () => void;
  onShowRejectionModal: () => void;
}

export const ProfileMenuList: React.FC<ProfileMenuListProps> = ({
  user,
  providerStatus,
  rejectionReason,
  onNavigateToPersonalInfo,
  onNavigateToHelpCenter,
  onApplyProviderPress,
  onShowRejectionModal,
}) => {
  const { isMobile, screenWidth, screenHeight } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, screenHeight);

  const renderMenuButton = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    showArrow: boolean = true,
    rightElement?: React.ReactNode,
  ) => (
    <TouchableOpacity
      style={styles.modernMenuButton}
      onPress={onPress}
      activeOpacity={0.7}
      {...(Platform.OS === 'web'
        ? {
            onMouseEnter: (e: any) => {
              e.currentTarget.style.backgroundColor = '#F8FAFC';
            },
            onMouseLeave: (e: any) => {
              e.currentTarget.style.backgroundColor = '#FFFFFF';
            },
          }
        : {})}
    >
      <View style={styles.modernMenuButtonLeft}>
        <View style={styles.modernMenuIconContainer}>
          <Feather name={icon as any} size={20} color="#2563EB" />
        </View>
        <View style={styles.modernMenuTextContainer}>
          <Text style={styles.modernMenuTitle}>{title}</Text>
          <Text style={styles.modernMenuSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.modernMenuButtonRight}>
        {rightElement || (showArrow && <Feather name="chevron-right" size={18} color="#94A3B8" />)}
      </View>
    </TouchableOpacity>
  );

  const renderAccountSection = () => (
    <View style={styles.modernSection}>
      <Text style={styles.modernSectionTitle}>Account</Text>
      <View style={styles.modernSectionCard}>
        {renderMenuButton(
          'user',
          'Personal Information',
          'View and edit your personal details',
          onNavigateToPersonalInfo || (() => {}),
        )}

        {user.role !== 'provider' && user.role !== 'admin' && (
          <>
            {providerStatus === 'pending' && (
              <View style={styles.modernPendingNotice}>
                <View style={styles.modernPendingIconContainer}>
                  <Feather name="clock" size={16} color="#f59e0b" />
                </View>
                <View style={styles.modernPendingTextContainer}>
                  <Text style={styles.modernPendingTitle}>Application Pending</Text>
                  <Text style={styles.modernPendingSubtitle}>
                    Your application is under review. Please wait for admin approval.
                  </Text>
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
                  <Feather name="alert-triangle" size={16} color="#ef4444" />
                </View>
                <View style={styles.modernRejectionTextContainer}>
                  <Text style={styles.modernRejectionTitle}>Application Rejected</Text>
                  <Text style={styles.modernRejectionSubtitle}>Tap to view rejection reason</Text>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}

            {providerStatus !== 'pending' && providerStatus !== 'rejected' && (
              <TouchableOpacity
                style={styles.modernApplyProviderButton}
                onPress={onApplyProviderPress}
                activeOpacity={0.7}
              >
                <View style={styles.modernApplyProviderIconContainer}>
                  <Feather name="send" size={16} color="#2563EB" />
                </View>
                <View style={styles.modernApplyProviderTextContainer}>
                  <Text style={styles.modernApplyProviderTitle}>Apply as Provider</Text>
                  <Text style={styles.modernApplyProviderSubtitle}>
                    Submit your documents to become a provider
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color="#94A3B8" />
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
          'help-circle',
          'Tips',
          'Get helpful tips and guidance',
          onNavigateToHelpCenter || (() => {}),
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
