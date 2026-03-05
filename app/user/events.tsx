import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { EventsView } from '../../mvc/views/user/EventsView';
import { EventDetailView } from '../../mvc/views/user/EventDetailView';

const routeKeyMap: Record<string, string> = {
  personalInfo: 'personal-info',
  helpCenter: 'help-center',
  paymentMethods: 'payment-methods',
  tips: 'help-center',
};

export default function EventsRoute() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string }>();

  const handleNavigate = (route: string) => {
    if (route.startsWith('events/')) {
      const id = route.split('/')[1];
      router.push(`/user/events?eventId=${id}` as any);
      return;
    }
    const mapped = routeKeyMap[route] || route;
    router.push(`/user/${mapped}` as any);
  };

  const handleBack = () => {
    router.push('/user/events' as any);
  };

  if (params.eventId) {
    return (
      <EventDetailView
        eventId={Number(params.eventId)}
        userId={user?.uid || ''}
        userEmail={user?.email || undefined}
        user={user || undefined}
        onNavigate={handleNavigate}
        onLogout={logoutVoid}
        onBack={handleBack}
      />
    );
  }

  return (
    <EventsView
      userId={user?.uid || ''}
      userEmail={user?.email || undefined}
      user={user || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    />
  );
}
