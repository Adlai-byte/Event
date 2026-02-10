import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  TextInput,
  Platform,
  Alert,
  Image,
  FlatList,
  Modal
} from 'react-native';
import * as Location from 'expo-location';
import { User } from '../../models/User';
import { AuthState } from '../../models/AuthState';
import { getApiBaseUrl } from '../../services/api';
import { BookingModal } from '../../components/BookingModal';
import { AppLayout } from '../../components/layout';

interface DashboardViewProps {
  user: User;
  authState: AuthState;
  onLogout: () => Promise<boolean>;
  onNavigate: (route: string) => void;
  onNavigateToBookings?: () => void;

  onNavigateToHiring?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToLikes?: () => void;
  onNavigateToFeatured?: () => void;
  onNavigateToNearby?: () => void;
  onNavigateToPhotography?: () => void;
  onNavigateToVenues?: () => void;
  onNavigateToMusic?: () => void;
  onNavigateToEventDetails?: (eventId: string) => void;
  onNavigateToProviderProfile?: (providerEmail: string) => void;
  serviceIdToBook?: string | null;
  onBookingModalClosed?: () => void;
  onNavigateToPersonalInfo?: () => void;
}

interface Service {
  idservice: number;
  s_name: string;
  s_description: string;
  s_category: string;
  s_base_price: number | string;
  s_rating: number | string | null;
  s_review_count: number | string | null;
  s_city: string | null;
  s_state: string | null;
  s_address: string | null;
  provider_name: string;
  provider_email?: string | null;
  primary_image?: string | null;
  distance_km?: number;
}

