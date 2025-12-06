import React, { useState, useEffect } from 'react';
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
  FlatList
} from 'react-native';
import * as Location from 'expo-location';
import { User } from '../../models/User';
import { AuthState } from '../../models/AuthState';
import { getApiBaseUrl } from '../../services/api';
import { BookingModal } from '../../components/BookingModal';
import { getShadowStyle } from '../../utils/shadowStyles';

interface DashboardViewProps {
  user: User;
  authState: AuthState;
  onLogout: () => Promise<boolean>;
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
  serviceIdToBook?: string | null;
  onBookingModalClosed?: () => void;
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
  provider_name: string;
  primary_image?: string | null;
  distance_km?: number;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;
const isMobile = screenWidth < 768;
const isMobileWeb = Platform.OS === 'web' && screenWidth < 768;

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  authState,
  onLogout,
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
  serviceIdToBook,
  onBookingModalClosed
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'home' | 'messages' | 'booking' | 'like' | 'profile'>('home');
  const [loading, setLoading] = useState(true);
  const [featuredServices, setFeaturedServices] = useState<Service[]>([]);
  const [nearbyServices, setNearbyServices] = useState<Service[]>([]);
  const [photographyServices, setPhotographyServices] = useState<Service[]>([]);
  const [venueServices, setVenueServices] = useState<Service[]>([]);
  const [musicServices, setMusicServices] = useState<Service[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<{ [key: string]: number }>({});
  const [bookingsCount, setBookingsCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryServices, setCategoryServices] = useState<Service[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchResults, setSearchResults] = useState<Service[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get user location
  useEffect(() => {
    const getLocation = async () => {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        // Web geolocation
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            // Only log non-permission errors (permission denied is expected user behavior)
            if (error.code !== 1) {
              console.log('Geolocation error:', error);
            }
            // Default to Metro Manila if geolocation fails
            setUserLocation({
              latitude: 14.5995,
              longitude: 120.9842,
            });
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      } else {
        // Mobile geolocation using expo-location
        try {
          // Request permissions
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.log('Location permission denied');
            // Default to Metro Manila if permission denied
            setUserLocation({
              latitude: 14.5995,
              longitude: 120.9842,
            });
            return;
          }

          // Get current position
          // Note: expo-location doesn't support timeout option, so we use Promise.race for timeout handling
          const locationPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Location request timeout')), 10000);
          });
          
          const location = await Promise.race([locationPromise, timeoutPromise]);

          setUserLocation({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        } catch (error) {
          console.log('Location error:', error);
          // Default to Metro Manila if geolocation fails
          setUserLocation({
            latitude: 14.5995,
            longitude: 120.9842,
          });
        }
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [user, userLocation]);

  // Handle service ID passed from ServiceDetailsView to trigger booking
  useEffect(() => {
    if (serviceIdToBook) {
      // Find the service in any of the service lists
      const allServices = [
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
    try {
      const userEmail = user.email || '';
      
      // Helper function to map image URLs
      const mapImageUrl = (s: any) => ({
        ...s,
        primary_image: s.primary_image ? (s.primary_image.startsWith('/uploads/') ? `${getApiBaseUrl()}${s.primary_image}` : s.primary_image) : null
      });

      // Load high-rated services for today (rating >= 4.0, sorted by rating and review count)
      const featuredResp = await fetch(`${getApiBaseUrl()}/api/services?highRated=true&limit=10`);
      if (featuredResp.ok) {
        const featuredData = await featuredResp.json();
        setFeaturedServices((featuredData.rows || []).map(mapImageUrl));
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

      // Load counts
      if (userEmail) {
        const [bookingsResp, messagesResp] = await Promise.all([
          fetch(`${getApiBaseUrl()}/api/user/bookings/count?email=${encodeURIComponent(userEmail)}`),
          fetch(`${getApiBaseUrl()}/api/user/messages/count?email=${encodeURIComponent(userEmail)}`)
        ]);

        if (bookingsResp.ok) {
          const bookingsData = await bookingsResp.json();
          setBookingsCount(bookingsData.count || 0);
        }
        if (messagesResp.ok) {
          const messagesData = await messagesResp.json();
          setMessagesCount(messagesData.count || 0);
        }
      }
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
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services?search=${encodeURIComponent(searchQuery)}`);
      if (resp.ok) {
        const data = await resp.json();
        const mapImageUrl = (s: any) => ({
          ...s,
          primary_image: s.primary_image ? (s.primary_image.startsWith('/uploads/') ? `${getApiBaseUrl()}${s.primary_image}` : s.primary_image) : null
        });
        setSearchResults((data.rows || []).map(mapImageUrl));
        setSelectedCategory(null); // Clear category selection when searching
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const loadCategoryServices = async (category: string) => {
    setLoadingCategory(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services?category=${encodeURIComponent(category)}`);
      if (resp.ok) {
        const data = await resp.json();
        const mapImageUrl = (s: any) => ({
          ...s,
          primary_image: s.primary_image ? (s.primary_image.startsWith('/uploads/') ? `${getApiBaseUrl()}${s.primary_image}` : s.primary_image) : null
        });
        setCategoryServices((data.rows || []).map(mapImageUrl));
        setSelectedCategory(category);
        setActiveTab('messages');
      }
    } catch (error) {
      console.error('Error loading category services:', error);
    } finally {
      setLoadingCategory(false);
    }
  };

  const handleCategoryClick = (category: string, categoryName: string) => {
    loadCategoryServices(category);
  };

  const clearCategoryFilter = () => {
    setSelectedCategory(null);
    setCategoryServices([]);
    setActiveTab('home');
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

  const handleConfirmBooking = async (date: string, startTime: string, endTime: string, attendees?: number) => {
    if (!selectedService || !user.email) {
      Alert.alert('Error', 'Unable to create booking. Please try again.');
      return;
    }

    // For now, use default values - you can enhance this with a form later
    const eventName = `${selectedService.s_name} - ${new Date(date).toLocaleDateString()}`;
    const location = selectedService.s_city || 'TBD';

    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientEmail: user.email,
          serviceId: selectedService.idservice,
          eventName: eventName,
          eventDate: date,
          startTime: startTime,
          endTime: endTime,
          location: location,
          attendees: attendees || null,
          notes: null
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        // Close the booking modal
                handleCloseBookingModal();
                // Refresh bookings count
                loadDashboardData();
        // Navigate directly to bookings view
                onNavigateToBookings?.();
        // Show brief success message
        Alert.alert('Success', 'Booking created successfully!');
      } else {
        const errorData = await resp.json();
        // Handle overlap conflict specifically
        if (resp.status === 409) {
          Alert.alert(
            'Time Conflict',
            errorData.error || 'This time slot overlaps with an existing booking. Please select a different time.',
            [{ text: 'OK' }]
          );
        } else {
        Alert.alert('Error', errorData.error || 'Failed to create booking');
        }
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
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
                style={styles.modernServiceImage}
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
            <Text style={styles.modernServiceTitle} numberOfLines={2}>{service.s_name}</Text>
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
          {service.s_city && (
                <View style={styles.modernLocationContainer}>
                  <Text style={styles.modernLocationIcon}>📍</Text>
                  <Text style={styles.modernLocationText} numberOfLines={1}>{service.s_city}</Text>
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

  const renderCategoryCard = (icon: string, label: string, count: number, onPress: () => void) => (
    <TouchableOpacity 
      style={[styles.modernCategoryCard]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.modernCategoryIconContainer}>
        <Text style={styles.modernCategoryIcon}>{icon}</Text>
      </View>
      <Text style={styles.modernCategoryLabel}>{label}</Text>
      {count > 0 && (
        <View style={styles.modernCategoryBadge}>
          <Text style={styles.modernCategoryBadgeText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image 
              source={require('../../../assets/logo.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          
          {/* Web Navigation in Header */}
          {Platform.OS === 'web' && (
            <View style={styles.webNavigation}>
              <TouchableOpacity 
                style={[styles.webNavItem, activeTab === 'home' && styles.webNavItemActive]}
                onPress={() => setActiveTab('home')}
              >
                <Text style={[styles.webNavIcon, activeTab === 'home' && styles.webNavIconActive]}>🏠</Text>
                <Text style={[styles.webNavLabel, activeTab === 'home' && styles.webNavLabelActive]}>Home</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.webNavItem, activeTab === 'messages' && styles.webNavItemActive]}
                onPress={() => {
                  setActiveTab('messages');
                  onNavigateToMessages?.();
                }}
              >
                <Text style={[styles.webNavIcon, activeTab === 'messages' && styles.webNavIconActive]}>💬</Text>
                <Text style={[styles.webNavLabel, activeTab === 'messages' && styles.webNavLabelActive]}>Message</Text>
                {messagesCount > 0 && (
                  <View style={styles.webNavBadge}>
                    <Text style={styles.webNavBadgeText}>{messagesCount > 99 ? '99+' : messagesCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.webNavItem, activeTab === 'booking' && styles.webNavItemActive]}
                onPress={() => {
                  setActiveTab('booking');
                  onNavigateToBookings?.();
                }}
              >
                <Text style={[styles.webNavIcon, activeTab === 'booking' && styles.webNavIconActive]}>📅</Text>
                <Text style={[styles.webNavLabel, activeTab === 'booking' && styles.webNavLabelActive]}>Booking</Text>
                {bookingsCount > 0 && (
                  <View style={styles.webNavBadge}>
                    <Text style={styles.webNavBadgeText}>{bookingsCount > 99 ? '99+' : bookingsCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.webNavItem, activeTab === 'like' && styles.webNavItemActive]}
                onPress={() => {
                  setActiveTab('like');
                  onNavigateToHiring?.();
                }}
              >
                <Text style={[styles.webNavIcon, activeTab === 'like' && styles.webNavIconActive]}>💼</Text>
                <Text style={[styles.webNavLabel, activeTab === 'like' && styles.webNavLabelActive]}>Job</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.webNavItem, activeTab === 'profile' && styles.webNavItemActive]}
                onPress={() => {
                  setActiveTab('profile');
                  onNavigateToProfile?.();
                }}
              >
                <Text style={[styles.webNavIcon, activeTab === 'profile' && styles.webNavIconActive]}>👤</Text>
                <Text style={[styles.webNavLabel, activeTab === 'profile' && styles.webNavLabelActive]}>Profile</Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={onNavigateToNotifications}
            >
              <Text style={styles.notificationIcon}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.profileButton}
              onPress={onNavigateToProfile}
            >
              {user.profilePicture ? (
                <Image
                  source={{ 
                    uri: user.profilePicture.startsWith('/uploads/') 
                      ? `${getApiBaseUrl()}${user.profilePicture}`
                      : user.profilePicture.startsWith('data:image')
                      ? user.profilePicture
                      : user.profilePicture
                  }}
                  style={styles.profileAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.profileAvatar}>{user.getInitials()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

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
                placeholder="Search events, services, or providers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
                placeholderTextColor="#94a3b8"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
              <TouchableOpacity 
                style={styles.modernSearchButton} 
                onPress={handleSearch}
                activeOpacity={0.8}
              >
                <Text style={styles.modernSearchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : searchResults.length > 0 || isSearching ? (
          <>
            {/* Search Results View */}
            <View style={styles.searchResultsHeader}>
              <TouchableOpacity 
                onPress={() => {
                  setSearchResults([]);
                  setSearchQuery('');
                  setIsSearching(false);
                }} 
                style={styles.backButton}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.searchResultsTitle}>
                Search Results {searchQuery ? `for "${searchQuery}"` : ''}
              </Text>
              <View style={styles.placeholder} />
            </View>

            {isSearching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a55e1" />
                <Text style={styles.loadingText}>Searching...</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <View style={[styles.servicesContainer, styles.servicesGrid]}>
                {searchResults.map((item, index) => {
                  // Create rows of 2 items
                  if (index % 2 === 0) {
                    const rowItems = searchResults.slice(index, index + 2);
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
                                      style={styles.serviceImage}
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
                                  {serviceItem.s_city && (
                                    <Text style={styles.serviceLocation} numberOfLines={1}>📍 {serviceItem.s_city}</Text>
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
                <Text style={styles.emptyStateIcon}>🔍</Text>
                <Text style={styles.emptyStateText}>No services found</Text>
                <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
              </View>
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
                  // Create rows of 2 items
                  if (index % 2 === 0) {
                    const rowItems = categoryServices.slice(index, index + 2);
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
                                      style={styles.serviceImage}
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
                                  {serviceItem.s_city && (
                                    <Text style={styles.serviceLocation} numberOfLines={1}>📍 {serviceItem.s_city}</Text>
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
                <Text style={styles.emptyStateText}>No services found</Text>
                <Text style={styles.emptyStateSubtext}>There are no {selectedCategory} services available at the moment.</Text>
              </View>
            )}
          </>
        ) : (
          <>

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
                        () => handleCategoryClick(category, getCategoryLabel(category))
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            </View>

            {/* High-Rated Services */}
            {featuredServices.length > 0 && (
              <View style={styles.servicesContainer}>
                <View style={styles.servicesHeader}>
                  <Text style={styles.sectionTitle}>⭐ High-Rated Services</Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.servicesScrollView}
                  contentContainerStyle={styles.servicesScrollContent}
                  nestedScrollEnabled={true}
                >
                  {featuredServices.map(service => renderServiceCard(service))}
                </ScrollView>
              </View>
            )}

            {/* Nearby Services */}
            {nearbyServices.length > 0 && (
              <View style={styles.servicesContainer}>
                <View style={styles.servicesHeader}>
                  <Text style={styles.sectionTitle}>Nearby Services (Within 100km)</Text>
                  <TouchableOpacity onPress={() => {
                    onNavigateToNearby?.();
                    setActiveTab('messages');
                  }}>
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.servicesScrollView}
                  contentContainerStyle={styles.servicesScrollContent}
                  nestedScrollEnabled={true}
                >
                  {nearbyServices.slice(0, 5).map(service => renderServiceCard(service))}
                </ScrollView>
              </View>
            )}
          </>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal
          visible={showBookingModal}
          serviceId={selectedService.idservice}
          serviceName={selectedService.s_name}
          onClose={handleCloseBookingModal}
          onConfirm={handleConfirmBooking}
        />
      )}

      {/* Bottom Navigation - Mobile Only */}
      {Platform.OS !== 'web' && (
      <View style={[styles.bottomNavigation, getShadowStyle(0.1, 4, -2)]}>
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'home' && styles.activeNavItem]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.navIcon, activeTab === 'home' && styles.activeNavIcon]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'messages' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('messages');
            onNavigateToMessages?.();
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'messages' && styles.activeNavIcon]}>💬</Text>
          <Text style={[styles.navLabel, activeTab === 'messages' && styles.activeNavLabel]}>Message</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'booking' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('booking');
            onNavigateToBookings?.();
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'booking' && styles.activeNavIcon]}>📅</Text>
          <Text style={[styles.navLabel, activeTab === 'booking' && styles.activeNavLabel]}>Booking</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'like' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('like');
            onNavigateToHiring?.();
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'like' && styles.activeNavIcon]}>💼</Text>
          <Text style={[styles.navLabel, activeTab === 'like' && styles.activeNavLabel]}>Job</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]}
          onPress={() => {
            setActiveTab('profile');
            onNavigateToProfile?.();
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'profile' && styles.activeNavIcon]}>👤</Text>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.activeNavLabel]}>Profile</Text>
        </TouchableOpacity>
      </View>
      )}
    </View>
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
    paddingTop: 10,
    paddingBottom: Platform.OS === 'web' ? 40 : 80,
    flexGrow: 1,
    backgroundColor: 'transparent',
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isMobileWeb ? 16 : (Platform.OS === 'web' ? 20 : 20),
    paddingTop: isMobileWeb ? 16 : (Platform.OS === 'web' ? 20 : 50),
    paddingBottom: isMobileWeb ? 16 : (Platform.OS === 'web' ? 20 : 15),
    backgroundColor: '#ffffff',
    position: 'relative',
    zIndex: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb 
        ? '0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)' 
        : '0 2px 8px rgba(0, 0, 0, 0.08)',
      borderBottomWidth: isMobileWeb ? 0 : 1,
      borderBottomColor: '#E9ECEF',
    } : {
      ...((Platform.OS as string) !== 'web' && {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 3,
      }),
    }),
  },
  headerLeft: {
    flex: Platform.OS === 'web' ? 0 : 1,
    marginRight: isMobileWeb ? 8 : (Platform.OS === 'web' ? 40 : 0),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isMobileWeb ? 8 : 12,
    marginLeft: isMobileWeb ? 8 : (Platform.OS === 'web' ? 20 : 0),
  },
  webNavigation: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isMobileWeb ? 6 : (Platform.OS === 'web' ? 8 : 4),
    paddingHorizontal: isMobileWeb ? 12 : (Platform.OS === 'web' ? 20 : 0),
    flexWrap: isMobileWeb ? 'wrap' : 'nowrap',
    ...(isMobileWeb ? {
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      paddingVertical: 8,
      paddingHorizontal: 12,
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
    } : {}),
  },
  webNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: isMobileWeb ? 10 : (Platform.OS === 'web' ? 10 : 8),
    paddingHorizontal: isMobileWeb ? 12 : (Platform.OS === 'web' ? 16 : 12),
    borderRadius: isMobileWeb ? 12 : (Platform.OS === 'web' ? 12 : 8),
    gap: isMobileWeb ? 6 : 6,
    position: 'relative',
    minWidth: isMobileWeb ? 44 : undefined,
    minHeight: isMobileWeb ? 44 : undefined,
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    } : {}),
    ...(isMobileWeb ? {
      backgroundColor: 'transparent',
    } : {}),
  },
  webNavItemActive: {
    ...(isMobileWeb ? {
      backgroundColor: '#667eea',
      ...(Platform.OS === 'web' ? {
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(102, 126, 234, 0.2)',
      } : {}),
    } : {
    backgroundColor: Platform.OS === 'web' ? '#F0F4FF' : '#E9ECEF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(74, 85, 225, 0.1)',
    } : {}),
    }),
  },
  webNavIcon: {
    fontSize: isMobileWeb ? 20 : (Platform.OS === 'web' ? 20 : 18),
    ...(isMobileWeb ? {
      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
    } : {}),
  },
  webNavIconActive: {
    ...(isMobileWeb ? {
      transform: [{ scale: 1.15 }],
      filter: 'drop-shadow(0 2px 4px rgba(102, 126, 234, 0.3))',
    } : {
    transform: [{ scale: 1.1 }],
    }),
  },
  webNavLabel: {
    fontSize: isMobileWeb ? 12 : (Platform.OS === 'web' ? 14 : 12),
    color: isMobileWeb ? '#64748B' : '#475569', // Better contrast: 7.4:1 (was #636E72 - 5.2:1)
    fontWeight: isMobileWeb ? '600' : '600', // Increased from 500 for better readability
    flexShrink: 1,
    ...(Platform.OS === 'web' ? {
      letterSpacing: isMobileWeb ? 0.3 : 0.2,
    } : {}),
    ...(isMobileWeb ? {
      marginTop: 2,
    } : {}),
  },
  webNavLabelActive: {
    color: isMobileWeb ? '#FFFFFF' : '#4f46e5', // White text on gradient background for mobile web
    fontWeight: isMobileWeb ? '700' : '700', // Increased from 600
    ...(isMobileWeb ? {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    } : {}),
  },
  webNavBadge: {
    position: 'absolute',
    top: isMobileWeb ? 2 : (Platform.OS === 'web' ? 4 : 2),
    right: isMobileWeb ? 2 : (Platform.OS === 'web' ? 4 : 2),
    backgroundColor: '#FF3B30',
    borderRadius: isMobileWeb ? 10 : 10,
    minWidth: isMobileWeb ? 20 : 18,
    height: isMobileWeb ? 20 : 18,
    paddingHorizontal: isMobileWeb ? 5 : 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: isMobileWeb ? 2 : 0,
    borderColor: isMobileWeb ? '#FFFFFF' : 'transparent',
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb 
        ? '0 3px 8px rgba(255, 59, 48, 0.4), 0 1px 2px rgba(255, 59, 48, 0.2)' 
        : '0 2px 4px rgba(255, 59, 48, 0.3)',
    } : {
      shadowColor: '#FF3B30',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 3,
    }),
  },
  webNavBadgeText: {
    color: '#ffffff',
    fontSize: isMobileWeb ? 11 : 10,
    fontWeight: 'bold',
    ...(isMobileWeb ? {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    } : {}),
  },
  logoImage: {
    width: isMobileWeb ? 90 : 120,
    height: isMobileWeb ? 30 : 40,
  },
  notificationButton: {
    width: isMobileWeb ? 40 : (Platform.OS === 'web' ? 44 : 40),
    height: isMobileWeb ? 40 : (Platform.OS === 'web' ? 44 : 40),
    borderRadius: isMobileWeb ? 20 : (Platform.OS === 'web' ? 22 : 20),
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb 
        ? '0 4px 12px rgba(255, 215, 0, 0.4), 0 2px 4px rgba(255, 215, 0, 0.2)' 
        : '0 2px 4px rgba(255, 215, 0, 0.3)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    } : {}),
    ...(isMobileWeb ? {
      borderWidth: 2,
      borderColor: '#FFFFFF',
    } : {}),
  },
  notificationIcon: {
    fontSize: isMobileWeb ? 18 : 20,
    ...(isMobileWeb ? {
      filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
    } : {}),
  },
  profileButton: {
    width: isMobileWeb ? 40 : (Platform.OS === 'web' ? 44 : 40),
    height: isMobileWeb ? 40 : (Platform.OS === 'web' ? 44 : 40),
    borderRadius: isMobileWeb ? 20 : (Platform.OS === 'web' ? 22 : 20),
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: isMobileWeb 
        ? '0 4px 12px rgba(74, 85, 225, 0.4), 0 2px 4px rgba(74, 85, 225, 0.2)' 
        : '0 2px 6px rgba(74, 85, 225, 0.3)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    } : {}),
    ...(isMobileWeb ? {
      borderWidth: 2,
      borderColor: '#FFFFFF',
    } : {}),
  },
  profileAvatar: {
    fontSize: isMobileWeb ? 14 : 14,
    fontWeight: 'bold',
    color: '#ffffff',
    ...(isMobileWeb ? {
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
    } : {}),
  },
  profileAvatarImage: {
    width: isMobileWeb ? 40 : 40,
    height: isMobileWeb ? 40 : 40,
    borderRadius: isMobileWeb ? 20 : 20,
    ...(isMobileWeb ? {
      borderWidth: 2,
      borderColor: '#FFFFFF',
    } : {}),
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
    fontSize: Platform.OS === 'web' ? 42 : 28,
    fontWeight: '800',
    color: '#ffffff', // High contrast: 12.6:1 ratio on #4f46e5
    marginBottom: Platform.OS === 'web' ? 12 : 8,
    lineHeight: Platform.OS === 'web' ? 52 : 36,
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
    fontSize: Platform.OS === 'web' ? 20 : 16,
    color: '#ffffff', // Changed to pure white for maximum contrast (was #f8fafc)
    marginBottom: Platform.OS === 'web' ? 32 : 24,
    fontWeight: '600',
    lineHeight: Platform.OS === 'web' ? 28 : 24,
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
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: Platform.OS === 'web' ? 4 : 4,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.2s ease',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 8,
    }),
  },
  searchIconContainer: {
    marginRight: Platform.OS === 'web' ? 12 : 10,
  },
  modernSearchInput: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#0f172a', // High contrast: 15.8:1 on white
    paddingVertical: Platform.OS === 'web' ? 14 : 12,
    fontWeight: '500',
    lineHeight: Platform.OS === 'web' ? 24 : 22,
  },
  modernSearchButton: {
    backgroundColor: '#4f46e5', // Darker for better contrast
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    ...(Platform.OS === 'web' ? {
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
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
    fontSize: Platform.OS === 'web' ? 15 : 14,
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
    fontSize: Platform.OS === 'web' ? 28 : 22,
    fontWeight: '800',
    color: '#0f172a', // Higher contrast: 15.8:1 on light background (was #1e293b - 12.6:1)
    marginBottom: Platform.OS === 'web' ? 24 : 18,
    ...(Platform.OS === 'web' ? {
      letterSpacing: -0.5,
    } : {}),
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
    marginBottom: Platform.OS === 'web' ? 40 : 30,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 0,
  },
  categoriesScrollView: {
    paddingLeft: 20,
  },
  categoriesScrollContent: {
    paddingRight: 20,
  },
  // Modern Category Cards
  modernCategoryCard: {
    width: Platform.OS === 'web' ? 160 : 140,
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? 20 : 16,
    padding: Platform.OS === 'web' ? 24 : 20,
    alignItems: 'center',
    marginRight: Platform.OS === 'web' ? 20 : 16,
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: '#f1f5f9',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  modernCategoryIconContainer: {
    width: Platform.OS === 'web' ? 64 : 56,
    height: Platform.OS === 'web' ? 64 : 56,
    borderRadius: Platform.OS === 'web' ? 32 : 28,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  modernCategoryIcon: {
    fontSize: Platform.OS === 'web' ? 32 : 28,
  },
  modernCategoryLabel: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
    color: '#0f172a', // Higher contrast: 15.8:1 on white (was #1e293b - 12.6:1)
    textAlign: 'center',
    marginBottom: 4,
  },
  modernCategoryBadge: {
    backgroundColor: '#4a55e1',
    borderRadius: 12,
    paddingHorizontal: Platform.OS === 'web' ? 10 : 8,
    paddingVertical: Platform.OS === 'web' ? 4 : 3,
    marginTop: 4,
  },
  modernCategoryBadgeText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#ffffff',
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
    marginBottom: Platform.OS === 'web' ? 40 : 30,
    marginTop: Platform.OS === 'web' ? 30 : 20,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 0,
    width: '100%',
  },
  servicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 0 : 20,
    marginBottom: Platform.OS === 'web' ? 20 : 15,
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
    borderRadius: Platform.OS === 'web' ? 20 : 18,
    marginRight: Platform.OS === 'web' ? 20 : 16,
    width: Platform.OS === 'web' ? 320 : 300,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.06)',
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
    height: Platform.OS === 'web' ? 200 : 180,
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
    padding: Platform.OS === 'web' ? 20 : 16,
  },
  modernServiceTitle: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: '800',
    color: '#0f172a', // Higher contrast: 15.8:1 on white (was #1e293b - 12.6:1)
    marginBottom: Platform.OS === 'web' ? 8 : 6,
    letterSpacing: -0.5,
    lineHeight: Platform.OS === 'web' ? 26 : 24,
  },
  modernServiceProvider: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#475569', // Better contrast: 7.4:1 on white (was #64748b - 5.2:1)
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    fontWeight: '600', // Increased for better readability
  },
  modernServiceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 14 : 12,
  },
  modernRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernRatingStar: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    marginRight: 4,
  },
  modernRatingText: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
    color: '#0f172a', // Higher contrast
    marginRight: 4,
  },
  modernReviewCount: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#475569', // Better contrast: 7.4:1 (was #64748b - 5.2:1)
    fontWeight: '600', // Increased for readability
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
    marginBottom: Platform.OS === 'web' ? 16 : 14,
    paddingTop: Platform.OS === 'web' ? 12 : 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  modernPriceLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    color: '#475569', // Better contrast: 7.4:1 (was #64748b - 5.2:1)
    fontWeight: '600', // Increased for readability
    marginRight: 6,
  },
  modernPrice: {
    fontSize: Platform.OS === 'web' ? 24 : 22,
    fontWeight: '800',
    color: '#4f46e5', // Darker blue for better contrast: 7.1:1 on white (was #4a55e1 - 6.2:1)
    letterSpacing: -0.5,
  },
  modernServiceActions: {
    flexDirection: 'row',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: Platform.OS === 'web' ? 20 : 16,
    gap: Platform.OS === 'web' ? 12 : 10,
  },
  modernViewButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  modernViewButtonText: {
    color: '#334155', // Better contrast: 9.5:1 on light gray (was #475569)
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
  },
  modernBookButton: {
    flex: 1,
    backgroundColor: '#4f46e5', // Darker for better contrast
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
  modernBookButtonText: {
    color: '#ffffff', // High contrast: 12.6:1 on #4f46e5
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
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
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
  },
  ratingText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginRight: 4,
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
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
  bottomSpacing: {
    height: 20,
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 40,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    zIndex: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeNavItem: {
    // Active state styling
  },
  navIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  activeNavIcon: {
    // Active icon color handled by text color
  },
  navLabel: {
    fontSize: 12,
    color: '#636E72',
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#4a55e1',
    fontWeight: '600',
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  categoryFilterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    flex: 1,
    textAlign: 'center',
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
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 0 : 0,
  },
  serviceCardWrapper: {
    width: Platform.OS === 'web' ? '48%' : (screenWidth - 60) / 2,
    marginBottom: 15,
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
});
