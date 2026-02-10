import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { MessagingView } from '../../mvc/views/user/MessagingView';

const routeKeyMap: Record<string, string> = {
  personalInfo: 'personal-info',
  helpCenter: 'help-center',
  paymentMethods: 'payment-methods',
  tips: 'help-center',
};

export default function MessagesRoute() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId?: string }>();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/user/${mapped}` as any);
  };

  return (
    <MessagingView
      userId={user?.uid || ''}
      userEmail={user?.email || undefined}
      user={user || undefined}
      conversationId={conversationId || undefined}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
    />
  );
}
