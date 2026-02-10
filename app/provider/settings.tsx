import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { SettingsView } from '../../mvc/views/provider/SettingsView';

const routeKeyMap: Record<string, string> = {
  paymentSetup: 'payment-setup',
  personalInfo: 'personal-info',
};

export default function ProviderSettings() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/provider/${mapped}` as any);
  };

  return (
    <SettingsView
      user={user!}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    />
  );
}
