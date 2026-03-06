import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../mvc/contexts/AuthContext';
import { DashboardView } from '../../mvc/views/user/DashboardView';

export default function DashboardRoute() {
  const { user, authState, logout } = useAuth();
  const router = useRouter();
  const { bookServiceId, bookPackageId } = useLocalSearchParams<{
    bookServiceId?: string;
    bookPackageId?: string;
  }>();

  return (
    <DashboardView
      user={user!}
      authState={authState}
      onLogout={logout}
      onNavigate={(route: string) => router.push(`/user/${route}` as any)}
      onNavigateToBookings={() => router.push('/user/bookings')}
      onNavigateToMessages={() => router.push('/user/messages')}
      onNavigateToHiring={() => router.push('/user/hiring')}
      onNavigateToProfile={() => router.push('/user/profile')}
      onNavigateToNotifications={() => router.push('/user/notifications')}
      onNavigateToLikes={() => {}}
      onNavigateToFeatured={() => {}}
      onNavigateToNearby={() => {}}
      onNavigateToPhotography={() => {}}
      onNavigateToVenues={() => {}}
      onNavigateToMusic={() => {}}
      onNavigateToEventDetails={(id: string) => router.push(`/user/service/${id}` as any)}
      onNavigateToProviderProfile={(email: string) =>
        router.push(`/user/provider/${encodeURIComponent(email)}` as any)
      }
      onNavigateToPersonalInfo={() => router.push('/user/personal-info')}
      serviceIdToBook={bookServiceId || null}
      packageIdToBook={bookPackageId ? Number(bookPackageId) : undefined}
      onBookingModalClosed={() => {
        // Clear query params after modal closes
        router.replace('/user/dashboard' as any);
      }}
    />
  );
}
