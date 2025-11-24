import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, TextInput, Platform, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import { User as UserModel } from '../../models/User';
import { ServiceCategory } from '../../models/Service';
import { getApiBaseUrl } from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

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
}

export const ServicesView: React.FC<ProviderServicesProps> = ({ user, onNavigate, onLogout }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Form state for adding/editing service
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    duration: '',
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

  useEffect(() => {
    loadServices();
    // Get user's current location if available
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
          console.log('Geolocation error:', error);
          // Default to a common location (Manila, Philippines)
          const defaultLocation = { lat: 14.5995, lng: 120.9842 };
          setMapLocation(defaultLocation);
          setNewService(prev => ({
            ...prev,
            latitude: defaultLocation.lat.toString(),
            longitude: defaultLocation.lng.toString()
          }));
        }
      );
    } else {
      // Default location if geolocation not available
      const defaultLocation = { lat: 14.5995, lng: 120.9842 };
      setMapLocation(defaultLocation);
      setNewService(prev => ({
        ...prev,
        latitude: defaultLocation.lat.toString(),
        longitude: defaultLocation.lng.toString()
      }));
    }
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
          // Don't update mapLocation state to prevent re-renders and blinking
          // Only update if coordinates actually changed significantly
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
            
            return {
              id: s.idservice.toString(),
              name: s.s_name,
              category: s.s_category,
              price: parseFloat(s.s_base_price) || 0,
              status: s.s_is_active ? 'active' : 'inactive',
              rating: parseFloat(s.s_rating) || 0,
              bookings: s.s_review_count || 0,
              description: s.s_description || '',
              image: imageData,
              address: parsedAddress,
              latitude: parsedLatitude,
              longitude: parsedLongitude
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

  const handleAddService = async () => {
    // Prevent double submission
    if (submitting) {
      console.log('Already submitting, please wait...');
      return;
    }

    // Validate required fields
    if (!newService.name || !newService.category || !newService.price) {
      Alert.alert('Error', 'Please fill in all required fields (Service Name, Category, and Price)');
      return;
    }

    if (!newService.latitude || !newService.longitude) {
      Alert.alert('Error', 'Please pin your location on the map');
      return;
    }

    if (!user?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Validate price is a valid number
    const price = parseFloat(newService.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

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

      const requestBody = {
        providerId: user.uid,
        providerEmail: user.email || null,
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        category: newService.category,
        basePrice: price,
        pricingType: 'fixed',
        duration: parseInt(newService.duration) || 60,
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
        Alert.alert('Success', 'Service added successfully!');
        
        // Reset form
        setNewService({ 
          name: '', 
          description: '', 
          category: '', 
          price: '', 
          duration: '', 
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
        
        // Switch to list view and reload
        setActiveTab('list');
        await loadServices();
      } else {
        const errorMsg = data.error || 'Failed to add service';
        Alert.alert('Error', errorMsg);
        console.error('❌ Add service error:', errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Add service exception:', error);
      Alert.alert('Error', error.message || 'Failed to add service. Please try again.');
    } finally {
      setSubmitting(false);
      console.log('🏁 Service creation process completed');
    }
  };

  const handleMapMessage = (event: any) => {
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
  };

  const handleImagePick = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      // For web, create a file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          // Validate file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            Alert.alert('Error', 'Image size must be less than 5MB');
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
      // For mobile, you can use expo-image-picker or react-native-image-picker
      Alert.alert('Image Upload', 'Image picker not implemented for mobile. Please use web version.');
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
      price: service.price.toString(),
      duration: '',
      maxCapacity: '',
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

    // Validate required fields
    if (!newService.name || !newService.category || !newService.price) {
      Alert.alert('Error', 'Please fill in all required fields (Service Name, Category, and Price)');
      return;
    }

    // Validate price is a valid number
    const price = parseFloat(newService.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    setSubmitting(true);

    try {
      const requestBody: any = {
        name: newService.name.trim(),
        description: newService.description.trim() || null,
        category: newService.category,
        basePrice: price,
        pricingType: 'fixed',
      };

      if (newService.duration) {
        requestBody.duration = parseInt(newService.duration) || 60;
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
        Alert.alert('Success', 'Service updated successfully');
        // Reset form and reload services
        setNewService({
          name: '',
          description: '',
          category: '',
          price: '',
          duration: '',
          maxCapacity: '',
          latitude: '',
          longitude: '',
          address: '',
          image: null
        });
        setEditingServiceId(null);
        setActiveTab('list');
        // Force reload services to get updated image
        console.log('🔄 Reloading services after update...');
        await loadServices();
        console.log('✅ Services reloaded');
      } else {
        Alert.alert('Error', data.error || 'Failed to update service');
      }
    } catch (error) {
      console.error('Error updating service:', error);
      Alert.alert('Error', 'Failed to update service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const SidebarItem = ({ icon, label, route }: { icon: string; label: string; route: string }) => (
    <TouchableOpacity style={styles.sidebarItem} onPress={() => onNavigate?.(route)}>
      <Text style={styles.sidebarIcon}>{icon}</Text>
      <Text style={styles.sidebarLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const categories = ['all', 'venue', 'catering', 'photography', 'music', 'decoration', 'entertainment', 'planning'];
  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.layout}>
      {/* Sidebar */}
      <View style={styles.sidebar}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.getInitials() || 'PR'}</Text>
          </View>
          <Text style={styles.profileName}>{user?.getFullName() || 'Provider'}</Text>
          <Text style={styles.profileEmail}>{user?.email || ''}</Text>
        </View>

        <View style={styles.sidebarNav}>
          <SidebarItem icon="🏠" label="Dashboard" route="dashboard" />
          <SidebarItem icon="🎯" label="Services" route="services" />
          <SidebarItem icon="📅" label="Bookings" route="bookings" />
          <SidebarItem icon="📝" label="Proposals" route="proposals" />
          <SidebarItem icon="💬" label="Messages" route="messages" />
          <SidebarItem icon="👤" label="Profile" route="profile" />
          <SidebarItem icon="⚙️" label="Settings" route="settings" />
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => onLogout?.()}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Main */}
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>My Services</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
                onPress={() => setActiveTab('list')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'list' && styles.tabButtonTextActive]}>My Services</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabButton, (activeTab === 'add' || activeTab === 'edit') && styles.tabButtonActive]}
                onPress={() => {
                  if (activeTab === 'edit') {
                    // Cancel edit mode
                    setEditingServiceId(null);
                    setNewService({
                      name: '',
                      description: '',
                      category: '',
                      price: '',
                      duration: '',
                      maxCapacity: '',
                      latitude: '',
                      longitude: '',
                      address: '',
                      image: null
                    });
                    setActiveTab('add');
                  } else {
                    setActiveTab('add');
                  }
                }}
              >
                <Text style={[styles.tabButtonText, (activeTab === 'add' || activeTab === 'edit') && styles.tabButtonTextActive]}>
                  {activeTab === 'edit' ? 'Edit Service' : 'Add Service'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {activeTab === 'list' && (
            <>
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
                {mapLocation && Platform.OS === 'web' ? (
                  <View
                    style={styles.map}
                    // @ts-ignore - web-specific prop
                    nativeID="map-container"
                  />
                ) : mapLocation ? (
                  <WebView
                    ref={mapWebViewRef}
                    source={{ html: generateMapHTML() }}
                    style={styles.map}
                    onMessage={handleMapMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                  />
                ) : null}
              </View>
              {newService.address ? (
                <Text style={styles.addressText} numberOfLines={2}>
                  📍 {newService.address}
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
              
              <View style={styles.formRow}>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Price (₱) *</Text>
                  <TextInput 
                    style={styles.addInput} 
                    placeholder="Enter price" 
                    keyboardType="numeric"
                    value={newService.price}
                    onChangeText={(text) => setNewService({...newService, price: text})}
                  />
                </View>
                <View style={styles.formCol}>
                  <Text style={styles.formLabel}>Duration (minutes)</Text>
                  <TextInput 
                    style={styles.addInput} 
                    placeholder="60" 
                    keyboardType="numeric"
                    value={newService.duration}
                    onChangeText={(text) => setNewService({...newService, duration: text})}
                  />
                </View>
              </View>

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
        </View>
      </ScrollView>
    </View>
  );
};

const sidebarWidth = Math.min(220, screenWidth * 0.25);

const styles = StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#EEF1F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#EEF1F5',
  },
  content: {
    padding: 20,
  },
  sidebar: {
    width: sidebarWidth,
    backgroundColor: '#102A43',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#1F3B57',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  profileName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  profileEmail: {
    color: '#9FB3C8',
    fontSize: 12,
    marginTop: 4,
  },
  sidebarNav: {
    marginTop: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarIcon: {
    width: 26,
    fontSize: 16,
    color: '#DFE7EF',
  },
  sidebarLabel: {
    color: '#DFE7EF',
    fontSize: 14,
    marginLeft: 6,
  },
  logoutButton: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#1F3B57',
  },
  logoutIcon: {
    width: 26,
    fontSize: 16,
    color: '#FEE2E2',
  },
  logoutText: {
    color: '#FEE2E2',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  tabButtonActive: {
    backgroundColor: '#4a55e1',
  },
  tabButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
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
    padding: 16,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
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
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    minWidth: 100,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#4a55e1',
    minWidth: 100,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
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
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginTop: 16,
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
    gap: 6,
    alignItems: 'center',
  },
  tableActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
    minWidth: 80,
  },
  tableActionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
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
    height: 300,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 8,
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
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
});

export default ServicesView;


