import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { SharedEventsView } from '../../mvc/views/provider/SharedEventsView';

export default function SharedEventsRoute() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    router.push(`/provider/${route}` as any);
  };

  return (
    <SharedEventsView
      userId={user?.uid || ''}
      userEmail={user?.email || undefined}
      user={user || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    />
  );
}
