import { useState, useEffect, useCallback } from 'react';
import { getApiBaseUrl } from '../services/api';
import { ServicePackage, calculatePackagePrice } from '../models/Package';

interface TimeSlot {
  start: string;
  end: string;
  available?: boolean;
}

interface ServiceDetails {
  basePrice: number;
  hourlyPrice: number | null;
  perDayPrice: number | null;
  duration: number;
  category: string;
}

export function useBookingCost(
  serviceId: number,
  visible: boolean,
  selectedSlots: TimeSlot[],
  selectedDays: string[],
  preSelectedPackage?: ServicePackage | null
) {
  const [serviceDetails, setServiceDetails] = useState<ServiceDetails | null>(null);
  const [bookingMode, setBookingMode] = useState<'hourly' | 'perday'>('hourly');
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [attendees, setAttendees] = useState<string>('1');

  // Package-related state
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [removedItems, setRemovedItems] = useState<number[]>([]);
  const [packagePaxCount, setPackagePaxCount] = useState<number>(1);

  // Reset cost-related state
  const resetCostState = useCallback(() => {
    setEstimatedCost(0);
    setAttendees('1');
    setSelectedPackage(null);
    setRemovedItems([]);
    setPackagePaxCount(1);
  }, []);

  // Load service details
  const loadServiceDetails = useCallback(async () => {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && data.service) {
          const service = data.service;
          const basePrice = parseFloat(service.s_base_price) || 0;
          const hourlyPrice = service.s_hourly_price ? parseFloat(service.s_hourly_price) : null;
          const perDayPrice = service.s_per_day_price ? parseFloat(service.s_per_day_price) : null;
          const duration = parseInt(service.s_duration) || 60;
          const category = service.s_category || '';
          setServiceDetails({ basePrice, hourlyPrice, perDayPrice, duration, category });

          if (perDayPrice && !hourlyPrice) {
            setBookingMode('perday');
          } else {
            setBookingMode('hourly');
          }
        }
      }
    } catch (error) {
      console.error('Error loading service details:', error);
    }
  }, [serviceId]);

  // Load packages
  const loadPackages = useCallback(async () => {
    if (!serviceId) return;

    try {
      setLoadingPackages(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/packages`);

      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.packages)) {
          const mappedPackages: ServicePackage[] = data.packages
            .filter((p: any) => p.sp_is_active)
            .map((p: any) => ({
              id: p.idpackage,
              serviceId: p.sp_service_id,
              name: p.sp_name,
              description: p.sp_description,
              minPax: p.sp_min_pax,
              maxPax: p.sp_max_pax,
              basePrice: p.sp_base_price ? parseFloat(p.sp_base_price) : undefined,
              priceType: p.sp_price_type,
              discountPercent: parseFloat(p.sp_discount_percent) || 0,
              calculatedPrice: p.calculated_price,
              isActive: !!p.sp_is_active,
              displayOrder: p.sp_display_order || 0,
              categories: (p.categories || []).map((c: any) => ({
                id: c.idcategory,
                packageId: c.pc_package_id,
                name: c.pc_name,
                description: c.pc_description,
                displayOrder: c.pc_display_order || 0,
                items: (c.items || []).map((i: any) => ({
                  id: i.iditem,
                  categoryId: i.pi_category_id,
                  name: i.pi_name,
                  description: i.pi_description,
                  quantity: i.pi_quantity || 1,
                  unit: i.pi_unit || 'pc',
                  unitPrice: parseFloat(i.pi_unit_price) || 0,
                  isOptional: !!i.pi_is_optional,
                  displayOrder: i.pi_display_order || 0,
                })),
              })),
            }));
          setPackages(mappedPackages);
        }
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  }, [serviceId]);

  // Toggle item removal in a package
  const toggleItemRemoved = useCallback((itemId: number) => {
    setRemovedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  // Get current package price
  const getPackagePrice = useCallback((): number => {
    if (!selectedPackage) return 0;
    return calculatePackagePrice(selectedPackage, packagePaxCount, removedItems);
  }, [selectedPackage, packagePaxCount, removedItems]);

  // Calculate total duration from selected slots
  const calculateTotalDuration = useCallback((slots: TimeSlot[]): number => {
    if (slots.length === 0) return 0;

    const sortedSlots = [...slots].sort((a, b) => {
      const timeA = a.start.split(':').map(Number);
      const timeB = b.start.split(':').map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });

    const earliestStart = sortedSlots[0].start;
    const latestStart = sortedSlots[sortedSlots.length - 1].start;

    const [startHour, startMin] = earliestStart.split(':').map(Number);
    const [endHour, endMin] = latestStart.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    return endMinutes - startMinutes;
  }, []);

  // Format duration for display
  const formatDuration = useCallback((minutes: number): string => {
    const MINUTES_PER_HOUR = 60;
    const MINUTES_PER_DAY = 1440;

    if (minutes < MINUTES_PER_HOUR) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    if (minutes >= MINUTES_PER_DAY) {
      const days = Math.floor(minutes / MINUTES_PER_DAY);
      const remainingMinutes = minutes % MINUTES_PER_DAY;

      if (remainingMinutes === 0) {
        return days === 1 ? '1 day' : `${days} days`;
      }

      const hours = Math.floor(remainingMinutes / MINUTES_PER_HOUR);
      const mins = remainingMinutes % MINUTES_PER_HOUR;

      let result = days === 1 ? '1 day' : `${days} days`;
      if (hours > 0) {
        result += ` ${hours}hr`;
      }
      if (mins > 0) {
        result += ` ${mins}min`;
      }
      return result;
    }

    if (minutes === MINUTES_PER_HOUR) {
      return '1hr';
    }

    const hours = Math.floor(minutes / MINUTES_PER_HOUR);
    const mins = minutes % MINUTES_PER_HOUR;

    if (mins === 0) {
      return `${hours}hr`;
    }
    return `${hours}hr ${mins}min`;
  }, []);

  // Format time string
  const formatTime = useCallback((timeStr: string): string => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }, []);

  // Format date string
  const formatDate = useCallback((dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  // Calculate estimated cost
  const calculateEstimatedCost = useCallback((slots: TimeSlot[], days?: string[]) => {
    if (!serviceDetails) {
      setEstimatedCost(0);
      return;
    }

    const { basePrice, hourlyPrice, perDayPrice, category } = serviceDetails;
    let calculatedCost = 0;

    if (category.toLowerCase() === 'catering') {
      const numAttendees = parseInt(attendees) || 1;
      calculatedCost = basePrice * numAttendees;
    } else if (bookingMode === 'perday' && days && days.length > 0) {
      const pricePerDay = perDayPrice || basePrice;
      calculatedCost = pricePerDay * days.length;
    } else if (bookingMode === 'hourly' && slots.length > 0) {
      const pricePerHour = hourlyPrice || basePrice;
      const selectedDurationMinutes = calculateTotalDuration(slots);
      const hours = selectedDurationMinutes / 60;
      calculatedCost = pricePerHour * hours;
    }

    setEstimatedCost(calculatedCost);
  }, [serviceDetails, attendees, bookingMode, calculateTotalDuration]);

  // Recalculate cost when dependencies change
  useEffect(() => {
    if (serviceDetails) {
      if (serviceDetails.category.toLowerCase() === 'catering') {
        calculateEstimatedCost(selectedSlots);
      } else if (bookingMode === 'perday' && selectedDays.length > 0) {
        calculateEstimatedCost([], selectedDays);
      } else if (bookingMode === 'hourly' && selectedSlots.length > 0) {
        calculateEstimatedCost(selectedSlots);
      } else {
        setEstimatedCost(0);
      }
    }
  }, [selectedSlots, selectedDays, serviceDetails, attendees, bookingMode]);

  // Set pre-selected package when provided
  useEffect(() => {
    if (visible && preSelectedPackage) {
      setSelectedPackage(preSelectedPackage);
      setPackagePaxCount(preSelectedPackage.minPax || 1);
    }
  }, [visible, preSelectedPackage]);

  return {
    serviceDetails,
    bookingMode,
    setBookingMode,
    estimatedCost,
    attendees,
    setAttendees,
    packages,
    loadingPackages,
    selectedPackage,
    setSelectedPackage,
    removedItems,
    setRemovedItems,
    packagePaxCount,
    setPackagePaxCount,
    resetCostState,
    loadServiceDetails,
    loadPackages,
    toggleItemRemoved,
    getPackagePrice,
    calculateTotalDuration,
    formatDuration,
    formatTime,
    formatDate,
  };
}
