import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../mvc/contexts/AuthContext';
import { ServiceDetailsView } from '../../../mvc/views/user/ServiceDetailsView';

export default function ServiceDetailsRoute() {
  const { user, logoutVoid } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <ServiceDetailsView
      serviceId={id}
      user={user || undefined}
      onNavigate={(route: string) => {
        if (route === 'dashboard') router.push('/user/dashboard');
        else router.push(`/user/${route}` as any);
      }}
      onLogout={logoutVoid}
      onNavigateToProviderProfile={(email: string) =>
        router.push(`/user/provider/${encodeURIComponent(email)}` as any)
      }
      onBookNow={(serviceId: string, packageId?: number) =>
        router.push(
          `/user/dashboard?bookServiceId=${serviceId}${packageId ? `&bookPackageId=${packageId}` : ''}` as any,
        )
      }
    />
  );
}
