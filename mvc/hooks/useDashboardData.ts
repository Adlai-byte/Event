import { useState, useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Location from 'expo-location';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '../models/User';
import { apiClient } from '../services/apiClient';
import { getApiBaseUrl } from '../services/api';
import { ServiceDTO as Service } from '../types/service';
import { mapImageUrl } from '../utils/serviceHelpers';

const defaultLocation = { latitude: 14.5995, longitude: 120.9842 };

export function useDashboardData(
  user: User,
  serviceIdToBook?: string | null,
  onBookingModalClosed?: () => void,
) {
  const queryClient = useQueryClient();

  // Location state (not a fetch concern)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const isMountedRef = useRef(true);

  // Category browsing state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryServices, setCategoryServices] = useState<Service[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);

  // Booking modal state
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // --- Geolocation (unchanged) ---
  useEffect(() => {
    isMountedRef.current = true;
    if (Platform.OS !== 'web') {
      setUserLocation(defaultLocation);
    }
    const getLocation = async () => {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (isMountedRef.current) {
              setUserLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            }
          },
          (error) => {
            if (error.code !== 1) console.log('Geolocation error:', error);
            if (isMountedRef.current) setUserLocation(defaultLocation);
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (!isMountedRef.current) return;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (!isMountedRef.current) return;
          if (status !== 'granted') {
            if (isMountedRef.current) setUserLocation(defaultLocation);
            return;
          }
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Location request timeout')), 10000);
          });
          const location = await Promise.race([locationPromise, timeoutPromise]);
          if (isMountedRef.current) {
            setUserLocation({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        } catch {
          if (isMountedRef.current) setUserLocation(defaultLocation);
        }
      }
    };
    getLocation();
    return () => { isMountedRef.current = false; };
  }, []);

  // --- Queries ---
  const featuredQuery = useQuery({
    queryKey: ['featured-services'],
    queryFn: async () => {
      const data = await apiClient.get('/api/services', { limit: 50 });
      const mapped = (data.rows || []).map(mapImageUrl);
      return mapped.sort((a: Service, b: Service) => {
        const ratingA = parseFloat(a.s_rating?.toString() || '0');
        const ratingB = parseFloat(b.s_rating?.toString() || '0');
        const reviewCountA = parseInt(a.s_review_count?.toString() || '0');
        const reviewCountB = parseInt(b.s_review_count?.toString() || '0');
        if (ratingA !== ratingB) return ratingB - ratingA;
        return reviewCountB - reviewCountA;
      });
    },
  });

  const featuredServices = featuredQuery.data ?? [];
  const bannerServices = featuredServices.slice(0, 3);

  const nearbyQuery = useQuery({
    queryKey: ['nearby-services', userLocation?.latitude, userLocation?.longitude],
    queryFn: async () => {
      const params: Record<string, any> = { limit: 10, radius: 100 };
      if (userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
      }
      const data = await apiClient.get('/api/services', params);
      return (data.rows || []).map(mapImageUrl);
    },
    enabled: !!userLocation,
  });

  const categoryPreviewQuery = useQuery({
    queryKey: ['category-previews'],
    queryFn: async () => {
      const [photoData, venueData, musicData] = await Promise.all([
        apiClient.get('/api/services', { category: 'photography', limit: 3 }),
        apiClient.get('/api/services', { category: 'venue', limit: 3 }),
        apiClient.get('/api/services', { category: 'music', limit: 3 }),
      ]);
      return {
        photography: (photoData.rows || []).map(mapImageUrl),
        venue: (venueData.rows || []).map(mapImageUrl),
        music: (musicData.rows || []).map(mapImageUrl),
      };
    },
  });

  const categoryCountsQuery = useQuery({
    queryKey: ['category-counts'],
    queryFn: async () => {
      const categories = ['photography', 'venue', 'music', 'catering'];
      const responses = await Promise.all(
        categories.map(cat => apiClient.get('/api/services', { category: cat }))
      );
      const counts: Record<string, number> = {};
      categories.forEach((cat, i) => {
        counts[cat] = (responses[i].rows || []).length;
      });
      return counts;
    },
  });

  const photographyServices = categoryPreviewQuery.data?.photography ?? [];
  const venueServices = categoryPreviewQuery.data?.venue ?? [];
  const musicServices = categoryPreviewQuery.data?.music ?? [];

  // Combined loading state
  const loading = featuredQuery.isLoading;

  // --- Service-by-ID booking trigger ---
  useEffect(() => {
    if (serviceIdToBook) {
      const allServices = [
        ...bannerServices,
        ...featuredServices,
        ...(nearbyQuery.data ?? []),
        ...photographyServices,
        ...venueServices,
        ...musicServices,
        ...categoryServices
      ];
      const serviceToBook = allServices.find(s => s.idservice.toString() === serviceIdToBook);
      if (serviceToBook) {
        setSelectedService(serviceToBook);
        setShowBookingModal(true);
      } else {
        fetchServiceById(serviceIdToBook);
      }
    }
  }, [serviceIdToBook, featuredServices, nearbyQuery.data, photographyServices, venueServices, musicServices, categoryServices]);

  // --- Category browsing ---
  const loadCategoryServices = async (category: string, useFilters: boolean = false, buildFilterQuery?: (baseUrl: string, additionalParams?: { [key: string]: string }) => string) => {
    setLoadingCategory(true);
    try {
      let url: string;
      if (useFilters && buildFilterQuery) {
        url = buildFilterQuery(`${getApiBaseUrl()}/api/services`, { category });
      } else {
        const params = new URLSearchParams();
        params.append('category', category);
        url = `${getApiBaseUrl()}/api/services?${params.toString()}`;
      }
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        setCategoryServices((data.rows || []).map(mapImageUrl));
        setSelectedCategory(category);
      }
    } catch (error) {
      console.error('Error loading category services:', error);
    } finally {
      setLoadingCategory(false);
    }
  };

  const clearCategoryFilter = () => {
    setSelectedCategory(null);
    setCategoryServices([]);
  };

  // --- Booking handlers ---
  const handleBookNow = (service: Service) => {
    setSelectedService(service);
    setShowBookingModal(true);
  };

  const handleCloseBookingModal = () => {
    setShowBookingModal(false);
    setSelectedService(null);
    if (onBookingModalClosed) {
      onBookingModalClosed();
    }
  };

  const fetchServiceById = async (serviceId: string) => {
    try {
      const data = await apiClient.get(`/api/services/${serviceId}`);
      if (data.service) {
        const service = mapImageUrl(data.service);
        setSelectedService(service);
        setShowBookingModal(true);
      }
    } catch (error) {
      console.error('Error fetching service:', error);
      Alert.alert('Error', 'Failed to load service details. Please try again.');
    }
  };

  const handleConfirmBooking = async (date: string, startTime: string, endTime: string, attendees?: number, notes?: string): Promise<void> => {
    if (!selectedService || !user.email) {
      throw new Error('Unable to create booking. Please try again.');
    }

    let dateRangeInfo = null;
    let eventName = '';
    let eventDate = date;

    if (notes) {
      try {
        dateRangeInfo = JSON.parse(notes);
        if (dateRangeInfo.startDate && dateRangeInfo.endDate) {
          const startFormatted = new Date(dateRangeInfo.startDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
          const endFormatted = new Date(dateRangeInfo.endDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
          eventName = `${selectedService.s_name} - ${startFormatted} - ${endFormatted}`;
          eventDate = dateRangeInfo.startDate;
        }
      } catch {
        // notes not JSON
      }
    }

    if (!eventName) {
      const formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
      eventName = `${selectedService.s_name} - ${formattedDate}`;
    }

    const location = selectedService.s_city || 'TBD';

    const data = await apiClient.post('/api/bookings', {
      clientEmail: user.email,
      serviceId: selectedService.idservice,
      eventName,
      eventDate,
      startTime,
      endTime,
      location,
      attendees: attendees || null,
      notes: notes || null,
    });

    // On success, invalidate dashboard queries
    queryClient.invalidateQueries({ queryKey: ['featured-services'] });
    queryClient.invalidateQueries({ queryKey: ['user-bookings'] });
  };

  // --- Category image helper ---
  const getCategoryImage = (category: string): string | null => {
    if (category === 'photography' && photographyServices.length > 0 && photographyServices[0].primary_image) {
      return photographyServices[0].primary_image;
    } else if (category === 'venue' && venueServices.length > 0 && venueServices[0].primary_image) {
      return venueServices[0].primary_image;
    } else if (category === 'music' && musicServices.length > 0 && musicServices[0].primary_image) {
      return musicServices[0].primary_image;
    } else if (category === 'catering') {
      const cateringService = featuredServices.find(s => s.s_category === 'catering');
      if (cateringService && cateringService.primary_image) {
        return cateringService.primary_image;
      }
    }
    return null;
  };

  const loadDashboardData = async () => {
    queryClient.invalidateQueries({ queryKey: ['featured-services'] });
    queryClient.invalidateQueries({ queryKey: ['nearby-services'] });
    queryClient.invalidateQueries({ queryKey: ['category-previews'] });
    queryClient.invalidateQueries({ queryKey: ['category-counts'] });
  };

  return {
    loading,
    featuredServices,
    bannerServices,
    nearbyServices: nearbyQuery.data ?? [],
    photographyServices,
    venueServices,
    musicServices,
    categoryCounts: categoryCountsQuery.data ?? {},
    userLocation,
    selectedCategory,
    setSelectedCategory,
    categoryServices,
    setCategoryServices,
    loadingCategory,
    showBookingModal,
    selectedService,
    loadDashboardData,
    loadCategoryServices,
    clearCategoryFilter,
    handleBookNow,
    handleCloseBookingModal,
    handleConfirmBooking,
    getCategoryImage,
  };
}
