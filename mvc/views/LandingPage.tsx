import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getApiBaseUrl } from '../services/api';
import { LoginView } from './LoginView';
import { RegisterView } from './user/RegisterView';
import { AuthState } from '../models/AuthState';
import { LoginFormData } from '../models/FormData';
import { useBreakpoints } from '../hooks/useBreakpoints';
import { formatPrice } from '../utils/serviceHelpers';
import { createLandingStyles } from './LandingPage.styles';
import { NavBar, MobileMenu } from '../components/landing/NavBar';
import { HeroSection } from '../components/landing/HeroSection';
import { ServiceShowcase } from '../components/landing/ServiceShowcase';

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
  authState?: AuthState;
  onLoginSubmit?: (formData: LoginFormData) => Promise<{ success: boolean; error?: string }>;
  onRegisterSubmit?: (formData: any) => Promise<{ success: boolean; error?: string }>;
  onForgotPassword?: (email: string) => Promise<boolean>;
  onGoogleLogin?: () => Promise<boolean>;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLogin,
  onRegister,
  onNavigateToService,
  authState = new AuthState(),
  onLoginSubmit,
  onRegisterSubmit,
  onForgotPassword,
  onGoogleLogin,
}) => {
  const { screenWidth, isMobile, isMobileWeb, isTablet, isDesktop, isLargeDesktop } =
    useBreakpoints();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, _setActiveTab] = useState<'popular' | 'latest'>('popular');
  const [activeNav, setActiveNav] = useState<'home' | 'services' | 'events' | 'about' | 'contact'>(
    'home',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [_searchLoading, setSearchLoading] = useState(false);
  const [featuredService, setFeaturedService] = useState<Service | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [authModalState] = useState<AuthState>(authState);
  const [newsletterEmailError, setNewsletterEmailError] = useState<string | null>(null);

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

  const handleNewsletterSubscribe = () => {
    const error = validateEmail(newsletterEmail);
    if (error) {
      setNewsletterEmailError(error);
      if (Platform.OS === 'web') {
        Alert.alert('Invalid Email', error);
      } else {
        Alert.alert('Invalid Email', error);
      }
      return;
    }
    // If email is valid, navigate to register
    setNewsletterEmailError(null);
    onRegister();
  };
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
      ? service.primary_image.startsWith('/uploads/')
        ? `${getApiBaseUrl()}${service.primary_image}`
        : service.primary_image
      : null,
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
      const endpoint =
        activeTab === 'popular'
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
      const promises = categories.map((cat) =>
        fetch(`${getApiBaseUrl()}/api/services?category=${cat}&limit=1`),
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
      const promises = categories.map((cat) =>
        fetch(`${getApiBaseUrl()}/api/services?category=${cat}&limit=3`),
      );

      const responses = await Promise.all(promises);
      const categoryData: { [key: string]: Service[] } = {};

      responses.forEach((resp, index) => {
        if (resp.ok) {
          resp.json().then((data) => {
            if (data.ok && Array.isArray(data.rows)) {
              categoryData[categories[index]] = data.rows.map(mapImageUrl);
              setCategoryServices((prev) => ({ ...prev, ...categoryData }));
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
        loadCategoryServices(),
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
      const resp = await fetch(
        `${getApiBaseUrl()}/api/services?search=${encodeURIComponent(searchQuery)}&limit=10`,
      );
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
      const resp = await fetch(
        `${getApiBaseUrl()}/api/services?category=${encodeURIComponent(category)}&limit=10`,
      );
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
        { text: 'Login', onPress: () => setShowLoginModal(true) },
      ]);
    }
  };

  // Handle section layout to track positions
  const handleSectionLayout = (section: string, event: any) => {
    const { y } = event.nativeEvent.layout;
    setSectionPositions((prev) => ({ ...prev, [section]: y }));
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

  const styles = useMemo(
    () =>
      createLandingStyles({
        isMobile,
        isMobileWeb,
        isTablet,
        isDesktop,
        isLargeDesktop,
        screenWidth,
      }),
    [isMobile, isMobileWeb, isTablet, isDesktop, isLargeDesktop, screenWidth],
  );

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

      {/* Mobile slide-out menu (rendered outside ScrollView) */}
      {menuOpen && (
        <MobileMenu
          styles={styles}
          activeNav={activeNav}
          onNavClick={handleNavClick}
          onClose={() => setMenuOpen(false)}
        />
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Bar + Header */}
        <NavBar
          styles={styles}
          screenWidth={screenWidth}
          activeNav={activeNav}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearch}
          onNavClick={handleNavClick}
          onMenuOpen={() => setMenuOpen(true)}
          onLoginPress={onLogin}
        />

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Home Section */}
          <View ref={homeRef} onLayout={(e) => handleSectionLayout('home', e)}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a55e1" />
                <Text style={styles.loadingText}>Loading amazing services...</Text>
              </View>
            ) : (
              <>
                {/* Hero Section */}
                <HeroSection
                  styles={styles}
                  featuredService={featuredService}
                  trendingServices={trendingServices}
                  onServiceClick={handleServiceClick}
                  onRegister={onRegister}
                />

                {/* Service Showcase (recommended, sidebar, entertainment) */}
                <ServiceShowcase
                  styles={styles}
                  trendingServices={trendingServices}
                  entertainmentServices={entertainmentServices}
                  newsletterEmail={newsletterEmail}
                  newsletterEmailError={newsletterEmailError}
                  onServiceClick={handleServiceClick}
                  onRegister={onRegister}
                  onNewsletterEmailChange={setNewsletterEmail}
                  onNewsletterSubscribe={handleNewsletterSubscribe}
                  validateEmail={validateEmail}
                  onNewsletterEmailErrorChange={setNewsletterEmailError}
                />

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
                          accessibilityRole="button"
                          accessibilityLabel={`View service: ${service.s_name}`}
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
                                {service.s_category.charAt(0).toUpperCase() +
                                  service.s_category.slice(1)}
                              </Text>
                            </View>
                          )}
                          <View style={styles.serviceCardContent}>
                            <Text style={styles.serviceCardTitle} numberOfLines={2}>
                              {service.s_name}
                            </Text>
                            <Text style={styles.serviceCardDescription} numberOfLines={2}>
                              {service.s_description}
                            </Text>
                            <View style={styles.serviceCardMeta}>
                              <Text style={styles.serviceCardPrice}>
                                {formatPrice(service.s_base_price || 0)}
                              </Text>
                              {service.s_rating && service.s_rating > 0 && (
                                <View
                                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                >
                                  <Feather name="star" size={14} color="#f59e0b" />
                                  <Text style={styles.serviceCardRating}>
                                    {Number(service.s_rating).toFixed(1)}
                                  </Text>
                                </View>
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
                              selectedCategory === category && styles.categoryCardActive,
                            ]}
                            onPress={() => handleCategoryFilter(category)}
                            accessibilityRole="button"
                            accessibilityLabel={`Filter by ${category}`}
                          >
                            <Text
                              style={[
                                styles.categoryText,
                                selectedCategory === category && styles.categoryTextActive,
                              ]}
                            >
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </Text>
                            {categoryServices[category] &&
                              categoryServices[category].length > 0 && (
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
                          accessibilityRole="button"
                          accessibilityLabel="View all services"
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
                      Discover exciting events happening near you. From weddings to corporate
                      gatherings, find the perfect event for your occasion.
                    </Text>
                    <View style={styles.eventsGrid}>
                      {entertainmentServices.length > 0 ? (
                        entertainmentServices.map((service) => (
                          <TouchableOpacity
                            key={service.idservice}
                            style={styles.eventCard}
                            onPress={() => handleServiceClick(service.idservice)}
                            accessibilityRole="button"
                            accessibilityLabel={`View event: ${service.s_name}`}
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
                                {service.s_category.charAt(0).toUpperCase() +
                                  service.s_category.slice(1)}
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
                        <Feather name="target" size={28} color="#2563EB" />
                        <Text style={styles.aboutFeatureTitle}>Wide Selection</Text>
                        <Text style={styles.aboutFeatureText}>
                          Choose from hundreds of verified service providers
                        </Text>
                      </View>
                      <View style={styles.aboutFeature}>
                        <Feather name="award" size={28} color="#2563EB" />
                        <Text style={styles.aboutFeatureTitle}>Quality Assured</Text>
                        <Text style={styles.aboutFeatureText}>
                          All services are rated and reviewed by real customers
                        </Text>
                      </View>
                      <View style={styles.aboutFeature}>
                        <Feather name="credit-card" size={28} color="#2563EB" />
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
                      Have questions? We're here to help! Get in touch with us through any of the
                      following:
                    </Text>
                    <View style={styles.contactInfo}>
                      <View style={styles.contactItem}>
                        <Feather name="mail" size={22} color="#2563EB" />
                        <Text style={styles.contactLabel}>Email</Text>
                        <Text style={styles.contactValue}>support@e-vent.com</Text>
                      </View>
                      <View style={styles.contactItem}>
                        <Feather name="phone" size={22} color="#2563EB" />
                        <Text style={styles.contactLabel}>Phone</Text>
                        <Text style={styles.contactValue}>+63 123 456 7890</Text>
                      </View>
                      <View style={styles.contactItem}>
                        <Feather name="map-pin" size={22} color="#2563EB" />
                        <Text style={styles.contactLabel}>Address</Text>
                        <Text style={styles.contactValue}>
                          City of Mati, Davao Oriental, Philippines
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.contactButton}
                      onPress={() => setShowRegisterModal(true)}
                      accessibilityRole="button"
                      accessibilityLabel="Get started today"
                    >
                      <Text style={styles.contactButtonText}>Get Started Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Call to Action */}
                <View style={styles.ctaSection}>
                  <Text style={styles.ctaTitle}>Ready to Plan Your Event?</Text>
                  <Text style={styles.ctaDescription}>
                    Join thousands of users who trust us for their special occasions
                  </Text>
                  <View style={styles.ctaButtons}>
                    <TouchableOpacity
                      style={styles.ctaButtonPrimary}
                      onPress={onRegister}
                      accessibilityRole="button"
                      accessibilityLabel="Get started with registration"
                    >
                      <Text style={styles.ctaButtonText}>Get Started</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.ctaButtonSecondary}
                      onPress={onLogin}
                      accessibilityRole="button"
                      accessibilityLabel="Login to your account"
                    >
                      <Text style={styles.ctaButtonTextSecondary}>Login</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>About Us</Text>
              <TouchableOpacity
                onPress={() => handleNavClick('about')}
                accessibilityRole="button"
                accessibilityLabel="Our story"
              >
                <Text style={styles.footerLink}>Our Story</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNavClick('about')}
                accessibilityRole="button"
                accessibilityLabel="Our team"
              >
                <Text style={styles.footerLink}>Our Team</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNavClick('contact')}
                accessibilityRole="button"
                accessibilityLabel="Contact us"
              >
                <Text style={styles.footerLink}>Contact Us</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>My Account</Text>
              <TouchableOpacity
                onPress={() => setShowLoginModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Login"
              >
                <Text style={styles.footerLink}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onRegister}
                accessibilityRole="button"
                accessibilityLabel="Register"
              >
                <Text style={styles.footerLink}>Register</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNavClick('services')}
                accessibilityRole="button"
                accessibilityLabel="My bookings"
              >
                <Text style={styles.footerLink}>My Bookings</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Services</Text>
              <TouchableOpacity
                onPress={() => handleNavClick('services')}
                accessibilityRole="button"
                accessibilityLabel="All services"
              >
                <Text style={styles.footerLink}>All Services</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNavClick('events')}
                accessibilityRole="button"
                accessibilityLabel="Events"
              >
                <Text style={styles.footerLink}>Events</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNavClick('services')}
                accessibilityRole="button"
                accessibilityLabel="Categories"
              >
                <Text style={styles.footerLink}>Categories</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Support</Text>
              <TouchableOpacity
                onPress={() => handleNavClick('contact')}
                accessibilityRole="button"
                accessibilityLabel="Help center"
              >
                <Text style={styles.footerLink}>Help Center</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNavClick('contact')}
                accessibilityRole="button"
                accessibilityLabel="FAQs"
              >
                <Text style={styles.footerLink}>FAQs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleNavClick('about')}
                accessibilityRole="button"
                accessibilityLabel="Terms and conditions"
              >
                <Text style={styles.footerLink}>Terms & Conditions</Text>
              </TouchableOpacity>
            </View>

            {/* Download App QR Code */}
            <View style={styles.footerColumn}>
              <Text style={styles.footerColumnTitle}>Download App</Text>
              <View style={styles.qrCodeContainer}>
                {/* QR Code - Links to EAS Build page for APK download */}
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://expo.dev/accounts/honey25/projects/e-vent/builds/ab2ee8e2-444d-4840-b796-3230e256f782')}`,
                  }}
                  style={styles.qrCode as any}
                  resizeMode="contain"
                />
                <Text style={styles.qrCodeLabel}>Scan to download</Text>
                <Text style={styles.qrCodeSubLabel}>Android APK</Text>
                <TouchableOpacity
                  style={styles.downloadButton}
                  accessibilityRole="button"
                  accessibilityLabel="Download Android APK"
                  onPress={() => {
                    // EAS Build page link - users can download APK from the build page
                    const apkUrl =
                      'https://expo.dev/accounts/honey25/projects/e-vent/builds/ab2ee8e2-444d-4840-b796-3230e256f782';

                    if (Platform.OS === 'web') {
                      // For direct download, use a direct link to the APK file
                      // If the URL points to an APK file, it will download automatically
                      const link = document.createElement('a');
                      link.href = apkUrl;
                      link.download = 'Event.apk';
                      link.target = '_blank';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    } else {
                      // On mobile, open in browser
                      Linking.openURL(apkUrl).catch((err) => {
                        console.error('Error opening URL:', err);
                        Alert.alert('Error', 'Failed to open download link. Please try again.');
                      });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Feather name="download" size={16} color="#fff" />
                    <Text style={styles.downloadButtonText}>Download APK</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.footerBottom}>
            <Text style={styles.footerText}>{'\u00A9'} 2025 E-VENT. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Login Modal */}
      <Modal
        visible={showLoginModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLoginModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLoginModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Close login modal"
            >
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {onLoginSubmit ? (
                <LoginView
                  authState={authModalState}
                  onLogin={async (formData) => {
                    const result = await onLoginSubmit(formData);
                    if (result.success) {
                      setShowLoginModal(false);
                      onLogin();
                    }
                    return result;
                  }}
                  onRegister={() => {
                    setShowLoginModal(false);
                    setShowRegisterModal(true);
                  }}
                  onForgotPassword={onForgotPassword || (async () => false)}
                  onGoogleLogin={onGoogleLogin}
                />
              ) : (
                <View style={styles.modalPlaceholder}>
                  <Text style={styles.modalPlaceholderText}>Login functionality not available</Text>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      setShowLoginModal(false);
                      onLogin();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Go to login page"
                  >
                    <Text style={styles.modalButtonText}>Go to Login Page</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Register Modal */}
      <Modal
        visible={showRegisterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRegisterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowRegisterModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Close register modal"
            >
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {onRegisterSubmit ? (
                <RegisterView
                  authState={authModalState}
                  onRegister={async (formData) => {
                    const result = await onRegisterSubmit(formData);
                    if (result.success) {
                      setShowRegisterModal(false);
                      onRegister();
                    }
                    return result;
                  }}
                  onLogin={() => {
                    setShowRegisterModal(false);
                    setShowLoginModal(true);
                  }}
                />
              ) : (
                <View style={styles.modalPlaceholder}>
                  <Text style={styles.modalPlaceholderText}>
                    Register functionality not available
                  </Text>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => {
                      setShowRegisterModal(false);
                      onRegister();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Go to register page"
                  >
                    <Text style={styles.modalButtonText}>Go to Register Page</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
