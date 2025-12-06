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
  Platform
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
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
    crashReporting: true
  });

  const handleSettingChange = (key: keyof typeof settings, value: boolean): void => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = (): void => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive' }
      ]
    );
  };

  const handleClearCache = (): void => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive' }
      ]
    );
  };

  const handleDeleteAccount = (): void => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive' }
      ]
    );
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    showSwitch: boolean = true
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <Text style={styles.settingIcon}>{icon}</Text>
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
          <Text style={styles.settingArrow}>›</Text>
        )}
      </View>
    </View>
  );

  const renderActionItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress: () => void,
    isDestructive: boolean = false
  ) => (
    <TouchableOpacity style={styles.actionItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <Text style={[styles.settingIcon, isDestructive && styles.destructiveIcon]}>
          {icon}
        </Text>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, isDestructive && styles.destructiveText]}>
            {title}
          </Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Text style={styles.settingArrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Background Design */}
      <View style={styles.backgroundContainer}>
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundGradient} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem(
              '🔔',
              'Notifications',
              'Enable all notifications',
              settings.notifications,
              (value) => {
                handleSettingChange('notifications', value);
                if (!value) {
                  handleSettingChange('emailNotifications', false);
                  handleSettingChange('pushNotifications', false);
                }
              }
            )}

            {settings.notifications && (
              <>
                {renderSettingItem(
                  '📧',
                  'Email Notifications',
                  'Receive notifications via email',
                  settings.emailNotifications,
                  (value) => {
                    handleSettingChange('emailNotifications', value);
                    if (value && !settings.notifications) {
                      handleSettingChange('notifications', true);
                    }
                  }
                )}

                {renderSettingItem(
                  '📱',
                  'Push Notifications',
                  'Receive push notifications on your device',
                  settings.pushNotifications,
                  (value) => {
                    handleSettingChange('pushNotifications', value);
                    if (value && !settings.notifications) {
                      handleSettingChange('notifications', true);
                    }
                  }
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
              '🌙',
              'Dark Mode',
              'Use dark theme throughout the app',
              settings.darkMode,
              (value) => handleSettingChange('darkMode', value)
            )}

            {renderSettingItem(
              '🎨',
              'Theme',
              'Choose your preferred color scheme',
              false,
              () => {},
              false
            )}
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem(
              '📍',
              'Location Services',
              'Allow app to access your location',
              settings.locationServices,
              (value) => handleSettingChange('locationServices', value)
            )}

            {renderSettingItem(
              '📊',
              'Analytics',
              'Help improve the app by sharing usage data',
              settings.analytics,
              (value) => handleSettingChange('analytics', value)
            )}

            {renderSettingItem(
              '🐛',
              'Crash Reporting',
              'Automatically send crash reports',
              settings.crashReporting,
              (value) => handleSettingChange('crashReporting', value)
            )}

            {renderActionItem(
              '🔒',
              'Privacy Policy',
              'Read our privacy policy',
              () => {}
            )}

            {renderActionItem(
              '📋',
              'Terms of Service',
              'Read our terms of service',
              () => {}
            )}
          </View>
        </View>

        {/* Data & Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem(
              '🔄',
              'Auto Sync',
              'Automatically sync data when connected',
              settings.autoSync,
              (value) => handleSettingChange('autoSync', value)
            )}

            {renderSettingItem(
              '💾',
              'Data Saving',
              'Reduce data usage for slower connections',
              settings.dataSaving,
              (value) => handleSettingChange('dataSaving', value)
            )}

            {renderActionItem(
              '🗑️',
              'Clear Cache',
              'Free up storage space',
              handleClearCache
            )}

            {renderActionItem(
              '📤',
              'Export Data',
              'Download your data',
              () => {}
            )}
          </View>
        </View>

        {/* Accessibility Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accessibility</Text>
          <View style={styles.sectionContent}>
            {renderSettingItem(
              '🔊',
              'Sound Effects',
              'Play sounds for interactions',
              settings.soundEffects,
              (value) => handleSettingChange('soundEffects', value)
            )}

            {renderSettingItem(
              '📳',
              'Haptic Feedback',
              'Vibrate for touch interactions',
              settings.hapticFeedback,
              (value) => handleSettingChange('hapticFeedback', value)
            )}

            {renderActionItem(
              '♿',
              'Accessibility Settings',
              'Configure accessibility options',
              () => {}
            )}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionContent}>
            {renderActionItem(
              'ℹ️',
              'App Version',
              'Version 1.0.0 (Build 1)',
              () => {}
            )}

            {renderActionItem(
              '⭐',
              'Rate App',
              'Rate us on the App Store',
              () => {}
            )}

            {renderActionItem(
              '📝',
              'Send Feedback',
              'Help us improve the app',
              () => {}
            )}
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.sectionContent}>
            {renderActionItem(
              '🚪',
              'Logout',
              'Sign out of your account',
              handleLogout
            )}

            {renderActionItem(
              '🗑️',
              'Delete Account',
              'Permanently delete your account',
              handleDeleteAccount,
              true
            )}
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
    paddingTop: 10,
    paddingBottom: 10,
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
  sectionContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F3F4',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 30,
    textAlign: 'center',
  },
  destructiveIcon: {
    color: '#FF3B30',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 2,
  },
  destructiveText: {
    color: '#FF3B30',
  },
  settingSubtitle: {
    fontSize: 14,
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











