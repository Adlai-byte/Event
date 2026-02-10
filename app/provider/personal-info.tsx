import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { useUpdateUser } from '../../mvc/hooks/useUpdateUser';
import { PersonalInfoView } from '../../mvc/views/user/PersonalInfoView';

const routeKeyMap: Record<string, string> = {
  paymentSetup: 'payment-setup',
  personalInfo: 'personal-info',
};

export default function ProviderPersonalInfo() {
  const { user, logoutVoid, sendVerificationEmail, checkEmailVerification } = useAuth();
  const { saveUser } = useUpdateUser();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    const mapped = routeKeyMap[route] || route;
    router.push(`/provider/${mapped}` as any);
  };

  return (
    <PersonalInfoView
      user={user!}
      onNavigate={handleNavigate}
      onLogout={logoutVoid}
      onSave={saveUser}
      onSendVerificationEmail={sendVerificationEmail}
      onCheckVerification={checkEmailVerification}
    />
  );
}
