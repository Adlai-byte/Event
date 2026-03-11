import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User as UserModel } from '../models/User';
import { ServicePackage } from '../models/Package';
import { apiClient } from '../services/apiClient';
import { getApiBaseUrl } from '../services/api';

/** Local Service shape used inside the provider Services view. */
export interface ProviderService {
  id: string;
  name: string;
  category: string;
  price: number;
  hourlyPrice?: number | null;
  perDayPrice?: number | null;
  status: 'draft' | 'active' | 'inactive';
  rating: number;
  bookings: number;
  description: string;
  image?: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  duration?: number;
  maxCapacity?: number;
  cancellationPolicyId?: number | null;
  travelRadiusKm?: number | null;
  minBookingHours?: number | null;
  maxBookingHours?: number | null;
  leadTimeDays?: number;
  tags?: string[];
  inclusions?: string[];
}

const parseJsonField = (val: any): string[] => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

function mapToProviderService(s: any): ProviderService {
  let parsedAddress = s.s_address || '';
  let parsedLatitude: number | undefined;
  let parsedLongitude: number | undefined;

  if (parsedAddress) {
    const coordsMatch = parsedAddress.match(/\(([\d.-]+),([\d.-]+)\)/);
    if (coordsMatch) {
      parsedLatitude = parseFloat(coordsMatch[1]);
      parsedLongitude = parseFloat(coordsMatch[2]);
      parsedAddress = parsedAddress.replace(/\s*\([\d.-]+,[\d.-]+\)\s*$/, '').trim();
    } else if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(parsedAddress.trim())) {
      const [lat, lng] = parsedAddress.split(',');
      parsedLatitude = parseFloat(lat);
      parsedLongitude = parseFloat(lng);
      parsedAddress = '';
    }
  }

  let imageData = s.primary_image || null;
  if (imageData && typeof imageData === 'string') {
    if (imageData.startsWith('/uploads/')) {
      imageData = `${getApiBaseUrl()}${imageData}?t=${Date.now()}`;
    } else if (imageData.startsWith('data:image')) {
      // already a data URI
    } else if (imageData.length > 100) {
      imageData = `data:image/jpeg;base64,${imageData}`;
    }
  }

  const displayPrice = s.s_hourly_price
    ? parseFloat(s.s_hourly_price)
    : parseFloat(s.s_base_price) || 0;

  return {
    id: s.idservice.toString(),
    name: s.s_name,
    category: s.s_category,
    price: displayPrice,
    hourlyPrice: s.s_hourly_price ? parseFloat(s.s_hourly_price) : null,
    perDayPrice: s.s_per_day_price ? parseFloat(s.s_per_day_price) : null,
    status: s.s_status || s.status || (s.s_is_active === 1 || s.s_is_active === '1' ? 'active' : 'inactive'),
    rating: parseFloat(s.s_rating) || 0,
    bookings: s.s_review_count || 0,
    description: s.s_description || '',
    image: imageData,
    address: parsedAddress,
    latitude: parsedLatitude,
    longitude: parsedLongitude,
    duration: parseInt(s.s_duration) || 60,
    maxCapacity: parseInt(s.s_max_capacity) || 1,
    cancellationPolicyId: s.s_cancellation_policy_id ?? null,
    travelRadiusKm: s.s_travel_radius_km ?? s.travelRadiusKm ?? null,
    minBookingHours: s.s_min_booking_hours !== null && s.s_min_booking_hours !== undefined ? parseFloat(s.s_min_booking_hours) : (s.minBookingHours !== null && s.minBookingHours !== undefined ? parseFloat(s.minBookingHours) : null),
    maxBookingHours: s.s_max_booking_hours !== null && s.s_max_booking_hours !== undefined ? parseFloat(s.s_max_booking_hours) : (s.maxBookingHours !== null && s.maxBookingHours !== undefined ? parseFloat(s.maxBookingHours) : null),
    leadTimeDays: parseInt(s.s_lead_time_days ?? s.leadTimeDays ?? '0') || 0,
    tags: parseJsonField(s.s_tags ?? s.tags),
    inclusions: parseJsonField(s.s_inclusions ?? s.inclusions),
  };
}

