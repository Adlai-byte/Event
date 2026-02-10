import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { HiringView } from '../../mvc/views/user/HiringView';

const routeKeyMap: Record<string, string> = {
  personalInfo: 'personal-info',
  helpCenter: 'help-center',
  paymentMethods: 'payment-methods',
  tips: 'help-center',
};

export default function HiringRoute() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/user/${mapped}` as any);
  };

  return (
    <HiringView
      userId={user?.uid || ''}
      userEmail={user?.email || undefined}
      userType="client"
      user={user || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    />
  );
}
