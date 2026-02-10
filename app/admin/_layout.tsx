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

const routeKeyMap: Record<string, string> = {
  user: 'users',
  providerApplications: 'provider-applications',
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

  const segments = pathname.split('/');
  const activeRoute = segments[segments.length - 1] || 'dashboard';
  const title = routeTitleMap[activeRoute] || 'Dashboard';

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
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