function mapToPackage(p: any): ServicePackage {
  return {
    id: p.idpackage,
    serviceId: p.sp_service_id,
    name: p.sp_name,
    description: p.sp_description,
    minGuests: p.sp_min_pax,
    maxGuests: p.sp_max_pax,
    basePrice: p.sp_base_price ? parseFloat(p.sp_base_price) : undefined,
    priceType: p.sp_price_type,
    billingType: p.sp_billing_type || 'hourly',
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
  } as ServicePackage;
}

export function useServicesList(user?: UserModel) {
  const queryClient = useQueryClient();
  const email = user?.email || '';

  // Package UI state (not data-fetching)
  const [showPackageBuilder, setShowPackageBuilder] = useState(false);
  const [selectedServiceForPackage, setSelectedServiceForPackage] =
    useState<ProviderService | null>(null);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

  // --- Queries ---
  const servicesQuery = useQuery({
    queryKey: ['provider-services', email],
    queryFn: async () => {
      const data = await apiClient.get('/api/services', { providerEmail: email });
      if (data.ok && Array.isArray(data.data)) {
        return data.data.map(mapToProviderService);
      }
      return [];
    },
    enabled: !!email,
  });

  const services = servicesQuery.data ?? [];

  const packagesQuery = useQuery({
    queryKey: ['provider-packages', email],
    queryFn: async () => {
      const pkgsByService: Record<string, ServicePackage[]> = {};
      for (const service of services) {
        try {
          const data = await apiClient.get(`/api/services/${service.id}/packages`);
          const pkgs = data?.data?.packages ?? data?.packages;
          if (data.ok && Array.isArray(pkgs)) {
            pkgsByService[service.id] = pkgs.map(mapToPackage);
          }
        } catch (err) {
          if (__DEV__) console.error(`Error loading packages for service ${service.id}:`, err);
        }
      }
      return pkgsByService;
    },
    enabled: services.length > 0,
  });

  // --- Mutations ---
  const toggleStatusMutation = useMutation({
    mutationFn: async (service: ProviderService) => {
      await apiClient.post(`/api/services/${service.id}/status`, {
        isActive: service.status !== 'active',
      });
      return service;
    },
    onSuccess: (service) => {
      queryClient.invalidateQueries({ queryKey: ['provider-services'] });
      Alert.alert(
        'Success',
        `Service ${service.status === 'active' ? 'deactivated' : 'activated'} successfully`,
      );
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update service status');
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (pkgId: number) => {
      return apiClient.delete(`/api/packages/${pkgId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-packages'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to delete package');
    },
  });

  // --- Handlers that preserve original API ---
  const handleToggleServiceStatus = (service: ProviderService) => {
    toggleStatusMutation.mutate(service);
  };

  const handleDeletePackage = (pkg: ServicePackage, onSuccess: () => void) => {
    const message = `Are you sure you want to delete "${pkg.name}"? This action cannot be undone.`;

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        deletePackageMutation.mutate(pkg.id!, {
          onSuccess: () => onSuccess(),
        });
      }
    } else {
      Alert.alert('Delete Package', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePackageMutation.mutate(pkg.id!, {
              onSuccess: () => onSuccess(),
            });
          },
        },
      ]);
    }
  };

  const loadServices = () => {
    servicesQuery.refetch();
  };

  const loadPackages = () => {
    packagesQuery.refetch();
  };

  return {
    services,
    loading: servicesQuery.isLoading,
    packages: packagesQuery.data ?? {},
    loadingPackages: packagesQuery.isLoading,
    showPackageBuilder,
    setShowPackageBuilder,
    selectedServiceForPackage,
    setSelectedServiceForPackage,
    editingPackage,
    setEditingPackage,
    loadServices,
    loadPackages,
    handleToggleServiceStatus,
    handleDeletePackage,
  };
}
