import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, TextInput, Platform, Image, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { User as UserModel } from '../../models/User';
import { ServiceCategory } from '../../models/Service';
import { ServicePackage, formatPeso, calculatePackagePrice } from '../../models/Package';
import { getApiBaseUrl } from '../../services/api';
import { PackageBuilder } from '../../components/PackageBuilder';
import { AppLayout } from '../../components/layout';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;

interface ProviderServicesProps {
  user?: UserModel;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  status: 'active' | 'inactive';
  rating: number;
  bookings: number;
  description: string;
  image?: string | null;
  address?: string;
  latitude?: number;
  longitude?: number;
  duration?: number; // Duration in minutes
  maxCapacity?: number;
}

export const ServicesView: React.FC<ProviderServicesProps> = ({ user, onNavigate, onLogout }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit' | 'packages'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Package-related state
  const [packages, setPackages] = useState<Record<string, ServicePackage[]>>({});
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [showPackageBuilder, setShowPackageBuilder] = useState(false);
  const [selectedServiceForPackage, setSelectedServiceForPackage] = useState<Service | null>(null);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);

  // Form state for adding/editing service
  const [newService, setNewService] = useState({
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
    image: null as string | null // Base64 image data
  });

  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapWebViewRef = useRef<WebView>(null);
  const mapInitializedRef = useRef<boolean>(false);
  const mapInstanceRef = useRef<any>(null);

  // Auto-hide success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Reset form when switching to add mode (and not editing)
  useEffect(() => {
    if (activeTab === 'add' && !editingServiceId) {
      setNewService({
        name: '',
        description: '',
        category: '',
        price: '',
        duration: '',
        maxCapacity: undefined,
        latitude: '',
        longitude: '',
        address: '',
        image: null
      });
      // Reset map location
      const defaultLocation = { lat: 14.5995, lng: 120.9842 };
      setMapLocation(defaultLocation);
      mapInitializedRef.current = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
      }
    }
  }, [activeTab, editingServiceId]);

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    loadServices();
    
    // Always set a default location so map shows immediately
    const defaultLocation = { lat: 14.5995, lng: 120.9842 };
    
    // Set default location first so map shows immediately
    setMapLocation(defaultLocation);
    setNewService(prev => ({
      ...prev,
      latitude: defaultLocation.lat.toString(),
      longitude: defaultLocation.lng.toString()
    }));
    
    // Get user's current location
    const getCurrentLocation = async () => {
      try {
        if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
          // Web geolocation
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
              // Keep default location if geolocation fails
            }
          );
        } else if (Platform.OS !== 'web') {
          // Mobile: Request location permission and get current location
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
                longitude: longitude.toString()
              }));
              
              // Reverse geocode to get address
              try {
                const [address] = await Location.reverseGeocodeAsync({
                  latitude,
                  longitude,
                });
                
                if (address) {
                  const addressString = [
                    address.street,
                    address.city,
                    address.region,
                    address.country
                  ].filter(Boolean).join(', ');
                  
                  setNewService(prev => ({
                    ...prev,
                    address: addressString
                  }));
                }
              } catch (geocodeError) {
                console.log('Reverse geocoding error:', geocodeError);
              }
            } catch (locationError) {
              console.log('Location error:', locationError);
              Alert.alert(
                'Location Error',
                'Unable to get your current location. Please pin your location manually on the map.',
                [{ text: 'OK' }]
              );
            }
          } else {
            Alert.alert(
              'Location Permission',
              'Location permission is required to automatically pin your current location. You can still pin your location manually on the map.',
              [{ text: 'OK' }]
            );
          }
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };
    
    getCurrentLocation();
  }, []);

  // Initialize map for web platform - only once when mapLocation is first set
  useEffect(() => {
    if (Platform.OS !== 'web' || !mapLocation || typeof window === 'undefined' || mapInitializedRef.current) {
      return;
    }

    // Load Leaflet for web
    const loadLeaflet = () => {
      // Load CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      // Load JS
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

      // Don't re-initialize if already initialized
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
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);

      const marker = L.marker([lat, lng], {
        draggable: true
      }).addTo(map);

      const updateLocation = async (lat: number, lng: number) => {
        // Update coordinates immediately
        setNewService(prev => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lng.toString()
        }));
        
        try {
          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: {
              'User-Agent': 'EventApp/1.0',
              'Accept-Language': 'en'
            }
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          let address = data.display_name || '';
          
          // If display_name is empty, try to construct from address components
          if (!address && data.address) {
            const addr = data.address;
            const parts = [
              addr.road,
              addr.house_number,
              addr.neighbourhood || addr.suburb,
              addr.city || addr.town || addr.village,
              addr.state,
              addr.country
            ].filter(Boolean);
            address = parts.join(', ');
          }
          
          console.log('Reverse geocoding result:', { lat, lng, address, fullData: data });

          if (address && address.trim()) {
            setNewService(prev => ({
              ...prev,
              address: address
            }));
          } else {
            // If still no address, try one more time with different zoom level
            try {
              const retryResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`, {
                headers: {
                  'User-Agent': 'EventApp/1.0',
                  'Accept-Language': 'en'
                }
              });
              const retryData = await retryResponse.json();
              const retryAddress = retryData.display_name || '';
              
              if (retryAddress && retryAddress.trim()) {
                setNewService(prev => ({
                  ...prev,
                  address: retryAddress
                }));
              } else if (retryData.address) {
                // Try constructing from retry data
                const addr = retryData.address;
                const parts = [
                  addr.road,
                  addr.house_number,
                  addr.neighbourhood || addr.suburb,
                  addr.city || addr.town || addr.village,
                  addr.state,
                  addr.country
                ].filter(Boolean);
                const constructedAddress = parts.join(', ');
                if (constructedAddress) {
                  setNewService(prev => ({
                    ...prev,
                    address: constructedAddress
                  }));
                }
              }
            } catch (retryError) {
              console.error('Retry reverse geocoding error:', retryError);
            }
          }
          // Don't update mapLocation state to prevent re-renders and blinking
          // Only update if coordinates actually changed significantly
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          // Don't show coordinates - just keep the address field empty or previous value
          // The user can see the coordinates in the map itself
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

      // Initial location update (only once)
      updateLocation(lat, lng);
    };

    loadLeaflet();

    return () => {
      // Only cleanup on unmount
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
  }, [mapLocation]); // Only re-run if mapLocation changes from null to a value

  const loadServices = async () => {
    try {
      setLoading(true);
      const providerEmail = encodeURIComponent(user?.email || '');
      const resp = await fetch(`${getApiBaseUrl()}/api/services?providerEmail=${providerEmail}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          const mapped: Service[] = data.rows.map((s: any) => {
            // Parse address to extract coordinates if they exist
            let parsedAddress = s.s_address || '';
            let parsedLatitude: number | undefined;
            let parsedLongitude: number | undefined;
            
            // Address format: "address (lat,lng)" or just "lat,lng"
            if (parsedAddress) {
              const coordsMatch = parsedAddress.match(/\(([\d.-]+),([\d.-]+)\)/);
              if (coordsMatch) {
                parsedLatitude = parseFloat(coordsMatch[1]);
                parsedLongitude = parseFloat(coordsMatch[2]);
                // Remove coordinates from address string
                parsedAddress = parsedAddress.replace(/\s*\([\d.-]+,[\d.-]+\)\s*$/, '').trim();
              } else if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(parsedAddress.trim())) {
                // Address is just coordinates
                const [lat, lng] = parsedAddress.split(',');
                parsedLatitude = parseFloat(lat);
                parsedLongitude = parseFloat(lng);
                parsedAddress = '';
              }
            }
            
            // Handle image URL - can be file path or base64 (for backward compatibility)
            let imageData = s.primary_image || null;
            if (imageData && typeof imageData === 'string') {
              // If it's a file path (starts with /uploads), convert to full URL
              if (imageData.startsWith('/uploads/')) {
                // Get API base URL and construct full image URL
                const apiBaseUrl = getApiBaseUrl();
                // Add cache-busting parameter to ensure fresh image after update
                const cacheBuster = `?t=${Date.now()}`;
                imageData = `${apiBaseUrl}${imageData}${cacheBuster}`;
                console.log('🖼️  Image URL constructed:', {
                  original: s.primary_image,
                  apiBaseUrl: apiBaseUrl,
                  finalUrl: imageData.substring(0, 80) + '...'
                });
              } 
              // If it's base64 data URI, keep it as is
              else if (imageData.startsWith('data:image')) {
                // Already a data URI, keep it
                console.log('🖼️  Image is base64 data URI');
              }
              // If it's just base64 without prefix (old format), add prefix
              else if (imageData.length > 100) {
                imageData = `data:image/jpeg;base64,${imageData}`;
                console.log('🖼️  Image formatted as base64');
              }
            }
            
            console.log('Service data:', {
              id: s.idservice,
              name: s.s_name,
              primary_image: s.primary_image ? 'Has image' : 'No image',
              primary_image_path: s.primary_image ? s.primary_image.substring(0, 50) : 'none',
              image_length: s.primary_image ? s.primary_image.length : 0,
              image_formatted: imageData ? 'Formatted' : 'None',
              final_image_url: imageData ? imageData.substring(0, 80) : 'none',
              address: parsedAddress,
              latitude: parsedLatitude,
              longitude: parsedLongitude
            });
            
            // Use hourly price if available, otherwise use base price
            const displayPrice = s.s_hourly_price ? parseFloat(s.s_hourly_price) : (parseFloat(s.s_base_price) || 0);
            
            return {
              id: s.idservice.toString(),
              name: s.s_name,
              category: s.s_category,
              price: displayPrice,
              hourlyPrice: s.s_hourly_price ? parseFloat(s.s_hourly_price) : null,
              perDayPrice: s.s_per_day_price ? parseFloat(s.s_per_day_price) : null,
              status: s.s_is_active ? 'active' : 'inactive',
              rating: parseFloat(s.s_rating) || 0,
              bookings: s.s_review_count || 0,
              description: s.s_description || '',
              image: imageData,
              address: parsedAddress,
              latitude: parsedLatitude,
              longitude: parsedLongitude,
              duration: parseInt(s.s_duration) || 60,
              maxCapacity: parseInt(s.s_max_capacity) || 1
            };
          });
          setServices(mapped);
        }
      }
    } catch (error) {
      console.error('Error loading services:', error);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    if (services.length === 0) return;

    setLoadingPackages(true);
    try {
      const pkgsByService: Record<string, ServicePackage[]> = {};

      for (const service of services) {
        try {
          const resp = await fetch(`${getApiBaseUrl()}/api/services/${service.id}/packages`);
          if (resp.ok) {
            const data = await resp.json();
            if (data.ok && Array.isArray(data.packages)) {
              pkgsByService[service.id] = data.packages.map((p: any) => ({
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
            }
          }
        } catch (err) {
          console.error(`Error loading packages for service ${service.id}:`, err);
        }
      }

      setPackages(pkgsByService);
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  // Load packages when services change or when switching to packages tab
  useEffect(() => {
    if (activeTab === 'packages' && services.length > 0) {
      loadPackages();
    }
  }, [activeTab, services]);

  const handleCreatePackage = (service: Service) => {
    setSelectedServiceForPackage(service);
    setEditingPackage(null);
    setShowPackageBuilder(true);
  };

  const handleEditPackage = (pkg: ServicePackage, service: Service) => {
    setSelectedServiceForPackage(service);
    setEditingPackage(pkg);
    setShowPackageBuilder(true);
  };

  const handleDeletePackage = async (pkg: ServicePackage) => {
    Alert.alert(
      'Delete Package',
      `Are you sure you want to delete "${pkg.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const resp = await fetch(`${getApiBaseUrl()}/api/packages/${pkg.id}`, {
                method: 'DELETE',
              });
              const data = await resp.json();
              if (data.ok) {
                setSuccessMessage('Package deleted successfully');
                loadPackages();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete package');
              }
            } catch (error) {
              console.error('Delete package error:', error);
              Alert.alert('Error', 'Failed to delete package');
            }
          },
        },
      ]
    );
  };

  const handlePackageSaved = () => {
    setSuccessMessage(editingPackage ? 'Package updated successfully!' : 'Package created successfully!');
    loadPackages();
    setShowPackageBuilder(false);
    setEditingPackage(null);
    setSelectedServiceForPackage(null);
  };

  const handleAddService = async () => {
    // Clear previous error message
    setErrorMessage('');
    
    // Prevent double submission
    if (submitting) {
      console.log('Already submitting, please wait...');
      return;
    }

    // Validate required fields
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

    // Validate prices based on category
    if (newService.category === 'catering') {
      // For catering, validate base price (per person)
      const price = parseFloat(newService.price);
      if (isNaN(price) || price <= 0) {
        setErrorMessage('Please enter a valid price per person');
        return;
      }
    } else {
      // For non-catering, validate hourly and per-day prices
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

    // Duration is no longer required - will use default (1 hour = 60 minutes)

    setSubmitting(true);
    console.log('🚀 Starting service creation...');

    try {
      // Extract city and state from address if available
      let city = null;
      let state = null;
      if (newService.address) {
        const addressParts = newService.address.split(',');
        if (addressParts.length >= 2) {
          city = addressParts[addressParts.length - 3]?.trim() || null;
          state = addressParts[addressParts.length - 2]?.trim() || null;
        }
      }

      // Set default duration (1 hour = 60 minutes for non-catering, 4 hours = 240 minutes for catering)
      let durationInMinutes = newService.category === 'catering' ? 240 : 60;

      // Determine base price - use hourly price for non-catering, or price for catering
      const basePrice = newService.category === 'catering' 
        ? parseFloat(newService.price) 
        : (parseFloat(newService.hourlyPrice) || 0);
      
      const requestBody = {
        providerId: user.uid,
        providerEmail: user.email || null,
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        category: newService.category,
        basePrice: basePrice,
        hourlyPrice: newService.category !== 'catering' && newService.hourlyPrice ? parseFloat(newService.hourlyPrice) : null,
        perDayPrice: newService.category !== 'catering' && newService.perDayPrice ? parseFloat(newService.perDayPrice) : null,
        pricingType: 'fixed',
        duration: durationInMinutes,
        maxCapacity: parseInt(newService.maxCapacity) || 1,
        latitude: parseFloat(newService.latitude),
        longitude: parseFloat(newService.longitude),
        address: newService.address || null,
        city: city,
        state: state,
        image: newService.image // Include image data
      };

      console.log('========================================');
      console.log('📤 SENDING SERVICE DATA TO SERVER:');
      console.log('========================================');
      console.log('Provider ID (Firebase UID):', requestBody.providerId);
      console.log('Provider Email:', requestBody.providerEmail);
      console.log('Service Name:', requestBody.name);
      console.log('Description:', requestBody.description);
      console.log('Category:', requestBody.category);
      console.log('Base Price:', requestBody.basePrice);
      console.log('Pricing Type:', requestBody.pricingType);
      console.log('Duration (minutes):', requestBody.duration);
      console.log('Max Capacity:', requestBody.maxCapacity);
      console.log('Latitude:', requestBody.latitude);
      console.log('Longitude:', requestBody.longitude);
      console.log('Address:', requestBody.address);
      console.log('City:', requestBody.city);
      console.log('State:', requestBody.state);
      console.log('========================================');
      console.log('Full Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('========================================');

      console.log('📡 Making POST request to:', `${getApiBaseUrl()}/api/services`);
      
      const resp = await fetch(`${getApiBaseUrl()}/api/services`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', resp.status, resp.statusText);
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('❌ Response error:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Server error');
        } catch (e) {
          throw new Error(errorText || 'Failed to add service');
        }
      }

      const data = await resp.json();
      console.log('========================================');
      console.log('📥 SERVER RESPONSE:');
      console.log('========================================');
      console.log('Status:', resp.status, resp.statusText);
      console.log('Response Data:', JSON.stringify(data, null, 2));
      console.log('========================================');

      if (data.ok) {
        console.log('✅ Service created successfully! ID:', data.id);
        
        // Reset form
        setNewService({ 
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
          image: null
        });
        
        // Reset map location
        const defaultLocation = { lat: 14.5995, lng: 120.9842 };
        setMapLocation(defaultLocation);
        mapInitializedRef.current = false;
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {}
          mapInstanceRef.current = null;
        }
        
        // Switch to list view, show success message, and reload
        setActiveTab('list');
        setSuccessMessage('Service successfully added!');
        await loadServices();
      } else {
        const errorMsg = data.error || 'Failed to add service';
        setErrorMessage(errorMsg);
        console.error('❌ Add service error:', errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Add service exception:', error);
      setErrorMessage(error.message || 'Failed to add service. Please try again.');
    } finally {
      setSubmitting(false);
      console.log('🏁 Service creation process completed');
    }
  };

  const handleMapMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'location-selected') {
        console.log('Received location from map:', data);
        const lat = data.lat;
        const lng = data.lng;
        let address = data.address || '';
        
        // If address is empty or just coordinates, try to get it using reverse geocoding
        if (!address || address.trim() === '' || address.startsWith('Coordinates:')) {
          try {
            // Try expo-location reverse geocoding first (for mobile)
            if (Platform.OS !== 'web') {
              try {
                const [expoAddress] = await Location.reverseGeocodeAsync({
                  latitude: lat,
                  longitude: lng,
                });
                
                if (expoAddress) {
                  address = [
                    expoAddress.street,
                    expoAddress.city,
                    expoAddress.region,
                    expoAddress.country
                  ].filter(Boolean).join(', ');
                }
              } catch (expoError) {
                console.log('Expo reverse geocoding failed, trying Nominatim:', expoError);
              }
            }
            
            // Fallback to Nominatim API if expo-location didn't work or on web
            if (!address || address.trim() === '') {
              const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
                headers: {
                  'User-Agent': 'EventApp/1.0'
                }
              });
              const nominatimData = await response.json();
              address = nominatimData.display_name || '';
            }
          } catch (geocodeError) {
            console.error('Reverse geocoding error:', geocodeError);
            // Keep coordinates as fallback
            if (!address || address.trim() === '') {
              address = `Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            }
          }
        }
        
        setNewService(prev => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lng.toString(),
          address: address
        }));
        setMapLocation({ lat: lat, lng: lng });
      }
    } catch (error) {
      console.error('Error parsing map message:', error);
    }
  };

  const handleImagePick = async () => {
    try {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // For web, create a file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 10MB for service images)
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
        // Mobile implementation using expo-image-picker
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'We need access to your photos to upload a service image. Please enable photo library access in your device settings.'
          );
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9], // Service images can be landscape
          quality: 0.8,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          // Check file size (10MB limit)
          if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
            Alert.alert('Error', 'Image size must be less than 10MB');
            return;
          }
          // Convert to base64 if we have the data
          if (asset.base64) {
            const imageExtension = asset.uri.split('.').pop()?.toLowerCase() || 'jpeg';
            const base64String = `data:image/${imageExtension};base64,${asset.base64}`;
            setNewService(prev => ({ ...prev, image: base64String }));
          } else {
            Alert.alert('Warning', 'Image processing failed. Please try selecting the image again.');
            console.warn('Base64 data not available for image:', asset.uri);
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

  const generateMapHTML = () => {
    const initialLat = mapLocation?.lat || 14.5995;
    const initialLng = mapLocation?.lng || 120.9842;
    const isWeb = Platform.OS === 'web';
    const postMessageMethod = isWeb ? 'window.parent.postMessage' : 'window.ReactNativeWebView.postMessage';
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
            #map { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <script>
            const map = L.map('map').setView([${initialLat}, ${initialLng}], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);
            
            let marker = L.marker([${initialLat}, ${initialLng}], {
              draggable: true
            }).addTo(map);
            
            const sendMessage = (data) => {
              const message = JSON.stringify(data);
              ${isWeb ? `
                // For web, use window.postMessage to communicate with parent
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage(message, '*');
                } else {
                  // Fallback for same-origin iframe
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
                // Add a small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const response = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}&zoom=18&addressdetails=1\`, {
                  headers: {
                    'User-Agent': 'EventApp/1.0',
                    'Accept-Language': 'en'
                  }
                });
                
                if (!response.ok) {
                  throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const data = await response.json();
                let address = data.display_name || '';
                
                // If display_name is empty, try to construct from address components
                if (!address && data.address) {
                  const addr = data.address;
                  const parts = [
                    addr.road,
                    addr.house_number,
                    addr.neighbourhood || addr.suburb,
                    addr.city || addr.town || addr.village,
                    addr.state,
                    addr.country
                  ].filter(Boolean);
                  address = parts.join(', ');
                }
                
                console.log('WebView reverse geocoding result:', { lat, lng, address });
                
                if (address && address.trim()) {
                  sendMessage({
                    type: 'location-selected',
                    lat: lat,
                    lng: lng,
                    address: address
                  });
                } else {
                  // Try one more time with different zoom level
                  try {
                    const retryResponse = await fetch(\`https://nominatim.openstreetmap.org/reverse?format=json&lat=\${lat}&lon=\${lng}&zoom=16&addressdetails=1\`, {
                      headers: {
                        'User-Agent': 'EventApp/1.0',
                        'Accept-Language': 'en'
                      }
                    });
                    const retryData = await retryResponse.json();
                    const retryAddress = retryData.display_name || '';
                    
                    if (retryAddress && retryAddress.trim()) {
                      sendMessage({
                        type: 'location-selected',
                        lat: lat,
                        lng: lng,
                        address: retryAddress
                      });
                    } else if (retryData.address) {
                      // Try constructing from retry data
                      const addr = retryData.address;
                      const parts = [
                        addr.road,
                        addr.house_number,
                        addr.neighbourhood || addr.suburb,
                        addr.city || addr.town || addr.village,
                        addr.state,
                        addr.country
                      ].filter(Boolean);
                      const constructedAddress = parts.join(', ');
                      if (constructedAddress) {
                        sendMessage({
                          type: 'location-selected',
                          lat: lat,
                          lng: lng,
                          address: constructedAddress
                        });
                      } else {
                        sendMessage({
                          type: 'location-selected',
                          lat: lat,
                          lng: lng,
                          address: ''
                        });
                      }
                    } else {
                      sendMessage({
                        type: 'location-selected',
                        lat: lat,
                        lng: lng,
                        address: ''
                      });
                    }
                  } catch (retryError) {
                    console.error('Retry reverse geocoding error:', retryError);
                    sendMessage({
                      type: 'location-selected',
                      lat: lat,
                      lng: lng,
                      address: ''
                    });
                  }
                }
              } catch (error) {
                console.error('WebView reverse geocoding error:', error);
                // Don't send coordinates - let handleMapMessage handle it
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
            
            // Initial location update
            updateLocation(${initialLat}, ${initialLng});
            
            ${isWeb ? `
            // Listen for messages from parent (if needed)
            window.addEventListener('message', function(event) {
              // Handle any messages from parent if needed
            });
            ` : ''}
          </script>
        </body>
      </html>
    `;
  };

  const handleToggleServiceStatus = async (service: Service) => {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services/${service.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: service.status !== 'active' })
      });
      if (resp.ok) {
        setServices(prev => prev.map(s => 
          s.id === service.id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s
        ));
        Alert.alert('Success', `Service ${service.status === 'active' ? 'deactivated' : 'activated'} successfully`);
      } else {
        Alert.alert('Error', 'Failed to update service status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update service status');
    }
  };

  const handleEditService = (service: Service) => {
    setEditingServiceId(service.id);
    
    // Set map location if coordinates are available
    if (service.latitude && service.longitude) {
      setMapLocation({ lat: service.latitude, lng: service.longitude });
    }
    
    // Log image data for debugging
    console.log('Editing service - Image data:', {
      serviceId: service.id,
      serviceName: service.name,
      hasImage: !!service.image,
      imageType: service.image ? typeof service.image : 'none',
      imageLength: service.image ? service.image.length : 0,
      imageStart: service.image ? service.image.substring(0, 50) : 'none',
      isValidDataURI: service.image ? service.image.startsWith('data:image') : false
    });
    
    // Keep image as-is (can be URL or base64)
    // URLs are fine for display, base64 will be used when uploading new image
    let imageToSet = service.image || null;
    if (imageToSet && typeof imageToSet === 'string') {
      // If it's a URL (http/https/uploads), keep it as is
      if (imageToSet.startsWith('http://') || imageToSet.startsWith('https://') || imageToSet.startsWith('/uploads/')) {
        // It's a URL, keep it for display
        console.log('Image is URL, keeping for display');
      }
      // If it's base64 but missing data URI prefix, add it
      else if (!imageToSet.startsWith('data:image') && imageToSet.length > 50) {
        imageToSet = `data:image/jpeg;base64,${imageToSet}`;
        console.log('Formatted image data URI');
      }
      // If it's too short and not a URL, it's probably invalid
      else if (imageToSet.length < 50 && !imageToSet.startsWith('http')) {
        console.warn('Image data seems too short, setting to null');
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
      image: imageToSet
    });
    setActiveTab('edit');
  };

  const handleUpdateService = async () => {
    if (!editingServiceId) return;

    // Prevent double submission
    if (submitting) {
      return;
    }

    // Validate required fields based on category
    if (!newService.name || !newService.category) {
      setErrorMessage('Please fill in all required fields (Service Name and Category)');
      return;
    }

    // Validate prices based on category
    if (newService.category === 'catering') {
      // For catering, validate base price (per person)
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
      // For non-catering, validate hourly and per-day prices
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

    // Duration is no longer required - will use default (1 hour = 60 minutes)

    setSubmitting(true);

    try {
      // Determine base price - use hourly price for non-catering, or price for catering
      const basePrice = newService.category === 'catering' 
        ? parseFloat(newService.price) 
        : (parseFloat(newService.hourlyPrice) || 0);
      
      const requestBody: any = {
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        category: newService.category,
        basePrice: basePrice,
        pricingType: 'fixed',
      };

      // Set default duration (1 hour = 60 minutes for non-catering, 4 hours = 240 minutes for catering)
      requestBody.duration = newService.category === 'catering' ? 240 : 60;
      
      // Add hourly and per-day prices for non-catering services
      if (newService.category !== 'catering') {
        requestBody.hourlyPrice = newService.hourlyPrice ? parseFloat(newService.hourlyPrice) : null;
        requestBody.perDayPrice = newService.perDayPrice ? parseFloat(newService.perDayPrice) : null;
      }
      
      if (newService.maxCapacity) {
        requestBody.maxCapacity = parseInt(newService.maxCapacity) || 1;
      }
      
      // Extract city and state from address if available (same as create endpoint)
      let city = null;
      let state = null;
      if (newService.address) {
        const addressParts = newService.address.split(',');
        if (addressParts.length >= 2) {
          // Address format: "Street, City, State, Country"
          // Get city (usually 2nd to last) and state (usually 3rd to last)
          city = addressParts[addressParts.length - 3]?.trim() || null;
          state = addressParts[addressParts.length - 2]?.trim() || null;
        }
      }
      
      // Always send location data if available (even if empty, to preserve or update location)
      if (newService.address !== undefined) {
        requestBody.address = newService.address || '';
      }
      if (city !== undefined && city !== null) {
        requestBody.city = city;
      }
      if (state !== undefined && state !== null) {
        requestBody.state = state;
      }
      if (newService.latitude !== undefined && newService.longitude !== undefined) {
        requestBody.latitude = newService.latitude ? parseFloat(newService.latitude) : '';
        requestBody.longitude = newService.longitude ? parseFloat(newService.longitude) : '';
      }
      // Include image if it exists and is a base64 string (new upload)
      // Only send if it's a data URI (new image), not a URL (existing image)
      if (newService.image && typeof newService.image === 'string' && newService.image.startsWith('data:image')) {
        requestBody.image = newService.image;
        console.log('📤 Sending image update (base64 data URI)');
      } else if (newService.image) {
        console.log('ℹ️  Image is URL, not sending update (no change):', newService.image.substring(0, 50));
      }

      const resp = await fetch(`${getApiBaseUrl()}/api/services/${editingServiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await resp.json();

      if (resp.ok && data.ok) {
        // Reset form and reload services
        setNewService({
          name: '',
          description: '',
          category: '',
          price: '',
    maxCapacity: '',
          latitude: '',
          longitude: '',
          address: '',
          image: null
        });
        setEditingServiceId(null);
        // Switch to list view and show success message
        setActiveTab('list');
        setSuccessMessage('Service updated successfully!');
        // Force reload services to get updated image
        console.log('🔄 Reloading services after update...');
        await loadServices();
        console.log('✅ Services reloaded');
      } else {
        setErrorMessage(data.error || 'Failed to update service. Please try again.');
      }
    } catch (error: any) {
      console.error('Error updating service:', error);
      setErrorMessage(error.message || 'Failed to update service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['all', 'venue', 'catering', 'photography', 'music'];
  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AppLayout
      role="provider"
      activeRoute="services"
      title="Services"
      user={user}
      onNavigate={(route) => onNavigate?.(route)}
      onLogout={() => onLogout?.()}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>

        {/* Tab Buttons */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
            onPress={() => setActiveTab('list')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'list' && styles.tabButtonTextActive]}>My Services</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, (activeTab === 'add' || activeTab === 'edit') && styles.tabButtonActive]}
            onPress={() => {
              // Always reset form when switching to add mode
              setEditingServiceId(null);
              setNewService({
                name: '',
                description: '',
                category: '',
                price: '',
                maxCapacity: undefined,
                latitude: '',
                longitude: '',
                address: '',
                image: null
              });
              // Reset map location
              const defaultLocation = { lat: 14.5995, lng: 120.9842 };
              setMapLocation(defaultLocation);
              mapInitializedRef.current = false;
              if (mapInstanceRef.current) {
                try {
                  mapInstanceRef.current.remove();
                } catch (e) {}
                mapInstanceRef.current = null;
              }
              setActiveTab('add');
            }}
          >
            <Text style={[styles.tabButtonText, (activeTab === 'add' || activeTab === 'edit') && styles.tabButtonTextActive]}>
              {activeTab === 'edit' ? 'Cancel Edit' : 'Add Service'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'packages' && styles.tabButtonActive]}
            onPress={() => setActiveTab('packages')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'packages' && styles.tabButtonTextActive]}>
              Packages
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {activeTab === 'list' && (
            <>
              {successMessage ? (
                <View style={styles.successMessage}>
                  <Text style={styles.successMessageText}>{successMessage}</Text>
                  <TouchableOpacity onPress={() => setSuccessMessage('')} style={styles.successCloseButton}>
                    <Text style={styles.successCloseText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {/* Search and Filter */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search services..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
                  {categories.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, filterCategory === cat && styles.categoryChipActive]}
                      onPress={() => setFilterCategory(cat)}
                    >
                      <Text style={[styles.categoryChipText, filterCategory === cat && styles.categoryChipTextActive]}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Services Table */}
              {isMobile ? (
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={true}
                  style={styles.tableScrollContainer}
                  contentContainerStyle={styles.tableScrollContent}
                >
                  <View style={styles.tableContainer}>
                    {/* Table Header */}
                    <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.tableColImage]}>Photo</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColName]}>Service Name</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColCategory]}>Category</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColPrice]}>Price</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColRating]}>Rating</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColStatus]}>Status</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColActions]}>Actions</Text>
                  </View>
                  
                  {/* Table Rows */}
                  {filteredServices.map((service, i) => (
                    <View key={service.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                      <View style={styles.tableColImage}>
                        {service.image && (service.image.startsWith('http://') || service.image.startsWith('https://') || service.image.startsWith('data:image')) ? (
                          <Image 
                            source={{ uri: service.image }} 
                            style={styles.tableImage}
                            onError={(e) => {
                              console.error('❌ Image load error for service:', service.name);
                              console.error('Error details:', e.nativeEvent?.error || 'Unknown error');
                              console.log('Image URL:', service.image);
                              console.log('Image URL length:', service.image?.length);
                            }}
                            onLoad={() => console.log('✅ Image loaded for service:', service.name, 'URL:', service.image?.substring(0, 60))}
                          />
                        ) : (
                          <View style={styles.tableImagePlaceholder}>
                            <Text style={styles.tableImagePlaceholderText}>📷</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.tableColName}>
                        <Text style={[styles.tableCell, { fontWeight: '600' }]} numberOfLines={1}>
                          {service.name}
                        </Text>
                      </View>
                      <View style={styles.tableColCategory}>
                        <Text style={styles.tableCell}>
                          {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                        </Text>
                      </View>
                      <View style={styles.tableColPrice}>
                        <Text style={[styles.tableCell, { fontWeight: '600' }]}>
                          ₱{service.price.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.tableColRating}>
                        <Text style={[styles.tableCell, { fontSize: 13 }]}>
                          ⭐ {service.rating} ({service.bookings})
                        </Text>
                      </View>
                      <View style={styles.tableColStatus}>
                        <View style={[styles.statusBadge, service.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                          <Text style={styles.statusText}>{service.status}</Text>
                        </View>
                      </View>
                      <View style={styles.tableColActions}>
                        <View style={styles.tableActions}>
                          <TouchableOpacity 
                            style={[styles.tableActionButton, service.status === 'active' ? styles.deactivateButton : styles.activateButton]}
                            onPress={() => handleToggleServiceStatus(service)}
                          >
                            <Text style={styles.tableActionButtonText}>
                              {service.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.tableActionButton, styles.editButton]}
                            onPress={() => handleEditService(service)}
                          >
                            <Text style={styles.editButtonText}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.tableContainer}>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderText, styles.tableColImage]}>Photo</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColName]}>Service Name</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColCategory]}>Category</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColPrice]}>Price</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColRating]}>Rating</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColStatus]}>Status</Text>
                    <Text style={[styles.tableHeaderText, styles.tableColActions]}>Actions</Text>
                  </View>

                  {/* Table Rows */}
                  {filteredServices.map((service, i) => (
                    <View key={service.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
                      <View style={styles.tableColImage}>
                        {service.image && (service.image.startsWith('http://') || service.image.startsWith('https://') || service.image.startsWith('data:image')) ? (
                          <Image 
                            source={{ uri: service.image }} 
                            style={styles.tableImage}
                            onError={(e) => {
                              console.error('❌ Image load error for service:', service.name);
                              console.error('Error details:', e.nativeEvent?.error || 'Unknown error');
                              console.log('Image URL:', service.image);
                              console.log('Image URL length:', service.image?.length);
                            }}
                            onLoad={() => console.log('✅ Image loaded for service:', service.name, 'URL:', service.image?.substring(0, 60))}
                          />
                        ) : (
                          <View style={styles.tableImagePlaceholder}>
                            <Text style={styles.tableImagePlaceholderText}>📷</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.tableColName}>
                        <Text style={[styles.tableCell, { fontWeight: '600' }]} numberOfLines={1}>
                          {service.name}
                        </Text>
                      </View>
                      <View style={styles.tableColCategory}>
                        <Text style={styles.tableCell}>
                          {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                        </Text>
                      </View>
                      <View style={styles.tableColPrice}>
                        <Text style={[styles.tableCell, { fontWeight: '600' }]}>
                          ₱{service.price.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.tableColRating}>
                        <Text style={[styles.tableCell, { fontSize: 13 }]}>
                          ⭐ {service.rating} ({service.bookings})
                        </Text>
                      </View>
                      <View style={styles.tableColStatus}>
                        <View style={[styles.statusBadge, service.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                          <Text style={styles.statusText}>{service.status}</Text>
                        </View>
                      </View>
                      <View style={styles.tableColActions}>
                        <View style={styles.tableActions}>
                          <TouchableOpacity 
                            style={[styles.tableActionButton, service.status === 'active' ? styles.deactivateButton : styles.activateButton]}
                            onPress={() => handleToggleServiceStatus(service)}
                          >
                            <Text style={styles.tableActionButtonText}>
                              {service.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.tableActionButton, styles.editButton]}
                            onPress={() => handleEditService(service)}
                          >
                            <Text style={styles.editButtonText}>Edit</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {filteredServices.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No services found</Text>
                  <Text style={styles.emptyStateSubtext}>Add your first service to get started</Text>
                </View>
              )}
            </>
          )}

          {(activeTab === 'add' || activeTab === 'edit') && (
            <View style={styles.addForm}>
              {activeTab === 'edit' && (
                <Text style={styles.formTitle}>Edit Service</Text>
              )}
              {errorMessage ? (
                <View style={styles.errorMessage}>
                  <Text style={styles.errorMessageText}>{errorMessage}</Text>
                  <TouchableOpacity onPress={() => setErrorMessage('')} style={styles.errorCloseButton}>
                    <Text style={styles.errorCloseText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              <Text style={styles.formLabel}>Service Name *</Text>
              <TextInput 
                style={styles.addInputFull} 
                placeholder="Enter service name" 
                value={newService.name}
                onChangeText={(text) => setNewService({...newService, name: text})}
              />
              
              <Text style={styles.formLabel}>Description</Text>
              <TextInput 
                style={[styles.addInputFull, styles.textArea]} 
                placeholder="Enter service description" 
                multiline
                numberOfLines={4}
                value={newService.description}
                onChangeText={(text) => setNewService({...newService, description: text})}
              />
              
              <Text style={styles.formLabel}>Service Photo</Text>
              {(() => {
                // Check if image is valid - can be base64 data URI or URL
                const hasValidImage = newService.image && 
                                     typeof newService.image === 'string' && 
                                     (newService.image.startsWith('data:image') || 
                                      newService.image.startsWith('http://') || 
                                      newService.image.startsWith('https://') ||
                                      newService.image.startsWith('/uploads/'));
                
                console.log('Image preview check:', {
                  hasImage: !!newService.image,
                  imageLength: newService.image?.length || 0,
                  isDataURI: newService.image?.startsWith('data:image') || false,
                  isURL: newService.image?.startsWith('http') || newService.image?.startsWith('/uploads/') || false,
                  willShow: hasValidImage
                });
                
                return hasValidImage ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image 
                      source={{ uri: newService.image }} 
                      style={styles.imagePreview}
                      onError={(e) => {
                        console.error('❌ Image display error in edit form');
                        console.error('Error details:', e.nativeEvent?.error || 'Unknown error');
                        console.log('Image URI length:', newService.image?.length);
                        console.log('Image URI start:', newService.image?.substring(0, 50));
                        console.log('Image URI end:', newService.image?.substring(newService.image.length - 20));
                      }}
                      onLoad={() => {
                        console.log('✅ Image loaded successfully in edit form');
                        console.log('Image size:', newService.image?.length);
                      }}
                    />
                    <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
                      <Text style={styles.removeImageText}>Remove Photo</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.imageUploadButton} onPress={handleImagePick}>
                    <Text style={styles.imageUploadText}>📷 Choose Photo</Text>
                  </TouchableOpacity>
                );
              })()}
              
              <Text style={styles.formLabel}>Location *</Text>
              <Text style={styles.mapHint}>Click on the map or drag the marker to pin your service location</Text>
              <View style={styles.mapContainer}>
                {mapLocation ? (
                  Platform.OS === 'web' ? (
                    <View
                      style={styles.map}
                      // @ts-ignore - web-specific prop
                      nativeID="map-container"
                    />
                  ) : (
                    <View style={{ flex: 1, position: 'relative' }}>
                      <WebView
                        ref={mapWebViewRef}
                        source={{ html: generateMapHTML() }}
                        style={styles.map}
                        onMessage={handleMapMessage}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={true}
                        scalesPageToFit={true}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        allowFileAccess={true}
                        mixedContentMode="always"
                        originWhitelist={['*']}
                        onError={(syntheticEvent) => {
                          const { nativeEvent } = syntheticEvent;
                          console.error('WebView error: ', nativeEvent);
                        }}
                        onLoadEnd={() => {
                          console.log('Map WebView loaded successfully');
                        }}
                        onLoadStart={() => {
                          console.log('Map WebView loading started');
                        }}
                        renderLoading={() => (
                          <View style={styles.mapLoadingContainer}>
                            <ActivityIndicator size="large" color="#4a55e1" />
                            <Text style={styles.mapLoadingText}>Loading map...</Text>
                          </View>
                        )}
                      />
                    </View>
                  )
                ) : (
                  <View style={styles.mapLoadingContainer}>
                    <ActivityIndicator size="large" color="#4a55e1" />
                    <Text style={styles.mapLoadingText}>Loading map...</Text>
                  </View>
                )}
              </View>
              {newService.address && newService.address.trim() ? (
                <Text style={styles.addressText} numberOfLines={3}>
                  📍 {newService.address}
                </Text>
              ) : newService.latitude && newService.longitude ? (
                <Text style={styles.addressText} numberOfLines={3}>
                  📍 {newService.latitude}, {newService.longitude}
                </Text>
              ) : (
                <Text style={styles.addressPlaceholder}>
                  Location will appear here after pinning
                </Text>
              )}
              
              <Text style={styles.formLabel}>Category *</Text>
              <View style={styles.categoryGrid}>
                {categories.filter(c => c !== 'all').map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.categoryOption, newService.category === cat && styles.categoryOptionSelected]}
                    onPress={() => setNewService({...newService, category: cat})}
                  >
                    <Text style={[styles.categoryOptionText, newService.category === cat && styles.categoryOptionTextSelected]}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {newService.category === 'catering' ? (
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Price (₱) *</Text>
                    <TextInput 
                      style={styles.addInput} 
                      placeholder="Enter price per person" 
                      keyboardType="numeric"
                      value={newService.price}
                      onChangeText={(text) => setNewService({...newService, price: text})}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.formRow}>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Hourly Price (₱) *</Text>
                    <TextInput 
                      style={styles.addInput} 
                      placeholder="Enter hourly price" 
                      keyboardType="numeric"
                      value={newService.hourlyPrice}
                      onChangeText={(text) => setNewService({...newService, hourlyPrice: text})}
                    />
                  </View>
                  <View style={styles.formCol}>
                    <Text style={styles.formLabel}>Per Day Price (₱) *</Text>
                    <TextInput 
                      style={styles.addInput} 
                      placeholder="Enter per day price" 
                      keyboardType="numeric"
                      value={newService.perDayPrice}
                      onChangeText={(text) => setNewService({...newService, perDayPrice: text})}
                    />
                  </View>
                </View>
              )}


              <Text style={styles.formLabel}>Max Capacity</Text>
              <TextInput 
                style={styles.addInputFull} 
                placeholder="1" 
                keyboardType="numeric"
                value={newService.maxCapacity}
                onChangeText={(text) => setNewService({...newService, maxCapacity: text})}
              />
              
              <TouchableOpacity 
                style={[styles.addButtonLarge, submitting && styles.addButtonDisabled]} 
                onPress={activeTab === 'edit' ? handleUpdateService : handleAddService}
                disabled={submitting}
              >
                {submitting ? (
                  <Text style={styles.addButtonText}>
                    {activeTab === 'edit' ? 'Updating Service...' : 'Adding Service...'}
                  </Text>
                ) : (
                  <Text style={styles.addButtonText}>
                    {activeTab === 'edit' ? 'Update Service' : 'Add Service'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'packages' && (
            <View style={styles.packagesContainer}>
              {successMessage ? (
                <View style={styles.successMessage}>
                  <Text style={styles.successMessageText}>{successMessage}</Text>
                  <TouchableOpacity onPress={() => setSuccessMessage('')} style={styles.successCloseButton}>
                    <Text style={styles.successCloseText}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {loadingPackages ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#4A55E1" />
                  <Text style={styles.loadingText}>Loading packages...</Text>
                </View>
              ) : services.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No services yet</Text>
                  <Text style={styles.emptyStateSubtext}>Create a service first to add packages</Text>
                </View>
              ) : (
                <>
                  {services.map(service => (
                    <View key={service.id} style={styles.servicePackageSection}>
                      <View style={styles.servicePackageHeader}>
                        <View style={styles.servicePackageInfo}>
                          <Text style={styles.servicePackageName}>{service.name}</Text>
                          <Text style={styles.servicePackageCategory}>
                            {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.createPackageButton}
                          onPress={() => handleCreatePackage(service)}
                        >
                          <Text style={styles.createPackageIcon}>+</Text>
                          <Text style={styles.createPackageText}>Add Package</Text>
                        </TouchableOpacity>
                      </View>

                      {packages[service.id]?.length > 0 ? (
                        <View style={styles.packagesList}>
                          {packages[service.id].map(pkg => {
                            const price = pkg.priceType === 'calculated'
                              ? calculatePackagePrice(pkg)
                              : pkg.basePrice || 0;

                            return (
                              <View key={pkg.id} style={styles.packageCard}>
                                <View style={styles.packageCardHeader}>
                                  <View style={styles.packageCardInfo}>
                                    <Text style={styles.packageCardName}>{pkg.name}</Text>
                                    {pkg.description && (
                                      <Text style={styles.packageCardDescription} numberOfLines={2}>
                                        {pkg.description}
                                      </Text>
                                    )}
                                  </View>
                                  <View style={styles.packageCardPrice}>
                                    <Text style={styles.packagePriceLabel}>
                                      {pkg.priceType === 'per_person' ? 'Per Person' : 'Total'}
                                    </Text>
                                    <Text style={styles.packagePriceValue}>{formatPeso(price)}</Text>
                                    {pkg.discountPercent > 0 && (
                                      <Text style={styles.packageDiscount}>
                                        {pkg.discountPercent}% off
                                      </Text>
                                    )}
                                  </View>
                                </View>

                                <View style={styles.packageCardMeta}>
                                  {pkg.minPax && (
                                    <Text style={styles.packageMetaText}>
                                      Min: {pkg.minPax} pax
                                    </Text>
                                  )}
                                  {pkg.maxPax && (
                                    <Text style={styles.packageMetaText}>
                                      Max: {pkg.maxPax} pax
                                    </Text>
                                  )}
                                  <Text style={styles.packageMetaText}>
                                    {pkg.categories.length} categories
                                  </Text>
                                  <Text style={styles.packageMetaText}>
                                    {pkg.categories.reduce((sum, c) => sum + c.items.length, 0)} items
                                  </Text>
                                </View>

                                <View style={styles.packageCardActions}>
                                  <TouchableOpacity
                                    style={[styles.packageActionButton, styles.packageEditButton]}
                                    onPress={() => handleEditPackage(pkg, service)}
                                  >
                                    <Text style={styles.packageEditButtonText}>Edit</Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.packageActionButton, styles.packageDeleteButton]}
                                    onPress={() => handleDeletePackage(pkg)}
                                  >
                                    <Text style={styles.packageDeleteButtonText}>Delete</Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={styles.noPackages}>
                          <Text style={styles.noPackagesText}>No packages yet</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Package Builder Modal */}
      {selectedServiceForPackage && (
        <PackageBuilder
          visible={showPackageBuilder}
          serviceId={parseInt(selectedServiceForPackage.id)}
          serviceName={selectedServiceForPackage.name}
          packageToEdit={editingPackage}
          onClose={() => {
            setShowPackageBuilder(false);
            setEditingPackage(null);
            setSelectedServiceForPackage(null);
          }}
          onSave={handlePackageSaved}
        />
      )}
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F5',
  },
  content: {
    padding: isMobile ? 12 : 20,
    paddingBottom: isMobile ? 20 : 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: isMobile ? 12 : 16,
    elevation: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: isMobile ? 12 : 20,
    backgroundColor: '#FFFFFF',
    flexWrap: 'wrap',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: isMobile ? undefined : 0,
    minWidth: isMobile ? (screenWidth - 48) / 2 : 120,
    paddingVertical: isMobile ? 8 : 8,
    paddingHorizontal: isMobile ? 12 : 16,
    borderRadius: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#4a55e1',
    elevation: 2,
    shadowColor: '#4a55e1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tabButtonText: {
    fontSize: isMobile ? 12 : 13,
    color: '#64748B',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  categoryFilter: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#4a55e1',
  },
  categoryChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: isMobile ? 12 : 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceCardAlt: {
    backgroundColor: '#F8FAFC',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceHeader: {
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    marginBottom: 8,
    gap: isMobile ? 8 : 0,
  },
  serviceName: {
    fontSize: isMobile ? 14 : 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  serviceDescription: {
    fontSize: isMobile ? 12 : 14,
    color: '#64748B',
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'flex-start' : 'center',
    gap: isMobile ? 6 : 12,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  servicePrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  serviceRating: {
    fontSize: 12,
    color: '#64748B',
  },
  serviceActions: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? 6 : 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: isMobile ? 10 : 8,
    paddingHorizontal: isMobile ? 16 : 12,
    borderRadius: 6,
    minWidth: isMobile ? '100%' : 100,
  },
  activateButton: {
    backgroundColor: '#16A34A',
  },
  deactivateButton: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
  },
  editButton: {
    paddingVertical: isMobile ? 8 : 6,
    paddingHorizontal: isMobile ? 12 : 10,
    borderRadius: 4,
    backgroundColor: '#4a55e1',
    minWidth: isMobile ? 70 : 80, // Fixed width instead of 100% for table buttons
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: isMobile ? 10 : 11,
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: '#94A3B8',
    fontSize: 14,
  },
  // Table Styles
  tableScrollContainer: {
    marginTop: 16,
    ...(isMobile && {
      maxHeight: '100%',
    }),
  },
  tableScrollContent: {
    ...(isMobile && {
      minWidth: 800, // Minimum width to ensure all columns are visible
    }),
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...(isMobile ? {
      width: 800, // Fixed width on mobile for horizontal scroll
    } : {
      width: '100%',
    }),
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tableRowAlt: {
    backgroundColor: '#F8FAFC',
  },
  tableCell: {
    fontSize: 14,
    color: '#1E293B',
  },
  tableColImage: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableColName: {
    flex: 2,
  },
  tableColCategory: {
    flex: 1.2,
  },
  tableColPrice: {
    flex: 1,
  },
  tableColRating: {
    flex: 1.2,
  },
  tableColStatus: {
    flex: 1,
    alignItems: 'flex-start',
  },
  tableColActions: {
    flex: 1.5,
    alignItems: 'flex-start',
  },
  tableImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    resizeMode: 'cover',
    backgroundColor: '#F1F5F9',
  },
  tableImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableImagePlaceholderText: {
    fontSize: 20,
  },
  tableActions: {
    flexDirection: 'row',
    gap: isMobile ? 4 : 6,
    alignItems: 'center',
    flexWrap: 'wrap', // Allow wrapping on very small screens
  },
  tableActionButton: {
    paddingVertical: isMobile ? 8 : 6,
    paddingHorizontal: isMobile ? 12 : 10,
    borderRadius: 4,
    minWidth: isMobile ? 70 : 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableActionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: isMobile ? 10 : 11,
    textAlign: 'center',
  },
  addForm: {
    marginTop: 16,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 6,
  },
  addInputFull: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formCol: {
    flex: 1,
  },
  addInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FAFC',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 12,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryOptionSelected: {
    backgroundColor: '#4a55e1',
    borderColor: '#4a55e1',
  },
  categoryOptionText: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  categoryOptionTextSelected: {
    color: '#FFFFFF',
  },
  addButtonLarge: {
    backgroundColor: '#4a55e1',
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  addButtonDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  imageUploadButton: {
    borderWidth: 2,
    borderColor: '#4a55e1',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    marginTop: 8,
  },
  imageUploadText: {
    color: '#4a55e1',
    fontWeight: '600',
    fontSize: 14,
  },
  imagePreviewContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    backgroundColor: '#F1F5F9',
    minHeight: 200,
  },
  removeImageButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EF4444',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  removeImageText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  mapContainer: {
    height: isMobile ? 250 : 300,
    minHeight: isMobile ? 250 : 300,
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  map: {
    width: '100%',
    height: '100%',
    minHeight: isMobile ? 250 : 300,
    backgroundColor: '#F8FAFC',
  },
  mapLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    zIndex: 1,
  },
  mapLoadingText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 14,
  },
  mapHint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  addressText: {
    fontSize: 13,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  addressPlaceholder: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  durationTypeContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  durationTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  durationTypeButtonActive: {
    backgroundColor: '#4a55e1',
    borderColor: '#4a55e1',
  },
  durationTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  durationTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successMessage: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  successMessageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  successCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  successCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  errorMessage: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorMessageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorCloseText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  // Packages tab styles
  packagesContainer: {
    flex: 1,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  servicePackageSection: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 20,
  },
  servicePackageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  servicePackageInfo: {
    flex: 1,
  },
  servicePackageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  servicePackageCategory: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  createPackageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#4A55E1',
    borderRadius: 8,
  },
  createPackageIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    marginRight: 6,
  },
  createPackageText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  packagesList: {
    marginTop: 8,
  },
  packageCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  packageCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  packageCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  packageCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  packageCardDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  packageCardPrice: {
    alignItems: 'flex-end',
  },
  packagePriceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  packagePriceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  packageDiscount: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
  },
  packageCardMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  packageMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  packageCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  packageActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  packageEditButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  packageEditButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  packageDeleteButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  packageDeleteButtonText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  noPackages: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noPackagesText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

export default ServicesView;