interface Provider {
  iduser: number;
  u_fname: string;
  u_lname: string;
  u_email: string;
  u_profile_picture?: string | null;
  provider_name: string;
  service_count: number;
  avg_rating: number | string | null;
  review_count: number | string | null;
}

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;
const isMobileWeb = Platform.OS === 'web' && screenWidth < 768;

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  authState,
  onLogout,
  onNavigate,
  onNavigateToBookings,
  onNavigateToMessages,
  onNavigateToHiring,
  onNavigateToProfile,
  onNavigateToNotifications,
  onNavigateToLikes,
  onNavigateToFeatured,
  onNavigateToNearby,
  onNavigateToPhotography,
  onNavigateToVenues,
  onNavigateToMusic,
  onNavigateToEventDetails,
  onNavigateToProviderProfile,
  serviceIdToBook,
  onBookingModalClosed,
  onNavigateToPersonalInfo
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [bannerServices, setBannerServices] = useState<Service[]>([]);
  const [bannerCurrentIndex, setBannerCurrentIndex] = useState(0);
  const [nearbyServices, setNearbyServices] = useState<Service[]>([]);
  const [photographyServices, setPhotographyServices] = useState<Service[]>([]);
  const [venueServices, setVenueServices] = useState<Service[]>([]);
  const [musicServices, setMusicServices] = useState<Service[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({});
  const scrollViewRef = React.useRef<ScrollView>(null);
  const bannerScrollRef = React.useRef<ScrollView>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryServices, setCategoryServices] = useState<Service[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchResults, setSearchResults] = useState<Service[]>([]);
  const [providerResults, setProviderResults] = useState<Provider[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState<string>('');
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterMinRating, setFilterMinRating] = useState<string>('');
  const [filterRadius, setFilterRadius] = useState<string>('100');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showRatingDropdown, setShowRatingDropdown] = useState(false);
  const isMountedRef = useRef(true);
  const defaultLocation = { latitude: 14.5995, longitude: 120.9842 };

  // Rating options for dropdown
  const ratingOptions = [
    { label: 'No minimum', value: '' },
    { label: '0.0', value: '0.0' },
    { label: '0.5', value: '0.5' },
    { label: '1.0', value: '1.0' },
    { label: '1.5', value: '1.5' },
    { label: '2.0', value: '2.0' },
    { label: '2.5', value: '2.5' },
    { label: '3.0', value: '3.0' },
    { label: '3.5', value: '3.5' },
    { label: '4.0', value: '4.0' },
    { label: '4.5', value: '4.5' },
    { label: '5.0', value: '5.0' },
  ];

  // Get user location - delay permission request on mobile to avoid white screen after allowing
  useEffect(() => {
    isMountedRef.current = true;
    // On mobile: set default location first so dashboard renders immediately, then request permission after delay
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
        // Mobile: delay permission request so UI is visible first (prevents white screen after Allow)
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
        } catch (error) {
          if (isMountedRef.current) setUserLocation(defaultLocation);
        }
      }
    };
    getLocation();
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [user, userLocation]);

  // Auto-scroll banner
  useEffect(() => {
    if (!bannerServices || bannerServices.length <= 1) return;
    
    let interval: NodeJS.Timeout | null = null;
    
    // Wait a bit for the ref to be ready
    const timeout = setTimeout(() => {
      if (!bannerScrollRef.current) return;
      
      interval = setInterval(() => {
        if (bannerScrollRef.current && bannerServices.length > 1) {
          setBannerCurrentIndex((prevIndex) => {
            const nextIndex = (prevIndex + 1) % bannerServices.length;
            try {
              const slideWidth = Platform.OS === 'web' 
                ? screenWidth - 48 
                : screenWidth - 32;
              bannerScrollRef.current?.scrollTo({
                x: nextIndex * slideWidth,
                animated: true,
              });
            } catch (error) {
              console.error('Banner scroll error:', error);
            }
            return nextIndex;
          });
        }
      }, 5000); // Change slide every 5 seconds
    }, 500);
    
    return () => {
      clearTimeout(timeout);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [bannerServices.length]);

  // Handle service ID passed from ServiceDetailsView to trigger booking
  useEffect(() => {
    if (serviceIdToBook) {
      // Find the service in any of the service lists
      const allServices = [
        ...bannerServices,
        ...featuredServices,
        ...nearbyServices,
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
        // If service not found in loaded services, fetch it
        fetchServiceById(serviceIdToBook);
      }
    }
  }, [serviceIdToBook, featuredServices, nearbyServices, photographyServices, venueServices, musicServices, categoryServices]);

  const loadDashboardData = async () => {
    setLoading(true);
    
    // Add timeout to ensure loading doesn't get stuck
    let loadingTimeout: NodeJS.Timeout | null = setTimeout(() => {
      console.warn('⚠️ Dashboard loading timeout - forcing loading to false');
      setLoading(false);
      loadingTimeout = null;
    }, 15000); // 15 second timeout
    
    try {
      const userEmail = user.email || '';
      
      // Helper function to map image URLs
      const mapImageUrl = (s: any) => ({
        ...s,
        primary_image: s.primary_image ? (s.primary_image.startsWith('/uploads/') ? `${getApiBaseUrl()}${s.primary_image}` : s.primary_image) : null
      });

      // Load all services (sorted by rating and review count)
      const featuredResp = await fetch(`${getApiBaseUrl()}/api/services?limit=50`);
      if (featuredResp.ok) {
        const featuredData = await featuredResp.json();
        const mappedServices = (featuredData.rows || []).map(mapImageUrl);
        // Sort by rating (descending) and review count (descending)
        const sortedServices = mappedServices.sort((a: Service, b: Service) => {
          const ratingA = parseFloat(a.s_rating?.toString() || '0');
          const ratingB = parseFloat(b.s_rating?.toString() || '0');
          const reviewCountA = parseInt(a.s_review_count?.toString() || '0');
          const reviewCountB = parseInt(b.s_review_count?.toString() || '0');
          
          if (ratingA !== ratingB) {
            return ratingB - ratingA; // Higher rating first
          }
          return reviewCountB - reviewCountA; // More reviews first
        });
        setFeaturedServices(sortedServices);
        // Set top 3 for banner (highest rated)
        setBannerServices(sortedServices.slice(0, 3));
      }

      // Load nearby services within 100km radius from user location
      let nearbyUrl = `${getApiBaseUrl()}/api/services?limit=10&radius=100`;
      if (userLocation) {
        nearbyUrl += `&latitude=${userLocation.latitude}&longitude=${userLocation.longitude}`;
      }
      const nearbyResp = await fetch(nearbyUrl);
      if (nearbyResp.ok) {
        const nearbyData = await nearbyResp.json();
        setNearbyServices((nearbyData.rows || []).map(mapImageUrl));
      }

      // Load category services (preview with limit) and total counts for all categories
      const categories = ['photography', 'venue', 'music', 'catering'];
      
      // Load preview services for main categories
      const [photoResp, venueResp, musicResp] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/services?category=photography&limit=3`),
        fetch(`${getApiBaseUrl()}/api/services?category=venue&limit=3`),
        fetch(`${getApiBaseUrl()}/api/services?category=music&limit=3`)
      ]);

      if (photoResp.ok) {
        const photoData = await photoResp.json();
        setPhotographyServices((photoData.rows || []).map(mapImageUrl));
      }
      if (venueResp.ok) {
        const venueData = await venueResp.json();
        setVenueServices((venueData.rows || []).map(mapImageUrl));
      }
      
      if (musicResp.ok) {
        const musicData = await musicResp.json();
        setMusicServices((musicData.rows || []).map(mapImageUrl));
      }

      // Load counts for all categories
      const countPromises = categories.map(category =>
        fetch(`${getApiBaseUrl()}/api/services?category=${category}`)
      );
      const countResponses = await Promise.all(countPromises);

      const counts: { [key: string]: number } = {};
      for (let i = 0; i < categories.length; i++) {
        if (countResponses[i].ok) {
          const countData = await countResponses[i].json();
          counts[categories[i]] = (countData.rows || []).length;
        } else {
          counts[categories[i]] = 0;
        }
      }
      setCategoryCounts(counts);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
      // Get API URL first to check if it's a Cloudflare tunnel
        const apiUrl = getApiBaseUrl();
      const isCloudflareTunnel = apiUrl.includes('trycloudflare.com');
      
      // Log more details about the network error
      const isTimeout = error?.message?.includes('timeout') || error?.message?.includes('Request timeout');
      const isDnsError = error?.message?.includes('ERR_NAME_NOT_RESOLVED') || 
                        error?.message?.includes('Failed to resolve') ||
                        error?.message?.includes('getaddrinfo ENOTFOUND') ||
                        (error?.message?.includes('Failed to fetch') && isCloudflareTunnel);
      const isNetworkError = error?.message?.includes('Network request failed') || 
                            error?.message?.includes('Failed to fetch') ||
                            error?.message?.includes('ERR_CONNECTION_TIMED_OUT') ||
                            isTimeout ||
                            isDnsError;
      
      if (isNetworkError) {
        const isEmulator = Platform.OS === 'android' && apiUrl.includes('10.0.2.2');
        const isPhysicalDevice = !isEmulator && (Platform.OS === 'android' || Platform.OS === 'ios');
        const isWeb = (Platform.OS as string) === 'web';
        
        console.error('🌐 Network Error Details:');
        console.error('  - API Base URL:', apiUrl);
        console.error('  - Platform:', Platform.OS);
        console.error('  - Error:', error.message);
        
        if (isDnsError || (isCloudflareTunnel && error?.message?.includes('Failed to fetch'))) {
          console.error('  - ❌ DNS Resolution Failed: Cannot resolve domain name');
          console.error('  - ⚠️  Cloudflare Tunnel URL is not resolving');
          if (isWeb) {
            console.error('  - 💡 Solution for Web/Vercel:');
            console.error('     1. SSH to your VPS: ssh root@72.62.64.59');
            console.error('     2. Check tunnel status: pm2 list | grep cloudflare-tunnel');
            console.error('     3. Get new tunnel URL: pm2 logs cloudflare-tunnel --lines 200 --nostream | grep -i "https://.*trycloudflare.com" | tail -1');
            console.error('     4. Update Vercel Environment Variable:');
            console.error('        - Go to Vercel Dashboard → Project → Settings → Environment Variables');
            console.error('        - Update EXPO_PUBLIC_API_BASE_URL with the new tunnel URL');
            console.error('        - Redeploy your Vercel deployment');
            console.error('  - 📖 See FIX_ERR_NAME_NOT_RESOLVED.md for detailed instructions');
          } else {
            console.error('  - 💡 Solution: The Cloudflare tunnel URL has expired or stopped');
            console.error('     Contact your administrator to restart the tunnel and get a new URL');
          }
        } else if (isTimeout) {
          console.error('  - ⚠️  Connection Timeout: Server is not responding');
        }
        
        if (isEmulator) {
          console.error('  - ⚠️  Android Emulator Detected');
          console.error('  - Solution: Make sure your server is running: npm run server');
          console.error('  - Test server: Open http://localhost:3001/api/health in your browser');
          console.error('  - If server is running, check Windows Firewall settings');
        } else if (isPhysicalDevice) {
          console.error('  - ⚠️  Physical Device Detected');
          console.error('  - Solution: Set EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3001 in .env file');
          console.error('  - Find your IP: Run "ipconfig" (Windows) or "ifconfig" (Mac/Linux)');
        } else if (!isDnsError && !isCloudflareTunnel) {
          console.error('  - Solution: Make sure your server is running: npm run server');
        }
      }
    } finally {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      setLoading(false);
    }
  };

  const buildFilterQuery = (baseUrl: string, additionalParams: { [key: string]: string } = {}) => {
    const params = new URLSearchParams();
    
    // Add search query
    if (searchQuery.trim()) {
      params.append('search', searchQuery.trim());
    }
    
    // Add category if selected (from filter or selectedCategory)
    if (filterCategory) {
      params.append('category', filterCategory);
    } else if (selectedCategory) {
      params.append('category', selectedCategory);
    }
    
    // Add price filters
    if (filterMinPrice.trim()) {
      const minPrice = parseFloat(filterMinPrice);
      if (!isNaN(minPrice) && minPrice >= 0) {
        params.append('minPrice', minPrice.toString());
      }
    }
    if (filterMaxPrice.trim()) {
      const maxPrice = parseFloat(filterMaxPrice);
      if (!isNaN(maxPrice) && maxPrice > 0) {
        params.append('maxPrice', maxPrice.toString());
      }
    }
    
    // Add city filter
    if (filterCity.trim()) {
      params.append('city', filterCity.trim());
    }
    
    // Add rating filter
    if (filterMinRating.trim()) {
      const minRating = parseFloat(filterMinRating);
      if (!isNaN(minRating) && minRating >= 0 && minRating <= 5) {
        params.append('minRating', minRating.toString());
      }
    }
    
    // Add location filters
    if (userLocation) {
      params.append('latitude', userLocation.latitude.toString());
      params.append('longitude', userLocation.longitude.toString());
      const radius = filterRadius.trim() ? parseFloat(filterRadius) : 100;
      if (!isNaN(radius) && radius > 0) {
        params.append('radius', radius.toString());
      }
    }
    
    // Add any additional parameters
    Object.keys(additionalParams).forEach(key => {
      if (additionalParams[key]) {
        params.append(key, additionalParams[key]);
      }
    });
    
    return `${baseUrl}?${params.toString()}`;
  };

  const handleSearch = async () => {
    // Allow search even without query if filters are applied
    const hasFilters = filterMinPrice || filterMaxPrice || filterCity || filterMinRating || filterCategory;
    
    if (!searchQuery.trim() && !hasFilters) {
      setSearchResults([]);
      setProviderResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    try {
      // Search for providers first (only if there's a search query)
      let providersData = { providers: [] };
      let providerServices: Service[] = [];
      
      if (searchQuery.trim()) {
        try {
          const providersUrl = `${getApiBaseUrl()}/api/providers/search?search=${encodeURIComponent(searchQuery.trim())}`;
          const providersResp = await fetch(providersUrl);
          if (providersResp.ok) {
            providersData = await providersResp.json();
            
            // Fetch all services from matching providers
            if (providersData.providers && providersData.providers.length > 0) {
              const providerEmails = providersData.providers.map((p: Provider) => p.u_email);
              
              // Build filter query without search term for provider services
              const buildProviderServicesQuery = (email: string) => {
                const params = new URLSearchParams();
                params.append('providerEmail', email);
                
                // Add category filter
                if (filterCategory) {
                  params.append('category', filterCategory);
                }
                
                // Add price filters
                if (filterMinPrice.trim()) {
                  const minPrice = parseFloat(filterMinPrice);
                  if (!isNaN(minPrice) && minPrice >= 0) {
                    params.append('minPrice', minPrice.toString());
                  }
                }
                if (filterMaxPrice.trim()) {
                  const maxPrice = parseFloat(filterMaxPrice);
                  if (!isNaN(maxPrice) && maxPrice > 0) {
                    params.append('maxPrice', maxPrice.toString());
                  }
                }
                
                // Add city filter
                if (filterCity.trim()) {
                  params.append('city', filterCity.trim());
                }
                
                // Add rating filter
                if (filterMinRating.trim()) {
                  const minRating = parseFloat(filterMinRating);
                  if (!isNaN(minRating) && minRating >= 0 && minRating <= 5) {
                    params.append('minRating', minRating.toString());
                  }
                }
                
                // Add location filters
                if (userLocation) {
                  params.append('latitude', userLocation.latitude.toString());
                  params.append('longitude', userLocation.longitude.toString());
                  const radius = filterRadius.trim() ? parseFloat(filterRadius) : 100;
                  if (!isNaN(radius) && radius > 0) {
                    params.append('radius', radius.toString());
                  }
                }
                
                return `${getApiBaseUrl()}/api/services?${params.toString()}`;
              };
              
              // Fetch services for each provider
              const providerServicePromises = providerEmails.map(async (email: string) => {
                try {
                  const providerServicesUrl = buildProviderServicesQuery(email);
                  console.log(`Fetching services for provider: ${email}`, providerServicesUrl);
                  const resp = await fetch(providerServicesUrl);
                  if (resp.ok) {
                    const data = await resp.json();
                    console.log(`Received ${data.rows?.length || 0} services for provider ${email}`);
                    // Filter to only include active services for public search
                    const activeServices = (data.rows || []).filter((s: any) => {
                      const isActive = s.s_is_active === 1 || s.s_is_active === '1' || s.s_is_active === true;
                      return isActive;
                    });
                    console.log(`Filtered to ${activeServices.length} active services for provider ${email}`);
                    return activeServices;
                  } else {
                    console.error(`Failed to fetch services for provider ${email}:`, resp.status);
                  }
                } catch (err) {
                  console.error(`Error fetching services for provider ${email}:`, err);
                }
                return [];
              });
              
              const providerServicesArrays = await Promise.all(providerServicePromises);
              providerServices = providerServicesArrays.flat();
              
              console.log(`Total: Fetched ${providerServices.length} active services from ${providerEmails.length} matching providers`);
            }
          }
        } catch (err) {
          console.error('Provider search error:', err);
        }
      }
      
      // Search for services
      const servicesUrl = buildFilterQuery(`${getApiBaseUrl()}/api/services`);
      console.log('Fetching services from URL:', servicesUrl);
      const servicesResp = await fetch(servicesUrl);
      
      if (servicesResp.ok) {
        const data = await servicesResp.json();
        console.log('Services API response:', { ok: data.ok, rowCount: data.rows?.length || 0 });
        
        const mapImageUrl = (s: any) => ({
          ...s,
          primary_image: s.primary_image ? (s.primary_image.startsWith('/uploads/') ? `${getApiBaseUrl()}${s.primary_image}` : s.primary_image) : null
        });
        
        // Combine service search results with provider services
        const serviceResults = (data.rows || []).map(mapImageUrl);
        const allProviderServices = providerServices.map(mapImageUrl);
        
        console.log(`Before merge: ${serviceResults.length} from search, ${allProviderServices.length} from providers`);
        
        // Merge results and remove duplicates based on service ID
        const serviceMap = new Map<number, Service>();
        
        // Add service search results first
        serviceResults.forEach((service: Service) => {
          serviceMap.set(service.idservice, service);
        });
        
        // Add provider services (will overwrite duplicates, keeping the first one)
        allProviderServices.forEach((service: Service) => {
          if (!serviceMap.has(service.idservice)) {
            serviceMap.set(service.idservice, service);
          }
        });
        
        const mergedResults = Array.from(serviceMap.values());
        
        console.log(`After merge: ${mergedResults.length} total services`);
        console.log(`Service IDs:`, mergedResults.map(s => s.idservice));
        
        setSearchResults(mergedResults);
        setProviderResults(providersData.providers || []);
        setSelectedCategory(null); // Clear category selection when searching
      } else {
        const errorText = await servicesResp.text();
        console.error('Services API error:', servicesResp.status, errorText);
        setSearchResults([]);
        setProviderResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setProviderResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadCategoryServices = async (category: string, useFilters: boolean = false) => {
    setLoadingCategory(true);
    try {
      let url: string;
      if (useFilters) {
        // Use filters if explicitly requested (e.g., when applying filters)
        url = buildFilterQuery(`${getApiBaseUrl()}/api/services`, { category });
      } else {
        // Load category services without filters (when clicking category card)
        const params = new URLSearchParams();
        params.append('category', category);
        url = `${getApiBaseUrl()}/api/services?${params.toString()}`;
      }
      const resp = await fetch(url);
      if (resp.ok) {
        const data = await resp.json();
        const mapImageUrl = (s: any) => ({
          ...s,
          primary_image: s.primary_image ? (s.primary_image.startsWith('/uploads/') ? `${getApiBaseUrl()}${s.primary_image}` : s.primary_image) : null
        });
        setCategoryServices((data.rows || []).map(mapImageUrl));
        setSelectedCategory(category);
      }
    } catch (error) {
      console.error('Error loading category services:', error);
    } finally {
      setLoadingCategory(false);
    }
  };

  const clearFilters = async () => {
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterCity('');
    setFilterMinRating('');
    setFilterRadius('100');
    setFilterCategory('');
    
    // Refresh the view after clearing filters
    if (selectedCategory) {
      await loadCategoryServices(selectedCategory, false);
    } else if (searchQuery.trim()) {
      await handleSearch();
    } else {
      // Clear search results if no query
      setSearchResults([]);
      setProviderResults([]);
      setIsSearching(false);
      loadDashboardData();
    }
  };

  const applyFilters = async () => {
    setShowFilters(false);
    
    // Always trigger search when filters are applied to show results immediately
    // This ensures filtered results are displayed in the search results view
    console.log('Applying filters:', {
      filterCategory,
      filterMinPrice,
      filterMaxPrice,
      filterCity,
      filterMinRating,
      filterRadius,
      userLocation
    });
    await handleSearch();
  };

  const handleCategoryClick = async (category: string, categoryName: string) => {
    // Clear all filters when clicking a category to show all services
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterCity('');
    setFilterMinRating('');
    setFilterRadius('100');
    setFilterCategory('');
    setSearchQuery('');
    setProviderResults([]);
    // Load category services without filters
    await loadCategoryServices(category);
  };

  const clearCategoryFilter = () => {
    setSelectedCategory(null);
    setCategoryServices([]);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      'photography': '📸',
      'venue': '🏢',
      'music': '🎵',
      'catering': '🍽️'
    };
    return icons[category.toLowerCase()] || '🎯';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: { [key: string]: string } = {
      'photography': 'Photography',
      'venue': 'Venues',
      'music': 'Music',
      'catering': 'Catering'
    };
    return labels[category.toLowerCase()] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const formatPrice = (price: number | string | null | undefined): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    if (isNaN(numPrice)) return '₱0.00';
    return `₱${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Group services by provider
  const groupServicesByProvider = (services: Service[]): { [key: string]: Service[] } => {
    const grouped: { [key: string]: Service[] } = {};
    services.forEach((service) => {
      const providerKey = service.provider_email || service.provider_name || 'Unknown Provider';
      if (!grouped[providerKey]) {
        grouped[providerKey] = [];
      }
      grouped[providerKey].push(service);
    });
    return grouped;
  };

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
      const resp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.service) {
          const mapImageUrl = (s: any) => ({
            ...s,
            primary_image: s.primary_image ? (s.primary_image.startsWith('/uploads/') ? `${getApiBaseUrl()}${s.primary_image}` : s.primary_image) : null
          });
          const service = mapImageUrl(data.service);
          setSelectedService(service);
          setShowBookingModal(true);
        }
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

    // Parse date range info if provided (for per-day multi-day bookings)
    let dateRangeInfo = null;
    let eventName = '';
    let eventDate = date;
    
    if (notes) {
      try {
        dateRangeInfo = JSON.parse(notes);
        if (dateRangeInfo.startDate && dateRangeInfo.endDate) {
          // Create event name with date range
          const startFormatted = new Date(dateRangeInfo.startDate).toLocaleDateString('en-US', { 
            month: 'numeric', 
            day: 'numeric', 
            year: 'numeric' 
          });
          const endFormatted = new Date(dateRangeInfo.endDate).toLocaleDateString('en-US', { 
            month: 'numeric', 
            day: 'numeric', 
            year: 'numeric' 
          });
          eventName = `${selectedService.s_name} - ${startFormatted} - ${endFormatted}`;
          eventDate = dateRangeInfo.startDate; // Use start date as the primary event date
        }
      } catch (e) {
        // If notes is not JSON, use it as regular notes
        console.warn('Failed to parse notes as JSON:', e);
      }
    }
    
    // If no date range info, create regular event name
    if (!eventName) {
      const formattedDate = new Date(date).toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
      eventName = `${selectedService.s_name} - ${formattedDate}`;
    }

    const location = selectedService.s_city || 'TBD';

    console.log(`Creating booking for date: ${eventDate}, eventName: ${eventName}, dateRange: ${dateRangeInfo ? `${dateRangeInfo.startDate} to ${dateRangeInfo.endDate}` : 'single day'}`);

      const resp = await fetch(`${getApiBaseUrl()}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: user.email,
          serviceId: selectedService.idservice,
          eventName: eventName,
        eventDate: eventDate,
          startTime: startTime,
          endTime: endTime,
          location: location,
          attendees: attendees || null,
        notes: notes || null // Store date range info in notes
        })
      });

      if (resp.ok) {
        const data = await resp.json();
      console.log(`Booking created successfully: ${data.id} for date range: ${dateRangeInfo ? `${dateRangeInfo.startDate} to ${dateRangeInfo.endDate}` : date}`);
                // Refresh bookings count
                loadDashboardData();
      // Return success - modal will handle closing and navigation
      return;
      } else {
        const errorData = await resp.json();
      console.error(`Booking creation failed for date ${eventDate}:`, errorData);
      // Throw error so modal can handle it
      const errorMessage = resp.status === 409
        ? (errorData.error || 'This time slot overlaps with an existing booking.')
        : (errorData.error || 'Failed to create booking');
      throw new Error(errorMessage);
    }
  };

  const renderServiceCard = (service: Service, onPress?: () => void) => {
    const rating = typeof service.s_rating === 'string' 
      ? parseFloat(service.s_rating) 
      : (service.s_rating || 0);
    const reviewCount = service.s_review_count || 0;
    
    return (
    <View 
      key={service.idservice}
        style={[styles.modernServiceCard]}
    >
      <TouchableOpacity 
        onPress={onPress || (() => onNavigateToEventDetails?.(service.idservice.toString()))}
          activeOpacity={0.9}
      >
          {/* Image with Badge */}
          <View style={styles.modernServiceImageContainer}>
          {service.primary_image && (service.primary_image.startsWith('http://') || service.primary_image.startsWith('https://') || service.primary_image.startsWith('data:image')) ? (
            <Image 
              source={{ uri: service.primary_image }} 
                style={styles.modernServiceImage as any}
                
              resizeMode="cover"
            />
          ) : (
              <View style={styles.modernServiceImagePlaceholder}>
            <Text style={styles.serviceEmoji}>{getCategoryIcon(service.s_category)}</Text>
              </View>
          )}
            {rating >= 4.5 && (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>⭐ Top Rated</Text>
        </View>
            )}
              </View>
          
          {/* Card Content */}
          <View style={styles.modernServiceInfo}>
            <View style={styles.modernServiceTitleRow}>
              <Text style={styles.modernServiceTitle} numberOfLines={2}>{service.s_name}</Text>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagIcon}>{getCategoryIcon(service.s_category)}</Text>
                <Text style={styles.categoryTagText}>{getCategoryLabel(service.s_category)}</Text>
              </View>
            </View>
            <Text style={styles.modernServiceProvider} numberOfLines={1}>{service.provider_name}</Text>
            
            {/* Rating and Location Row */}
            <View style={styles.modernServiceMeta}>
              {rating > 0 && !isNaN(rating) ? (
                <View style={styles.modernRatingContainer}>
                  <Text style={styles.modernRatingStar}>⭐</Text>
                  <Text style={styles.modernRatingText}>{rating.toFixed(1)}</Text>
                  <Text style={styles.modernReviewCount}>({reviewCount})</Text>
                </View>
              ) : (
                <Text style={styles.newBadge}>New</Text>
              )}
          {(service.s_city || service.s_state || service.s_address) && (
                <View style={styles.modernLocationContainer}>
                  <Text style={styles.modernLocationIcon}>📍</Text>
                  <Text style={styles.modernLocationText} numberOfLines={2}>
                    {(() => {
                      // Build full location string
                      const locationParts = [];
                      
                      // Add address first if it exists (most detailed)
                      if (service.s_address) {
                        const address = service.s_address.trim();
                        // Extract coordinates if present (format: "address (lat,lng)")
                        const coordsMatch = address.match(/\(([\d.-]+),([\d.-]+)\)/);
                        if (coordsMatch) {
                          // Remove coordinates from address for display
                          locationParts.push(address.replace(/\s*\([\d.-]+,[\d.-]+\)\s*/, '').trim());
                        } else {
                          locationParts.push(address);
                        }
                      }
                      
                      // Add city if not already in address
                      if (service.s_city && !locationParts.some(part => part.toLowerCase().includes(service.s_city!.toLowerCase()))) {
                        locationParts.push(service.s_city);
                      }
                      
                      // Add state if not already in address
                      if (service.s_state && !locationParts.some(part => part.toLowerCase().includes(service.s_state!.toLowerCase()))) {
                        locationParts.push(service.s_state);
                      }
                      
                      return locationParts.length > 0 ? locationParts.join(', ') : 'Location not specified';
                    })()}
                  </Text>
                  {service.distance_km !== undefined && (
                    <Text style={styles.modernDistanceText}> • {service.distance_km}km</Text>
                  )}
                </View>
              )}
            </View>
            
            {/* Price */}
            <View style={styles.modernPriceContainer}>
              <Text style={styles.modernPriceLabel}>Starting at</Text>
              <Text style={styles.modernPrice}>{formatPrice(service.s_base_price)}</Text>
            </View>
        </View>
      </TouchableOpacity>
        
        {/* Action Buttons */}
        <View style={styles.modernServiceActions}>
        <TouchableOpacity 
            style={styles.modernViewButton}
          onPress={() => onNavigateToEventDetails?.(service.idservice.toString())}
          activeOpacity={0.8}
        >
            <Text style={styles.modernViewButtonText}>View</Text>
      </TouchableOpacity>
      <TouchableOpacity 
            style={styles.modernBookButton}
        onPress={() => handleBookNow(service)}
        activeOpacity={0.8}
      >
            <Text style={styles.modernBookButtonText}>Book Now</Text>
      </TouchableOpacity>
      </View>
    </View>
  );
  };

  const renderCategoryCard = (icon: string, label: string, count: number, onPress: () => void, category: string) => {
    // Get a sample image from the category services
    let categoryImage: string | null = null;
    if (category === 'photography' && photographyServices.length > 0 && photographyServices[0].primary_image) {
      categoryImage = photographyServices[0].primary_image;
    } else if (category === 'venue' && venueServices.length > 0 && venueServices[0].primary_image) {
      categoryImage = venueServices[0].primary_image;
    } else if (category === 'music' && musicServices.length > 0 && musicServices[0].primary_image) {
      categoryImage = musicServices[0].primary_image;
    } else if (category === 'catering') {
      // Try to get catering image from featured services
      const cateringService = featuredServices.find(s => s.s_category === 'catering');
      if (cateringService && cateringService.primary_image) {
        categoryImage = cateringService.primary_image;
      }
    }

    return (
      <View style={styles.modernCategoryCard}>
    <TouchableOpacity 
      onPress={onPress}
          activeOpacity={0.9}
    >
          {/* Image with Badge */}
          <View style={styles.modernCategoryImageContainer}>
            {categoryImage && (categoryImage.startsWith('http://') || categoryImage.startsWith('https://') || categoryImage.startsWith('data:image')) ? (
              <Image 
                source={{ uri: categoryImage }} 
                style={styles.modernCategoryImage as any}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.modernCategoryImagePlaceholder}>
                <Text style={styles.categoryEmoji}>{icon}</Text>
      </View>
            )}
      {count > 0 && (
              <View style={styles.categoryCountBadge}>
                <Text style={styles.categoryCountBadgeText}>{count}</Text>
        </View>
      )}
          </View>
          
          {/* Card Content */}
          <View style={styles.modernCategoryInfo}>
            <View style={styles.modernCategoryTitleRow}>
              <Text style={styles.modernCategoryTitle} numberOfLines={2}>{label}</Text>
              <View style={styles.categoryTag}>
                <Text style={styles.categoryTagIcon}>{icon}</Text>
                <Text style={styles.categoryTagText}>{label}</Text>
              </View>
            </View>
            
            {/* Count Info */}
            <View style={styles.modernCategoryMeta}>
              <Text style={styles.modernCategoryCountText}>
                {count > 0 ? `${count} ${count === 1 ? 'service' : 'services'}` : 'No services yet'}
              </Text>
            </View>
          </View>
    </TouchableOpacity>
        
        {/* Action Button */}
        <View style={styles.modernCategoryActions}>
          <TouchableOpacity 
            style={styles.modernCategoryViewButton}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Text style={styles.modernCategoryViewButtonText}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
  };

  return (
    <AppLayout
      role="user"
      activeRoute="dashboard"
      title="Dashboard"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <View style={styles.container}>
        {/* Background Decorative Elements */}
        <View style={styles.backgroundContainer}>
          <View style={styles.backgroundGradient} />
          <View style={styles.backgroundCircle1} />
          <View style={styles.backgroundCircle2} />
          <View style={styles.backgroundCircle3} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          bounces={true}
        >
          {/* Hero Section with Gradient Background */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>Welcome back, {user.getFullName()}! 👋</Text>
            <Text style={styles.heroSubtitle}>Discover amazing events and services around you</Text>
            
            {/* Modern Search Bar */}
            <View style={styles.modernSearchContainer}>
              <View style={styles.searchIconContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
              </View>
          <TextInput
                style={styles.modernSearchInput}
                placeholder={isMobileWeb ? "Search..." : "Search events, services, or providers..."}
            value={searchQuery}
            onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
              <TouchableOpacity 
                style={[styles.filterButton, (filterMinPrice || filterMaxPrice || filterCity || filterMinRating || filterCategory) && styles.filterButtonActive]} 
                onPress={() => setShowFilters(!showFilters)}
                activeOpacity={0.8}
              >
                <Text style={[(filterMinPrice || filterMaxPrice || filterCity || filterMinRating || filterCategory) ? styles.filterButtonTextActive : styles.filterButtonText]}>
                  {showFilters ? '🔼' : '🔽'} {isMobileWeb ? 'Filter' : 'Filters'}
                </Text>
                {(filterMinPrice || filterMaxPrice || filterCity || filterMinRating || filterCategory) ? (
                  <View style={styles.filterBadge} />
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modernSearchButton} 
                onPress={() => {
                  console.log('Search button clicked, query:', searchQuery);
                  handleSearch();
                }}
                activeOpacity={0.8}
                disabled={false}
              >
                <Text style={styles.modernSearchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
        
        {/* Filter Panel */}
        {showFilters ? (
          <View style={styles.filterPanel}>
            <View style={styles.filterPanelHeader}>
              <Text style={styles.filterPanelTitle}>Filter Services</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Text style={styles.filterCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.filterContent} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.filterContentContainer}
            >
              {/* Category Selection */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>🏷️ Category</Text>
                <View style={styles.categoryButtonsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.categoryFilterButton,
                      filterCategory === '' && styles.categoryFilterButtonActive
                    ]}
                    onPress={() => setFilterCategory('')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.categoryFilterButtonText,
                      filterCategory === '' && styles.categoryFilterButtonTextActive
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {['photography', 'venue', 'music', 'catering'].map((category) => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryFilterButton,
                        filterCategory === category && styles.categoryFilterButtonActive
                      ]}
                      onPress={() => setFilterCategory(category)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.categoryFilterButtonText,
                        filterCategory === category && styles.categoryFilterButtonTextActive
                      ]}>
                        {getCategoryLabel(category)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Price Range */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>💰 Price Range (₱)</Text>
                <View style={styles.priceRangeContainer}>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceLabel}>Min</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      value={filterMinPrice}
                      onChangeText={setFilterMinPrice}
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={styles.priceSeparatorContainer}>
                    <Text style={styles.priceSeparator}>-</Text>
                  </View>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.priceLabel}>Max</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="No limit"
                      value={filterMaxPrice}
                      onChangeText={setFilterMaxPrice}
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>
              </View>
              
              {/* Location/Area */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>📍 Location</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="City name (e.g., Manila)"
                  value={filterCity}
                  onChangeText={setFilterCity}
                  placeholderTextColor="#94a3b8"
                />
                {userLocation && (
                  <View style={styles.radiusContainer}>
                    <Text style={styles.radiusLabel}>Radius: {filterRadius} km</Text>
                    <TextInput
                      style={styles.radiusInput}
                      placeholder="100"
                      value={filterRadius}
                      onChangeText={setFilterRadius}
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                )}
              </View>
              
              {/* Rating */}
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>⭐ Minimum Rating</Text>
                <TouchableOpacity
                  style={styles.ratingDropdownButton}
                  onPress={() => setShowRatingDropdown(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.ratingDropdownText,
                    !filterMinRating && styles.ratingDropdownPlaceholder
                  ]}>
                    {filterMinRating ? ratingOptions.find(opt => opt.value === filterMinRating)?.label || filterMinRating : 'Select rating'}
                  </Text>
                  <Text style={styles.ratingDropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
            
            <View style={styles.filterActions}>
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={clearFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.clearFiltersButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.applyFiltersButton}
                onPress={applyFilters}
                activeOpacity={0.8}
              >
                <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
          </View>
        </View>

        {/* Rating Dropdown Modal */}
        <Modal
            visible={showRatingDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowRatingDropdown(false)}
          >
            <TouchableOpacity
              style={styles.ratingModalOverlay}
              activeOpacity={1}
              onPress={() => setShowRatingDropdown(false)}
            >
              <View style={styles.ratingModalContent}>
                <View style={styles.ratingModalHeader}>
                  <Text style={styles.ratingModalTitle}>Select Minimum Rating</Text>
                  <TouchableOpacity
                    onPress={() => setShowRatingDropdown(false)}
                    style={styles.ratingModalCloseButton}
                  >
                    <Text style={styles.ratingModalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.ratingModalBody}>
                  {ratingOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.ratingModalItem,
                        filterMinRating === option.value && styles.ratingModalItemSelected
                      ]}
                      onPress={() => {
                        setFilterMinRating(option.value);
                        setShowRatingDropdown(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.ratingModalItemText,
                        filterMinRating === option.value && styles.ratingModalItemTextSelected
                      ]}>
                        {option.label}
                      </Text>
                      {filterMinRating === option.value && (
                        <Text style={styles.ratingModalCheckmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableOpacity>
          </Modal>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : searchResults.length > 0 || providerResults.length > 0 || isSearching || filterMinPrice || filterMaxPrice || filterCity || filterMinRating || filterCategory ? (
          <>
            {/* Search Results View */}
            <View style={styles.searchResultsHeader}>
              <TouchableOpacity 
                onPress={async () => {
                  setSearchResults([]);
                  setProviderResults([]);
                  setSearchQuery('');
                  setIsSearching(false);
                  // Clear filters and reload
                  setFilterMinPrice('');
                  setFilterMaxPrice('');
                  setFilterCity('');
                  setFilterMinRating('');
                  setFilterRadius('100');
                  setFilterCategory('');
                  await loadDashboardData();
                }} 
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.searchResultsTitle}>
                {searchQuery ? `Search Results for "${searchQuery}"` : 'Filtered Results'}
              </Text>
              <View style={styles.placeholder} />
            </View>

            {isSearching && searchResults.length === 0 && providerResults.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a55e1" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : (
              <ScrollView style={styles.searchResultsScroll}>
                {/* Provider Results */}
                {providerResults.length > 0 && (
                  <View style={styles.providersSection}>
                    <Text style={styles.sectionTitle}>Providers</Text>
                    <View style={styles.providersContainer}>
                      {providerResults.map((provider) => (
                        <TouchableOpacity
                          key={provider.iduser}
                          style={styles.providerCard}
                          onPress={() => onNavigateToProviderProfile?.(provider.u_email)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.providerImageContainer}>
                            {provider.u_profile_picture ? (
                              <Image
                                source={{ uri: provider.u_profile_picture.startsWith('/uploads/') ? `${getApiBaseUrl()}${provider.u_profile_picture}` : provider.u_profile_picture }}
                                style={styles.providerImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.providerImagePlaceholder}>
                                <Text style={styles.providerImagePlaceholderText}>
                                  {provider.provider_name.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.providerInfo}>
                            <Text style={styles.providerName} numberOfLines={1}>
                              {provider.provider_name}
                            </Text>
                            <Text style={styles.providerServicesCount}>
                              {provider.service_count} {provider.service_count === 1 ? 'service' : 'services'}
                            </Text>
                            {provider.avg_rating && parseFloat(String(provider.avg_rating)) > 0 ? (
                              <View style={styles.providerRating}>
                                <Text style={styles.providerRatingText}>
                                  ⭐ {parseFloat(String(provider.avg_rating)).toFixed(1)}
                                </Text>
                                {provider.review_count && (
                                  <Text style={styles.providerReviewCount}>
                                    ({provider.review_count} {parseInt(String(provider.review_count)) === 1 ? 'review' : 'reviews'})
                                  </Text>
                                )}
                              </View>
                            ) : null}
                          </View>
                          <View style={styles.providerArrow}>
                            <Text style={styles.providerArrowText}>→</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Service Results - Grouped by Provider */}
                {searchResults.length > 0 ? (
                  <>
                    {Object.entries(groupServicesByProvider(searchResults)).map(([providerKey, providerServices]) => {
                      const firstService = providerServices[0];
                      const providerName = firstService.provider_name || providerKey;
                      const providerEmail = firstService.provider_email || providerKey;
                      
                      return (
                        <View key={providerKey} style={styles.providerGroup}>
                          {/* Provider Header */}
                          <TouchableOpacity
                            style={styles.providerGroupHeader}
                            onPress={() => onNavigateToProviderProfile?.(providerEmail)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.providerGroupHeaderContent}>
                              <Text style={styles.providerGroupTitle}>{providerName}</Text>
                              <Text style={styles.providerGroupCount}>
                                {providerServices.length} {providerServices.length === 1 ? 'service' : 'services'}
                              </Text>
                            </View>
                            <Text style={styles.providerGroupArrow}>→</Text>
                          </TouchableOpacity>
                          
                          {/* Services Grid for this Provider */}
                          <View style={styles.servicesGrid}>
                            {providerServices.map((serviceItem, index) => {
                              // On mobile: 1 item per row, on web: 2 items per row
                              const itemsPerRow = Platform.OS === 'web' ? 2 : 1;
                              if (index % itemsPerRow === 0) {
                                const rowItems = providerServices.slice(index, index + itemsPerRow);
                                return (
                                  <View key={`row-${providerKey}-${index}`} style={styles.servicesRow}>
                                    {rowItems.map((item) => (
                                      <View key={item.idservice.toString()} style={styles.serviceCardWrapper}>
                                        <View style={[styles.serviceCard, styles.serviceCardGrid]}>
                                          <TouchableOpacity 
                                            onPress={() => onNavigateToEventDetails?.(item.idservice.toString())}
                                            activeOpacity={0.7}
                                          >
                                            <View style={styles.serviceImageContainer}>
                                              {item.primary_image && (item.primary_image.startsWith('http://') || item.primary_image.startsWith('https://') || item.primary_image.startsWith('data:image')) ? (
                                                <Image 
                                                  source={{ uri: item.primary_image }} 
                                                  style={styles.serviceImage as any}
                                                  resizeMode="cover"
                                                />
                                              ) : (
                                                <Text style={styles.serviceEmoji}>{getCategoryIcon(item.s_category)}</Text>
                                              )}
                                            </View>
                                            <View style={styles.serviceInfo}>
                                              <View style={styles.serviceTitleRow}>
                                                <Text style={styles.serviceTitle} numberOfLines={1}>{item.s_name}</Text>
                                                <View style={styles.categoryTag}>
                                                  <Text style={styles.categoryTagIcon}>{getCategoryIcon(item.s_category)}</Text>
                                                  <Text style={styles.categoryTagText}>{getCategoryLabel(item.s_category)}</Text>
                                                </View>
                                              </View>
                                              {(() => {
                                                const rating = typeof item.s_rating === 'string' 
                                                  ? parseFloat(item.s_rating) 
                                                  : (item.s_rating || 0);
                                                const reviewCount = item.s_review_count || 0;
                                                return rating > 0 && !isNaN(rating) ? (
                                                  <View style={styles.ratingContainer}>
                                                    <Text style={styles.ratingText}>⭐ {rating.toFixed(1)}</Text>
                                                    <Text style={styles.reviewCount}>({reviewCount})</Text>
                                                  </View>
                                                ) : null;
                                              })()}
                                              <Text style={styles.servicePrice}>{formatPrice(item.s_base_price)}</Text>
                                              {(item.s_city || item.s_state || item.s_address) && (
                                                <Text style={styles.serviceLocation} numberOfLines={2}>
                                                  📍 {(() => {
                                                    const locationParts = [];
                                                    if (item.s_address) {
                                                      const address = item.s_address.trim();
                                                      const coordsMatch = address.match(/\(([\d.-]+),([\d.-]+)\)/);
                                                      if (coordsMatch) {
                                                        locationParts.push(address.replace(/\s*\([\d.-]+,[\d.-]+\)\s*/, '').trim());
                                                      } else {
                                                        locationParts.push(address);
                                                      }
                                                    }
                                                    if (item.s_city && !locationParts.some(part => part.toLowerCase().includes(item.s_city!.toLowerCase()))) {
                                                      locationParts.push(item.s_city);
                                                    }
                                                    if (item.s_state && !locationParts.some(part => part.toLowerCase().includes(item.s_state!.toLowerCase()))) {
                                                      locationParts.push(item.s_state);
                                                    }
                                                    return locationParts.length > 0 ? locationParts.join(', ') : 'Location not specified';
                                                  })()}
                                                </Text>
                                              )}
                                            </View>
                                          </TouchableOpacity>
                                          <View style={styles.serviceActions}>
                                            <TouchableOpacity 
                                              style={styles.viewDetailsButton}
                                              onPress={() => onNavigateToEventDetails?.(item.idservice.toString())}
                                              activeOpacity={0.8}
                                            >
                                              <Text style={styles.viewDetailsButtonText}>View Details</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                              style={styles.bookNowButton}
                                              onPress={() => handleBookNow(item)}
                                              activeOpacity={0.8}
                                            >
                                              <Text style={styles.bookNowButtonText}>Book Now</Text>
                                            </TouchableOpacity>
                                          </View>
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                );
                              }
                              return null;
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </>
                ) : null}

                {/* Empty State */}
                {searchResults.length === 0 && providerResults.length === 0 && !isSearching ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateIcon}>🔍</Text>
                    <Text style={styles.emptyStateText}>No data found</Text>
                    <Text style={styles.emptyStateSubtext}>
                      {searchQuery.trim() || filterMinPrice || filterMaxPrice || filterCity || filterMinRating || filterCategory
                        ? 'Try adjusting your search or filters'
                        : 'No results available at the moment'}
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </>
        ) : selectedCategory ? (
          <>
            {/* Category Filter View */}
            <View style={styles.categoryFilterHeader}>
              <TouchableOpacity onPress={clearCategoryFilter} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.categoryFilterTitle}>
                {selectedCategory === 'venue' ? 'Venues' : 
                 selectedCategory === 'photography' ? 'Photography' : 
                 selectedCategory === 'music' ? 'Music' : 
                 selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
              </Text>
              <View style={styles.placeholder} />
            </View>

            {loadingCategory ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a55e1" />
                <Text style={styles.loadingText}>Loading services...</Text>
              </View>
            ) : categoryServices.length > 0 ? (
              <View style={[styles.servicesContainer, styles.servicesGrid]}>
                {categoryServices.map((item, index) => {
                  // On mobile: 1 item per row, on web: 2 items per row
                  const itemsPerRow = Platform.OS === 'web' ? 2 : 1;
                  if (index % itemsPerRow === 0) {
                    const rowItems = categoryServices.slice(index, index + itemsPerRow);
                    return (
                      <View key={`row-${index}`} style={styles.servicesRow}>
                        {rowItems.map((serviceItem) => (
                          <View key={serviceItem.idservice.toString()} style={styles.serviceCardWrapper}>
                            <View style={[styles.serviceCard, styles.serviceCardGrid]}>
                              <TouchableOpacity 
                                onPress={() => onNavigateToEventDetails?.(serviceItem.idservice.toString())}
                                activeOpacity={0.7}
                              >
                                <View style={styles.serviceImageContainer}>
                                  {serviceItem.primary_image && (serviceItem.primary_image.startsWith('http://') || serviceItem.primary_image.startsWith('https://') || serviceItem.primary_image.startsWith('data:image')) ? (
                                    <Image 
                                      source={{ uri: serviceItem.primary_image }} 
                                      style={styles.serviceImage as any}
                                      resizeMode="cover"
                                    />
                                  ) : (
                                    <Text style={styles.serviceEmoji}>{getCategoryIcon(serviceItem.s_category)}</Text>
                                  )}
                                </View>
                                <View style={styles.serviceInfo}>
                                  <Text style={styles.serviceTitle} numberOfLines={1}>{serviceItem.s_name}</Text>
                                  <Text style={styles.serviceProvider} numberOfLines={1}>{serviceItem.provider_name}</Text>
                                  {(() => {
                                    const rating = typeof serviceItem.s_rating === 'string' 
                                      ? parseFloat(serviceItem.s_rating) 
                                      : (serviceItem.s_rating || 0);
                                    const reviewCount = serviceItem.s_review_count || 0;
                                    return rating > 0 && !isNaN(rating) ? (
                                      <View style={styles.ratingContainer}>
                                        <Text style={styles.ratingText}>⭐ {rating.toFixed(1)}</Text>
                                        <Text style={styles.reviewCount}>({reviewCount})</Text>
                                      </View>
                                    ) : null;
                                  })()}
                                  <Text style={styles.servicePrice}>{formatPrice(serviceItem.s_base_price)}</Text>
                                  {(serviceItem.s_city || serviceItem.s_state || serviceItem.s_address) && (
                                    <Text style={styles.serviceLocation} numberOfLines={2}>
                                      📍 {(() => {
                                        const locationParts = [];
                                        if (serviceItem.s_address) {
                                          const address = serviceItem.s_address.trim();
                                          const coordsMatch = address.match(/\(([\d.-]+),([\d.-]+)\)/);
                                          if (coordsMatch) {
                                            locationParts.push(address.replace(/\s*\([\d.-]+,[\d.-]+\)\s*/, '').trim());
                                          } else {
                                            locationParts.push(address);
                                          }
                                        }
                                        if (serviceItem.s_city && !locationParts.some(part => part.toLowerCase().includes(serviceItem.s_city!.toLowerCase()))) {
                                          locationParts.push(serviceItem.s_city);
                                        }
                                        if (serviceItem.s_state && !locationParts.some(part => part.toLowerCase().includes(serviceItem.s_state!.toLowerCase()))) {
                                          locationParts.push(serviceItem.s_state);
                                        }
                                        return locationParts.length > 0 ? locationParts.join(', ') : 'Location not specified';
                                      })()}
                                    </Text>
                                  )}
                                </View>
                              </TouchableOpacity>
                              <View style={styles.serviceActions}>
                                <TouchableOpacity 
                                  style={styles.viewDetailsButton}
                                  onPress={() => onNavigateToEventDetails?.(serviceItem.idservice.toString())}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.viewDetailsButtonText}>View Details</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                  style={styles.bookNowButton}
                                  onPress={() => handleBookNow(serviceItem)}
                                  activeOpacity={0.8}
                                >
                                  <Text style={styles.bookNowButtonText}>Book Now</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateIcon}>{getCategoryIcon(selectedCategory)}</Text>
                <Text style={styles.emptyStateText}>No data found</Text>
                <Text style={styles.emptyStateSubtext}>
                  {filterMinPrice || filterMaxPrice || filterCity || filterMinRating || filterCategory
                    ? 'No services match your filters. Try adjusting your filter criteria.'
                    : `There are no ${selectedCategory} services available at the moment.`}
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Banner Slider - Top 3 High-Rated Services */}
            {bannerServices && bannerServices.length > 0 && (
              <View style={styles.bannerContainer}>
                <View style={styles.bannerHeader}>
                  <Text style={styles.bannerTitle}>⭐ Best Services of the Day</Text>
                </View>
                <ScrollView
                  ref={bannerScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(event) => {
                    try {
                      const slideWidth = Platform.OS === 'web' 
                        ? screenWidth - 48 
                        : screenWidth - 32;
                      const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
                      setBannerCurrentIndex(index);
                    } catch (error) {
                      console.error('Banner scroll end error:', error);
                    }
                  }}
                  style={styles.bannerScrollView}
                  contentContainerStyle={styles.bannerScrollContent}
                >
                  {bannerServices.map((service, index) => {
                    const rating = typeof service.s_rating === 'string' 
                      ? parseFloat(service.s_rating) 
                      : (service.s_rating || 0);
                    const reviewCount = typeof service.s_review_count === 'string'
                      ? parseInt(service.s_review_count) || 0
                      : (service.s_review_count || 0);
                    const imageUrl = service.primary_image 
                      ? (service.primary_image.startsWith('http://') || service.primary_image.startsWith('https://') || service.primary_image.startsWith('data:image')
                          ? service.primary_image 
                          : `${getApiBaseUrl()}${service.primary_image}`)
                      : null;

                    return (
                      <TouchableOpacity
                        key={service.idservice}
                        style={styles.bannerSlide}
                        onPress={() => onNavigateToEventDetails?.(service.idservice.toString())}
                        activeOpacity={0.9}
                      >
                        <View style={styles.bannerCard}>
                          {imageUrl ? (
                            <Image
                              source={{ uri: imageUrl }}
                              style={styles.bannerImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.bannerImagePlaceholder}>
                              <Text style={styles.bannerImageIcon}>
                                {getCategoryIcon(service.s_category)}
                              </Text>
                            </View>
                          )}
                          <View style={styles.bannerOverlay} />
                          <View style={styles.bannerContent}>
                            <View style={styles.bannerBadgesRow}>
                              <View style={styles.bannerBadge}>
                                <Text style={styles.bannerBadgeText}>Top Rated</Text>
                              </View>
                              <View style={[styles.categoryTag, styles.bannerCategoryTag]}>
                                <Text style={styles.categoryTagIcon}>{getCategoryIcon(service.s_category)}</Text>
                                <Text style={[styles.categoryTagText, styles.bannerCategoryTagText]}>
                                  {getCategoryLabel(service.s_category)}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.bannerServiceName} numberOfLines={2}>
                              {service.s_name}
                            </Text>
                            <Text style={styles.bannerProviderName} numberOfLines={1}>
                              {service.provider_name}
                            </Text>
                            {rating > 0 && (
                              <View style={styles.bannerRating}>
                                <Text style={styles.bannerRatingText}>
                                  ⭐ {rating.toFixed(1)}
                                </Text>
                                {reviewCount > 0 && (
                                  <Text style={styles.bannerReviewCount}>
                                    ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                                  </Text>
                                )}
                              </View>
                            )}
                            <Text style={styles.bannerPrice}>
                              Starting at {formatPrice(service.s_base_price)}
                            </Text>
                            <View style={styles.bannerActions}>
                              <TouchableOpacity
                                style={styles.bannerViewButton}
                                onPress={() => onNavigateToEventDetails?.(service.idservice.toString())}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.bannerViewButtonText}>View Details</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.bannerBookButton}
                                onPress={() => handleBookNow(service)}
                                activeOpacity={0.8}
                              >
                                <Text style={styles.bannerBookButtonText}>Book Now</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {/* Pagination Indicators */}
                {bannerServices.length > 1 && (
                  <View style={styles.bannerPagination}>
                    {bannerServices.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.bannerDot,
                          index === bannerCurrentIndex && styles.bannerDotActive
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Categories */}
            <View style={styles.categoriesContainer}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScrollView}
                contentContainerStyle={styles.categoriesScrollContent}
                nestedScrollEnabled={true}
              >
                {['photography', 'venue', 'music', 'catering'].map((category) => {
                  const count = categoryCounts[category] || 0;
                  return (
                    <View key={category}>
                      {renderCategoryCard(
                        getCategoryIcon(category),
                        getCategoryLabel(category),
                        count,
                        () => handleCategoryClick(category, getCategoryLabel(category)),
                        category
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* All Services */}
            {featuredServices.length > 0 && (
              <View style={styles.servicesContainer}>
                <Text style={styles.sectionTitle}>All Services</Text>
                <View style={styles.servicesGrid}>
                  {featuredServices.map(service => renderServiceCard(service))}
                </View>
              </View>
            )}

          </>
        )}

        </ScrollView>

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal
          visible={showBookingModal}
          serviceId={selectedService.idservice}
          serviceName={selectedService.s_name}
          onClose={handleCloseBookingModal}
          onConfirm={handleConfirmBooking}
          user={user}
          onNavigateToPersonalInfo={() => {
            handleCloseBookingModal();
            // Navigate directly to personal info page
            if (onNavigateToPersonalInfo) {
              onNavigateToPersonalInfo();
            } else if (onNavigateToProfile) {
              // Fallback to profile if personalInfo navigation not available
              onNavigateToProfile();
            }
          }}
        />
      )}

      </View>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F8FAFC' : '#f0f2f5',
    position: 'relative',
  },
  // Background Decorative Elements
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: 'hidden',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Platform.OS === 'web' ? '#F8FAFC' : '#f0f2f5',
  },
  backgroundCircle1: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 600 : 400,
    height: Platform.OS === 'web' ? 600 : 400,
    borderRadius: Platform.OS === 'web' ? 300 : 200,
    backgroundColor: 'rgba(79, 70, 229, 0.08)',
    top: Platform.OS === 'web' ? -200 : -150,
    right: Platform.OS === 'web' ? -200 : -150,
    ...(Platform.OS === 'web' ? {
      filter: 'blur(80px)',
    } : {}),
  },
  backgroundCircle2: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 500 : 350,
    height: Platform.OS === 'web' ? 500 : 350,
    borderRadius: Platform.OS === 'web' ? 250 : 175,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    bottom: Platform.OS === 'web' ? -150 : -100,
    left: Platform.OS === 'web' ? -150 : -100,
    ...(Platform.OS === 'web' ? {
      filter: 'blur(70px)',
    } : {}),
  },
  backgroundCircle3: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 400 : 300,
    height: Platform.OS === 'web' ? 400 : 300,
    borderRadius: Platform.OS === 'web' ? 200 : 150,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    top: Platform.OS === 'web' ? '40%' : '35%',
    right: Platform.OS === 'web' ? '10%' : '5%',
    ...(Platform.OS === 'web' ? {
      filter: 'blur(60px)',
    } : {}),
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingTop: Platform.OS === 'web' ? 24 : 20,
    paddingBottom: Platform.OS === 'web' ? 48 : 80,
    flexGrow: 1,
    backgroundColor: 'transparent',
    width: '100%',
  },
  // Modern Hero Section - Improved Contrast & UX with Background Pattern
  heroSection: {
    backgroundColor: '#4f46e5',
    paddingTop: Platform.OS === 'web' ? 60 : 40,
    paddingBottom: Platform.OS === 'web' ? 70 : 50,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 20,
    marginBottom: Platform.OS === 'web' ? 40 : 30,
    position: 'relative',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      backgroundImage: `
        linear-gradient(135deg, #4f46e5 0%, #5b21b6 50%, #7c3aed 100%),
        radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.08) 0%, transparent 50%)
      `,
    } : {
      backgroundColor: '#4f46e5',
    }),
  },
  heroContent: {
    width: '100%',
    position: 'relative',
    zIndex: 1,
  },
  heroTitle: {
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 28 : 42) : 28,
    fontWeight: '800',
    color: '#ffffff', // High contrast: 12.6:1 ratio on #4f46e5
    marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 8 : 12) : 8,
    lineHeight: Platform.OS === 'web' ? (isMobileWeb ? 36 : 52) : 36,
    ...(Platform.OS === 'web' ? {
      letterSpacing: -0.5,
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    } : {
      textShadowColor: 'rgba(0, 0, 0, 0.2)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 4,
    }),
  },
  heroSubtitle: {
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 16,
    color: '#ffffff', // Changed to pure white for maximum contrast (was #f8fafc)
    marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 20 : 32) : 24,
    fontWeight: '600',
    lineHeight: Platform.OS === 'web' ? (isMobileWeb ? 24 : 28) : 24,
    ...(Platform.OS === 'web' ? {
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.15)',
    } : {
      textShadowColor: 'rgba(0, 0, 0, 0.15)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  },
  modernSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 12 : 16) : 14,
    paddingHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 12 : 20) : 16,
    paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 2 : 4) : 4,
    borderWidth: Platform.OS === 'web' ? (isMobileWeb ? 1 : 2) : 2,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb ? '0 2px 8px rgba(0, 0, 0, 0.1)' : '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease',
      position: 'relative' as any,
      zIndex: 1,
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    }),
  },
  searchIconContainer: {
    marginRight: Platform.OS === 'web' ? (isMobileWeb ? 8 : 12) : 10,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 14 : 16) : 15,
    color: '#0f172a', // High contrast: 15.8:1 on white
    paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 10 : 14) : 12,
    fontWeight: '500',
    lineHeight: Platform.OS === 'web' ? (isMobileWeb ? 20 : 24) : 22,
    minWidth: 0, // Allow text input to shrink on mobile
  },
  modernSearchButton: {
    backgroundColor: '#4f46e5', // Darker for better contrast
    paddingHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 16 : 24) : 20,
    paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
    borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
    marginLeft: Platform.OS === 'web' ? (isMobileWeb ? 6 : 0) : 0,
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      boxShadow: isMobileWeb ? '0 2px 6px rgba(79, 70, 229, 0.3)' : '0 4px 12px rgba(79, 70, 229, 0.4)',
      userSelect: 'none' as any,
      WebkitUserSelect: 'none' as any,
      zIndex: 10,
      position: 'relative' as any,
    } : {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  modernSearchButtonText: {
    color: '#ffffff', // High contrast: 12.6:1 on #4f46e5
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 13 : 15) : 14,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Platform.OS === 'web' ? 40 : 20,
    marginTop: Platform.OS === 'web' ? 20 : 10,
    marginBottom: Platform.OS === 'web' ? 30 : 20,
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 16 : 25,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: '#E9ECEF',
    } : {
      ...((Platform.OS as string) !== 'web' && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }),
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  searchButton: {
    padding: 8,
  },
  searchIcon: {
    fontSize: 20,
    color: '#4a55e1',
  },
  welcomeContainer: {
    paddingHorizontal: Platform.OS === 'web' ? 20 : 20,
    marginBottom: Platform.OS === 'web' ? 35 : 25,
    marginTop: Platform.OS === 'web' ? 10 : 0,
  },
  welcomeTitle: {
    fontSize: Platform.OS === 'web' ? 32 : 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: Platform.OS === 'web' ? 8 : 5,
    ...(Platform.OS === 'web' ? {
      letterSpacing: -0.5,
    } : {}),
  },
  welcomeSubtitle: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#636E72',
    ...(Platform.OS === 'web' ? {
      letterSpacing: 0.2,
    } : {}),
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#636E72',
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 24 : 28) : 26,
    fontWeight: Platform.OS === 'web' ? '800' : '900',
    color: '#0f172a', // Higher contrast: 15.8:1 on light background (was #1e293b - 12.6:1)
    marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 20 : 24) : 22,
    marginTop: Platform.OS === 'web' ? 0 : 8,
    paddingBottom: Platform.OS === 'web' ? (isMobileWeb ? 14 : 16) : 14,
    borderBottomWidth: Platform.OS === 'web' ? (isMobileWeb ? 2 : 3) : 4,
    borderBottomColor: '#4a55e1',
    alignSelf: 'flex-start',
    paddingRight: Platform.OS === 'web' ? (isMobileWeb ? 20 : 24) : 24,
    paddingLeft: Platform.OS === 'web' ? 0 : 4,
    ...(Platform.OS === 'web' ? {
      letterSpacing: -0.5,
    } : {
      letterSpacing: -0.4,
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    }),
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: (screenWidth - 60) / 2,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    position: 'relative',
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    marginBottom: Platform.OS === 'web' ? 48 : 40,
    marginTop: Platform.OS === 'web' ? 32 : 28,
    paddingHorizontal: Platform.OS === 'web' ? 24 : 24,
    paddingVertical: Platform.OS === 'web' ? 32 : 28,
    paddingTop: Platform.OS === 'web' ? 32 : 28,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 20 : 18,
    marginHorizontal: Platform.OS === 'web' ? 24 : 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    }),
  },
  categoriesScrollView: {
    paddingLeft: 20,
  },
  categoriesScrollContent: {
    paddingRight: 20,
  },
  // Banner Slider Styles
  bannerContainer: {
    marginBottom: Platform.OS === 'web' ? 32 : 28,
    marginTop: Platform.OS === 'web' ? 24 : 24,
    marginHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingVertical: Platform.OS === 'web' ? 0 : 8,
  },
  bannerHeader: {
    marginBottom: Platform.OS === 'web' ? 20 : 20,
    marginTop: Platform.OS === 'web' ? 0 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 4,
  },
  bannerTitle: {
    fontSize: Platform.OS === 'web' ? 26 : 24,
    fontWeight: Platform.OS === 'web' ? '800' : '900',
    color: '#1e293b',
    paddingBottom: Platform.OS === 'web' ? 12 : 12,
    borderBottomWidth: Platform.OS === 'web' ? 3 : 4,
    borderBottomColor: '#4a55e1',
    alignSelf: 'flex-start',
    paddingRight: Platform.OS === 'web' ? 24 : 24,
    paddingLeft: Platform.OS === 'web' ? 0 : 4,
    letterSpacing: Platform.OS === 'web' ? -0.5 : -0.4,
    ...(Platform.OS !== 'web' ? {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    } : {}),
  },
  bannerScrollView: {
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    overflow: 'hidden',
  },
  bannerScrollContent: {
    paddingHorizontal: 0,
  },
  bannerSlide: {
    width: screenWidth - (Platform.OS === 'web' ? 48 : 32),
    marginRight: Platform.OS === 'web' ? 0 : 0,
  },
  bannerCard: {
    width: '100%',
    height: Platform.OS === 'web' ? 400 : 320,
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImageIcon: {
    fontSize: 80,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Platform.OS === 'web' ? 24 : 20,
    zIndex: 2,
  },
  bannerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 8 : 6,
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    flexWrap: 'wrap',
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFD700',
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(255, 215, 0, 0.4)',
    } : {
      shadowColor: '#FFD700',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  bannerBadgeText: {
    color: '#1e293b',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bannerServiceName: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerProviderName: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  bannerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    gap: 8,
  },
  bannerRatingText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontWeight: '700',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bannerReviewCount: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    color: '#E2E8F0',
  },
  bannerPrice: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: Platform.OS === 'web' ? 16 : 14,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? 12 : 10,
  },
  bannerViewButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    } : {}),
  },
  bannerViewButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '700',
  },
  bannerBookButton: {
    flex: 1,
    backgroundColor: '#4a55e1',
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(74, 85, 225, 0.4)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#4a55e1',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  bannerBookButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '700',
  },
  bannerPagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 16 : 12,
    gap: 8,
  },
  bannerDot: {
    width: Platform.OS === 'web' ? 10 : 8,
    height: Platform.OS === 'web' ? 10 : 8,
    borderRadius: Platform.OS === 'web' ? 5 : 4,
    backgroundColor: '#CBD5E1',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.3s ease',
    } : {}),
  },
  bannerDotActive: {
    width: Platform.OS === 'web' ? 24 : 20,
    backgroundColor: '#4a55e1',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(74, 85, 225, 0.4)',
    } : {}),
  },
  // Modern Category Cards (matching service card style)
  modernCategoryCard: {
    width: Platform.OS === 'web' ? 320 : 280,
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    overflow: 'hidden',
    marginRight: Platform.OS === 'web' ? 20 : 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: '#f1f5f9',
      transition: 'all 0.3s ease',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  modernCategoryImageContainer: {
    width: '100%',
    height: Platform.OS === 'web' ? 180 : 160,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  modernCategoryImage: {
    width: '100%',
    height: '100%',
  },
  modernCategoryImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  categoryEmoji: {
    fontSize: Platform.OS === 'web' ? 64 : 56,
  },
  categoryCountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#4f46e5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
    } : {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  categoryCountBadgeText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '700',
  },
  modernCategoryInfo: {
    padding: Platform.OS === 'web' ? 20 : 16,
  },
  modernCategoryTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Platform.OS === 'web' ? 8 : 6,
    gap: Platform.OS === 'web' ? 8 : 6,
  },
  modernCategoryTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '800',
    color: '#0f172a',
    flex: 1,
    letterSpacing: -0.5,
    lineHeight: Platform.OS === 'web' ? 26 : 24,
  },
  modernCategoryMeta: {
    marginBottom: Platform.OS === 'web' ? 14 : 12,
  },
  modernCategoryCountText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#475569',
    fontWeight: '600',
  },
  modernCategoryActions: {
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: Platform.OS === 'web' ? 20 : 16,
  },
  modernCategoryViewButton: {
    flex: 1,
    backgroundColor: '#4f46e5',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  modernCategoryViewButtonText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
  },
  categoryCard: {
    width: Platform.OS === 'web' ? 140 : 120,
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 16 : 12,
    padding: Platform.OS === 'web' ? 20 : 15,
    alignItems: 'center',
    marginRight: Platform.OS === 'web' ? 20 : 15,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: '#F1F3F5',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {
      ...((Platform.OS as string) !== 'web' && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      }),
    }),
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 11,
    color: '#636E72',
  },
  servicesContainer: {
    marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 32 : 48) : 40,
    marginTop: Platform.OS === 'web' ? (isMobileWeb ? 24 : 32) : 28,
    paddingHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 16 : 24) : 24,
    paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 20 : 32) : 28,
    paddingTop: Platform.OS === 'web' ? (isMobileWeb ? 20 : 32) : 28,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 18,
    marginHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 16 : 24) : 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb 
        ? '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)'
        : '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
      borderWidth: 1,
      borderColor: '#E2E8F0',
    }),
  },
  seeAllText: {
    fontSize: 14,
    color: '#4a55e1',
    fontWeight: '600',
  },
  servicesScrollView: {
    paddingLeft: 20,
  },
  servicesScrollContent: {
    paddingRight: 20,
  },
  // Modern Service Cards
  modernServiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 18,
    marginRight: Platform.OS === 'web' ? 0 : 0,
    marginBottom: Platform.OS === 'web' ? 0 : 16,
    width: Platform.OS === 'web' 
      ? (isMobileWeb ? '100%' : ('calc(25% - 18px)' as any))
      : '100%', // Full width on mobile web, 4 columns on desktop
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb 
        ? '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)'
        : '0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
      borderWidth: 1,
      borderColor: '#f1f5f9',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  modernServiceImageContainer: {
    width: '100%',
    height: Platform.OS === 'web' ? (isMobileWeb ? 180 : 200) : 220,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  modernServiceImage: {
    width: '100%',
    height: '100%',
  },
  modernServiceImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10b981',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
    } : {
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  featuredBadgeText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '700',
  },
  modernServiceInfo: {
    padding: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 16,
  },
  modernServiceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 6 : 8) : 6,
    gap: Platform.OS === 'web' ? (isMobileWeb ? 6 : 8) : 6,
  },
  modernServiceTitle: {
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 18 : 20) : 18,
    fontWeight: '800',
    color: '#0f172a', // Higher contrast: 15.8:1 on white (was #1e293b - 12.6:1)
    flex: 1,
    letterSpacing: -0.5,
    lineHeight: Platform.OS === 'web' ? (isMobileWeb ? 24 : 26) : 24,
  },
  modernServiceProvider: {
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 13 : 14) : 13,
    color: '#475569', // Better contrast: 7.4:1 on white (was #64748b - 5.2:1)
    marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
    fontWeight: '600', // Increased for better readability
  },
  modernServiceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 12 : 14) : 12,
  },
  modernRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
    borderRadius: Platform.OS === 'web' ? 20 : 18,
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    }),
  },
  modernRatingStar: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    marginRight: 4,
  },
  modernRatingText: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
    color: '#78350F',
    marginRight: 4,
  },
  modernReviewCount: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#78350F',
    fontWeight: '600',
  },
  newBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modernLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  modernLocationIcon: {
    fontSize: Platform.OS === 'web' ? 14 : 12,
    marginRight: 4,
  },
  modernLocationText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#475569', // Better contrast: 7.4:1 (was #64748b - 5.2:1)
    fontWeight: '600', // Increased for readability
    flex: 1,
    flexWrap: 'wrap',
  },
  modernDistanceText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#059669', // Darker green for better contrast: 4.8:1 (was #10b981 - 3.1:1)
    fontWeight: '700',
    marginLeft: 4,
  },
  modernPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Platform.OS === 'web' ? (isMobileWeb ? 14 : 16) : 14,
    paddingTop: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modernPriceLabel: {
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 11 : 12) : 11,
    color: '#475569', // Better contrast: 7.4:1 (was #64748b - 5.2:1)
    fontWeight: '600', // Increased for readability
    marginRight: 6,
  },
  modernPrice: {
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 22 : 24) : 22,
    fontWeight: '800',
    color: '#4f46e5', // Darker blue for better contrast: 7.1:1 on white (was #4a55e1 - 6.2:1)
    letterSpacing: -0.5,
  },
  modernServiceActions: {
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 16,
    paddingBottom: Platform.OS === 'web' ? (isMobileWeb ? 16 : 20) : 16,
    gap: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
  },
  modernViewButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 12 : 14) : 12,
    borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  modernViewButtonText: {
    color: '#334155', // Better contrast: 9.5:1 on light gray (was #475569)
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 14 : 15) : 14,
    fontWeight: '700',
  },
  modernBookButton: {
    flex: 1,
    backgroundColor: '#4f46e5', // Darker for better contrast
    paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 12 : 14) : 12,
    borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb 
        ? '0 2px 6px rgba(79, 70, 229, 0.3)'
        : '0 4px 12px rgba(79, 70, 229, 0.4)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  modernBookButtonText: {
    color: '#ffffff', // High contrast: 12.6:1 on #4f46e5
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 14 : 15) : 14,
    fontWeight: '700',
  },
  modernProfileButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    alignItems: 'center',
    marginHorizontal: Platform.OS === 'web' ? 6 : 5,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  modernProfileButtonText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 0,
    marginRight: 15,
    width: 280,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 6,
    }),
  },
  serviceCardGrid: {
    width: '100%',
    marginRight: 0,
  },
  serviceImageContainer: {
    width: '100%',
    height: 160,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceEmoji: {
    fontSize: 56,
  },
  serviceInfo: {
    padding: 16,
    paddingBottom: 12,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    flex: 1,
    letterSpacing: -0.3,
  },
  serviceProvider: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
    borderRadius: Platform.OS === 'web' ? 20 : 18,
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    }),
  },
  ratingText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#78350F',
    marginRight: 4,
    fontWeight: '700',
  },
  reviewCount: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#78350F',
    fontWeight: '600',
  },
  servicePrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  serviceLocation: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    flexWrap: 'wrap',
  },
  distanceText: {
    fontSize: 13,
    color: '#10b981',
    fontWeight: '600',
  },
  serviceActions: {
    flexDirection: 'row',
    paddingHorizontal: isMobile ? 12 : 16,
    paddingBottom: isMobile ? 12 : 16,
    gap: isMobile ? 8 : 10,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: isMobile ? 16 : 14,
    paddingHorizontal: isMobile ? 12 : 16,
    borderRadius: isMobile ? 10 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: isMobile ? 1.5 : 1.5,
    borderColor: '#4285F4',
    minHeight: isMobile ? 48 : undefined,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(66, 133, 244, 0.1)',
    } : {
      shadowColor: '#4285F4',
      shadowOffset: { width: 0, height: isMobile ? 2 : 2 },
      shadowOpacity: isMobile ? 0.15 : 0.1,
      shadowRadius: isMobile ? 6 : 4,
      elevation: isMobile ? 3 : 2,
    }),
  },
  viewDetailsButtonText: {
    color: '#4285F4',
    fontSize: isMobile ? 14 : 15,
    fontWeight: '700',
    letterSpacing: isMobile ? 0.3 : 0.2,
  },
  bookNowButton: {
    flex: 1,
    backgroundColor: '#4285F4',
    paddingVertical: isMobile ? 16 : 14,
    paddingHorizontal: isMobile ? 12 : 16,
    borderRadius: isMobile ? 10 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isMobile ? 48 : undefined,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3), 0 2px 4px rgba(66, 133, 244, 0.2)',
    } : {
      shadowColor: '#4285F4',
      shadowOffset: { width: 0, height: isMobile ? 4 : 4 },
      shadowOpacity: isMobile ? 0.35 : 0.3,
      shadowRadius: isMobile ? 10 : 8,
      elevation: isMobile ? 5 : 4,
    }),
  },
  bookNowButtonText: {
    color: '#ffffff',
    fontSize: isMobile ? 14 : 15,
    fontWeight: '700',
    letterSpacing: isMobile ? 0.3 : 0.2,
  },
  profileButtonAction: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: isMobile ? 16 : 14,
    paddingHorizontal: isMobile ? 12 : 16,
    borderRadius: isMobile ? 10 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isMobile ? 48 : undefined,
    marginHorizontal: isMobile ? 4 : 5,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3), 0 2px 4px rgba(16, 185, 129, 0.2)',
    } : {
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: isMobile ? 4 : 4 },
      shadowOpacity: isMobile ? 0.35 : 0.3,
      shadowRadius: isMobile ? 10 : 8,
      elevation: isMobile ? 5 : 4,
    }),
  },
  profileButtonText: {
    color: '#ffffff',
    fontSize: isMobile ? 14 : 15,
    fontWeight: '700',
    letterSpacing: isMobile ? 0.3 : 0.2,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 20,
    paddingVertical: Platform.OS === 'web' ? 20 : 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchResultsTitle: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  categoryFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 24,
    paddingVertical: Platform.OS === 'web' ? 15 : 18,
    backgroundColor: '#ffffff',
    borderBottomWidth: Platform.OS === 'web' ? 1 : 3,
    borderBottomColor: Platform.OS === 'web' ? '#E9ECEF' : '#4a55e1',
  },
  categoryFilterTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 24,
    fontWeight: Platform.OS === 'web' ? 'bold' : '900',
    color: '#2D3436',
    flex: 1,
    textAlign: 'center',
    ...(Platform.OS !== 'web' ? {
      letterSpacing: -0.3,
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    } : {}),
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4a55e1',
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' ? {
      gap: isMobileWeb ? 16 : 24,
      justifyContent: 'flex-start',
    } : {
      gap: 16,
      paddingHorizontal: 0,
      paddingBottom: 20,
      justifyContent: 'flex-start',
    }),
  },
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    width: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
    gap: Platform.OS === 'web' ? 24 : 12,
  },
  serviceCardWrapper: {
    ...(Platform.OS === 'web' ? {
      width: '48%',
    } : {
      width: '100%', // Full width on mobile (1 column)
    }),
    marginBottom: Platform.OS === 'web' ? 0 : 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#636E72',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#95A5A6',
    textAlign: 'center',
  },
  searchResultsScroll: {
    flex: 1,
  },
  providersSection: {
    paddingHorizontal: Platform.OS === 'web' ? 32 : 20,
    paddingTop: Platform.OS === 'web' ? 32 : 24,
    paddingBottom: Platform.OS === 'web' ? 24 : 20,
    marginBottom: Platform.OS === 'web' ? 32 : 24,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    marginHorizontal: Platform.OS === 'web' ? 24 : 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  sectionTitleSecondary: {
    fontSize: Platform.OS === 'web' ? 26 : 24,
    fontWeight: Platform.OS === 'web' ? '800' : '900',
    color: '#1e293b',
    marginBottom: Platform.OS === 'web' ? 24 : 22,
    marginTop: Platform.OS === 'web' ? 0 : 8,
    paddingBottom: Platform.OS === 'web' ? 16 : 14,
    borderBottomWidth: Platform.OS === 'web' ? 3 : 4,
    borderBottomColor: '#4a55e1',
    alignSelf: 'flex-start',
    paddingRight: Platform.OS === 'web' ? 24 : 24,
    paddingLeft: Platform.OS === 'web' ? 0 : 4,
    letterSpacing: Platform.OS === 'web' ? -0.5 : -0.4,
    ...(Platform.OS !== 'web' ? {
      textShadowColor: 'rgba(0, 0, 0, 0.1)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    } : {}),
  },
  providersContainer: {
    gap: 12,
  },
  providerCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    padding: Platform.OS === 'web' ? 20 : 16,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  providerImageContainer: {
    width: Platform.OS === 'web' ? 60 : 56,
    height: Platform.OS === 'web' ? 60 : 56,
    borderRadius: Platform.OS === 'web' ? 30 : 28,
    overflow: 'hidden',
    marginRight: 16,
  },
  providerImage: {
    width: '100%',
    height: '100%',
  },
  providerImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerImagePlaceholderText: {
    fontSize: Platform.OS === 'web' ? 24 : 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  providerServicesCount: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#64748b',
    marginBottom: 4,
  },
  providerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providerRatingText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#f59e0b',
  },
  providerReviewCount: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#94a3b8',
  },
  providerArrow: {
    marginLeft: 12,
  },
  providerArrowText: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    color: '#94a3b8',
  },
  // Filter Styles
  filterButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: Platform.OS === 'web' ? (isMobileWeb ? 10 : 16) : 14,
    paddingVertical: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
    borderRadius: Platform.OS === 'web' ? (isMobileWeb ? 10 : 12) : 10,
    marginRight: Platform.OS === 'web' ? (isMobileWeb ? 6 : 8) : 6,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  filterButtonActive: {
    backgroundColor: '#4f46e5',
  },
  filterButtonText: {
    color: '#475569',
    fontSize: Platform.OS === 'web' ? (isMobileWeb ? 12 : 14) : 13,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.4)',
    } : {}),
  },
  filterPanel: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    marginTop: Platform.OS === 'web' ? 16 : 12,
    marginHorizontal: Platform.OS === 'web' ? 0 : 0,
    maxHeight: Platform.OS === 'web' ? 800 : 750,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
      borderWidth: 1,
      borderColor: '#e2e8f0',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  filterPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Platform.OS === 'web' ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterPanelTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  filterCloseButton: {
    fontSize: Platform.OS === 'web' ? 24 : 20,
    color: '#64748b',
    fontWeight: 'bold',
    padding: 4,
  },
  filterContent: {
    maxHeight: Platform.OS === 'web' ? 650 : 600,
  },
  filterContentContainer: {
    padding: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: Platform.OS === 'web' ? 20 : 24,
  },
  filterSection: {
    marginBottom: Platform.OS === 'web' ? 24 : 20,
  },
  filterLabel: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 12 : 10,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#64748b',
    marginBottom: Platform.OS === 'web' ? 6 : 5,
    fontWeight: '500',
  },
  priceInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Platform.OS === 'web' ? 10 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: '#0f172a',
  },
  priceSeparatorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 8 : 6,
  },
  priceSeparator: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#64748b',
    fontWeight: '600',
  },
  filterInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Platform.OS === 'web' ? 10 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: '#0f172a',
  },
  radiusContainer: {
    marginTop: Platform.OS === 'web' ? 12 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 12 : 10,
  },
  radiusLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  radiusInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Platform.OS === 'web' ? 10 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#0f172a',
    width: Platform.OS === 'web' ? 100 : 80,
  },
  categoryButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Platform.OS === 'web' ? 10 : 8,
  },
  categoryFilterButton: {
    paddingHorizontal: Platform.OS === 'web' ? 16 : 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderRadius: Platform.OS === 'web' ? 10 : 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  categoryFilterButtonActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  categoryFilterButtonText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    color: '#64748b',
  },
  categoryFilterButtonTextActive: {
    color: '#ffffff',
  },
  filterActions: {
    flexDirection: 'row',
    padding: Platform.OS === 'web' ? 20 : 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: Platform.OS === 'web' ? 12 : 10,
  },
  clearFiltersButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  clearFiltersButtonText: {
    color: '#64748b',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    backgroundColor: '#4f46e5',
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  applyFiltersButtonText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
  },
  // Provider Group Styles
  providerGroup: {
    marginBottom: Platform.OS === 'web' ? 32 : 24,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    padding: Platform.OS === 'web' ? 24 : 20,
    marginHorizontal: Platform.OS === 'web' ? 24 : 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  providerGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'web' ? 16 : 12,
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  providerGroupHeaderContent: {
    flex: 1,
  },
  providerGroupTitle: {
    fontSize: Platform.OS === 'web' ? 22 : 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: Platform.OS === 'web' ? 4 : 2,
  },
  providerGroupCount: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#64748b',
    fontWeight: '500',
  },
  providerGroupArrow: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    color: '#4a55e1',
    fontWeight: '700',
    marginLeft: Platform.OS === 'web' ? 16 : 12,
  },
  // Category Tag Styles
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: Platform.OS === 'web' ? 10 : 8,
    paddingVertical: Platform.OS === 'web' ? 4 : 3,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    gap: Platform.OS === 'web' ? 4 : 3,
    flexShrink: 0,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    }),
  },
  categoryTagIcon: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
  },
  categoryTagText: {
    fontSize: Platform.OS === 'web' ? 11 : 10,
    fontWeight: '600',
    color: '#4a55e1',
    textTransform: 'capitalize',
  },
  bannerCategoryTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  bannerCategoryTagText: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ratingDropdownButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingDropdownText: {
    fontSize: 14,
    color: '#0f172a',
    flex: 1,
  },
  ratingDropdownPlaceholder: {
    color: '#94a3b8',
  },
  ratingDropdownArrow: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 8,
  },
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    maxHeight: '70%',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  ratingModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  ratingModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  ratingModalCloseButton: {
    padding: 4,
  },
  ratingModalCloseText: {
    fontSize: 20,
    color: '#64748b',
    fontWeight: 'bold',
  },
  ratingModalBody: {
    maxHeight: 400,
  },
  ratingModalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ratingModalItemSelected: {
    backgroundColor: '#f0f4ff',
  },
  ratingModalItemText: {
    fontSize: 15,
    color: '#0f172a',
  },
  ratingModalItemTextSelected: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  ratingModalCheckmark: {
    fontSize: 18,
    color: '#4f46e5',
    fontWeight: 'bold',
  },
});
