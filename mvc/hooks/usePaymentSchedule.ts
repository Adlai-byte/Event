import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export interface PaymentScheduleItem {
  id: number;
  type: 'deposit' | 'balance';
  amount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'waived';
  paymentId: number | null;
  paymentStatus: string | null;
  paidAt: string | null;
}

export interface RefundEstimate {
  bookingId: number;
  totalCost: number;
  totalPaid: number;
  refundAmount: number;
  refundPercent: number;
  daysUntilEvent: number;
  message: string;
}

interface PaymentScheduleResponse {
  ok: boolean;
  data: { rows: PaymentScheduleItem[] };
}

interface DepositBalanceResponse {
  ok: boolean;
  data: {
    paymentId: number;
    amount: number;
    method: string;
    message?: string;
    checkoutUrl?: string;
  };
}

interface RefundEstimateResponse {
  ok: boolean;
  data: RefundEstimate;
}

interface CancelBookingResponse {
  ok: boolean;
  data: {
    message: string;
    refundAmount?: number;
  };
}

export function usePaymentSchedule(bookingId: number | string) {
  const numericId = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
  return useQuery({
    queryKey: ['payment-schedule', numericId],
    queryFn: async () => {
      const resp = await apiClient.get<PaymentScheduleResponse>(
        `/api/bookings/${numericId}/payment-schedule`,
      );
      return resp.data?.rows ?? [];
    },
    enabled: !!numericId && !isNaN(numericId),
  });
}

export function usePayDepositMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      paymentMethod,
    }: {
      bookingId: number | string;
      paymentMethod: 'paymongo' | 'cash';
    }) => {
      const resp = await apiClient.post<DepositBalanceResponse>(
        `/api/bookings/${bookingId}/pay-deposit`,
        { paymentMethod },
      );
      return resp.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['payment-schedule', Number(variables.bookingId)] });
      qc.invalidateQueries({ queryKey: ['user-bookings'] });
      qc.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });
}

export function usePayBalanceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      paymentMethod,
    }: {
      bookingId: number | string;
      paymentMethod: 'paymongo' | 'cash';
    }) => {
      const resp = await apiClient.post<DepositBalanceResponse>(
        `/api/bookings/${bookingId}/pay-balance`,
        { paymentMethod },
      );
      return resp.data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['payment-schedule', Number(variables.bookingId)] });
      qc.invalidateQueries({ queryKey: ['user-bookings'] });
      qc.invalidateQueries({ queryKey: ['provider-bookings'] });
    },
  });
}

export function useRefundEstimate(bookingId: number | string, enabled: boolean = false) {
  const numericId = typeof bookingId === 'string' ? parseInt(bookingId, 10) : bookingId;
  return useQuery({
    queryKey: ['refund-estimate', numericId],
    queryFn: async () => {
      const resp = await apiClient.get<RefundEstimateResponse>(
        `/api/bookings/${numericId}/refund-estimate`,
      );
      return resp.data;
    },
    enabled: !!numericId && !isNaN(numericId) && enabled,
  });
}

export function useCancelBookingMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: number | string; reason?: string }) => {
      const resp = await apiClient.post<CancelBookingResponse>(
        `/api/bookings/${bookingId}/cancel`,
        { reason },
      );
      return resp.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-bookings'] });
      qc.invalidateQueries({ queryKey: ['provider-bookings'] });
      qc.invalidateQueries({ queryKey: ['payment-schedule'] });
    },
  });
}
