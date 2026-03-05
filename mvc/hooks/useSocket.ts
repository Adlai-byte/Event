// mvc/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectSocket, disconnectSocket } from '../services/socketClient';

/**
 * Manages socket connection lifecycle tied to auth state.
 * Listens for server events and invalidates React Query caches.
 * Call this once in the root layout or auth-gated wrapper.
 */
export function useSocket(userEmail: string | undefined) {
  const queryClient = useQueryClient();
  const emailRef = useRef(userEmail);
  emailRef.current = userEmail;

  useEffect(() => {
    if (!userEmail) {
      disconnectSocket();
      return;
    }

    const socket = connectSocket(userEmail);

    const onUnreadUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['unread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    };

    const onNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-notifications'] });
    };

    const onBookingUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
    };

    const onHiringUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['provider-job-postings'] });
      queryClient.invalidateQueries({ queryKey: ['provider-applications'] });
      queryClient.invalidateQueries({ queryKey: ['user-job-postings'] });
      queryClient.invalidateQueries({ queryKey: ['user-applications'] });
    };

    const onAvailabilityUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['availability-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
      queryClient.invalidateQueries({ queryKey: ['availability-check'] });
    };

    const onEventUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['user-events'] });
      queryClient.invalidateQueries({ queryKey: ['user-event'] });
      queryClient.invalidateQueries({ queryKey: ['event-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['event-budget'] });
      queryClient.invalidateQueries({ queryKey: ['event-checklist'] });
      queryClient.invalidateQueries({ queryKey: ['event-timeline'] });
    };

    socket.on('unread-update', onUnreadUpdate);
    socket.on('new-notification', onNewNotification);
    socket.on('booking-update', onBookingUpdate);
    socket.on('hiring-update', onHiringUpdate);
    socket.on('availability-update', onAvailabilityUpdate);
    socket.on('event-update', onEventUpdate);

    return () => {
      socket.off('unread-update', onUnreadUpdate);
      socket.off('new-notification', onNewNotification);
      socket.off('booking-update', onBookingUpdate);
      socket.off('hiring-update', onHiringUpdate);
      socket.off('availability-update', onAvailabilityUpdate);
      socket.off('event-update', onEventUpdate);
      disconnectSocket();
    };
  }, [userEmail, queryClient]);
}
