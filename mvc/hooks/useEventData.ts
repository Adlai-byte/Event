import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type EventStatus = 'planning' | 'upcoming' | 'in_progress' | 'completed' | 'cancelled';

export interface EventItem {
  id: number;
  userId: number;
  name: string;
  date: string;
  endDate: string | null;
  location: string | null;
  budget: number;
  guestCount: number | null;
  description: string | null;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: number;
  eventId: number;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
  category: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface TimelineEntry {
  id: number;
  eventId: number;
  startTime: string;
  endTime: string | null;
  title: string;
  description: string | null;
  bookingId: number | null;
  bookingName: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface EventBooking {
  id: number;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  totalCost: number;
  status: string;
  serviceName: string | null;
  serviceCategory: string | null;
  providerName: string | null;
  primaryImage: string | null;
  isPaid: boolean;
  depositPaid: boolean;
}

export interface EventBudget {
  totalBudget: number;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  byCategory: Array<{ category: string; amount: number }>;
}

// ──────────────────────────────────────────────
// Event CRUD hooks
// ──────────────────────────────────────────────

export function useEvents(email?: string) {
  return useQuery({
    queryKey: ['user-events', email],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; data: { rows: EventItem[] } }>('/api/events');
      return data?.data?.rows ?? [];
    },
    enabled: !!email,
  });
}

export function useEvent(eventId: number | null, email?: string) {
  return useQuery({
    queryKey: ['user-event', eventId],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; data: EventItem }>(`/api/events/${eventId}`);
      return data?.data ?? null;
    },
    enabled: !!email && !!eventId,
  });
}

export function useCreateEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      date: string;
      endDate?: string | null;
      location?: string;
      budget?: number;
      guestCount?: number;
      description?: string;
    }) => apiClient.post('/api/events', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-events'] });
    },
  });
}

export function useUpdateEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: number } & Partial<Omit<EventItem, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) =>
      apiClient.put(`/api/events/${id}`, data),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['user-events'] });
      qc.invalidateQueries({ queryKey: ['user-event', variables.id] });
    },
  });
}

export function useDeleteEventMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/events/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-events'] });
    },
  });
}

// ──────────────────────────────────────────────
// Event Bookings hooks
// ──────────────────────────────────────────────

export function useEventBookings(eventId: number | null) {
  return useQuery({
    queryKey: ['event-bookings', eventId],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; data: { rows: EventBooking[] } }>(
        `/api/events/${eventId}/bookings`,
      );
      return data?.data?.rows ?? [];
    },
    enabled: !!eventId,
  });
}

export function useLinkBookingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, bookingId }: { eventId: number; bookingId: number }) =>
      apiClient.post(`/api/events/${eventId}/bookings`, { bookingId }),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['event-bookings', variables.eventId] });
      qc.invalidateQueries({ queryKey: ['event-budget', variables.eventId] });
      qc.invalidateQueries({ queryKey: ['user-bookings'] });
    },
  });
}

export function useUnlinkBookingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, bookingId }: { eventId: number; bookingId: number }) =>
      apiClient.delete(`/api/events/${eventId}/bookings/${bookingId}`),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['event-bookings', variables.eventId] });
      qc.invalidateQueries({ queryKey: ['event-budget', variables.eventId] });
      qc.invalidateQueries({ queryKey: ['user-bookings'] });
    },
  });
}

// ──────────────────────────────────────────────
// Budget hook
// ──────────────────────────────────────────────

export function useEventBudget(eventId: number | null) {
  return useQuery({
    queryKey: ['event-budget', eventId],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; data: EventBudget }>(
        `/api/events/${eventId}/budget`,
      );
      return data?.data ?? null;
    },
    enabled: !!eventId,
  });
}

// ──────────────────────────────────────────────
// Checklist hooks
// ──────────────────────────────────────────────

export function useEventChecklist(eventId: number | null) {
  return useQuery({
    queryKey: ['event-checklist', eventId],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; data: { rows: ChecklistItem[] } }>(
        `/api/events/${eventId}/checklist`,
      );
      return data?.data?.rows ?? [];
    },
    enabled: !!eventId,
  });
}

export function useAddChecklistItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      ...data
    }: {
      eventId: number;
      title: string;
      dueDate?: string | null;
      category?: string;
      sortOrder?: number;
    }) => apiClient.post(`/api/events/${eventId}/checklist`, data),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['event-checklist', variables.eventId] });
    },
  });
}

export function useUpdateChecklistItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      itemId,
      ...data
    }: {
      eventId: number;
      itemId: number;
      title?: string;
      isCompleted?: boolean;
      dueDate?: string | null;
      category?: string;
      sortOrder?: number;
    }) => apiClient.put(`/api/events/${eventId}/checklist/${itemId}`, data),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['event-checklist', variables.eventId] });
    },
  });
}

export function useDeleteChecklistItemMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, itemId }: { eventId: number; itemId: number }) =>
      apiClient.delete(`/api/events/${eventId}/checklist/${itemId}`),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['event-checklist', variables.eventId] });
    },
  });
}

// ──────────────────────────────────────────────
// Timeline hooks
// ──────────────────────────────────────────────

export function useEventTimeline(eventId: number | null) {
  return useQuery({
    queryKey: ['event-timeline', eventId],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; data: { rows: TimelineEntry[] } }>(
        `/api/events/${eventId}/timeline`,
      );
      return data?.data?.rows ?? [];
    },
    enabled: !!eventId,
  });
}

export function useAddTimelineEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      ...data
    }: {
      eventId: number;
      startTime: string;
      endTime?: string | null;
      title: string;
      description?: string;
      bookingId?: number | null;
      sortOrder?: number;
    }) => apiClient.post(`/api/events/${eventId}/timeline`, data),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['event-timeline', variables.eventId] });
    },
  });
}

export function useUpdateTimelineEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      entryId,
      ...data
    }: {
      eventId: number;
      entryId: number;
      startTime?: string;
      endTime?: string | null;
      title?: string;
      description?: string;
      bookingId?: number | null;
      sortOrder?: number;
    }) => apiClient.put(`/api/events/${eventId}/timeline/${entryId}`, data),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['event-timeline', variables.eventId] });
    },
  });
}

export function useDeleteTimelineEntryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, entryId }: { eventId: number; entryId: number }) =>
      apiClient.delete(`/api/events/${eventId}/timeline/${entryId}`),
    onSuccess: (_d, variables) => {
      qc.invalidateQueries({ queryKey: ['event-timeline', variables.eventId] });
    },
  });
}
