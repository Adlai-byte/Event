import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, Redirect, useRouter, usePathname } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { AppLayout } from '../../mvc/components/layout/AppLayout';

const routeTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  bookings: 'My Bookings',
  messages: 'Messages',
  hiring: 'Hiring',
  profile: 'Profile',
  events: 'Event Workspace',
  'personal-info': 'Personal Information',
  settings: 'Settings',
  'help-center': 'Help Center',
  'payment-methods': 'Payment Methods',
  notifications: 'Notifications',
  service: 'Service Details',
  provider: 'Provider Profile',
};

const routeKeyMap: Record<string, string> = {
  personalInfo: 'personal-info',
  helpCenter: 'help-center',
  paymentMethods: 'payment-methods',
  tips: 'help-center',
};

export default function UserLayout() {
  const { user, isAuthenticated, isLoading, logoutVoid } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  if (user?.role === 'admin' || user?.role === 'provider') {
    return <Redirect href="/" />;
  }

  const pathSegments = pathname.replace(/^\/user\/?/, '').split('/');
  const activeRoute = pathSegments[0] || 'dashboard';
  const title = routeTitles[activeRoute] || 'Dashboard';

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/user/${mapped}` as any);
  };

  return (
    <AppLayout
      role="user"
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
