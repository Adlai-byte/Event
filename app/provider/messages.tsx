import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { MessagingView } from '../../mvc/views/provider/MessagingView';

const routeKeyMap: Record<string, string> = {
  paymentSetup: 'payment-setup',
  personalInfo: 'personal-info',
};

export default function ProviderMessages() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/provider/${mapped}` as any);
  };

  return (
    <MessagingView
      userId={user?.uid || ''}
      user={user || undefined}
      onBack={() => router.push('/provider/dashboard' as any)}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    />
  );
}
