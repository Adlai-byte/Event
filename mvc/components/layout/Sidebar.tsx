// mvc/components/layout/Sidebar.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '../ui/Avatar';
import { useBreakpoints } from '../../hooks/useBreakpoints';

type Role = 'user' | 'provider' | 'admin';

interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
}

interface SidebarProps {
  role: Role;
  activeRoute: string;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  unreadMessages?: number;
  onNavigate: (route: string) => void;
  onLogout: () => void;
  onClose?: () => void;
}

const navItemsByRole: Record<Role, NavItem[]> = {
  user: [
    { key: 'dashboard', label: 'Dashboard', icon: 'home' },
    { key: 'bookings', label: 'Bookings', icon: 'calendar' },
    { key: 'events', label: 'Events', icon: 'layers' },
    { key: 'messages', label: 'Messages', icon: 'message-circle' },
    { key: 'hiring', label: 'Hiring', icon: 'briefcase' },
    { key: 'profile', label: 'Profile', icon: 'user' },
    { key: 'notifications', label: 'Notifications', icon: 'bell' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ],
  provider: [
    { key: 'dashboard', label: 'Dashboard', icon: 'home' },
    { key: 'services', label: 'Services', icon: 'tool' },
    { key: 'bookings', label: 'Bookings', icon: 'calendar' },
    { key: 'availability', label: 'Availability', icon: 'clock' },
    { key: 'cancellation-policies', label: 'Policies', icon: 'shield' },
    { key: 'proposals', label: 'Proposals', icon: 'file-text' },
    { key: 'hiring', label: 'Hiring', icon: 'briefcase' },
    { key: 'messages', label: 'Messages', icon: 'message-circle' },
    { key: 'shared-events', label: 'Shared Events', icon: 'users' },
    { key: 'analytics', label: 'Analytics', icon: 'bar-chart-2' },
    { key: 'profile', label: 'Profile', icon: 'user' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ],
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: 'home' },
    { key: 'user', label: 'Users', icon: 'users' },
    { key: 'services', label: 'Services', icon: 'tool' },
    { key: 'bookings', label: 'Bookings', icon: 'calendar' },
    { key: 'analytics', label: 'Analytics', icon: 'bar-chart-2' },
    { key: 'messages', label: 'Messages', icon: 'message-circle' },
    { key: 'providerApplications', label: 'Applications', icon: 'clipboard' },
  ],
};

export function Sidebar({
  role,
  activeRoute,
  user,
  unreadMessages = 0,
  onNavigate,
  onLogout,
  onClose,
}: SidebarProps) {
  const { screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(screenWidth), [screenWidth]);
  const items = navItemsByRole[role];
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoDot} />
          <Text style={styles.logo}>E-VENT</Text>
        </View>
        {onClose && (
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close menu">
            <Feather name="x" size={20} color="#94A3B8" />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation */}
      <ScrollView style={styles.nav} showsVerticalScrollIndicator={false}>
        {items.map((item) => {
          const isActive = activeRoute === item.key;
          const showBadge = item.key === 'messages' && unreadMessages > 0;

          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => onNavigate(item.key)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: isActive }}
            >
              {isActive && <View style={styles.activeAccent} />}
              <View style={styles.navIconContainer}>
                <Feather
                  name={item.icon}
                  size={18}
                  color={isActive ? '#2563EB' : '#94A3B8'}
                />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadMessages > 99 ? '99+' : unreadMessages}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* User + Logout */}
      <View style={styles.footer}>
        {user && (
          <View style={styles.userSection}>
            <Avatar uri={user.profilePicture} name={displayName} size={32} />
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {user.email}
              </Text>
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout} accessibilityLabel="Log out">
          <Feather name="log-out" size={16} color="#94A3B8" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (screenWidth: number) => {
  return StyleSheet.create({
    container: {
      width: Math.min(260, screenWidth * 0.8),
      backgroundColor: '#FFFFFF',
      borderRightWidth: 1,
      borderRightColor: '#E2E8F0',
      height: '100%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
    },
    logoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#2563EB',
      marginRight: 10,
    },
    logo: {
      fontSize: 18,
      fontWeight: '700',
      color: '#0F172A',
      letterSpacing: -0.3,
    },
    nav: {
      flex: 1,
      paddingHorizontal: 8,
      paddingTop: 12,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 2,
      position: 'relative',
    },
    navItemActive: {
      backgroundColor: '#EFF6FF',
    },
    activeAccent: {
      position: 'absolute',
      left: 0,
      top: 8,
      bottom: 8,
      width: 3,
      borderRadius: 2,
      backgroundColor: '#2563EB',
    },
    navIconContainer: {
      width: 28,
      alignItems: 'center',
    },
    navLabel: {
      fontSize: 14,
      color: '#64748B',
      flex: 1,
      marginLeft: 8,
    },
    navLabelActive: {
      color: '#2563EB',
      fontWeight: '600',
    },
    badge: {
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    userSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    userInfo: {
      marginLeft: 10,
      flex: 1,
    },
    userName: {
      fontSize: 13,
      fontWeight: '600',
      color: '#0F172A',
    },
    userEmail: {
      fontSize: 11,
      color: '#94A3B8',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      gap: 8,
    },
    logoutText: {
      fontSize: 13,
      color: '#94A3B8',
      fontWeight: '500',
    },
  });
};
