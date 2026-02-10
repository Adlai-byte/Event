import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { HelpCenterView } from '../../mvc/views/user/HelpCenterView';

const routeKeyMap: Record<string, string> = {
  personalInfo: 'personal-info',
  helpCenter: 'help-center',
  paymentMethods: 'payment-methods',
  tips: 'help-center',
};

export default function HelpCenterRoute() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/user/${mapped}` as any);
  };

  return (
    <HelpCenterView
      user={user || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    />
  );
}
