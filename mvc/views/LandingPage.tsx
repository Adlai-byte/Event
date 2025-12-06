import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getApiBaseUrl } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768;
const isTablet = screenWidth >= 768 && screenWidth < 1024;
const isDesktop = screenWidth >= 1024;
const isLargeDesktop = screenWidth >= 1440;
const isMobileWeb = Platform.OS === 'web' && screenWidth < 768;

interface Service {
  idservice: number;
  s_name: string;
  s_description: string;
  s_category: string;
  s_base_price: number | null;
  s_rating: number | null;
  s_review_count: number | null;
  primary_image?: string | null;
  provider_name?: string;
}

interface LandingPageProps {
  onLogin: () => void;
  onRegister: () => void;
  onNavigateToService?: (serviceId: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin, onRegister, onNavigateToService }) => {
  const [activeTab, setActiveTab] = useState<'popular' | 'latest'>('popular');
  const [activeNav, setActiveNav] = useState<'home' | 'services' | 'events' | 'about' | 'contact'>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [featuredService, setFeaturedService] = useState<Service | null>(null);
  const [trendingServices, setTrendingServices] = useState<Service[]>([]);
  const [entertainmentServices, setEntertainmentServices] = useState<Service[]>([]);
  const [categoryServices, setCategoryServices] = useState<{ [key: string]: Service[] }>({});
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [sectionPositions, setSectionPositions] = useState<{ [key: string]: number }>({});
  
  const scrollViewRef = useRef<ScrollView>(null);
  const homeRef = useRef<View>(null);
  const servicesRef = useRef<View>(null);
  const eventsRef = useRef<View>(null);
  const aboutRef = useRef<View>(null);
  const contactRef = useRef<View>(null);

  const categories = ['venue', 'catering', 'photography', 'music', 'decoration', 'transportation'];

  // Map image URLs
  const mapImageUrl = (service: any): Service => ({
    ...service,
    primary_image: service.primary_image 
      ? (service.primary_image.startsWith('/uploads/') 
          ? `${getApiBaseUrl()}${service.primary_image}` 
          : service.primary_image)
      : null
  });

  // Load featured service (highest rated)
  const loadFeaturedService = async () => {
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services?highRated=true&limit=1`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && data.rows && data.rows.length > 0) {
          setFeaturedService(mapImageUrl(data.rows[0]));
        }
      }
    } catch (error) {
      console.error('Error loading featured service:', error);
    }
  };

  // Load trending services
  const loadTrendingServices = async () => {
    try {
      const endpoint = activeTab === 'popular' 
        ? `${getApiBaseUrl()}/api/services?highRated=true&limit=5`
        : `${getApiBaseUrl()}/api/services?limit=5`;
      
      const resp = await fetch(endpoint);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          setTrendingServices(data.rows.map(mapImageUrl));
        }
      }
    } catch (error) {
      console.error('Error loading trending services:', error);
    }
  };

  // Load entertainment/news services (mix of categories)
  const loadEntertainmentServices = async () => {
    try {
      const categories = ['venue', 'catering', 'photography'];
      const promises = categories.map(cat => 
        fetch(`${getApiBaseUrl()}/api/services?category=${cat}&limit=1`)
      );
      
      const responses = await Promise.all(promises);
      const services: Service[] = [];
      
      for (const resp of responses) {
        if (resp.ok) {
          const data = await resp.json();
          if (data.ok && data.rows && data.rows.length > 0) {
            services.push(mapImageUrl(data.rows[0]));
          }
        }
      }
      
      setEntertainmentServices(services);
    } catch (error) {
      console.error('Error loading entertainment services:', error);
    }
  };

  // Load category services
  const loadCategoryServices = async () => {
    try {
      const promises = categories.map(cat => 
        fetch(`${getApiBaseUrl()}/api/services?category=${cat}&limit=3`)
      );
      
      const responses = await Promise.all(promises);
      const categoryData: { [key: string]: Service[] } = {};
      
      responses.forEach((resp, index) => {
        if (resp.ok) {
          resp.json().then(data => {
            if (data.ok && Array.isArray(data.rows)) {
              categoryData[categories[index]] = data.rows.map(mapImageUrl);
              setCategoryServices(prev => ({ ...prev, ...categoryData }));
            }
          });
        }
      });
    } catch (error) {
      console.error('Error loading category services:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadFeaturedService(),
        loadTrendingServices(),
        loadEntertainmentServices(),
        loadCategoryServices()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, []);

  // Reload trending when tab changes
  useEffect(() => {
    loadTrendingServices();
  }, [activeTab]);

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // Reset to show all services
      loadTrendingServices();
      return;
    }

    setSearchLoading(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services?search=${encodeURIComponent(searchQuery)}&limit=10`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          setTrendingServices(data.rows.map(mapImageUrl));
        }
      }
    } catch (error) {
      console.error('Error searching services:', error);
      Alert.alert('Error', 'Failed to search services. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle category filter
  const handleCategoryFilter = async (category: string) => {
    if (selectedCategory === category) {
      // Deselect category
      setSelectedCategory(null);
      loadTrendingServices();
      return;
    }

    setSelectedCategory(category);
    setSearchLoading(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services?category=${encodeURIComponent(category)}&limit=10`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          setTrendingServices(data.rows.map(mapImageUrl));
        }
      }
    } catch (error) {
      console.error('Error filtering by category:', error);
      Alert.alert('Error', 'Failed to filter services. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle service click
  const handleServiceClick = (serviceId: number) => {
    if (onNavigateToService) {
      onNavigateToService(serviceId.toString());
    } else {
      Alert.alert('Please Login', 'You need to login to view service details.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: onLogin }
      ]);
    }
  };

  // Format price
  const formatPrice = (price: number | null | undefined) => {
    const numPrice = Number(price) || 0;
    return `₱${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  // Handle section layout to track positions
  const handleSectionLayout = (section: string, event: any) => {
    const { y } = event.nativeEvent.layout;
    setSectionPositions(prev => ({ ...prev, [section]: y }));
  };

  // Handle navigation
  const handleNavClick = (navItem: 'home' | 'services' | 'events' | 'about' | 'contact') => {
    setActiveNav(navItem);
    
    // Handle specific navigation actions
    if (navItem === 'services') {
      // Load all services if not already loaded
      if (allServices.length === 0) {
        loadAllServices();
      }
    } else if (navItem === 'events') {
      // Reload entertainment services
      loadEntertainmentServices();
    }
    
    // Scroll to section
    setTimeout(() => {
      if (navItem === 'home') {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      } else {
        const position = sectionPositions[navItem];
        if (position !== undefined) {
          scrollViewRef.current?.scrollTo({ y: position - 100, animated: true });
        }
      }
    }, 100);
  };

  // Load all services for Services section
  const loadAllServices = async () => {
    setSearchLoading(true);
    try {
      const resp = await fetch(`${getApiBaseUrl()}/api/services?limit=20`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.rows)) {
          setAllServices(data.rows.map(mapImageUrl));
        }
      }
    } catch (error) {
      console.error('Error loading all services:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      {/* Background Design Elements */}
      <View style={styles.backgroundContainer}>
        <View style={styles.backgroundGradient} />
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        <View style={styles.backgroundCircle3} />
        <View style={styles.backgroundCircle4} />
        <View style={styles.backgroundCircle5} />
        <View style={styles.backgroundPattern} />
        <View style={styles.backgroundAccent1} />
        <View style={styles.backgroundAccent2} />
      </View>
      
    <ScrollView 
      ref={scrollViewRef}
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
    >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarText}>Plan your perfect event with E-VENT</Text>
          <View style={styles.topBarRight}>
            <TouchableOpacity onPress={onLogin} style={styles.topBarLink}>
              <Text style={styles.topBarLinkText}>Account</Text>
            </TouchableOpacity>
          </View>
        </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
            {/* Search Bar on Left */}
            <View style={styles.searchBarContainer}>
              <TouchableOpacity onPress={handleSearch} style={styles.searchIconButton}>
                <Text style={styles.searchIcon}>🔍</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.searchInput}
                placeholder="Search events, services..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>

            {/* Logo in Center */}
            <View style={styles.logoSection}>
              <Text style={styles.logo}>E-VENT</Text>
        </View>

            {/* Navigation on Right */}
            <View style={styles.headerNav}>
          <TouchableOpacity 
                style={[styles.headerNavItem, activeNav === 'home' && styles.headerNavItemActive]}
            onPress={() => handleNavClick('home')}
          >
                <Text style={[styles.headerNavText, activeNav === 'home' && styles.headerNavTextActive]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity 
                style={[styles.headerNavItem, activeNav === 'services' && styles.headerNavItemActive]}
            onPress={() => handleNavClick('services')}
          >
                <Text style={[styles.headerNavText, activeNav === 'services' && styles.headerNavTextActive]}>Services</Text>
          </TouchableOpacity>
          <TouchableOpacity 
                style={[styles.headerNavItem, activeNav === 'events' && styles.headerNavItemActive]}
            onPress={() => handleNavClick('events')}
          >
                <Text style={[styles.headerNavText, activeNav === 'events' && styles.headerNavTextActive]}>Events</Text>
          </TouchableOpacity>
          <TouchableOpacity 
                style={[styles.headerNavItem, activeNav === 'about' && styles.headerNavItemActive]}
            onPress={() => handleNavClick('about')}
          >
                <Text style={[styles.headerNavText, activeNav === 'about' && styles.headerNavTextActive]}>About</Text>
          </TouchableOpacity>
          <TouchableOpacity 
                style={[styles.headerNavItem, activeNav === 'contact' && styles.headerNavItemActive]}
            onPress={() => handleNavClick('contact')}
          >
                <Text style={[styles.headerNavText, activeNav === 'contact' && styles.headerNavTextActive]}>Contact</Text>
          </TouchableOpacity>
            </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Home Section */}
        <View 
          ref={homeRef}
          onLayout={(e) => handleSectionLayout('home', e)}
        >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4a55e1" />
            <Text style={styles.loadingText}>Loading amazing services...</Text>
          </View>
        ) : (
          <>
            {/* Hero Section - ModernWood Style */}
            <View style={styles.heroSection}>
              <View style={styles.heroContent}>
                <View style={styles.heroTextContainer}>
                  <Text style={styles.heroBadge}>Bestseller 2024</Text>
                  <Text style={styles.heroTitle}>
                    {featuredService?.s_name || "Stylish Event Services for Your Special Occasions"}
                  </Text>
                  <Text style={styles.heroDescription}>
                    {featuredService?.s_description || "Your one-stop platform for booking venues, catering, photography, and more for your special occasions."}
                  </Text>
                <TouchableOpacity 
                    style={styles.heroCTA}
                    onPress={() => featuredService ? handleServiceClick(featuredService.idservice) : onRegister()}
                >
                    <Text style={styles.heroCTAText}>See More</Text>
                  </TouchableOpacity>
                    </View>
                <View style={styles.heroImages}>
                    {featuredService?.primary_image ? (
                      <Image 
                        source={{ uri: featuredService.primary_image }} 
                      style={styles.heroImage1 as any}
                        resizeMode="cover"
                      />
                    ) : (
                    <View style={[styles.heroImage1, styles.heroImagePlaceholder]}>
                      <Text style={styles.heroImageText}>Featured Service</Text>
                      </View>
                    )}
                  {trendingServices.length > 0 && trendingServices[0]?.primary_image ? (
                    <Image 
                      source={{ uri: trendingServices[0].primary_image }} 
                      style={styles.heroImage2 as any}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.heroImage2, styles.heroImagePlaceholder]}>
                      <Text style={styles.heroImageText}>Service</Text>
                  </View>
                        )}
                      </View>
                  </View>
              </View>

            {/* Main Content with Sidebar - ModernWood Style */}
            <View style={styles.contentWithSidebar}>
              {/* Main Content Area */}
              <View style={styles.mainContentArea}>
                {/* Recommended Products Section */}
                <View style={styles.recommendedSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.recommendedTitle}>Recommended Services</Text>
                    <Text style={styles.recommendedSubtitle}>
                      Discover our handpicked selection of premium event services
                    </Text>
                </View>
                  
                    {trendingServices.length > 0 ? (
                    <View style={styles.servicesGrid}>
                      {trendingServices.slice(0, 6).map((service) => (
                        <TouchableOpacity 
                          key={service.idservice} 
                          style={styles.serviceCard}
                          onPress={() => handleServiceClick(service.idservice)}
                        >
                            {service.primary_image ? (
                              <Image 
                                source={{ uri: service.primary_image }} 
                              style={styles.serviceCardImage as any}
                                resizeMode="cover"
                              />
                            ) : (
                            <View style={styles.serviceCardImagePlaceholder}>
                              <Text style={styles.serviceCardImageText}>
                                {service.s_name.charAt(0)}
                              </Text>
                          </View>
                          )}
                          <View style={styles.serviceCardContent}>
                            <Text style={styles.serviceCardPrice}>
                              {formatPrice(service.s_base_price || 0)}
                            </Text>
                            <Text style={styles.serviceCardTitle} numberOfLines={2}>
                              {service.s_name}
                            </Text>
                            <Text style={styles.serviceCardBrand}>
                              {service.provider_name || 'Premium Provider'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                    ) : (
                    <Text style={styles.emptyText}>No services available</Text>
                  )}
                </View>
              </View>

              {/* Right Sidebar - ModernWood Style */}
              <View style={styles.sidebar}>
                {/* Promotional Image */}
                <View style={styles.sidebarPromoImage}>
                  {trendingServices.length > 0 && trendingServices[0]?.primary_image ? (
                    <Image 
                      source={{ uri: trendingServices[0].primary_image }} 
                      style={styles.sidebarImage as any}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.sidebarImagePlaceholder}>
                      <Text style={styles.sidebarImageText}>Event Setup</Text>
                  </View>
                )}
                </View>

                {/* Promotional Section */}
                <View style={styles.sidebarPromo}>
                  <Text style={styles.sidebarPromoTitle}>Premium Event Services</Text>
                  <Text style={styles.sidebarPromoText}>
                    Discover our curated selection of professional event services. From venues to catering, we have everything you need for your special occasion.
                  </Text>
                  <TouchableOpacity style={styles.sidebarPromoButton} onPress={onRegister}>
                    <Text style={styles.sidebarPromoButtonText}>Learn More</Text>
                  </TouchableOpacity>
                </View>

                {/* Service Features */}
                <View style={styles.sidebarFeatures}>
                  <View style={styles.sidebarFeature}>
                    <Text style={styles.sidebarFeatureIcon}>🛠️</Text>
                    <View style={styles.sidebarFeatureContent}>
                      <Text style={styles.sidebarFeatureTitle}>24/7 Support</Text>
                      <Text style={styles.sidebarFeatureText}>
                        Our team is available around the clock to assist you with your event planning needs.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sidebarFeature}>
                    <Text style={styles.sidebarFeatureIcon}>🛡️</Text>
                    <View style={styles.sidebarFeatureContent}>
                      <Text style={styles.sidebarFeatureTitle}>Best Price Guarantee</Text>
                      <Text style={styles.sidebarFeatureText}>
                        We guarantee the best prices for all our services. Find a better price? We'll match it.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Newsletter Section */}
                <View style={styles.sidebarNewsletter}>
                  <Text style={styles.sidebarNewsletterTitle}>Get -20% on Your First Booking</Text>
                  <Text style={styles.sidebarNewsletterSubtitle}>
                    Subscribe to our newsletter and receive exclusive discounts
                  </Text>
                  <View style={styles.sidebarNewsletterForm}>
                    <TextInput
                      style={styles.sidebarNewsletterInput}
                      placeholder="Your email address"
                      placeholderTextColor="#94A3B8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity style={styles.sidebarNewsletterButton} onPress={onRegister}>
                      <Text style={styles.sidebarNewsletterButtonText}>Subscribe</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>

            {/* Entertainment Section */}
            <View style={styles.entertainmentSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Entertainment & News</Text>
              </View>
              {entertainmentServices.length > 0 ? (
                <View style={styles.articlesGrid}>
                  {entertainmentServices.map((service) => (
                    <TouchableOpacity 
                      key={service.idservice} 
                      style={styles.articleCard}
                      onPress={() => handleServiceClick(service.idservice)}
                    >
                      {service.primary_image ? (
                        <Image 
                          source={{ uri: service.primary_image }} 
                          style={styles.articleImage as any}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.articleImagePlaceholder}>
                          <Text style={styles.articleImageText}>
                            {service.s_category.charAt(0).toUpperCase() + service.s_category.slice(1)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.articleCardContent}>
                        <Text style={styles.articleCardTitle} numberOfLines={2}>{service.s_name}</Text>
                        <View style={styles.articleCardMeta}>
                          <Text style={styles.articleCardPrice}>
                            {formatPrice(service.s_base_price || 0)}
                          </Text>
                          {service.s_rating && 
                           typeof service.s_rating === 'number' && 
                           service.s_rating > 0 && (
                            <Text style={styles.articleCardRating}>
                              ⭐ {Number(service.s_rating).toFixed(1)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>No services available</Text>
              )}
            </View>

            {/* Services Section */}
            <View 
              ref={servicesRef} 
              style={styles.categoriesSection}
              onLayout={(e) => handleSectionLayout('services', e)}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>All Services</Text>
              </View>
              {activeNav === 'services' && allServices.length > 0 ? (
                <View style={styles.servicesGrid}>
                  {allServices.map((service) => (
                    <TouchableOpacity 
                      key={service.idservice} 
                      style={styles.serviceCard}
                      onPress={() => handleServiceClick(service.idservice)}
                    >
                      {service.primary_image ? (
                        <Image 
                          source={{ uri: service.primary_image }} 
                          style={styles.serviceCardImage as any}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.serviceCardImagePlaceholder}>
                          <Text style={styles.serviceCardImageText}>
                            {service.s_category.charAt(0).toUpperCase() + service.s_category.slice(1)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.serviceCardContent}>
                        <Text style={styles.serviceCardTitle} numberOfLines={2}>{service.s_name}</Text>
                        <Text style={styles.serviceCardDescription} numberOfLines={2}>
                          {service.s_description}
                        </Text>
                        <View style={styles.serviceCardMeta}>
                          <Text style={styles.serviceCardPrice}>
                            {formatPrice(service.s_base_price || 0)}
                          </Text>
                          {service.s_rating && service.s_rating > 0 && (
                            <Text style={styles.serviceCardRating}>
                              ⭐ {Number(service.s_rating).toFixed(1)}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <>
                  <View style={styles.categoriesGrid}>
                    {categories.map((category) => (
                      <TouchableOpacity 
                        key={category} 
                        style={[
                          styles.categoryCard,
                          selectedCategory === category && styles.categoryCardActive
                        ]}
                        onPress={() => handleCategoryFilter(category)}
                      >
                        <Text style={[
                          styles.categoryText,
                          selectedCategory === category && styles.categoryTextActive
                        ]}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </Text>
                        {categoryServices[category] && categoryServices[category].length > 0 && (
                          <Text style={styles.categoryCount}>
                            {categoryServices[category].length} services
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {activeNav === 'services' && (
                    <TouchableOpacity 
                      style={styles.loadMoreButton}
                      onPress={loadAllServices}
                    >
                      <Text style={styles.loadMoreButtonText}>View All Services</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>

            {/* Events Section */}
            <View 
              ref={eventsRef} 
              style={styles.eventsSection}
              onLayout={(e) => handleSectionLayout('events', e)}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
              </View>
              <View style={styles.eventsContent}>
                <Text style={styles.eventsDescription}>
                  Discover exciting events happening near you. From weddings to corporate gatherings, 
                  find the perfect event for your occasion.
                </Text>
                <View style={styles.eventsGrid}>
                  {entertainmentServices.length > 0 ? (
                    entertainmentServices.map((service) => (
                      <TouchableOpacity 
                        key={service.idservice} 
                        style={styles.eventCard}
                        onPress={() => handleServiceClick(service.idservice)}
                      >
                        {service.primary_image ? (
                          <Image 
                            source={{ uri: service.primary_image }} 
                            style={styles.eventCardImage as any}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.eventCardImagePlaceholder}>
                            <Text style={styles.eventCardImageText}>Event</Text>
                          </View>
                        )}
                        <View style={styles.eventCardContent}>
                          <Text style={styles.eventCardTitle} numberOfLines={2}>
                            {service.s_name}
                          </Text>
                          <Text style={styles.eventCardCategory}>
                            {service.s_category.charAt(0).toUpperCase() + service.s_category.slice(1)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No events available at the moment</Text>
                  )}
                </View>
              </View>
            </View>

            {/* About Section */}
            <View 
              ref={aboutRef} 
              style={styles.aboutSection}
              onLayout={(e) => handleSectionLayout('about', e)}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>About E-VENT</Text>
              </View>
              <View style={styles.aboutContent}>
                <Text style={styles.aboutText}>
                  E-VENT is your trusted partner for planning and organizing memorable events. 
                  We connect you with the best service providers in the industry, from venues 
                  and catering to photography and entertainment.
                </Text>
                <View style={styles.aboutFeatures}>
                  <View style={styles.aboutFeature}>
                    <Text style={styles.aboutFeatureIcon}>🎯</Text>
                    <Text style={styles.aboutFeatureTitle}>Wide Selection</Text>
                    <Text style={styles.aboutFeatureText}>
                      Choose from hundreds of verified service providers
                    </Text>
                  </View>
                  <View style={styles.aboutFeature}>
                    <Text style={styles.aboutFeatureIcon}>⭐</Text>
                    <Text style={styles.aboutFeatureTitle}>Quality Assured</Text>
                    <Text style={styles.aboutFeatureText}>
                      All services are rated and reviewed by real customers
                    </Text>
                  </View>
                  <View style={styles.aboutFeature}>
                    <Text style={styles.aboutFeatureIcon}>💳</Text>
                    <Text style={styles.aboutFeatureTitle}>Easy Booking</Text>
                    <Text style={styles.aboutFeatureText}>
                      Simple and secure booking process
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Contact Section */}
            <View 
              ref={contactRef} 
              style={styles.contactSection}
              onLayout={(e) => handleSectionLayout('contact', e)}
            >
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Contact Us</Text>
              </View>
              <View style={styles.contactContent}>
                <Text style={styles.contactDescription}>
                  Have questions? We're here to help! Get in touch with us through any of the following:
                </Text>
                <View style={styles.contactInfo}>
                  <View style={styles.contactItem}>
                    <Text style={styles.contactIcon}>📧</Text>
                    <Text style={styles.contactLabel}>Email</Text>
                    <Text style={styles.contactValue}>support@e-vent.com</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Text style={styles.contactIcon}>📱</Text>
                    <Text style={styles.contactLabel}>Phone</Text>
                    <Text style={styles.contactValue}>+63 123 456 7890</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Text style={styles.contactIcon}>📍</Text>
                    <Text style={styles.contactLabel}>Address</Text>
                    <Text style={styles.contactValue}>City of Mati, Davao Oriental, Philippines</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.contactButton} onPress={onRegister}>
                  <Text style={styles.contactButtonText}>Get Started Today</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Call to Action */}
            <View style={styles.ctaSection}>
              <Text style={styles.ctaTitle}>Ready to Plan Your Event?</Text>
              <Text style={styles.ctaDescription}>Join thousands of users who trust us for their special occasions</Text>
              <View style={styles.ctaButtons}>
                <TouchableOpacity style={styles.ctaButtonPrimary} onPress={onRegister}>
                  <Text style={styles.ctaButtonText}>Get Started</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ctaButtonSecondary} onPress={onLogin}>
                  <Text style={styles.ctaButtonTextSecondary}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
        </View>
      </View>

      {/* Footer - ModernWood Style */}
      <View style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerColumn}>
            <Text style={styles.footerColumnTitle}>About Us</Text>
            <TouchableOpacity onPress={() => handleNavClick('about')}>
              <Text style={styles.footerLink}>Our Story</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleNavClick('about')}>
              <Text style={styles.footerLink}>Our Team</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleNavClick('contact')}>
              <Text style={styles.footerLink}>Contact Us</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footerColumn}>
            <Text style={styles.footerColumnTitle}>My Account</Text>
            <TouchableOpacity onPress={onLogin}>
              <Text style={styles.footerLink}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onRegister}>
              <Text style={styles.footerLink}>Register</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleNavClick('services')}>
              <Text style={styles.footerLink}>My Bookings</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footerColumn}>
            <Text style={styles.footerColumnTitle}>Services</Text>
            <TouchableOpacity onPress={() => handleNavClick('services')}>
              <Text style={styles.footerLink}>All Services</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleNavClick('events')}>
              <Text style={styles.footerLink}>Events</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleNavClick('services')}>
              <Text style={styles.footerLink}>Categories</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.footerColumn}>
            <Text style={styles.footerColumnTitle}>Support</Text>
            <TouchableOpacity onPress={() => handleNavClick('contact')}>
              <Text style={styles.footerLink}>Help Center</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleNavClick('contact')}>
              <Text style={styles.footerLink}>FAQs</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleNavClick('about')}>
              <Text style={styles.footerLink}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.footerBottom}>
        <Text style={styles.footerText}>© 2025 E-VENT. All rights reserved.</Text>
        </View>
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
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
    backgroundColor: '#F0F4FF',
  },
  backgroundCircle1: {
    position: 'absolute',
    width: isDesktop ? 500 : 350,
    height: isDesktop ? 500 : 350,
    borderRadius: isDesktop ? 250 : 175,
    backgroundColor: 'rgba(74, 85, 225, 0.15)',
    top: -150,
    right: -150,
    ...(Platform.OS === 'web' && {
      filter: 'blur(80px)',
    }),
  },
  backgroundCircle2: {
    position: 'absolute',
    width: isDesktop ? 450 : 300,
    height: isDesktop ? 450 : 300,
    borderRadius: isDesktop ? 225 : 150,
    backgroundColor: 'rgba(254, 243, 199, 0.6)',
    bottom: isDesktop ? 150 : 100,
    left: -100,
    ...(Platform.OS === 'web' && {
      filter: 'blur(70px)',
    }),
  },
  backgroundCircle3: {
    position: 'absolute',
    width: isDesktop ? 400 : 280,
    height: isDesktop ? 400 : 280,
    borderRadius: isDesktop ? 200 : 140,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    top: isDesktop ? '35%' : '30%',
    right: isDesktop ? 30 : 10,
    ...(Platform.OS === 'web' && {
      filter: 'blur(60px)',
    }),
  },
  backgroundCircle4: {
    position: 'absolute',
    width: isDesktop ? 320 : 220,
    height: isDesktop ? 320 : 220,
    borderRadius: isDesktop ? 160 : 110,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    top: isDesktop ? '60%' : '55%',
    left: isDesktop ? 100 : 50,
    ...(Platform.OS === 'web' && {
      filter: 'blur(55px)',
    }),
  },
  backgroundCircle5: {
    position: 'absolute',
    width: isDesktop ? 380 : 260,
    height: isDesktop ? 380 : 260,
    borderRadius: isDesktop ? 190 : 130,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    bottom: isDesktop ? 300 : 200,
    right: isDesktop ? 200 : 100,
    ...(Platform.OS === 'web' && {
      filter: 'blur(65px)',
    }),
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.06,
    ...(Platform.OS === 'web' && {
      backgroundImage: `
        radial-gradient(circle at 20% 30%, rgba(74, 85, 225, 0.12) 0%, transparent 50%),
        radial-gradient(circle at 80% 70%, rgba(254, 243, 199, 0.18) 0%, transparent 50%),
        radial-gradient(circle at 40% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 2px 2px, rgba(74, 85, 225, 0.12) 1px, transparent 0)
      `,
      backgroundSize: '100% 100%, 100% 100%, 100% 100%, 50px 50px',
    }),
  },
  backgroundAccent1: {
    position: 'absolute',
    width: isDesktop ? 200 : 150,
    height: isDesktop ? 200 : 150,
    borderRadius: isDesktop ? 100 : 75,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    top: isDesktop ? '20%' : '15%',
    left: isDesktop ? '15%' : '10%',
    ...(Platform.OS === 'web' && {
      filter: 'blur(50px)',
    }),
  },
  backgroundAccent2: {
    position: 'absolute',
    width: isDesktop ? 250 : 180,
    height: isDesktop ? 250 : 180,
    borderRadius: isDesktop ? 125 : 90,
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    bottom: isDesktop ? '25%' : '20%',
    right: isDesktop ? '20%' : '15%',
    ...(Platform.OS === 'web' && {
      filter: 'blur(55px)',
    }),
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    maxWidth: isLargeDesktop ? 1600 : isDesktop ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
    backgroundColor: 'transparent',
  },
  topBar: {
    backgroundColor: '#F1F5F9',
    paddingVertical: isMobile || isMobileWeb ? 8 : 10,
    paddingHorizontal: isMobile || isMobileWeb ? 16 : isDesktop ? 60 : 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  topBarText: {
    fontSize: isMobile ? 12 : 13,
    color: '#64748B',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  topBarLink: {
    paddingVertical: 4,
  },
  topBarLinkText: {
    fontSize: isMobile ? 12 : 13,
    color: '#4a55e1',
    fontWeight: '500',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: isMobile || isMobileWeb ? 12 : 16,
    ...(isDesktop && Platform.OS === 'web' && !isMobileWeb ? {
      position: 'sticky' as any,
      top: 0,
      zIndex: 1000,
    } : {}),
  },
  headerContent: {
    flexDirection: isMobile || isMobileWeb ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: isMobile || isMobileWeb ? 16 : isDesktop ? 60 : 40,
    gap: isMobile || isMobileWeb ? 16 : 24,
    maxWidth: isLargeDesktop ? 1600 : isDesktop ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: isMobile || isMobileWeb ? 1 : 0.3,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: isMobileWeb ? 36 : 40,
  },
  searchIconButton: {
    paddingRight: 8,
  },
  searchIcon: {
    fontSize: 18,
    color: '#64748B',
  },
  logoSection: {
    flex: isMobile ? 1 : 0.4,
    alignItems: 'center',
  },
  logo: {
    fontSize: isMobile || isMobileWeb ? 28 : isDesktop ? 32 : 30,
    fontWeight: '900',
    color: '#1E293B',
    letterSpacing: 2,
  },
  headerNav: {
    flex: isMobile || isMobileWeb ? 1 : 0.3,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: isMobile || isMobileWeb ? 8 : 16,
    flexWrap: 'wrap',
  },
  headerNavItem: {
    paddingVertical: 6,
    paddingHorizontal: isMobile || isMobileWeb ? 8 : 12,
  },
  headerNavItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#4a55e1',
  },
  headerNavText: {
    fontSize: isMobile ? 13 : 14,
    color: '#64748B',
    fontWeight: '500',
  },
  headerNavTextActive: {
    color: '#4a55e1',
    fontWeight: '600',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    padding: 0,
  },
  // Hero Section - ModernWood Style
  heroSection: {
    paddingHorizontal: isMobile || isMobileWeb ? 16 : isDesktop ? 60 : 40,
    paddingVertical: isMobile || isMobileWeb ? 40 : isDesktop ? 60 : 50,
    backgroundColor: '#FFFFFF',
    maxWidth: isLargeDesktop ? 1600 : isDesktop ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  heroContent: {
    flexDirection: isMobile || isMobileWeb ? 'column' : 'row',
    alignItems: 'center',
    gap: isMobile || isMobileWeb ? 24 : isDesktop ? 40 : 32,
  },
  heroTextContainer: {
    flex: isMobile ? 1 : 1,
  },
  heroBadge: {
    fontSize: isMobile ? 12 : 14,
    color: '#4a55e1',
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: isMobile || isMobileWeb ? 32 : isDesktop ? 48 : 40,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    lineHeight: isMobile || isMobileWeb ? 40 : isDesktop ? 56 : 48,
  },
  heroDescription: {
    fontSize: isMobile || isMobileWeb ? 16 : 18,
    color: '#64748B',
    lineHeight: isMobile || isMobileWeb ? 24 : 28,
    marginBottom: 24,
  },
  heroCTA: {
    alignSelf: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#4a55e1',
    borderRadius: 8,
  },
  heroCTAText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  heroImages: {
    flex: isMobile ? 1 : 1,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  heroImage1: {
    width: isMobile ? '100%' : isDesktop ? 280 : 240,
    height: isMobile ? 200 : isDesktop ? 350 : 300,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  heroImage2: {
    width: isMobile ? '100%' : isDesktop ? 240 : 200,
    height: isMobile ? 180 : isDesktop ? 320 : 280,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    marginTop: isMobile ? 0 : 40,
  },
  heroImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a55e1',
  },
  heroImageText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  // Content with Sidebar Layout
  contentWithSidebar: {
    flexDirection: isMobile ? 'column' : 'row',
    paddingHorizontal: isMobile ? 16 : isDesktop ? 60 : 40,
    paddingVertical: isMobile ? 32 : isDesktop ? 48 : 32,
    gap: isMobile ? 24 : isDesktop ? 32 : 24,
    maxWidth: isLargeDesktop ? 1600 : isDesktop ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  mainContentArea: {
    flex: isMobile ? 1 : 2,
  },
  recommendedSection: {
    marginBottom: isMobile ? 32 : isDesktop ? 48 : 40,
  },
  recommendedTitle: {
    fontSize: isMobile ? 28 : isDesktop ? 36 : 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  recommendedSubtitle: {
    fontSize: isMobile ? 14 : 16,
    color: '#64748B',
    marginBottom: 24,
  },
  mainContent: {
    paddingHorizontal: isMobile ? 16 : isDesktop ? 60 : 40,
    paddingVertical: isMobile ? 32 : isDesktop ? 48 : 32,
    maxWidth: isLargeDesktop ? 1600 : isDesktop ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  featuredSection: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? 16 : isDesktop ? 32 : 24,
    marginBottom: isMobile ? 32 : isDesktop ? 64 : 48,
  },
  featuredCard: {
    flex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    ...(Platform.OS !== 'web' && {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    }),
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }),
  },
  featuredImageContainer: {
    position: 'relative',
    height: isMobile ? 200 : 300,
    backgroundColor: '#4a55e1',
  },
  featuredTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    zIndex: 1,
  },
  featuredTagText: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredImageText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  featuredContent: {
    padding: 24,
  },
  featuredTitle: {
    fontSize: isMobile ? 24 : 32,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  featuredDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 16,
  },
  featuredMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  featuredPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4a55e1',
  },
  featuredRating: {
    fontSize: 14,
    color: '#64748B',
  },
  exploreButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#4a55e1',
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sidebar: {
    flex: isMobile ? 1 : 0.4,
    minWidth: isMobile ? '100%' : isDesktop ? 320 : 280,
  },
  sidebarPromoImage: {
    width: '100%',
    height: isMobile ? 200 : isDesktop ? 250 : 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#E2E8F0',
  },
  sidebarImage: {
    width: '100%',
    height: '100%',
  },
  sidebarImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4a55e1',
  },
  sidebarImageText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  sidebarPromo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sidebarPromoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  sidebarPromoText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  sidebarPromoButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4a55e1',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sidebarPromoButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarFeatures: {
    gap: 16,
    marginBottom: 20,
  },
  sidebarFeature: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sidebarFeatureIcon: {
    fontSize: 24,
  },
  sidebarFeatureContent: {
    flex: 1,
  },
  sidebarFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  sidebarFeatureText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  sidebarNewsletter: {
    backgroundColor: '#4a55e1',
    borderRadius: 12,
    padding: 24,
  },
  sidebarNewsletterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  sidebarNewsletterSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  sidebarNewsletterForm: {
    gap: 12,
  },
  sidebarNewsletterInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1E293B',
  },
  sidebarNewsletterButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  sidebarNewsletterButtonText: {
    color: '#4a55e1',
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarHeader: {
    marginBottom: 16,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  tabActive: {
    backgroundColor: '#4a55e1',
  },
  tabText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sidebarLoading: {
    padding: 20,
    alignItems: 'center',
  },
  articleList: {
    gap: 16,
  },
  articleItem: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  articleThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  articleThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  articleThumbnailText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  articleInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  articleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  articleCategory: {
    fontSize: 12,
    color: '#64748B',
  },
  entertainmentSection: {
    marginBottom: 48,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: isMobile ? 24 : 28,
    fontWeight: '700',
    color: '#1E293B',
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    borderRadius: 6,
  },
  articlesGrid: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? 16 : isDesktop ? 24 : 20,
    flexWrap: 'wrap',
    justifyContent: isDesktop ? 'flex-start' : 'center',
  },
  articleCard: {
    ...(isMobile ? { flex: 1 } : {}),
    ...(Platform.OS === 'web' && !isMobile ? {
      width: (isDesktop ? 'calc(33.333% - 16px)' : 'calc(50% - 12px)') as any,
    } : {}),
    minWidth: isMobile ? '100%' : isDesktop ? 300 : 280,
    maxWidth: isMobile ? '100%' : isDesktop ? 380 : 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    ...(Platform.OS !== 'web' && {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    }),
    ...(Platform.OS === 'web' && {
      boxShadow: '0 3px 15px rgba(0, 0, 0, 0.08)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }),
  },
  articleImage: {
    width: '100%',
    height: 180,
  },
  articleImagePlaceholder: {
    height: 180,
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  articleCardContent: {
    padding: 16,
  },
  articleCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  articleCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleCardPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a55e1',
  },
  articleCardRating: {
    fontSize: 12,
    color: '#64748B',
  },
  categoriesSection: {
    marginBottom: 48,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  categoryCardActive: {
    backgroundColor: '#4a55e1',
    borderColor: '#4a55e1',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  categoryCount: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  ctaSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ctaTitle: {
    fontSize: isMobile ? 28 : 36,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 24,
    textAlign: 'center',
  },
  ctaButtons: {
    flexDirection: isMobileWeb ? 'column' : 'row',
    gap: isMobileWeb ? 12 : 16,
    width: isMobileWeb ? '100%' : 'auto',
  },
  ctaButtonPrimary: {
    paddingVertical: isMobileWeb ? 12 : 14,
    paddingHorizontal: isMobileWeb ? 24 : 32,
    backgroundColor: '#4a55e1',
    borderRadius: 8,
    width: isMobileWeb ? '100%' : 'auto',
  },
  ctaButtonSecondary: {
    paddingVertical: isMobileWeb ? 12 : 14,
    paddingHorizontal: isMobileWeb ? 24 : 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a55e1',
    width: isMobileWeb ? '100%' : 'auto',
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: isMobileWeb ? 14 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  ctaButtonTextSecondary: {
    color: '#4a55e1',
    fontSize: isMobileWeb ? 14 : 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
    padding: 20,
  },
  footer: {
    backgroundColor: '#1E293B',
    paddingTop: isMobile || isMobileWeb ? 40 : isDesktop ? 60 : 50,
    paddingBottom: isMobile || isMobileWeb ? 24 : isDesktop ? 32 : 28,
    paddingHorizontal: isMobile || isMobileWeb ? 16 : isDesktop ? 60 : 40,
    marginTop: isDesktop ? 64 : 32,
  },
  footerContent: {
    flexDirection: isMobile || isMobileWeb ? 'column' : 'row',
    justifyContent: 'space-between',
    gap: isMobile || isMobileWeb ? 32 : isDesktop ? 48 : 40,
    marginBottom: isMobile || isMobileWeb ? 24 : isDesktop ? 32 : 28,
    maxWidth: isLargeDesktop ? 1600 : isDesktop ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  footerColumn: {
    flex: isMobile || isMobileWeb ? 1 : 1,
    minWidth: isMobile || isMobileWeb ? '100%' : isDesktop ? 200 : 180,
  },
  footerColumnTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  footerLink: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 12,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      transition: 'color 0.2s ease',
    }),
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: isMobile || isMobileWeb ? 20 : isDesktop ? 24 : 22,
    alignItems: 'center',
    maxWidth: isLargeDesktop ? 1600 : isDesktop ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: isMobile || isMobileWeb ? 13 : 14,
  },
  // Services Section Styles
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isMobile ? 16 : isDesktop ? 24 : 20,
    justifyContent: isDesktop ? 'flex-start' : 'center',
  },
  serviceCard: {
    ...(isMobile ? { flex: 1 } : {}),
    ...(Platform.OS === 'web' && !isMobile ? {
      width: (isDesktop ? 'calc(33.333% - 16px)' : 'calc(50% - 10px)') as any,
    } : {}),
    minWidth: isMobile ? '100%' : isDesktop ? 300 : 280,
    maxWidth: isMobile ? '100%' : isDesktop ? 380 : 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 3,
    ...(Platform.OS !== 'web' && {
    shadowColor: '#4a55e1',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    }),
    ...(Platform.OS === 'web' && {
      boxShadow: '0 3px 15px rgba(74, 85, 225, 0.1)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    }),
  },
  serviceCardImage: {
    width: '100%',
    height: 200,
  },
  serviceCardImagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCardImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  serviceCardContent: {
    padding: 16,
  },
  serviceCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  serviceCardDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 20,
  },
  serviceCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceCardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4a55e1',
    marginBottom: 8,
  },
  serviceCardBrand: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  serviceCardRating: {
    fontSize: 14,
    color: '#64748B',
  },
  loadMoreButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#4a55e1',
    borderRadius: 8,
    alignSelf: 'center',
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Events Section Styles
  eventsSection: {
    marginBottom: 48,
  },
  eventsContent: {
    marginTop: 24,
  },
  eventsDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  eventCard: {
    flex: isMobile ? 1 : 1,
    minWidth: isMobile ? '100%' : 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    ...(Platform.OS !== 'web' && {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    }),
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    }),
  },
  eventCardImage: {
    width: '100%',
    height: 180,
  },
  eventCardImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCardImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  eventCardContent: {
    padding: 16,
  },
  eventCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  eventCardCategory: {
    fontSize: 14,
    color: '#64748B',
  },
  // About Section Styles
  aboutSection: {
    marginBottom: 48,
  },
  aboutContent: {
    marginTop: 24,
  },
  aboutText: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  aboutFeatures: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 24,
    flexWrap: 'wrap',
  },
  aboutFeature: {
    flex: isMobile ? 1 : 1,
    minWidth: isMobile ? '100%' : 250,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  aboutFeatureIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  aboutFeatureTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  aboutFeatureText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Contact Section Styles
  contactSection: {
    marginBottom: 48,
  },
  contactContent: {
    marginTop: 24,
  },
  contactDescription: {
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
  },
  contactInfo: {
    flexDirection: isMobile || isMobileWeb ? 'column' : 'row',
    gap: 24,
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  contactItem: {
    flex: isMobile || isMobileWeb ? 1 : 1,
    minWidth: isMobile || isMobileWeb ? '100%' : 200,
    alignItems: 'center',
    padding: isMobileWeb ? 20 : 24,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  contactValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  contactButton: {
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#4a55e1',
    borderRadius: 8,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
