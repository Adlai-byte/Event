import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { User as UserModel } from '../../models/User';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

interface AdminServicesProps {
  user?: UserModel;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

interface Service {
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

export const ServicesView: React.FC<AdminServicesProps> = ({ user, onNavigate, onLogout }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form state for adding service
  const [newService, setNewService] = useState({
    providerEmail: '',
    name: '',
    description: '',
    category: '',
    price: '',
    pricingType: 'fixed' as 'fixed' | 'per_person',
    latitude: '',
    longitude: '',
    address: ''
  });

  const [emailError, setEmailError] = useState<string | null>(null);

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

  const [mapLocation, setMapLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapWebViewRef = useRef<WebView>(null);
  const mapInitializedRef = useRef<boolean>(false);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    loadServices();
    // Get default location
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
      const defaultLocation = { lat: 14.5995, lng: 120.9842 };
      setMapLocation(defaultLocation);
      setNewService(prev => ({
        ...prev,
        latitude: defaultLocation.lat.toString(),
        longitude: defaultLocation.lng.toString()
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

  const loadServices = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/services`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          const mapped: Service[] = data.rows.map((s: any) => ({
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

      const resp = await fetch(`${getApiBaseUrl()}/api/services`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Server error');
        } catch (e) {
          throw new Error(errorText || 'Failed to add service');
        }
      }

      const data = await resp.json();

      if (data.ok) {
        Alert.alert('Success', 'Service added successfully!');

        setNewService({
          providerEmail: '',
          name: '',
          description: '',
          category: '',
          price: '',
          pricingType: 'fixed',
          latitude: '',
          longitude: '',
          address: ''
        });

        const defaultLocation = { lat: 14.5995, lng: 120.9842 };
        setMapLocation(defaultLocation);
        mapInitializedRef.current = false;
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (e) {}
          mapInstanceRef.current = null;
        }

        setActiveTab('list');
        await loadServices();
      } else {
        const errorMsg = data.error || 'Failed to add service';
        Alert.alert('Error', errorMsg);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add service. Please try again.');
    } finally {
      setSubmitting(false);
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

  const generateMapHTML = () => {
    const initialLat = mapLocation?.lat || 14.5995;
    const initialLng = mapLocation?.lng || 120.9842;
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
              attribution: '© OpenStreetMap contributors',
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
      } else {
        Alert.alert('Error', 'Failed to update service status');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update service status');
    }
  };

  const categories = ['all', 'venue', 'catering', 'photography', 'music'];
  const filteredServices = services.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         s.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = filterCategory === 'all' || s.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <AppLayout
      role="admin"
      activeRoute="services"
      title="Services"
      user={user}
      onNavigate={onNavigate!}
      onLogout={onLogout!}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Services Management</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
                onPress={() => setActiveTab('list')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'list' && styles.tabButtonTextActive]}>View All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'add' && styles.tabButtonActive]}
                onPress={() => setActiveTab('add')}
              >
                <Text style={[styles.tabButtonText, activeTab === 'add' && styles.tabButtonTextActive]}>Add Service</Text>
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

              {/* Services List */}
              {filteredServices.map((service, i) => (
                <View key={service.id} style={[styles.serviceCard, i % 2 === 1 && styles.serviceCardAlt]}>
                  <View style={styles.serviceInfo}>
                    <View style={styles.serviceHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text style={styles.serviceProvider}>Provider: {service.provider}</Text>
                      </View>
                      <View style={[styles.statusBadge, service.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                        <Text style={styles.statusText}>{service.status}</Text>
                      </View>
                    </View>
                    {service.description ? (
                      <Text style={styles.serviceDescription} numberOfLines={2}>{service.description}</Text>
                    ) : null}
                    <View style={styles.serviceMeta}>
                      <Text style={styles.serviceCategory}>{service.category}</Text>
                      <Text style={styles.servicePrice}>
                        ₱ {service.price.toLocaleString()}
                        {service.pricingType === 'per_person' && (
                          <Text style={styles.perPersonLabel}> /person</Text>
                        )}
                      </Text>
                      <Text style={styles.serviceRating}>⭐ {service.rating} ({service.bookings})</Text>
                    </View>
                  </View>
                  <View style={styles.serviceActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, service.status === 'active' ? styles.deactivateButton : styles.activateButton]}
                      onPress={() => handleToggleServiceStatus(service)}
                    >
                      <Text style={styles.actionButtonText}>{service.status === 'active' ? 'Deactivate' : 'Activate'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.editButton}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {filteredServices.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No services found</Text>
                  <Text style={styles.emptyStateSubtext}>Add a new service to get started</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'add' && (
            <View style={styles.addForm}>
              <Text style={styles.formLabel}>Provider Email *</Text>
              <TextInput
                style={[styles.addInputFull, emailError && { borderColor: '#ef4444', borderWidth: 1 }]}
                placeholder="Enter provider email"
                value={newService.providerEmail}
                onChangeText={(text) => {
                  setNewService({...newService, providerEmail: text});
                  // Real-time email validation
                  const error = validateEmail(text);
                  setEmailError(error);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
              {emailError && <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{emailError}</Text>}

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

              <Text style={styles.formLabel}>Location *</Text>
              <Text style={styles.mapHint}>Click on the map or drag the marker to pin the service location</Text>
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

              <Text style={styles.formLabel}>Pricing Type *</Text>
              <View style={styles.pricingTypeContainer}>
                <TouchableOpacity
                  style={[styles.pricingTypeOption, newService.pricingType === 'fixed' && styles.pricingTypeOptionSelected]}
                  onPress={() => setNewService({...newService, pricingType: 'fixed'})}
                >
                  <Text style={[styles.pricingTypeText, newService.pricingType === 'fixed' && styles.pricingTypeTextSelected]}>
                    Fixed Price
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pricingTypeOption, newService.pricingType === 'per_person' && styles.pricingTypeOptionSelected]}
                  onPress={() => setNewService({...newService, pricingType: 'per_person'})}
                >
                  <Text style={[styles.pricingTypeText, newService.pricingType === 'per_person' && styles.pricingTypeTextSelected]}>
                    Per Person (Per Pax)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>
                {newService.pricingType === 'per_person' ? 'Price per Person (₱) *' : 'Price (₱) *'}
              </Text>
              <TextInput
                style={styles.addInputFull}
                placeholder={newService.pricingType === 'per_person' ? "Enter price per person" : "Enter price"}
                keyboardType="numeric"
                value={newService.price}
                onChangeText={(text) => setNewService({...newService, price: text})}
              />

              <TouchableOpacity
                style={[styles.addButtonLarge, submitting && styles.addButtonDisabled]}
                onPress={handleAddService}
                disabled={submitting}
              >
                {submitting ? (
                  <Text style={styles.addButtonText}>Adding Service...</Text>
                ) : (
                  <Text style={styles.addButtonText}>Add Service</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF1F5',
  },
  content: {
    padding: 20,
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  serviceProvider: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
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
  perPersonLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '400',
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
    width: '10%',
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
    width: '10%',
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
  addForm: {
    marginTop: 16,
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
  pricingTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  pricingTypeOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  pricingTypeOptionSelected: {
    backgroundColor: '#4a55e1',
    borderColor: '#4a55e1',
  },
  pricingTypeText: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  pricingTypeTextSelected: {
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
