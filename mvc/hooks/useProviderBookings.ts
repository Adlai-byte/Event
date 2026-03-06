import { useState, useCallback } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { User } from '../models/User';
import { getApiBaseUrl } from '../services/api';

export interface ProviderBooking {
  id: string;
  eventName: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  date: string;
  time: string;
  location: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  totalCost: number;
  serviceName: string;
  paymentMethod?: string;
  paymentStatus?: string;
  hasPendingCashPayment?: boolean;
  isPaid?: boolean;
  depositPaid?: boolean;
  balanceDueDate?: string | null;
}

const STATUS_FILTERS = [
  'all',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
] as const;

const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const time = timeStr.toString().slice(0, 5); // Get HH:MM
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return '#f59e0b';
    case 'confirmed':
      return '#10b981';
    case 'in_progress':
      return '#2563EB';
    case 'completed':
      return '#4a55e1';
    case 'cancelled':
      return '#ef4444';
    default:
      return '#64748B';
  }
};

function mapBooking(b: any): ProviderBooking {
  const hasPendingCash =
    b.has_pending_cash_payment === 1 ||
    (b.payment_method === 'Cash on Hand' && b.payment_status === 'pending');

  // Debug log
  if (b.b_status === 'confirmed') {
    // intentionally empty — debug log removed
  }

  // If status is 'completed' but not paid, change to 'cancelled'
  let finalStatus = b.b_status;
  if (b.b_status === 'completed' && b.is_paid !== 1) {
    finalStatus = 'cancelled';
  }

  return {
    id: b.idbooking.toString(),
    eventName: b.b_event_name,
    clientName: b.client_name || 'Unknown Client',
    clientEmail: b.client_email || null,
    clientPhone: b.client_phone || null,
    clientAddress: b.client_address || null,
    date: formatDate(b.b_event_date),
    time: `${formatTime(b.b_start_time)} - ${formatTime(b.b_end_time)}`,
    location: b.b_location,
    status: finalStatus,
    totalCost: parseFloat(b.b_total_cost) || 0,
    serviceName: b.service_name || 'Service',
    paymentMethod: b.payment_method || null,
    paymentStatus: b.payment_status || null,
    hasPendingCashPayment: hasPendingCash,
    isPaid: b.is_paid === 1,
    depositPaid: b.b_deposit_paid === 1 || b.b_deposit_paid === true,
    balanceDueDate: b.b_balance_due_date || null,
  };
}

