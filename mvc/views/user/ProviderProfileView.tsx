import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { SkeletonCard } from '../../components/ui';
import { getApiBaseUrl } from '../../services/api';
import { AppLayout } from '../../components/layout';

interface ProviderProfileViewProps {
  providerEmail: string;
  onNavigateToService?: (serviceId: string) => void;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

interface Provider {
  iduser: number;
  u_email: string;
  u_fname: string;
  u_lname: string;
  u_phone?: string;
  u_address?: string;
  u_city?: string;
  u_state?: string;
  u_profile_picture?: string;
  u_provider_status?: string;
  total_services?: number;
  total_bookings?: number;
  average_rating?: number;
  total_reviews?: number;
}

interface Service {
  idservice: number;
  s_name: string;
  s_category: string;
  s_base_price: number | string;
  s_rating: number | string | null;
  s_review_count: number | string | null;
  primary_image?: string | null;
}

const { width: screenWidth } = Dimensions.get('window');
const isMobile = screenWidth < 768 || Platform.OS !== 'web';

export const ProviderProfileView: React.FC<ProviderProfileViewProps> = ({
  providerEmail,
  onNavigateToService,
  user,
  onNavigate,
  onLogout,
}) => {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviderProfile();
  }, [providerEmail]);

  const loadProviderProfile = async () => {
    try {
      setLoading(true);
      
      console.log('Loading provider profile for email:', providerEmail);
      
      // Load provider information
      const providerResp = await fetch(
        `${getApiBaseUrl()}/api/provider/profile?email=${encodeURIComponent(providerEmail)}`
      );
      
      if (providerResp.ok) {
        const providerData = await providerResp.json();
        console.log('Provider data response:', providerData);
        
        if (providerData.ok && providerData.provider) {
          setProvider(providerData.provider);
          
          // Load provider services
          const servicesResp = await fetch(
            `${getApiBaseUrl()}/api/provider/services?email=${encodeURIComponent(providerEmail)}`
          );
          
          if (servicesResp.ok) {
            const servicesData = await servicesResp.json();
            console.log('Services data response:', servicesData);
            if (servicesData.ok && servicesData.services) {
              setServices(servicesData.services);
              console.log('Loaded services:', servicesData.services.length);
            } else {
              console.log('No services in response');
            }
          } else {
            const errorData = await servicesResp.json().catch(() => ({}));
            console.error('Failed to load services:', servicesResp.status, errorData);
          }
        } else {
          console.error('Provider not found:', providerData.error || 'Unknown error');
        }
      } else {
        const errorData = await providerResp.json().catch(() => ({}));
        console.error('Failed to load provider profile:', providerResp.status, errorData);
      }
    } catch (error) {
      console.error('Error loading provider profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | string | null | undefined): string => {
    if (!price) return 'N/A';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return 'N/A';
    return `₱${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      photography: '📷',
      venue: '🏢',
      music: '🎵',
      catering: '🍽️',
    };
    return icons[category.toLowerCase()] || '🎯';
  };

  if (loading) {
    return (
      <AppLayout role="user" activeRoute="dashboard" title="Provider Profile" user={user} onNavigate={onNavigate} onLogout={onLogout}>
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </AppLayout>
    );
  }

  if (!provider) {
    return (
      <AppLayout role="user" activeRoute="dashboard" title="Provider Profile" user={user} onNavigate={onNavigate} onLogout={onLogout}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Provider not found</Text>
        </View>
      </AppLayout>
    );
  }

  const providerName = `${provider.u_fname} ${provider.u_lname}`;
  const initials = `${provider.u_fname?.[0] || ''}${provider.u_lname?.[0] || ''}`.toUpperCase();
  const profileImage = provider.u_profile_picture 
    ? (provider.u_profile_picture.startsWith('/uploads/') 
        ? `${getApiBaseUrl()}${provider.u_profile_picture}` 
        : provider.u_profile_picture)
    : null;

  return (
    <AppLayout role="user" activeRoute="dashboard" title="Provider Profile" user={user} onNavigate={onNavigate} onLogout={onLogout}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <Text style={styles.providerName}>{providerName}</Text>
          {provider.u_provider_status === 'approved' && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓ Verified Provider</Text>
            </View>
          )}
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{provider.total_services || 0}</Text>
            <Text style={styles.statLabel}>Services</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{provider.total_bookings || 0}</Text>
            <Text style={styles.statLabel}>Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {provider.average_rating ? provider.average_rating.toFixed(1) : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{provider.total_reviews || 0}</Text>
            <Text style={styles.statLabel}>Reviews</Text>
          </View>
        </View>

        {/* Contact Information */}
        {(provider.u_email || provider.u_phone || provider.u_address) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            {provider.u_email && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📧</Text>
                <Text style={styles.infoText}>{provider.u_email}</Text>
              </View>
            )}
            {provider.u_phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📱</Text>
                <Text style={styles.infoText}>{provider.u_phone}</Text>
              </View>
            )}
            {(provider.u_address || provider.u_city) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📍</Text>
                <Text style={styles.infoText}>
                  {[provider.u_address, provider.u_city, provider.u_state]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Services ({services.length})
          </Text>
          {services.length === 0 ? (
            <View style={styles.emptyServices}>
              <Text style={styles.emptyServicesText}>No services available</Text>
            </View>
          ) : (
            <View style={styles.servicesGrid}>
              {services.map((service) => {
                const rating = typeof service.s_rating === 'string' 
                  ? parseFloat(service.s_rating) 
                  : (service.s_rating || 0);
                const reviewCount = service.s_review_count || 0;
                const imageUrl = service.primary_image 
                  ? (service.primary_image.startsWith('/uploads/') || service.primary_image.startsWith('/')
                      ? `${getApiBaseUrl()}${service.primary_image}` 
                      : service.primary_image)
                  : null;

                return (
                  <TouchableOpacity
                    key={service.idservice}
                    style={styles.serviceCard}
                    onPress={() => onNavigateToService?.(service.idservice.toString())}
                    activeOpacity={0.8}
                  >
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.serviceImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.serviceImagePlaceholder}>
                        <Text style={styles.serviceImageIcon}>
                          {getCategoryIcon(service.s_category)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName} numberOfLines={2}>
                        {service.s_name}
                      </Text>
                      <View style={styles.serviceMeta}>
                        <Text style={styles.serviceCategory}>
                          {getCategoryIcon(service.s_category)} {service.s_category}
                        </Text>
                        {rating > 0 && (
                          <Text style={styles.serviceRating}>
                            ⭐ {rating.toFixed(1)} ({reviewCount})
                          </Text>
                        )}
                      </View>
                      <Text style={styles.servicePrice}>
                        {formatPrice(service.s_base_price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  profileHeader: {
    backgroundColor: '#FFFFFF',
    padding: isMobile ? 24 : 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    width: isMobile ? 100 : 120,
    height: isMobile ? 100 : 120,
    borderRadius: isMobile ? 50 : 60,
    backgroundColor: '#4a55e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: isMobile ? 36 : 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  providerName: {
    fontSize: isMobile ? 24 : 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: isMobile ? 16 : 24,
    borderRadius: 12,
    padding: isMobile ? 16 : 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: isMobile ? 20 : 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: isMobile ? 12 : 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: isMobile ? 16 : 24,
    borderRadius: 12,
    padding: isMobile ? 16 : 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  sectionTitle: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  infoText: {
    fontSize: isMobile ? 14 : 16,
    color: '#374151',
    flex: 1,
  },
  emptyServices: {
    padding: 40,
    alignItems: 'center',
  },
  emptyServicesText: {
    fontSize: 14,
    color: '#6B7280',
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceCard: {
    width: isMobile ? '100%' : '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      cursor: 'pointer',
      transition: 'transform 0.2s ease',
      ':hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  serviceImage: {
    width: '100%',
    height: isMobile ? 180 : 200,
  },
  serviceImagePlaceholder: {
    width: '100%',
    height: isMobile ? 180 : 200,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceImageIcon: {
    fontSize: 48,
  },
  serviceInfo: {
    padding: 12,
  },
  serviceName: {
    fontSize: isMobile ? 16 : 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceCategory: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  serviceRating: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: isMobile ? 18 : 20,
    fontWeight: '700',
    color: '#4a55e1',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
});

