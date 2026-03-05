// mvc/components/layout/Sidebar.tsx
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, semantic, typography, spacing, borderRadius } from '../../theme';
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
        <Text style={styles.logo}>E-VENT</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close menu">
            <Feather name="x" size={20} color={colors.neutral[400]} />
          </TouchableOpacity>
        )}
      </View>

      {/* User info */}
      {user && (
        <View style={styles.userSection}>
          <Avatar uri={user.profilePicture} name={displayName} size={36} />
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
              <View style={styles.navIconContainer}>
                <Feather
                  name={item.icon}
                  size={18}
                  color={isActive ? colors.neutral[0] : colors.neutral[400]}
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

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} accessibilityLabel="Log out">
        <View style={styles.navIconContainer}>
          <Feather name="log-out" size={18} color={colors.neutral[400]} />
        </View>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;
  return StyleSheet.create({
    container: {
      width: Math.min(280, screenWidth * 0.8),
      backgroundColor: semantic.sidebarBg,
      paddingVertical: spacing.lg,
      height: '100%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
    },
    logo: {
      ...typography.h1,
      color: colors.neutral[0],
    },
    userSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.xl,
      paddingBottom: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.dark[800],
    },
    userInfo: {
      marginLeft: spacing.md,
      flex: 1,
    },
    userName: {
      ...typography.label,
      color: colors.neutral[0],
    },
    userEmail: {
      ...typography.caption,
      ...(isExtraSmall ? { fontSize: 11 } : {}),
      color: colors.neutral[400],
    },
    nav: {
      flex: 1,
      paddingHorizontal: spacing.sm,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.xs,
    },
    navItemActive: {
      backgroundColor: semantic.sidebarActive,
    },
    navIconContainer: {
      width: 28,
      alignItems: 'center',
    },
    navLabel: {
      ...typography.body,
      color: colors.neutral[400],
      flex: 1,
      marginLeft: spacing.sm,
    },
    navLabelActive: {
      color: colors.neutral[0],
      fontWeight: '600',
    },
    badge: {
      backgroundColor: colors.error[500],
      borderRadius: borderRadius.full,
      minWidth: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      ...typography.caption,
      color: colors.neutral[0],
      fontWeight: '700',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.dark[800],
      marginTop: spacing.sm,
    },
    logoutText: {
      ...typography.body,
      color: colors.neutral[400],
      marginLeft: spacing.sm,
    },
  });
};
