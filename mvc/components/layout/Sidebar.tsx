// mvc/components/layout/Sidebar.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { colors, semantic, typography, spacing, shadow, borderRadius } from '../../theme';
import { Avatar } from '../ui/Avatar';

type Role = 'user' | 'provider' | 'admin';

interface NavItem {
  key: string;
  label: string;
  icon: string;
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
    { key: 'dashboard', label: 'Dashboard', icon: '\u{1F3E0}' },
    { key: 'bookings', label: 'Bookings', icon: '\u{1F4C5}' },
    { key: 'messages', label: 'Messages', icon: '\u{1F4AC}' },
    { key: 'hiring', label: 'Hiring', icon: '\u{1F4BC}' },
    { key: 'profile', label: 'Profile', icon: '\u{1F464}' },
    { key: 'notifications', label: 'Notifications', icon: '\u{1F514}' },
    { key: 'settings', label: 'Settings', icon: '\u2699\uFE0F' },
  ],
  provider: [
    { key: 'dashboard', label: 'Dashboard', icon: '\u{1F3E0}' },
    { key: 'services', label: 'Services', icon: '\u{1F6E0}\uFE0F' },
    { key: 'bookings', label: 'Bookings', icon: '\u{1F4C5}' },
    { key: 'proposals', label: 'Proposals', icon: '\u{1F4DD}' },
    { key: 'hiring', label: 'Hiring', icon: '\u{1F4BC}' },
    { key: 'messages', label: 'Messages', icon: '\u{1F4AC}' },
    { key: 'analytics', label: 'Analytics', icon: '\u{1F4CA}' },
    { key: 'profile', label: 'Profile', icon: '\u{1F464}' },
    { key: 'settings', label: 'Settings', icon: '\u2699\uFE0F' },
  ],
  admin: [
    { key: 'dashboard', label: 'Dashboard', icon: '\u{1F3E0}' },
    { key: 'user', label: 'Users', icon: '\u{1F465}' },
    { key: 'services', label: 'Services', icon: '\u{1F6E0}\uFE0F' },
    { key: 'bookings', label: 'Bookings', icon: '\u{1F4C5}' },
    { key: 'analytics', label: 'Analytics', icon: '\u{1F4CA}' },
    { key: 'messages', label: 'Messages', icon: '\u{1F4AC}' },
    { key: 'providerApplications', label: 'Applications', icon: '\u{1F4CB}' },
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
  const items = navItemsByRole[role];
  const displayName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>E-VENT</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} accessibilityLabel="Close menu">
            <Text style={styles.closeButton}>{'\u2715'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* User info */}
      {user && (
        <View style={styles.userSection}>
          <Avatar uri={user.profilePicture} name={displayName} size={36} />
          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.userEmail} numberOfLines={1}>{user.email}</Text>
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
              <Text style={styles.navIcon}>{item.icon}</Text>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
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
        <Text style={styles.navIcon}>{'\u{1F6AA}'}</Text>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 250,
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
  closeButton: {
    color: colors.neutral[400],
    fontSize: 20,
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
  navIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
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
