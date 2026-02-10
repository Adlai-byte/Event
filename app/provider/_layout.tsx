import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Slot, Redirect, usePathname, useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { AppLayout } from '../../mvc/components/layout/AppLayout';

const routeTitleMap: Record<string, string> = {
  dashboard: 'Dashboard',
  services: 'My Services',
  bookings: 'Bookings',
  proposals: 'Proposals',
  hiring: 'Hiring',
  messages: 'Messages',
  analytics: 'Analytics',
  profile: 'Profile',
  settings: 'Settings',
  'payment-setup': 'Payment Setup',
  'personal-info': 'Personal Information',
  notifications: 'Notifications',
};

const routeKeyMap: Record<string, string> = {
  paymentSetup: 'payment-setup',
  personalInfo: 'personal-info',
};

export default function ProviderLayout() {
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

  if (user?.role !== 'provider') {
    return <Redirect href="/" />;
  }

  const segments = pathname.split('/').filter(Boolean);
  const activeRoute = segments[1] || 'dashboard';
  const title = routeTitleMap[activeRoute] || 'Dashboard';

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/provider/${mapped}` as any);
  };

  return (
    <AppLayout
      role="provider"
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
