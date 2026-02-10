import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { ProfileView } from '../../mvc/views/user/ProfileView';

const routeKeyMap: Record<string, string> = {
  personalInfo: 'personal-info',
  helpCenter: 'help-center',
  paymentMethods: 'payment-methods',
  tips: 'help-center',
};

export default function ProfileRoute() {
  const { user, authState, logout } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/user/${mapped}` as any);
  };

  return (
    <ProfileView
      user={user!}
      authState={authState}
      onLogout={logout}
      onNavigateToPersonalInfo={() => router.push('/user/personal-info')}
      onNavigateToHelpCenter={() => router.push('/user/help-center')}
      onNavigate={handleNavigate}
    />
  );
}
