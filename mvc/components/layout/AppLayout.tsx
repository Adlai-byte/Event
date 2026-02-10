// mvc/components/layout/AppLayout.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { semantic, spacing } from '../../theme';
import { getApiBaseUrl } from '../../services/api';
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
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  // Shared unread message count - fetched ONCE here instead of in every view
  const loadUnreadMessages = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/user/messages/count?email=${encodeURIComponent(user.email)}`
      );
      const data = await res.json();
      if (data.ok) setUnreadMessages(data.count || 0);
    } catch {
      // Silently ignore fetch errors
    }
  }, [user?.email]);

  const loadNotificationCount = useCallback(async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/notifications/unread-count?email=${encodeURIComponent(user.email)}`
      );
      const data = await res.json();
      if (data.ok) setNotificationCount(data.count || 0);
    } catch {
      // Silently ignore fetch errors
    }
  }, [user?.email]);

  useEffect(() => {
    loadUnreadMessages();
    loadNotificationCount();
    const interval = setInterval(() => {
      loadUnreadMessages();
      loadNotificationCount();
    }, 30000); // Poll every 30s instead of 2-3s
    return () => clearInterval(interval);
  }, [loadUnreadMessages, loadNotificationCount]);

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
          <Pressable style={styles.drawerBackdrop} onPress={() => setSidebarOpen(false)} />
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
