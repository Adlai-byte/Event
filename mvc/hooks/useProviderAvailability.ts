import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

// --- Types ---

export interface BlockedDate {
  id: number;
  date: string; // YYYY-MM-DD
  reason: string | null;
}

export interface ScheduleEntry {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  isAvailable: boolean;
}

export interface CalendarDay {
  date: string;
  available: boolean;
  reason?: string;
}

// --- Provider hooks ---

/** Provider: get blocked dates for a date range */
export function useBlockedDates(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['blocked-dates', startDate, endDate],
    queryFn: () =>
      apiClient.get<BlockedDate[]>('/api/provider/availability/blocked-dates', {
        startDate,
        endDate,
      }),
    enabled: !!startDate && !!endDate,
  });
}

/** Provider: block date(s) */
export function useBlockDateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { date?: string; startDate?: string; endDate?: string; reason?: string }) =>
      apiClient.post('/api/provider/availability/blocked-dates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
    },
  });
}

/** Provider: unblock a date */
export function useUnblockDateMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/provider/availability/blocked-dates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-dates'] });
    },
  });
}

/** Provider: get weekly schedule for a service */
export function useSchedule(serviceId: number) {
  return useQuery({
    queryKey: ['schedule', serviceId],
    queryFn: () =>
      apiClient.get<ScheduleEntry[]>('/api/provider/availability/schedule', { serviceId }),
    enabled: !!serviceId,
  });
}

/** Provider: update weekly schedule */
export function useUpdateScheduleMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { serviceId: number; schedule: ScheduleEntry[] }) =>
      apiClient.put('/api/provider/availability/schedule', data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['schedule', vars.serviceId] });
    },
  });
}

// --- Public hooks ---

/** Public: check single date availability for a service */
export function useAvailabilityCheck(serviceId: number, date: string) {
  return useQuery({
    queryKey: ['availability-check', serviceId, date],
    queryFn: () =>
      apiClient.get<{ available: boolean; reason?: string }>(
        `/api/services/${serviceId}/availability/check`,
        { date },
      ),
    enabled: !!serviceId && !!date,
  });
}

/** Public: get month calendar for a service */
export function useMonthCalendar(serviceId: number, month: string) {
  const [yearStr, monthStr] = month.split('-');
  return useQuery({
    queryKey: ['availability-calendar', serviceId, month],
    queryFn: () =>
      apiClient.get<CalendarDay[]>(`/api/services/${serviceId}/availability/calendar`, {
        year: yearStr,
        month: String(parseInt(monthStr, 10)),
      }),
    enabled: !!serviceId && !!month,
  });
}
