import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import AdminBookingsView from '../../mvc/views/admin/BookingsView';

const routeKeyMap: Record<string, string> = {
  user: 'users',
  providerApplications: 'provider-applications',
};

export default function AdminBookings() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/admin/${mapped}` as any);
  };

  return (
    <AdminBookingsView
      user={user || undefined}
      onLogout={logoutVoid}
      onNavigate={handleNavigate}
    />
  );
}
