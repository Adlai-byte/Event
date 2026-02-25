import { useEffect, useState, useRef, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/apiClient';

export interface Service {
  id: string;
  name: string;
  provider: string;
  category: string;
  price: number;
  pricingType?: string;
  status: 'active' | 'inactive';
  rating: number;
  bookings: number;
  description: string;
}

export interface NewServiceForm {
  providerEmail: string;
  name: string;
  description: string;
  category: string;
  price: string;
  pricingType: 'fixed' | 'per_person';
  latitude: string;
  longitude: string;
  address: string;
}

const INITIAL_NEW_SERVICE: NewServiceForm = {
  providerEmail: '',
  name: '',
  description: '',
  category: '',
  price: '',
  pricingType: 'fixed',
  latitude: '',
  longitude: '',
  address: '',
};

const DEFAULT_LOCATION = { lat: 14.5995, lng: 120.9842 };

const CATEGORIES = ['all', 'venue', 'catering', 'photography', 'music'];

// Email validation function - stricter validation
const validateEmail = (email: string): string | null => {
  if (!email.trim()) {
    return 'Email is required';
  }
  // Requires proper domain and TLD (at least 2 characters)
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
};

async function fetchAdminServices(): Promise<Service[]> {
  const data = await apiClient.get<{ ok: boolean; rows: any[] }>('/api/services');
  if (data.ok && Array.isArray(data.rows)) {
    return data.rows.map((s: any) => ({
      id: s.idservice.toString(),
      name: s.s_name,
      provider: s.provider_name || 'Unknown Provider',
      category: s.s_category,
      price: parseFloat(s.s_base_price) || 0,
      pricingType: s.s_pricing_type || 'fixed',
      status: s.s_is_active ? 'active' : 'inactive',
      rating: parseFloat(s.s_rating) || 0,
      bookings: s.s_review_count || 0,
      description: s.s_description || ''
    }));
  }
  return [];
}

export function useAdminServices() {
  const queryClient = useQueryClient();

  // --- TanStack Query: load services ---
  const {
    data: services = [],
    isLoading: loading,
  } = useQuery<Service[]>({
    queryKey: ['admin-services'],
    queryFn: fetchAdminServices,
  });

  // --- UI state ---
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state for adding service
  const [newService, setNewService] = useState<NewServiceForm>(INITIAL_NEW_SERVICE);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Map state
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapWebViewRef = useRef<WebView>(null);
  const mapInitializedRef = useRef<boolean>(false);
  const mapInstanceRef = useRef<any>(null);

  // --- Geolocation on mount ---
  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapLocation({ lat: latitude, lng: longitude });
          setNewService(prev => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString()
          }));
        },
        (error) => {
          // Only log non-permission errors (permission denied is expected user behavior)
          if (error.code !== 1) {
            console.log('Geolocation error:', error);
          }
          setMapLocation(DEFAULT_LOCATION);
          setNewService(prev => ({
            ...prev,
            latitude: DEFAULT_LOCATION.lat.toString(),
            longitude: DEFAULT_LOCATION.lng.toString()
          }));
        }
      );
    } else {
      setMapLocation(DEFAULT_LOCATION);
      setNewService(prev => ({
        ...prev,
        latitude: DEFAULT_LOCATION.lat.toString(),
        longitude: DEFAULT_LOCATION.lng.toString()
      }));
    }
  }, []);

  // Initialize map for web platform
  useEffect(() => {
    if (Platform.OS !== 'web' || !mapLocation || typeof window === 'undefined' || mapInitializedRef.current) {
      return;
    }

    const loadLeaflet = () => {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!document.querySelector('script[src*="leaflet"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = initializeWebMap;
        document.head.appendChild(script);
      } else if ((window as any).L) {
        initializeWebMap();
      }
    };

    const initializeWebMap = () => {
      const L = (window as any).L;
      if (!L) {
        setTimeout(initializeWebMap, 100);
        return;
      }

      const mapElement = document.getElementById('map-container');
      if (!mapElement) {
        setTimeout(initializeWebMap, 100);
        return;
      }

      if (mapInitializedRef.current && mapInstanceRef.current) {
        return;
      }

      const lat = mapLocation.lat;
      const lng = mapLocation.lng;

      const map = L.map(mapElement, {
        zoomControl: true,
        doubleClickZoom: true,
        scrollWheelZoom: true
      }).setView([lat, lng], 13);

      mapInstanceRef.current = map;
      mapInitializedRef.current = true;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '\u00a9 OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        draggable: true
      }).addTo(map);

      const updateLocation = async (lat: number, lng: number) => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await response.json();
          const address = data.display_name || '';

          setNewService(prev => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lng.toString(),
            address: address
          }));
        } catch (error) {
          setNewService(prev => ({
            ...prev,
            latitude: lat.toString(),
            longitude: lng.toString(),
            address: ''
          }));
        }
      };

      marker.on('dragend', function(e: any) {
        const position = marker.getLatLng();
        updateLocation(position.lat, position.lng);
      });

      map.on('click', function(e: any) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        marker.setLatLng([lat, lng]);
        updateLocation(lat, lng);
      });

      updateLocation(lat, lng);
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
        mapInitializedRef.current = false;
      }
    };
  }, [mapLocation]);

  // --- Mutations ---

  const toggleStatusMutation = useMutation({
    mutationFn: async (service: Service) => {
      await apiClient.post(`/api/services/${service.id}/status`, {
        isActive: service.status !== 'active',
      });
      return service;
    },
    onSuccess: (_data, service) => {
      // Optimistically update the cache so the UI flips immediately
      queryClient.setQueryData<Service[]>(['admin-services'], (old) =>
        (old ?? []).map(s =>
          s.id === service.id
            ? { ...s, status: s.status === 'active' ? 'inactive' as const : 'active' as const }
            : s
        )
      );
    },
    onError: () => {
      Alert.alert('Error', 'Failed to update service status');
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (requestBody: Record<string, any>) => {
      return apiClient.post<{ ok: boolean; error?: string }>('/api/services', requestBody);
    },
    onSuccess: (data) => {
      if (data.ok) {
        Alert.alert('Success', 'Service added successfully!');

        setNewService(INITIAL_NEW_SERVICE);

        setMapLocation(DEFAULT_LOCATION);
        mapInitializedRef.current = false;
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {}
          mapInstanceRef.current = null;
        }

        setActiveTab('list');
        queryClient.invalidateQueries({ queryKey: ['admin-services'] });
      } else {
        const errorMsg = data.error || 'Failed to add service';
        Alert.alert('Error', errorMsg);
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to add service. Please try again.');
    },
    onSettled: () => {
      setSubmitting(false);
    },
  });

  // --- Handlers ---

  const handleToggleServiceStatus = useCallback(async (service: Service) => {
    toggleStatusMutation.mutate(service);
  }, [toggleStatusMutation]);

  const handleAddService = useCallback(async () => {
    if (submitting) {
      return;
    }

    // Validate email format
    const emailValidationError = validateEmail(newService.providerEmail);
    if (emailValidationError) {
      setEmailError(emailValidationError);
      Alert.alert('Invalid Email', emailValidationError);
      return;
    }

    if (!newService.providerEmail || !newService.name || !newService.category || !newService.price) {
      Alert.alert('Error', 'Please fill in all required fields (Provider Email, Service Name, Category, and Price)');
      return;
    }

    if (!newService.latitude || !newService.longitude) {
      Alert.alert('Error', 'Please pin the service location on the map');
      return;
    }

    const price = parseFloat(newService.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setSubmitting(true);

    let city = null;
    let state = null;
    if (newService.address) {
      const addressParts = newService.address.split(',');
      if (addressParts.length >= 2) {
        city = addressParts[addressParts.length - 3]?.trim() || null;
        state = addressParts[addressParts.length - 2]?.trim() || null;
      }
    }

    const requestBody = {
      providerEmail: newService.providerEmail.trim(),
      name: newService.name.trim(),
      description: newService.description.trim() || null,
      category: newService.category,
      basePrice: price,
      pricingType: newService.pricingType,
      duration: 60,
      maxCapacity: 1,
      latitude: parseFloat(newService.latitude),
      longitude: parseFloat(newService.longitude),
      address: newService.address || null,
      city: city,
      state: state
    };

    addServiceMutation.mutate(requestBody);
  }, [submitting, newService, addServiceMutation]);

  const handleMapMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location-selected') {
        setNewService(prev => ({
          ...prev,
          latitude: data.lat.toString(),
          longitude: data.lng.toString(),
          address: data.address || ''
        }));
        setMapLocation({ lat: data.lat, lng: data.lng });
      }
    } catch (error) {
      console.error('Error parsing map message:', error);
    }
  }, []);

  const generateMapHTML = useCallback(() => {
    const initialLat = mapLocation?.lat || DEFAULT_LOCATION.lat;
    const initialLng = mapLocation?.lng || DEFAULT_LOCATION.lng;
    const isWeb = Platform.OS === 'web';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            const map = L.map('map').setView([${initialLat}, ${initialLng}], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '\u00a9 OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);

            let marker = L.marker([${initialLat}, ${initialLng}], {
              draggable: true
            }).addTo(map);

            const sendMessage = (data) => {
              const message = JSON.stringify(data);
              ${isWeb ? `
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage(message, '*');
                } else {
                  window.postMessage(message, '*');
                }
              ` : `
                if (window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(message);
                }
              `}
            };

            const updateLocation = async (lat, lng) => {
              try {
                const response = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}\`);
                const data = await response.json();
                const address = data.display_name || '';

                sendMessage({
                  type: 'location-selected',
                  lat: lat,
                  lng: lng,
                  address: address
                });
              } catch (error) {
                sendMessage({
                  type: 'location-selected',
                  lat: lat,
                  lng: lng,
                  address: ''
                });
              }
            };

            marker.on('dragend', function(e) {
              const position = marker.getLatLng();
              updateLocation(position.lat, position.lng);
            });

            map.on('click', function(e) {
              const lat = e.latlng.lat;
              const lng = e.latlng.lng;
              marker.setLatLng([lat, lng]);
              updateLocation(lat, lng);
            });

            updateLocation(${initialLat}, ${initialLng});
          </script>
        </body>
      </html>
    `;
  }, [mapLocation]);

  const handleEmailChange = useCallback((text: string) => {
    setNewService(prev => ({ ...prev, providerEmail: text }));
    // Real-time email validation
    const error = validateEmail(text);
    setEmailError(error);
  }, []);

  const updateNewServiceField = useCallback(<K extends keyof NewServiceForm>(field: K, value: NewServiceForm[K]) => {
    setNewService(prev => ({ ...prev, [field]: value }));
  }, []);

  // Derived data
  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return {
    // State
    services,
    loading,
    submitting,
    activeTab,
    searchQuery,
    filterCategory,
    newService,
    emailError,
    mapLocation,
    mapWebViewRef,
    filteredServices,
    categories: CATEGORIES,

    // Setters
    setActiveTab,
    setSearchQuery,
    setFilterCategory,
    setNewService,

    // Handlers
    handleAddService,
    handleMapMessage,
    handleToggleServiceStatus,
    handleEmailChange,
    updateNewServiceField,
    generateMapHTML,
  };
}
