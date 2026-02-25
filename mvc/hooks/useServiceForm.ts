import { useState, useRef, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { User as UserModel } from '../models/User';
import { apiClient } from '../services/apiClient';

/** Shape of the service form data managed by this hook. */
export interface ServiceFormState {
  name: string;
  description: string;
  category: string;
  price: string;
  hourlyPrice: string;
  perDayPrice: string;
  maxCapacity: string;
  latitude: string;
  longitude: string;
  address: string;
  image: string | null;
}

const EMPTY_FORM: ServiceFormState = {
  name: '',
  description: '',
  category: '',
  price: '',
  hourlyPrice: '',
  perDayPrice: '',
  maxCapacity: '',
  latitude: '',
  longitude: '',
  address: '',
  image: null,
};

const DEFAULT_LOCATION = { lat: 14.5995, lng: 120.9842 };

export function useServiceForm(user?: UserModel) {
  const queryClient = useQueryClient();
  const [newService, setNewService] = useState<ServiceFormState>({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const mapWebViewRef = useRef<WebView>(null);
  const mapInitializedRef = useRef<boolean>(false);
  const mapInstanceRef = useRef<any>(null);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Set default location + attempt geolocation on mount
  useEffect(() => {
    setMapLocation(DEFAULT_LOCATION);
    setNewService(prev => ({
      ...prev,
      latitude: DEFAULT_LOCATION.lat.toString(),
      longitude: DEFAULT_LOCATION.lng.toString(),
    }));

    const getCurrentLocation = async () => {
      try {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              setMapLocation({ lat: latitude, lng: longitude });
              setNewService(prev => ({
                ...prev,
                latitude: latitude.toString(),
                longitude: longitude.toString(),
              }));
            },
            (error) => {
              if (error.code !== 1) {
                console.log('Geolocation error:', error);
              }
            },
          );
        } else if (Platform.OS !== 'web') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            try {
              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });
              const { latitude, longitude } = location.coords;
              setMapLocation({ lat: latitude, lng: longitude });
              setNewService(prev => ({
                ...prev,
                latitude: latitude.toString(),
                longitude: longitude.toString(),
              }));

              try {
                const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
                if (address) {
                  const addressString = [address.street, address.city, address.region, address.country]
                    .filter(Boolean)
                    .join(', ');
                  setNewService(prev => ({ ...prev, address: addressString }));
                }
              } catch (geocodeError) {
                console.log('Reverse geocoding error:', geocodeError);
              }
            } catch (locationError) {
              console.log('Location error:', locationError);
              Alert.alert(
                'Location Error',
                'Unable to get your current location. Please pin your location manually on the map.',
                [{ text: 'OK' }],
              );
            }
          } else {
            Alert.alert(
              'Location Permission',
              'Location permission is required to automatically pin your current location. You can still pin your location manually on the map.',
              [{ text: 'OK' }],
            );
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getCurrentLocation();
  }, []);

  // Initialize Leaflet map for web platform
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
        scrollWheelZoom: true,
      }).setView([lat, lng], 13);

      mapInstanceRef.current = map;
      mapInitializedRef.current = true;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '\u00a9 OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

      const updateLocation = async (lat: number, lng: number) => {
        setNewService(prev => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lng.toString(),
        }));

        try {
          await new Promise(resolve => setTimeout(resolve, 500));

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'User-Agent': 'EventApp/1.0', 'Accept-Language': 'en' } },
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          let address = data.display_name || '';

          if (!address && data.address) {
            const addr = data.address;
            const parts = [
              addr.road,
              addr.house_number,
              addr.neighbourhood || addr.suburb,
              addr.city || addr.town || addr.village,
              addr.state,
              addr.country,
            ].filter(Boolean);
            address = parts.join(', ');
          }

          if (address && address.trim()) {
            setNewService(prev => ({ ...prev, address }));
          } else {
            try {
              const retryResponse = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
                { headers: { 'User-Agent': 'EventApp/1.0', 'Accept-Language': 'en' } },
              );
              const retryData = await retryResponse.json();
              const retryAddress = retryData.display_name || '';

              if (retryAddress && retryAddress.trim()) {
                setNewService(prev => ({ ...prev, address: retryAddress }));
              } else if (retryData.address) {
                const addr = retryData.address;
                const parts = [
                  addr.road,
                  addr.house_number,
                  addr.neighbourhood || addr.suburb,
                  addr.city || addr.town || addr.village,
                  addr.state,
                  addr.country,
                ].filter(Boolean);
                const constructedAddress = parts.join(', ');
                if (constructedAddress) {
                  setNewService(prev => ({ ...prev, address: constructedAddress }));
                }
              }
            } catch (retryError) {
              console.error('Retry reverse geocoding error:', retryError);
            }
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
        }
      };

      marker.on('dragend', function (e: any) {
        const position = marker.getLatLng();
        updateLocation(position.lat, position.lng);
      });

      map.on('click', function (e: any) {
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
        } catch (e) {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null;
        mapInitializedRef.current = false;
      }
    };
  }, [mapLocation]);

  // ---- helpers ----

  const resetForm = () => {
    setNewService({ ...EMPTY_FORM });
    setMapLocation(DEFAULT_LOCATION);
    mapInitializedRef.current = false;
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove(); } catch (e) { /* */ }
      mapInstanceRef.current = null;
    }
  };

  const handleMapMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location-selected') {
        const lat = data.lat;
        const lng = data.lng;
        let address = data.address || '';

        if (!address || address.trim() === '' || address.startsWith('Coordinates:')) {
          try {
            if (Platform.OS !== 'web') {
              try {
                const [expoAddress] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                if (expoAddress) {
                  address = [expoAddress.street, expoAddress.city, expoAddress.region, expoAddress.country]
                    .filter(Boolean)
                    .join(', ');
                }
              } catch (expoError) {
                console.log('Expo reverse geocoding failed, trying Nominatim:', expoError);
              }
            }

            if (!address || address.trim() === '') {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
                { headers: { 'User-Agent': 'EventApp/1.0' } },
              );
              const nominatimData = await response.json();
              address = nominatimData.display_name || '';
            }
          } catch (geocodeError) {
            console.error('Reverse geocoding error:', geocodeError);
            if (!address || address.trim() === '') {
              address = `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
          }
        }

        setNewService(prev => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lng.toString(),
          address,
        }));
        setMapLocation({ lat, lng });
      }
    } catch (error) {
      console.error('Error parsing map message:', error);
    }
  };

  const handleImagePick = async () => {
    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            if (file.size > 10 * 1024 * 1024) {
              Alert.alert('Error', 'Image size must be less than 10MB');
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = reader.result as string;
              setNewService(prev => ({ ...prev, image: base64String }));
            };
            reader.onerror = () => {
              Alert.alert('Error', 'Failed to read image file');
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'We need access to your photos to upload a service image. Please enable photo library access in your device settings.',
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
            Alert.alert('Error', 'Image size must be less than 10MB');
            return;
          }
          if (asset.base64) {
            const imageExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpeg';
            const base64String = `data:image/${imageExtension};base64,${asset.base64}`;
            setNewService(prev => ({ ...prev, image: base64String }));
          } else {
            Alert.alert('Warning', 'Image processing failed. Please try selecting the image again.');
          }
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleRemoveImage = () => {
    setNewService(prev => ({ ...prev, image: null }));
  };

  // --- Mutations ---
  const addServiceMutation = useMutation({
    mutationFn: async (body: any) => {
      return apiClient.post('/api/services', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      return apiClient.put(`/api/services/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });

  const handleAddService = async (onSuccess: () => Promise<void>) => {
    setErrorMessage('');

    if (submitting) return;

    if (!newService.name || !newService.category || !newService.price) {
      setErrorMessage('Please fill in all required fields (Service Name, Category, and Price)');
      return;
    }
    if (!newService.latitude || !newService.longitude) {
      setErrorMessage('Please pin your location on the map');
      return;
    }
    if (!user?.uid) {
      setErrorMessage('User not authenticated');
      return;
    }

    if (newService.category === 'catering') {
      const price = parseFloat(newService.price);
      if (isNaN(price) || price <= 0) {
        setErrorMessage('Please enter a valid price per person');
        return;
      }
    } else {
      const hourlyPrice = newService.hourlyPrice ? parseFloat(newService.hourlyPrice) : null;
      const perDayPrice = newService.perDayPrice ? parseFloat(newService.perDayPrice) : null;
      if (!hourlyPrice || hourlyPrice <= 0) {
        setErrorMessage('Please enter a valid hourly price');
        return;
      }
      if (!perDayPrice || perDayPrice <= 0) {
        setErrorMessage('Please enter a valid per day price');
        return;
      }
    }

    setSubmitting(true);

    try {
      let city = null;
      let state = null;
      if (newService.address) {
        const addressParts = newService.address.split(',');
        if (addressParts.length >= 2) {
          city = addressParts[addressParts.length - 3]?.trim() || null;
          state = addressParts[addressParts.length - 2]?.trim() || null;
        }
      }

      const basePrice =
        newService.category === 'catering'
          ? parseFloat(newService.price)
          : parseFloat(newService.hourlyPrice) || 0;

      const requestBody = {
        providerId: user.uid,
        providerEmail: user.email || null,
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        category: newService.category,
        basePrice,
        hourlyPrice:
          newService.category !== 'catering' && newService.hourlyPrice
            ? parseFloat(newService.hourlyPrice)
            : null,
        perDayPrice:
          newService.category !== 'catering' && newService.perDayPrice
            ? parseFloat(newService.perDayPrice)
            : null,
        pricingType: 'fixed',
        duration: newService.category === 'catering' ? 240 : 60,
        maxCapacity: parseInt(newService.maxCapacity) || 1,
        latitude: parseFloat(newService.latitude),
        longitude: parseFloat(newService.longitude),
        address: newService.address || null,
        city,
        state,
        image: newService.image,
      };

      const data = await addServiceMutation.mutateAsync(requestBody);

      if (data.ok) {
        resetForm();
        setSuccessMessage('Service successfully added!');
        await onSuccess();
      } else {
        setErrorMessage(data.error || 'Failed to add service');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to add service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateService = async (onSuccess: () => Promise<void>) => {
    if (!editingServiceId) return;
    if (submitting) return;

    if (!newService.name || !newService.category) {
      setErrorMessage('Please fill in all required fields (Service Name and Category)');
      return;
    }

    if (newService.category === 'catering') {
      if (!newService.price) {
        setErrorMessage('Please enter a price per person');
        return;
      }
      const price = parseFloat(newService.price);
      if (isNaN(price) || price <= 0) {
        setErrorMessage('Please enter a valid price per person');
        return;
      }
    } else {
      const hourlyPrice = newService.hourlyPrice ? parseFloat(newService.hourlyPrice) : null;
      const perDayPrice = newService.perDayPrice ? parseFloat(newService.perDayPrice) : null;
      if (!hourlyPrice || hourlyPrice <= 0) {
        setErrorMessage('Please enter a valid hourly price');
        return;
      }
      if (!perDayPrice || perDayPrice <= 0) {
        setErrorMessage('Please enter a valid per day price');
        return;
      }
    }

    setSubmitting(true);

    try {
      const basePrice =
        newService.category === 'catering'
          ? parseFloat(newService.price)
          : parseFloat(newService.hourlyPrice) || 0;

      const requestBody: any = {
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        category: newService.category,
        basePrice,
        pricingType: 'fixed',
        duration: newService.category === 'catering' ? 240 : 60,
      };

      if (newService.category !== 'catering') {
        requestBody.hourlyPrice = newService.hourlyPrice ? parseFloat(newService.hourlyPrice) : null;
        requestBody.perDayPrice = newService.perDayPrice ? parseFloat(newService.perDayPrice) : null;
      }

      if (newService.maxCapacity) {
        requestBody.maxCapacity = parseInt(newService.maxCapacity) || 1;
      }

      let city = null;
      let state = null;
      if (newService.address) {
        const addressParts = newService.address.split(',');
        if (addressParts.length >= 2) {
          city = addressParts[addressParts.length - 3]?.trim() || null;
          state = addressParts[addressParts.length - 2]?.trim() || null;
        }
      }

      if (newService.address !== undefined) requestBody.address = newService.address || '';
      if (city !== undefined && city !== null) requestBody.city = city;
      if (state !== undefined && state !== null) requestBody.state = state;
      if (newService.latitude !== undefined && newService.longitude !== undefined) {
        requestBody.latitude = newService.latitude ? parseFloat(newService.latitude) : '';
        requestBody.longitude = newService.longitude ? parseFloat(newService.longitude) : '';
      }

      if (newService.image && typeof newService.image === 'string' && newService.image.startsWith('data:image')) {
        requestBody.image = newService.image;
      }

      const data = await updateServiceMutation.mutateAsync({ id: editingServiceId, body: requestBody });

      if (data.ok) {
        setNewService({ ...EMPTY_FORM });
        setEditingServiceId(null);
        setSuccessMessage('Service updated successfully!');
        await onSuccess();
      } else {
        setErrorMessage(data.error || 'Failed to update service. Please try again.');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  /** Populate the form with an existing service for editing. */
  const populateForEdit = (service: any) => {
    setEditingServiceId(service.id);

    if (service.latitude && service.longitude) {
      setMapLocation({ lat: service.latitude, lng: service.longitude });
    }

    let imageToSet = service.image || null;
    if (imageToSet && typeof imageToSet === 'string') {
      if (
        imageToSet.startsWith('http://') ||
        imageToSet.startsWith('https://') ||
        imageToSet.startsWith('/uploads/')
      ) {
        // keep for display
      } else if (!imageToSet.startsWith('data:image') && imageToSet.length > 50) {
        imageToSet = `data:image/jpeg;base64,${imageToSet}`;
      } else if (imageToSet.length < 50 && !imageToSet.startsWith('http')) {
        imageToSet = null;
      }
    }

    setNewService({
      name: service.name,
      description: service.description || '',
      category: service.category,
      price: service.category === 'catering' ? service.price.toString() : '',
      hourlyPrice: service.hourlyPrice ? service.hourlyPrice.toString() : '',
      perDayPrice: service.perDayPrice ? service.perDayPrice.toString() : '',
      maxCapacity: service.maxCapacity?.toString() || '',
      latitude: service.latitude?.toString() || '',
      longitude: service.longitude?.toString() || '',
      address: service.address || '',
      image: imageToSet,
    });
  };

  return {
    newService,
    setNewService,
    submitting,
    editingServiceId,
    setEditingServiceId,
    mapLocation,
    setMapLocation,
    successMessage,
    setSuccessMessage,
    errorMessage,
    setErrorMessage,
    mapWebViewRef,
    mapInitializedRef,
    mapInstanceRef,
    resetForm,
    handleMapMessage,
    handleImagePick,
    handleRemoveImage,
    handleAddService,
    handleUpdateService,
    populateForEdit,
  };
}
