import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { BookingView } from '../../mvc/views/user/BookingView';

const routeKeyMap: Record<string, string> = {
  personalInfo: 'personal-info',
  helpCenter: 'help-center',
  paymentMethods: 'payment-methods',
  tips: 'help-center',
};

export default function BookingsRoute() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/user/${mapped}` as any);
  };

  return (
    <BookingView
      userId={user?.uid || ''}
      userEmail={user?.email || undefined}
      user={user || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
      onNavigateToBookingDetails={(_bookingId: string) => {}}
      onNavigateToMessages={(conversationId: string) =>
        router.push(`/user/messages?conversationId=${conversationId}` as any)
      }
      onNavigateToEditEvent={(_eventId: string) => {}}
    />
  );
}
