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
  onNavigateToMessages?: () => void;
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
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

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
  onNavigateToEventDetails
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
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryServices, setCategoryServices] = useState<Service[]>([]);
  const [loadingCategory, setLoadingCategory] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const userEmail = user.email || '';
      
      // Helper function to map image URLs
      const mapImageUrl = (s: any) => ({
        ...s,
        primary_image: s.primary_image ? (s.primary_image.startsWith('/uploads/') ? `${getApiBaseUrl()}${s.primary_image}` : s.primary_image) : null
      });

      // Load featured services (high-rated)
      const featuredResp = await fetch(`${getApiBaseUrl()}/api/services?featured=true&limit=5`);
      if (featuredResp.ok) {
        const featuredData = await featuredResp.json();
        setFeaturedServices((featuredData.rows || []).map(mapImageUrl));
      }

      // Load nearby services (you can filter by city later)
      const nearbyResp = await fetch(`${getApiBaseUrl()}/api/services?limit=5`);
      if (nearbyResp.ok) {
        const nearbyData = await nearbyResp.json();
        setNearbyServices((nearbyData.rows || []).map(mapImageUrl));
      }

      // Load category services (preview with limit) and total counts for all categories
      const categories = ['photography', 'venue', 'music', 'catering', 'decoration', 'transportation', 'entertainment', 'planning', 'other'];
      
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
      // Log more details about the network error
      if (error?.message?.includes('Network request failed') || error?.message?.includes('Failed to fetch')) {
        const apiUrl = getApiBaseUrl();
        const isEmulator = Platform.OS === 'android' && apiUrl.includes('10.0.2.2');
        const isPhysicalDevice = !isEmulator && (Platform.OS === 'android' || Platform.OS === 'ios');
        
        console.error('🌐 Network Error Details:');
        console.error('  - API Base URL:', apiUrl);
        console.error('  - Platform:', Platform.OS);
        console.error('  - Error:', error.message);
        
        if (isEmulator) {
          console.error('  - ⚠️  Android Emulator Detected');
          console.error('  - Solution: Make sure your server is running: npm run server');
          console.error('  - Test server: Open http://localhost:3001/api/health in your browser');
          console.error('  - If server is running, check Windows Firewall settings');
        } else if (isPhysicalDevice) {
          console.error('  - ⚠️  Physical Device Detected');
          console.error('  - Solution: Set EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3001 in .env file');
          console.error('  - Find your IP: Run "ipconfig" (Windows) or "ifconfig" (Mac/Linux)');
        } else {
          console.error('  - Solution: Make sure your server is running: npm run server');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services?search=${encodeURIComponent(searchQuery)}`);
      if (resp.ok) {
        const data = await resp.json();
        // Navigate to messages with search results
        onNavigateToMessages?.();
      }
    } catch (error) {
      console.error('Search error:', error);
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
      'catering': '🍽️',
      'decoration': '🎨',
      'entertainment': '🎪',
      'transportation': '🚗',
      'planning': '📋',
      'other': '🎯'
    };
    return icons[category.toLowerCase()] || '🎯';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: { [key: string]: string } = {
      'photography': 'Photography',
      'venue': 'Venues',
      'music': 'Music',
      'catering': 'Catering',
      'decoration': 'Decoration',
      'entertainment': 'Entertainment',
      'transportation': 'Transportation',
      'planning': 'Planning',
      'other': 'Other'
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

  const renderServiceCard = (service: Service, onPress?: () => void) => (
    <View 
      key={service.idservice}
      style={[styles.serviceCard, getShadowStyle(0.1, 4, 2)]}
    >
      <TouchableOpacity 
        onPress={onPress || (() => onNavigateToEventDetails?.(service.idservice.toString()))}
        activeOpacity={0.7}
      >
        <View style={styles.serviceImageContainer}>
          {service.primary_image && (service.primary_image.startsWith('http://') || service.primary_image.startsWith('https://') || service.primary_image.startsWith('data:image')) ? (
            <Image 
              source={{ uri: service.primary_image }} 
              style={styles.serviceImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.serviceEmoji}>{getCategoryIcon(service.s_category)}</Text>
          )}
        </View>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceTitle} numberOfLines={1}>{service.s_name}</Text>
          <Text style={styles.serviceProvider} numberOfLines={1}>{service.provider_name}</Text>
          {(() => {
            const rating = typeof service.s_rating === 'string' 
              ? parseFloat(service.s_rating) 
              : (service.s_rating || 0);
            const reviewCount = service.s_review_count || 0;
            return rating > 0 && !isNaN(rating) ? (
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>⭐ {rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({reviewCount})</Text>
              </View>
            ) : null;
          })()}
          <Text style={styles.servicePrice}>{formatPrice(service.s_base_price)}</Text>
          {service.s_city && (
            <Text style={styles.serviceLocation} numberOfLines={1}>📍 {service.s_city}</Text>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.serviceActions}>
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => onNavigateToEventDetails?.(service.idservice.toString())}
          activeOpacity={0.8}
        >
          <Text style={styles.viewDetailsButtonText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.bookNowButton}
          onPress={() => handleBookNow(service)}
          activeOpacity={0.8}
        >
          <Text style={styles.bookNowButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCategoryCard = (icon: string, label: string, count: number, onPress: () => void) => (
    <TouchableOpacity style={[styles.categoryCard, getShadowStyle(0.1, 4, 2)]} onPress={onPress}>
      <Text style={styles.categoryIcon}>{icon}</Text>
      <Text style={styles.categoryLabel}>{label}</Text>
      {count > 0 && <Text style={styles.categoryCount}>{count} available</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
            <Text style={styles.logoText}>
              <Text style={styles.ePart}>E</Text><Text style={styles.ventPart}>-vent</Text>
            </Text>
          </View>
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

        {/* Search Bar */}
        <View style={[styles.searchContainer, getShadowStyle(0.1, 4, 2)]}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Welcome back, {user.getFullName()}!</Text>
          <Text style={styles.welcomeSubtitle}>Discover amazing events around you</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
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
              <View style={styles.servicesContainer}>
                <FlatList
                  data={categoryServices}
                  numColumns={2}
                  keyExtractor={(item) => item.idservice.toString()}
                  renderItem={({ item }) => (
                    <View style={styles.serviceCardWrapper}>
                      <View style={[styles.serviceCard, styles.serviceCardGrid, getShadowStyle(0.1, 4, 2)]}>
                        <TouchableOpacity 
                          onPress={() => onNavigateToEventDetails?.(item.idservice.toString())}
                          activeOpacity={0.7}
                        >
                          <View style={styles.serviceImageContainer}>
                            {item.primary_image && (item.primary_image.startsWith('http://') || item.primary_image.startsWith('https://') || item.primary_image.startsWith('data:image')) ? (
                              <Image 
                                source={{ uri: item.primary_image }} 
                                style={styles.serviceImage}
                                resizeMode="cover"
                              />
                            ) : (
                              <Text style={styles.serviceEmoji}>{getCategoryIcon(item.s_category)}</Text>
                            )}
                          </View>
                          <View style={styles.serviceInfo}>
                            <Text style={styles.serviceTitle} numberOfLines={1}>{item.s_name}</Text>
                            <Text style={styles.serviceProvider} numberOfLines={1}>{item.provider_name}</Text>
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
                            {item.s_city && (
                              <Text style={styles.serviceLocation} numberOfLines={1}>📍 {item.s_city}</Text>
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
                  )}
                  contentContainerStyle={styles.servicesGrid}
                  columnWrapperStyle={styles.servicesRow}
                  showsVerticalScrollIndicator={false}
                />
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
            {/* Quick Actions */}
            <View style={styles.quickActionsContainer}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <View style={styles.quickActionsGrid}>
                <TouchableOpacity 
                  style={[styles.quickActionButton, getShadowStyle(0.1, 4, 2)]} 
                  onPress={() => {
                    onNavigateToFeatured?.();
                    setActiveTab('messages');
                  }}
                >
                  <Text style={styles.quickActionIcon}>⭐</Text>
                  <Text style={styles.quickActionText}>Featured</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionButton, getShadowStyle(0.1, 4, 2)]} 
                  onPress={() => {
                    onNavigateToNearby?.();
                    setActiveTab('messages');
                  }}
                >
                  <Text style={styles.quickActionIcon}>📍</Text>
                  <Text style={styles.quickActionText}>Nearby</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionButton, getShadowStyle(0.1, 4, 2)]} 
                  onPress={() => {
                    onNavigateToBookings?.();
                    setActiveTab('booking');
                  }}
                >
                  <Text style={styles.quickActionIcon}>📅</Text>
                  <Text style={styles.quickActionText}>My Bookings</Text>
                  {bookingsCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{bookingsCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.quickActionButton, getShadowStyle(0.1, 4, 2)]} 
                  onPress={() => {
                    onNavigateToMessages?.();
                  }}
                >
                  <Text style={styles.quickActionIcon}>💬</Text>
                  <Text style={styles.quickActionText}>Messages</Text>
                  {messagesCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{messagesCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

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
                {['photography', 'venue', 'music', 'catering', 'decoration', 'transportation', 'entertainment', 'planning', 'other'].map((category) => {
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

            {/* Featured Services */}
            {featuredServices.length > 0 && (
              <View style={styles.servicesContainer}>
                <View style={styles.servicesHeader}>
                  <Text style={styles.sectionTitle}>Featured Services</Text>
                  <TouchableOpacity onPress={() => {
                    onNavigateToFeatured?.();
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
                  {featuredServices.slice(0, 5).map(service => renderServiceCard(service))}
                </ScrollView>
              </View>
            )}

            {/* Nearby Services */}
            {nearbyServices.length > 0 && (
              <View style={styles.servicesContainer}>
                <View style={styles.servicesHeader}>
                  <Text style={styles.sectionTitle}>Nearby Services</Text>
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

      {/* Bottom Navigation */}
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
            onNavigateToLikes?.();
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'like' && styles.activeNavIcon]}>❤️</Text>
          <Text style={[styles.navLabel, activeTab === 'like' && styles.activeNavLabel]}>Like</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4a55e1',
  },
  ePart: {
    fontWeight: '400',
  },
  ventPart: {
    fontWeight: '700',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileAvatar: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 5,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#636E72',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 15,
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
    marginBottom: 30,
  },
  categoriesScrollView: {
    paddingLeft: 20,
  },
  categoriesScrollContent: {
    paddingRight: 20,
  },
  categoryCard: {
    width: 120,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginRight: 15,
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
    marginBottom: 30,
  },
  servicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
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
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: 280,
  },
  serviceCardGrid: {
    width: '100%',
    marginRight: 0,
  },
  serviceImageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: '100%',
  },
  serviceEmoji: {
    fontSize: 48,
  },
  serviceInfo: {
    marginBottom: 8,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3436',
    marginBottom: 4,
  },
  serviceProvider: {
    fontSize: 13,
    color: '#636E72',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 13,
    color: '#2D3436',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#636E72',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a55e1',
    marginBottom: 4,
  },
  serviceLocation: {
    fontSize: 12,
    color: '#636E72',
  },
  serviceActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4a55e1',
    marginRight: 8,
  },
  viewDetailsButtonText: {
    color: '#4a55e1',
    fontSize: 14,
    fontWeight: '600',
  },
  bookNowButton: {
    flex: 1,
    backgroundColor: '#4a55e1',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookNowButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
    paddingVertical: 10,
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
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  serviceCardWrapper: {
    width: (screenWidth - 60) / 2,
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
