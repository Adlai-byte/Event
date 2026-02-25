// mvc/components/layout/AppLayout.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { semantic, spacing } from '../../theme';
import { apiClient } from '../../services/apiClient';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

type Role = 'user' | 'provider' | 'admin';

interface AppLayoutProps {
  children: React.ReactNode;
  role: Role;
  activeRoute: string;
  title: string;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    profilePicture?: string;
  };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

const mobileNavItems: Record<Role, { key: string; label: string; icon: string }[]> = {
  user: [
    { key: 'dashboard', label: 'Home', icon: '\u{1F3E0}' },
    { key: 'bookings', label: 'Bookings', icon: '\u{1F4C5}' },
    { key: 'messages', label: 'Messages', icon: '\u{1F4AC}' },
    { key: 'hiring', label: 'Hiring', icon: '\u{1F4BC}' },
    { key: 'profile', label: 'Profile', icon: '\u{1F464}' },
  ],
  provider: [
    { key: 'dashboard', label: 'Home', icon: '\u{1F3E0}' },
    { key: 'services', label: 'Services', icon: '\u{1F6E0}\uFE0F' },
    { key: 'bookings', label: 'Bookings', icon: '\u{1F4C5}' },
    { key: 'messages', label: 'Messages', icon: '\u{1F4AC}' },
    { key: 'profile', label: 'Profile', icon: '\u{1F464}' },
  ],
  admin: [
    { key: 'dashboard', label: 'Home', icon: '\u{1F3E0}' },
    { key: 'user', label: 'Users', icon: '\u{1F465}' },
    { key: 'services', label: 'Services', icon: '\u{1F6E0}\uFE0F' },
    { key: 'messages', label: 'Messages', icon: '\u{1F4AC}' },
    { key: 'providerApplications', label: 'Apps', icon: '\u{1F4CB}' },
  ],
};

export function AppLayout({
  children,
  role,
  activeRoute,
  title,
  user,
  onNavigate,
  onLogout,
}: AppLayoutProps) {
  const { isMobile } = useBreakpoints();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: unreadMessages = 0 } = useQuery({
    queryKey: ['unread-messages', user?.email],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; count?: number }>('/api/user/messages/count', { email: user!.email });
      return data.ok ? (data.count || 0) : 0;
    },
    enabled: !!user?.email,
    refetchInterval: 60000,
  });

  const { data: notificationCount = 0 } = useQuery({
    queryKey: ['unread-notifications', user?.email],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; count?: number }>('/api/notifications/unread-count', { email: user!.email });
      return data.ok ? (data.count || 0) : 0;
    },
    enabled: !!user?.email,
    refetchInterval: 60000,
  });

  const handleNavigate = (route: string) => {
    setSidebarOpen(false);
    onNavigate(route);
  };

  // Desktop: sidebar + content
  if (!isMobile) {
    return (
      <View style={styles.desktopContainer}>
        <Sidebar
          role={role}
          activeRoute={activeRoute}
          user={user}
          unreadMessages={unreadMessages}
          onNavigate={handleNavigate}
          onLogout={onLogout}
        />
        <View style={styles.desktopContent}>
          <Header
            title={title}
            notificationCount={notificationCount}
            onNotificationPress={() => handleNavigate('notifications')}
          />
          <View style={styles.pageContent}>
            {children}
          </View>
        </View>
      </View>
    );
  }

  // Mobile: header + content + bottom nav (+ drawer sidebar)
  return (
    <View style={styles.mobileContainer}>
      <Header
        title={title}
        showMenu
        notificationCount={notificationCount}
        onMenuPress={() => setSidebarOpen(true)}
        onNotificationPress={() => handleNavigate('notifications')}
      />
      <View style={styles.mobileContent}>
        {children}
      </View>
      <BottomNav
        items={mobileNavItems[role]}
        activeRoute={activeRoute}
        unreadMessages={unreadMessages}
        onNavigate={handleNavigate}
      />

      {/* Mobile sidebar drawer */}
      <Modal visible={sidebarOpen} transparent animationType="none">
        <View style={styles.drawerOverlay}>
          <Pressable style={styles.drawerBackdrop} onPress={() => setSidebarOpen(false)} accessibilityLabel="Close menu" />
          <Sidebar
            role={role}
            activeRoute={activeRoute}
            user={user}
            unreadMessages={unreadMessages}
            onNavigate={handleNavigate}
            onLogout={onLogout}
            onClose={() => setSidebarOpen(false)}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: semantic.background,
  },
  desktopContent: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    padding: spacing.xl,
  },
  mobileContainer: {
    flex: 1,
    backgroundColor: semantic.background,
  },
  mobileContent: {
    flex: 1,
  },
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
