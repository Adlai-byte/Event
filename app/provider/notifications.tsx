import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { NotificationView } from '../../mvc/views/user/NotificationView';

const routeKeyMap: Record<string, string> = {
  paymentSetup: 'payment-setup',
  personalInfo: 'personal-info',
};

export default function ProviderNotifications() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/provider/${mapped}` as any);
  };

  return (
    <NotificationView
      userEmail={user?.email || ''}
      user={user || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    />
  );
}
