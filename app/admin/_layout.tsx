import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, Redirect, usePathname, useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { AppLayout } from '../../mvc/components/layout/AppLayout';

const routeTitleMap: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'User Management',
  services: 'Services',
  bookings: 'Bookings',
  analytics: 'Analytics',
  messages: 'Messages',
  'provider-applications': 'Provider Applications',
};

// Sidebar key → URL segment
const sidebarKeyToUrl: Record<string, string> = {
  user: 'users',
  providerApplications: 'provider-applications',
};

// URL segment → Sidebar key (reverse mapping for active state)
const urlToSidebarKey: Record<string, string> = {
  users: 'user',
  'provider-applications': 'providerApplications',
};

export default function AdminLayout() {
  const { user, isAuthenticated, isLoading, logoutVoid } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (user?.role !== 'admin') {
    return <Redirect href="/" />;
  }

  const segments = pathname.split('/').filter(Boolean);
  const urlSegment = segments[1] || 'dashboard';
  // Map URL segment back to Sidebar nav key for active state highlight
  const activeRoute = urlToSidebarKey[urlSegment] || urlSegment;
  const title = routeTitleMap[urlSegment] || 'Dashboard';

  const handleNavigate = (route: string) => {
    const mapped = sidebarKeyToUrl[route] || route;
    router.push(`/admin/${mapped}` as any);
  };

  return (
    <AppLayout
      role="admin"
      activeRoute={activeRoute}
      title={title}
      user={user || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    >
      <Slot />
    </AppLayout>
  );
}
