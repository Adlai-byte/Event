import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { getApiBaseUrl } from '../services/api';
import type { Booking } from '../components/booking/types';

interface UseBookingDataOptions {
  userEmail?: string;
  refreshKey?: number;
}

function mapBooking(b: any): Booking {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(b.b_event_date);
  eventDate.setHours(0, 0, 0, 0);
  const isPast = (eventDate < today || b.b_status === 'completed') && b.b_status !== 'cancelled';

  let formattedDate = '';
  let dateRangeInfo = null;

  if (b.b_notes) {
    try {
      dateRangeInfo = JSON.parse(b.b_notes);
      if (dateRangeInfo.startDate && dateRangeInfo.endDate) {
        const allDates = dateRangeInfo.allDates || [];
        const startDate = new Date(dateRangeInfo.startDate);
        const endDate = new Date(dateRangeInfo.endDate);
        const daysDiff =
          Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const isConsecutive = allDates.length === daysDiff;

        if (isConsecutive && allDates.length > 1) {
          formattedDate = `${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        } else if (allDates.length > 1) {
          formattedDate = allDates
            .map((dateStr: string) =>
              new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            )
            .join(' and ');
        } else if (allDates.length === 1) {
          formattedDate = new Date(allDates[0]).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
        } else {
          formattedDate = `${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        }
      }
    } catch {
      // Notes is not JSON
    }
  }

  if (!formattedDate) {
    formattedDate = eventDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const startTime = b.b_start_time
    ? new Date(`2000-01-01T${b.b_start_time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';
  const endTime = b.b_end_time
    ? new Date(`2000-01-01T${b.b_end_time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : '';
  const timeStr = startTime && endTime ? `${startTime} - ${endTime}` : '';

  let imageUrl = null;
  if (b.primary_image) {
    const imageData = b.primary_image;
    if (imageData.startsWith('/uploads/')) {
      imageUrl = `${getApiBaseUrl()}${imageData}`;
    } else if (imageData.startsWith('data:image')) {
      imageUrl = imageData;
    } else if (imageData.length > 100) {
      imageUrl = `data:image/jpeg;base64,${imageData}`;
    } else {
      imageUrl = imageData;
    }
  }

  let finalStatus = b.b_status || 'pending';
  const isPaidValue = b.is_paid === 1 || b.is_paid === true;
  if (finalStatus === 'completed' && !isPaidValue) {
    finalStatus = 'cancelled';
  }

  return {
    id: b.idbooking.toString(),
    title: b.b_event_name || 'Untitled Event',
    date: formattedDate,
    dateStr: b.b_event_date,
    time: timeStr,
    startTime: b.b_start_time || '09:00:00',
    endTime: b.b_end_time || '10:00:00',
    location: b.b_location || 'Location not specified',
    attendees: b.b_attendees || 0,
    status: isPast ? (finalStatus === 'completed' ? 'completed' : 'past') : 'upcoming',
    bookingStatus: finalStatus,
    isPaid: isPaidValue,
    image: imageUrl || null,
    description:
      (dateRangeInfo ? null : b.b_notes) || b.b_event_name || 'No description available.',
    suppliers: Array.isArray(b.services) ? b.services : [],
    services: Array.isArray(b.serviceDetails)
      ? b.serviceDetails.map((s: any) => ({
          serviceId: s.serviceId,
          name: s.name,
          description: s.description,
          quantity: s.quantity,
          unitPrice: s.unitPrice,
          totalPrice: s.totalPrice,
        }))
      : [],
    totalCost: parseFloat(b.b_total_cost) || 0,
    depositPaid: b.b_deposit_paid === 1 || b.b_deposit_paid === true,
    balanceDueDate: b.b_balance_due_date || null,
  } as Booking;
}

export function useBookingData({ userEmail, refreshKey }: UseBookingDataOptions) {
  const queryClient = useQueryClient();
  const [serviceRatings, setServiceRatings] = useState<
    Record<number, { rating: number; comment: string | null }>
  >({});

  const bookingsQuery = useQuery({
    queryKey: ['user-bookings', userEmail, refreshKey],
    queryFn: async () => {
      const data = await apiClient.get('/api/user/bookings', { email: userEmail! });
      const rows = data.data?.rows ?? data.rows;
      if (data.ok && Array.isArray(rows)) {
        return rows.map(mapBooking);
      }
      return [];
    },
    enabled: !!userEmail,
  });

  const loadServiceRatings = useCallback(
    async (bookingId: string, services: Array<{ serviceId?: number }>) => {
      if (!userEmail) return;

      const ratings: Record<number, { rating: number; comment: string | null }> = {};

      for (const service of services) {
        if (!service.serviceId) continue;

        try {
          const data = await apiClient.get(
            `/api/bookings/${bookingId}/services/${service.serviceId}/rating`,
            { email: userEmail },
          );
          if (data.ok && data.rating) {
            ratings[service.serviceId] = {
              rating: data.rating.rating,
              comment: data.rating.comment,
            };
          }
        } catch (error) {
          if (__DEV__)
            console.error(`Error loading rating for service ${service.serviceId}:`, error);
        }
      }

      setServiceRatings(ratings);
    },
    [userEmail],
  );

  const loadBookings = () => {
    queryClient.invalidateQueries({ queryKey: ['user-bookings', userEmail] });
  };

  return {
    bookings: bookingsQuery.data ?? [],
    loading: bookingsQuery.isLoading,
    serviceRatings,
    loadBookings,
    loadServiceRatings,
  };
}
