import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';
import { getApiBaseUrl } from '../services/api';
import { ServiceDTO } from '../types/service';
import { ServicePackage } from '../models/Package';

export interface UseServiceDetailsResult {
  service: ServiceDTO | null;
  loading: boolean;
  images: string[];
  imageError: boolean;
  setImageError: (error: boolean) => void;
  reviews: any[];
  loadingReviews: boolean;
  packages: ServicePackage[];
  loadingPackages: boolean;
  selectedPackage: ServicePackage | null;
  setSelectedPackage: (pkg: ServicePackage | null) => void;
}

// --- API response types ---

interface ServiceResponse {
  ok: boolean;
  service?: ServiceDTO;
}

interface ImagesResponse {
  ok: boolean;
  images?: Array<{ si_image_url?: string }>;
}

interface ReviewsResponse {
  ok: boolean;
  reviews?: any[];
}

interface PackagesResponse {
  ok: boolean;
  packages?: any[];
}

// --- Query functions ---

async function fetchServiceWithImages(
  serviceId: string,
): Promise<{ service: ServiceDTO; images: string[] }> {
  const data = await apiClient.get<ServiceResponse>(
    `/api/services/${serviceId}`,
  );

  if (!data.ok || !data.service) {
    throw new Error('Service not found');
  }

  const service = data.service;

  // Load service images
  let images: string[] = [];
  try {
    const imagesData = await apiClient.get<ImagesResponse>(
      `/api/services/${serviceId}/images`,
    );
    if (imagesData.ok && imagesData.images) {
      const baseUrl = getApiBaseUrl();
      images = imagesData.images
        .map((img) => {
          if (img.si_image_url) {
            if (img.si_image_url.startsWith('/uploads/')) {
              return `${baseUrl}${img.si_image_url}`;
            }
            return img.si_image_url;
          }
          return null;
        })
        .filter((url): url is string => url !== null);
    }
  } catch {
    // Images are non-critical; return empty array on failure
  }

  return { service, images };
}

async function fetchReviews(serviceId: string): Promise<any[]> {
  const serviceIdNum =
    typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId;
  const data = await apiClient.get<ReviewsResponse>(
    `/api/services/${serviceIdNum}/reviews`,
  );
  if (data.ok && Array.isArray(data.reviews)) {
    return data.reviews;
  }
  return [];
}

async function fetchPackages(serviceId: string): Promise<ServicePackage[]> {
  const data = await apiClient.get<PackagesResponse>(
    `/api/services/${serviceId}/packages`,
  );

  if (data.ok && Array.isArray(data.packages)) {
    return data.packages
      .filter((p: any) => p.sp_is_active)
      .map(
        (p: any): ServicePackage => ({
          id: p.idpackage,
          serviceId: p.sp_service_id,
          name: p.sp_name,
          description: p.sp_description,
          minPax: p.sp_min_pax,
          maxPax: p.sp_max_pax,
          basePrice: p.sp_base_price
            ? parseFloat(p.sp_base_price)
            : undefined,
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
        }),
      );
  }

  return [];
}

// --- Hook ---

export function useServiceDetails(
  serviceId: string,
  onNavigate: (route: string) => void,
): UseServiceDetailsResult {
  const [imageError, setImageError] = useState(false);
  const [selectedPackage, setSelectedPackage] =
    useState<ServicePackage | null>(null);

  // Service + images query
  const serviceQuery = useQuery({
    queryKey: ['service', serviceId],
    queryFn: () => fetchServiceWithImages(serviceId),
    enabled: !!serviceId,
  });

  // Reviews query
  const reviewsQuery = useQuery({
    queryKey: ['service-reviews', serviceId],
    queryFn: () => fetchReviews(serviceId),
    enabled: !!serviceId,
  });

  // Packages query
  const packagesQuery = useQuery({
    queryKey: ['service-packages', serviceId],
    queryFn: () => fetchPackages(serviceId),
    enabled: !!serviceId,
  });

  // Handle service load error: alert + navigate to dashboard
  useEffect(() => {
    if (serviceQuery.error) {
      const message =
        serviceQuery.error.message === 'Service not found'
          ? 'Service not found'
          : 'Failed to load service details. Please try again.';
      Alert.alert('Error', message);
      onNavigate('dashboard');
    }
  }, [serviceQuery.error]);

  return {
    service: serviceQuery.data?.service ?? null,
    loading: serviceQuery.isLoading,
    images: serviceQuery.data?.images ?? [],
    imageError,
    setImageError,
    reviews: reviewsQuery.data ?? [],
    loadingReviews: reviewsQuery.isLoading,
    packages: packagesQuery.data ?? [],
    loadingPackages: packagesQuery.isLoading,
    selectedPackage,
    setSelectedPackage,
  };
}
