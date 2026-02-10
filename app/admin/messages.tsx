import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { MessagingView as AdminMessagingView } from '../../mvc/views/admin/MessagingView';

const routeKeyMap: Record<string, string> = {
  user: 'users',
  providerApplications: 'provider-applications',
};

export default function AdminMessages() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/admin/${mapped}` as any);
  };

  return (
    <AdminMessagingView
      userId={user?.uid || ''}
      user={user || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    />
  );
}
