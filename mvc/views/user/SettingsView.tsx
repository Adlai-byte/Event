import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { AppLayout } from '../../components/layout';
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface SettingsViewProps {
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

const createStyles = (isMobile: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f8f9fa',
    },
    scrollView: {
      flex: 1,
    },
    section: {
      marginHorizontal: isMobile ? 12 : 24,
      marginBottom: isMobile ? 16 : 32,
      marginTop: isMobile ? 12 : 24,
      paddingHorizontal: isMobile ? 12 : 24,
      paddingVertical: isMobile ? 16 : 24,
      backgroundColor: '#FFFFFF',
      borderRadius: isMobile ? 12 : 20,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3,
          }),
    },
    sectionTitle: {
      fontSize: isMobile ? 18 : 24,
      fontWeight: '800',
      color: '#1e293b',
      marginBottom: isMobile ? 12 : 20,
      paddingBottom: isMobile ? 8 : 12,
      borderBottomWidth: 3,
      borderBottomColor: '#4a55e1',
      alignSelf: 'flex-start',
      paddingRight: isMobile ? 16 : 24,
      marginLeft: 0,
      letterSpacing: isMobile ? -0.2 : -0.3,
    },
    sectionContent: {
      backgroundColor: '#ffffff',
      borderRadius: isMobile ? 12 : 16,
      padding: isMobile ? 12 : 20,
      ...(Platform.OS === 'web'
        ? {
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }),
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: isMobile ? 12 : 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F3F4',
    },
    actionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: isMobile ? 12 : 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F3F4',
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIconContainer: {
      width: 30,
      marginRight: isMobile ? 12 : 16,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: '#2D3436',
      marginBottom: 2,
    },
    destructiveText: {
      color: '#FF3B30',
    },
    settingSubtitle: {
      fontSize: isMobile ? 12 : 14,
      color: '#636E72',
    },
    settingRight: {
      marginLeft: 12,
    },
    settingArrow: {
      fontSize: 20,
      color: '#A4B0BE',
      fontWeight: 'bold',
    },
    bottomSpacing: {
      height: 20,
    },
  });

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onNavigate, onLogout }) => {
  const { isMobile } = useBreakpoints();
  const styles = createStyles(isMobile);
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    pushNotifications: true,
    locationServices: true,
    darkMode: false,
    autoSync: true,
    dataSaving: false,
    soundEffects: true,
    hapticFeedback: true,
    analytics: true,
    crashReporting: true,
  });

  const handleSettingChange = (key: keyof typeof settings, value: boolean): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogout = (): void => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive' },
    ]);
  };

  const handleClearCache = (): void => {
    Alert.alert('Clear Cache', 'This will clear all cached data. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive' },
    ]);
  };

  const handleDeleteAccount = (): void => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive' },
      ],
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    showSwitch: boolean = true,
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIconContainer}>
          <Feather name={icon as any} size={22} color="#4a55e1" />
        </View>
        <View style={styles.settingContent}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.settingRight}>
        {showSwitch ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
            thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
          />
        ) : (
          <Feather name="chevron-right" size={20} color="#A4B0BE" />
        )}
      </View>
    </View>
  );

  const renderActionItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    isDestructive: boolean = false,
  ) => (
    <TouchableOpacity
      style={styles.actionItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.settingLeft}>
        <View style={styles.settingIconContainer}>
          <Feather name={icon as any} size={22} color={isDestructive ? '#FF3B30' : '#4a55e1'} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, isDestructive && styles.destructiveText]}>
            {title}
          </Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Feather name="chevron-right" size={20} color="#A4B0BE" />
    </TouchableOpacity>
  );

  return (
    <AppLayout
      role="user"
      activeRoute="settings"
      title="Settings"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Notifications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.sectionContent}>
              {renderSettingItem(
                'bell',
                'Notifications',
                'Enable all notifications',
                settings.notifications,
                (value) => {
                  handleSettingChange('notifications', value);
                  if (!value) {
                    handleSettingChange('emailNotifications', false);
                    handleSettingChange('pushNotifications', false);
                  }
                },
              )}

              {settings.notifications && (
                <>
                  {renderSettingItem(
                    'mail',
                    'Email Notifications',
                    'Receive notifications via email',
                    settings.emailNotifications,
                    (value) => {
                      handleSettingChange('emailNotifications', value);
                      if (value && !settings.notifications) {
                        handleSettingChange('notifications', true);
                      }
                    },
                  )}

                  {renderSettingItem(
                    'smartphone',
                    'Push Notifications',
                    'Receive push notifications on your device',
                    settings.pushNotifications,
                    (value) => {
                      handleSettingChange('pushNotifications', value);
                      if (value && !settings.notifications) {
                        handleSettingChange('notifications', true);
                      }
                    },
                  )}
                </>
              )}
            </View>
          </View>

          {/* Appearance Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.sectionContent}>
              {renderSettingItem(
                'moon',
                'Dark Mode',
                'Use dark theme throughout the app',
                settings.darkMode,
                (value) => handleSettingChange('darkMode', value),
              )}

              {renderSettingItem(
                'droplet',
                'Theme',
                'Choose your preferred color scheme',
                false,
                () => {},
                false,
              )}
            </View>
          </View>

          {/* Privacy & Security Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy & Security</Text>
            <View style={styles.sectionContent}>
              {renderSettingItem(
                'map-pin',
                'Location Services',
                'Allow app to access your location',
                settings.locationServices,
                (value) => handleSettingChange('locationServices', value),
              )}

              {renderSettingItem(
                'bar-chart-2',
                'Analytics',
                'Help improve the app by sharing usage data',
                settings.analytics,
                (value) => handleSettingChange('analytics', value),
              )}

              {renderSettingItem(
                'alert-circle',
                'Crash Reporting',
                'Automatically send crash reports',
                settings.crashReporting,
                (value) => handleSettingChange('crashReporting', value),
              )}

              {renderActionItem('lock', 'Privacy Policy', 'Read our privacy policy', () => {})}

              {renderActionItem(
                'file-text',
                'Terms of Service',
                'Read our terms of service',
                () => {},
              )}
            </View>
          </View>

          {/* Data & Storage Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Data & Storage</Text>
            <View style={styles.sectionContent}>
              {renderSettingItem(
                'refresh-cw',
                'Auto Sync',
                'Automatically sync data when connected',
                settings.autoSync,
                (value) => handleSettingChange('autoSync', value),
              )}

              {renderSettingItem(
                'save',
                'Data Saving',
                'Reduce data usage for slower connections',
                settings.dataSaving,
                (value) => handleSettingChange('dataSaving', value),
              )}

              {renderActionItem(
                'trash-2',
                'Clear Cache',
                'Free up storage space',
                handleClearCache,
              )}

              {renderActionItem('upload', 'Export Data', 'Download your data', () => {})}
            </View>
          </View>

          {/* Accessibility Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Accessibility</Text>
            <View style={styles.sectionContent}>
              {renderSettingItem(
                'volume-2',
                'Sound Effects',
                'Play sounds for interactions',
                settings.soundEffects,
                (value) => handleSettingChange('soundEffects', value),
              )}

              {renderSettingItem(
                'smartphone',
                'Haptic Feedback',
                'Vibrate for touch interactions',
                settings.hapticFeedback,
                (value) => handleSettingChange('hapticFeedback', value),
              )}

              {renderActionItem(
                'eye',
                'Accessibility Settings',
                'Configure accessibility options',
                () => {},
              )}
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <View style={styles.sectionContent}>
              {renderActionItem('info', 'App Version', 'Version 1.0.0 (Build 1)', () => {})}

              {renderActionItem('star', 'Rate App', 'Rate us on the App Store', () => {})}

              {renderActionItem('edit', 'Send Feedback', 'Help us improve the app', () => {})}
            </View>
          </View>

          {/* Account Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.sectionContent}>
              {renderActionItem('log-out', 'Logout', 'Sign out of your account', handleLogout)}

              {renderActionItem(
                'trash-2',
                'Delete Account',
                'Permanently delete your account',
                handleDeleteAccount,
                true,
              )}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </AppLayout>
  );
};