export function useProviderBookings(user?: User) {
  const queryClient = useQueryClient();

  // --- UI state (local) ---
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ProviderBooking | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [bookingToUpdate, setBookingToUpdate] = useState<string | null>(null);

  // --- Query: fetch provider bookings ---
  const bookingsQuery = useQuery({
    queryKey: ['provider-bookings', user?.email],
    queryFn: async () => {
      const data = await apiClient.get<{ ok: boolean; rows?: any[] }>('/api/provider/bookings', {
        providerEmail: user!.email,
      });
      if (data.ok && Array.isArray(data.rows)) {
        return data.rows.map(mapBooking);
      }
      return [];
    },
    enabled: !!user?.email,
  });

  const bookings = bookingsQuery.data ?? [];
  const loading = bookingsQuery.isLoading;

  // --- Mutation: update booking status ---
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      bookingId,
      newStatus,
      reason,
    }: {
      bookingId: string;
      newStatus: string;
      reason?: string;
    }) => {
      const requestBody: any = { status: newStatus };
      if (reason) {
        requestBody.cancellation_reason = reason;
      }
      const data = await apiClient.post<{ ok: boolean; error?: string }>(
        `/api/bookings/${bookingId}/status`,
        requestBody,
      );
      if (!data.ok) {
        throw new Error(data.error || 'Failed to update booking status');
      }
      return { newStatus };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      Alert.alert(
        'Success',
        `Booking ${variables.newStatus === 'cancelled' ? 'cancelled' : 'confirmed'} successfully`,
      );
    },
    onError: (error: Error) => {
      if (__DEV__) console.error('Error updating booking status:', error);
      Alert.alert('Error', `Failed to update booking status: ${error.message}`);
    },
  });

  // --- Mutation: mark payment as paid ---
  const markPaidMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const data = await apiClient.post<{ ok: boolean; error?: string }>(
        `/api/provider/bookings/${bookingId}/mark-payment-paid`,
        { providerEmail: user?.email },
      );
      if (!data.ok) {
        throw new Error(data.error || 'Failed to mark payment as paid');
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
      Alert.alert('Success', 'Payment marked as paid successfully');
    },
    onError: (error: Error) => {
      if (__DEV__) console.error('Error marking payment as paid:', error);
      Alert.alert('Error', `Failed to mark payment as paid: ${error.message}`);
    },
  });

  // --- Handler wrappers (preserve exact same call signatures) ---

  const handleUpdateBookingStatus = useCallback(
    async (bookingId: string, newStatus: string, reason?: string) => {
      await updateStatusMutation.mutateAsync({ bookingId, newStatus, reason });
    },
    [updateStatusMutation],
  );

  const handleConfirmClick = useCallback((bookingId: string) => {
    setBookingToUpdate(bookingId);
    setShowConfirmModal(true);
  }, []);

  const handleCancelClick = useCallback((bookingId: string) => {
    setBookingToUpdate(bookingId);
    setCancelReason('');
    setShowCancelModal(true);
  }, []);

  const handleConfirmBooking = useCallback(async () => {
    if (bookingToUpdate) {
      setShowConfirmModal(false);
      await handleUpdateBookingStatus(bookingToUpdate, 'confirmed');
      setBookingToUpdate(null);
    }
  }, [bookingToUpdate, handleUpdateBookingStatus]);

  const handleCancelBooking = useCallback(async () => {
    if (bookingToUpdate && cancelReason.trim()) {
      setShowCancelModal(false);
      await handleUpdateBookingStatus(bookingToUpdate, 'cancelled', cancelReason.trim());
      setBookingToUpdate(null);
      setCancelReason('');
    } else {
      Alert.alert('Required', 'Please provide a reason for cancellation');
    }
  }, [bookingToUpdate, cancelReason, handleUpdateBookingStatus]);

  const handleMarkPaymentAsPaid = useCallback(
    async (bookingId: string) => {
      await markPaidMutation.mutateAsync(bookingId);
    },
    [markPaidMutation],
  );

  const handleDownloadInvoice = useCallback(
    async (bookingId: string) => {
      try {
        const invoiceUrl = `${getApiBaseUrl()}/api/provider/bookings/${bookingId}/invoice?providerEmail=${encodeURIComponent(user?.email || '')}`;

        if (Platform.OS === 'web') {
          // For web, open in new tab to download
          if (typeof window !== 'undefined') {
            window.open(invoiceUrl, '_blank');
          }
        } else {
          // For mobile, use Linking
          Linking.openURL(invoiceUrl).catch((err) => {
            if (__DEV__) console.error('Error opening invoice URL:', err);
            Alert.alert('Error', 'Failed to download invoice. Please try again.');
          });
        }
      } catch (error) {
        if (__DEV__) console.error('Error downloading invoice:', error);
        Alert.alert(
          'Error',
          `Failed to download invoice: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    },
    [user?.email],
  );

  const handleViewClientDetails = useCallback((booking: ProviderBooking) => {
    setSelectedBooking(booking);
    setShowClientDetailsModal(true);
  }, []);

  const handleCloseClientDetails = useCallback(() => {
    setShowClientDetailsModal(false);
    setSelectedBooking(null);
  }, []);

  const handleCloseConfirmModal = useCallback(() => {
    setShowConfirmModal(false);
  }, []);

  const handleCloseCancelModal = useCallback(() => {
    setShowCancelModal(false);
    setCancelReason('');
  }, []);

  // --- loadBookings triggers invalidation (same pattern as useBookingData) ---
  const loadBookings = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['provider-bookings', user?.email] });
  }, [queryClient, user?.email]);

  // --- Derived data ---
  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      b.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return {
    // Data
    bookings,
    filteredBookings,
    loading,
    filterStatus,
    searchQuery,
    selectedBooking,
    cancelReason,
    statusFilters: STATUS_FILTERS,

    // Modal visibility
    showClientDetailsModal,
    showConfirmModal,
    showCancelModal,

    // Setters
    setFilterStatus,
    setSearchQuery,
    setCancelReason,

    // Handlers
    loadBookings,
    handleUpdateBookingStatus,
    handleConfirmClick,
    handleCancelClick,
    handleConfirmBooking,
    handleCancelBooking,
    handleMarkPaymentAsPaid,
    handleDownloadInvoice,
    handleViewClientDetails,
    handleCloseClientDetails,
    handleCloseConfirmModal,
    handleCloseCancelModal,
  };
}
