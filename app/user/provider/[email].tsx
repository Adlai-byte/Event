import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../mvc/contexts/AuthContext';
import { ProviderProfileView } from '../../../mvc/views/user/ProviderProfileView';

export default function ProviderProfileRoute() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();

  return (
    <ProviderProfileView
      providerEmail={decodeURIComponent(email)}
      user={user || undefined}
      onNavigate={(route: string) => {
        if (route === 'dashboard') router.push('/user/dashboard');
        else router.push(`/user/${route}` as any);
      }}
      onLogout={logoutVoid}
      onNavigateToService={(serviceId: string) => router.push(`/user/service/${serviceId}` as any)}
    />
  );
}
