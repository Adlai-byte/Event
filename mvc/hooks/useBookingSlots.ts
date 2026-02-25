import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export function useBookingSlots(serviceId: number, visible: boolean) {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([]);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Reset all state when modal closes
  const resetState = useCallback(() => {
    setSelectedSlots([]);
    setSelectedDate(null);
    setSelectedDays([]);
  }, []);

  // --- Available dates query ---
  const availableDatesQuery = useQuery({
    queryKey: ['booking-available-dates', serviceId],
    queryFn: async () => {
      const data = await apiClient.get(`/api/services/${serviceId}/available-slots`);
      return data.dates || [];
    },
    enabled: visible && !!serviceId,
  });

  const availableDates = availableDatesQuery.data ?? [];

  // --- No-slots dates (pre-check which dates have zero available slots) ---
  const noSlotsDatesQuery = useQuery({
    queryKey: ['booking-no-slots-dates', serviceId, availableDates],
    queryFn: async () => {
      const noSlotsCheckPromises = availableDates.map(async (date: string) => {
        try {
          const slotData = await apiClient.get(`/api/services/${serviceId}/available-slots`, { date });
          const slots = slotData.slots || [];
          const availableOnly = slots.filter((slot: { available: boolean }) => slot.available === true);
          return availableOnly.length === 0 ? date : null;
        } catch {
          return null;
        }
      });
      const results = await Promise.all(noSlotsCheckPromises);
      return results.filter((date): date is string => date !== null);
    },
    enabled: visible && !!serviceId && availableDates.length > 0,
  });

  const noSlotsDates = noSlotsDatesQuery.data ?? [];

  // --- Week slots query (auto-refreshes every 1 second when visible) ---
  const getWeekDates = useCallback(() => {
    const getWeekStart = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    };
    const weekStart = getWeekStart(currentWeek);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      dates.push(day.toISOString().split('T')[0]);
    }
    return dates;
  }, [currentWeek]);

  const weekSlotsQuery = useQuery({
    queryKey: ['booking-week-slots', serviceId, getWeekDates()],
    queryFn: async () => {
      const weekDates = getWeekDates();
      const slotPromises = weekDates.map(async (dateStr) => {
        try {
          const data = await apiClient.get(`/api/services/${serviceId}/available-slots`, { date: dateStr });
          return { date: dateStr, slots: data.slots || [] };
        } catch {
          return { date: dateStr, slots: [] };
        }
      });
      const results = await Promise.all(slotPromises);
      const slotsMap: Record<string, TimeSlot[]> = {};
      results.forEach(({ date, slots }) => {
        slotsMap[date] = slots;
      });
      return slotsMap;
    },
    enabled: visible && !!serviceId,
    refetchInterval: visible && serviceId ? 1000 : false,
  });

  const allDatesSlots = weekSlotsQuery.data ?? {};

  // --- Selected date slots query ---
  const selectedDateSlotsQuery = useQuery({
    queryKey: ['booking-date-slots', serviceId, selectedDate],
    queryFn: async () => {
      const data = await apiClient.get(`/api/services/${serviceId}/available-slots`, { date: selectedDate! });
      return data.slots || [];
    },
    enabled: visible && !!serviceId && !!selectedDate,
    refetchInterval: visible && serviceId && selectedDate ? 1000 : false,
  });

  const availableSlots = selectedDateSlotsQuery.data ?? [];

  // Reset selected slots when date changes
  useEffect(() => {
    if (!selectedDate) {
      setSelectedSlots([]);
    }
  }, [selectedDate]);

  // --- Slot overlap check ---
  const doSlotsOverlap = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
    const [start1Hour, start1Min] = slot1.start.split(':').map(Number);
    const [end1Hour, end1Min] = slot1.end.split(':').map(Number);
    const [start2Hour, start2Min] = slot2.start.split(':').map(Number);
    const [end2Hour, end2Min] = slot2.end.split(':').map(Number);

    const start1Minutes = start1Hour * 60 + start1Min;
    const end1Minutes = end1Hour * 60 + end1Min;
    const start2Minutes = start2Hour * 60 + start2Min;
    const end2Minutes = end2Hour * 60 + end2Min;

    return (start1Minutes < end2Minutes) && (end1Minutes > start2Minutes);
  };

  // Toggle slot selection
  const handleSlotToggle = useCallback((slot: TimeSlot) => {
    if (!slot.available) {
      Alert.alert(
        'Slot Not Available',
        'This time slot is already taken and cannot be selected.',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedSlots(prev => {
      const isSelected = prev.some(s => s.start === slot.start && s.end === slot.end);
      if (isSelected) {
        return prev.filter(s => !(s.start === slot.start && s.end === slot.end));
      } else {
        const hasOverlap = prev.some(selectedSlot => doSlotsOverlap(selectedSlot, slot));
        if (hasOverlap) {
          Alert.alert(
            'Time Overlap',
            'This time slot overlaps with another selected slot. Please select non-overlapping time slots.',
            [{ text: 'OK' }]
          );
          return prev;
        }
        return [...prev, slot];
      }
    });
  }, []);

  // Check date availability
  const isDateAvailable = useCallback((dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < today) return false;
    if (availableDates.length === 0) return true;
    return availableDates.includes(dateStr);
  }, [availableDates]);

  // Check if date has no slots
  const isDateNoSlots = useCallback((dateStr: string): boolean => {
    return noSlotsDates.includes(dateStr);
  }, [noSlotsDates]);

  // Compatibility wrappers
  const loadAvailableDates = () => {
    availableDatesQuery.refetch();
  };

  const loadWeekSlots = () => {
    weekSlotsQuery.refetch();
  };

  const reloadSlotsForDate = (date: string) => {
    queryClient.invalidateQueries({ queryKey: ['booking-date-slots', serviceId, date] });
    queryClient.invalidateQueries({ queryKey: ['booking-week-slots', serviceId] });
  };

  return {
    availableDates,
    selectedDate,
    setSelectedDate,
    availableSlots,
    selectedSlots,
    setSelectedSlots,
    noSlotsDates,
    loadingDates: availableDatesQuery.isLoading,
    loadingSlots: selectedDateSlotsQuery.isLoading,
    currentWeek,
    setCurrentWeek,
    allDatesSlots,
    selectedDays,
    setSelectedDays,
    resetState,
    loadAvailableDates,
    loadWeekSlots,
    reloadSlotsForDate,
    handleSlotToggle,
    isDateAvailable,
    isDateNoSlots,
  };
}
