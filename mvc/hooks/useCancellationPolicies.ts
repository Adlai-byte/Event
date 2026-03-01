import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export interface CancellationRule {
  days_before: number;
  refund_percent: number;
}

export interface CancellationPolicy {
  id: number;
  name: string;
  depositPercent: number;
  rules: CancellationRule[];
  createdAt: string;
  updatedAt: string;
}

export function useCancellationPolicies() {
  return useQuery({
    queryKey: ['cancellation-policies'],
    queryFn: () => apiClient.get<{ rows: CancellationPolicy[] }>('/provider/cancellation-policies'),
  });
}

export function useCreatePolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; depositPercent: number; rules: CancellationRule[] }) =>
      apiClient.post('/provider/cancellation-policies', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cancellation-policies'] });
    },
  });
}

export function useUpdatePolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: number;
      name?: string;
      depositPercent?: number;
      rules?: CancellationRule[];
    }) => apiClient.put(`/provider/cancellation-policies/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cancellation-policies'] });
    },
  });
}

export function useDeletePolicyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/provider/cancellation-policies/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cancellation-policies'] });
    },
  });
}
