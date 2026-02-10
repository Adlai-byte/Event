import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { User } from '../../models/User';
import { AppLayout } from '../../components/layout';

interface SettingsViewProps {
  user: User;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onNavigate,
  onLogout,
}) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [autoAcceptBookings, setAutoAcceptBookings] = useState(false);
  const [showAvailability, setShowAvailability] = useState(true);

  return (
    <AppLayout
      role="provider"
      activeRoute="settings"
      title="Settings"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>Receive notifications about bookings and messages</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Email Notifications</Text>
                  <Text style={styles.settingDescription}>Receive notifications via email</Text>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>Receive push notifications on your device</Text>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Text style={styles.settingLabel}>Marketing Emails</Text>
                  <Text style={styles.settingDescription}>Receive updates and promotional emails</Text>
                </View>
                <Switch
                  value={marketingEmails}
                  onValueChange={setMarketingEmails}
                  trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </>
          )}
        </View>

        {/* Business Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Auto-Accept Bookings</Text>
              <Text style={styles.settingDescription}>Automatically accept bookings within your availability</Text>
            </View>
            <Switch
              value={autoAcceptBookings}
              onValueChange={setAutoAcceptBookings}
              trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Text style={styles.settingLabel}>Show Availability</Text>
              <Text style={styles.settingDescription}>Display your availability to clients</Text>
            </View>
            <Switch
              value={showAvailability}
              onValueChange={setShowAvailability}
              trackColor={{ false: '#E9ECEF', true: '#6C63FF' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          
          <TouchableOpacity style={styles.settingButton}>
            <Text style={styles.settingButtonText}>Privacy Policy</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingButton}>
            <Text style={styles.settingButtonText}>Terms of Service</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingButton}>
            <Text style={styles.settingButtonText}>Data & Privacy</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <TouchableOpacity style={styles.settingButton} onPress={() => onNavigate?.('profile')}>
            <Text style={styles.settingButtonText}>Edit Profile</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingButton}>
            <Text style={styles.settingButtonText}>Change Password</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingButton}>
            <Text style={styles.settingButtonText}>Payment Methods</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>App Version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Build Number</Text>
            <Text style={styles.aboutValue}>2024.01.01</Text>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 12,
  },
  settingItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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
  settingLeft: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#636E72',
  },
  settingButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
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
  settingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  arrowIcon: {
    fontSize: 20,
    color: '#A4B0BE',
    fontWeight: 'bold',
  },
  aboutItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aboutLabel: {
    fontSize: 16,
    color: '#636E72',
  },
  aboutValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  bottomSpacing: {
    height: 20,
  },
});

export default SettingsView;






















