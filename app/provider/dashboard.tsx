import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { DashboardView } from '../../mvc/views/provider/DashboardView';

const routeKeyMap: Record<string, string> = {
  paymentSetup: 'payment-setup',
  personalInfo: 'personal-info',
};

export default function ProviderDashboard() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/provider/${mapped}` as any);
  };

  return (
    <DashboardView
      user={user || undefined}
      onLogout={logoutVoid}
      onNavigate={handleNavigate}
    />
  );
}
