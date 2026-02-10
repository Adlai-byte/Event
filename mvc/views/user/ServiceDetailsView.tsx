import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { getApiBaseUrl } from '../../services/api';
import { getShadowStyle } from '../../utils/shadowStyles';
import { ServicePackage } from '../../models/Package';
import { PackageCard } from '../../components/PackageCard';
import { AppLayout } from '../../components/layout';

interface ServiceDetailsViewProps {
  serviceId: string;
  onBookNow?: (serviceId: string) => void;
  onNavigateToProviderProfile?: (providerEmail: string) => void;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

interface Service {
  idservice: number;
  s_name: string;
  s_description: string;
  s_category: string;
  s_base_price: number | string;
  s_pricing_type: string;
  s_duration: number;
  s_max_capacity: number;
  s_city: string | null;
  s_state: string | null;
  s_address: string | null;
  s_location_type: string;
  s_rating: number | string | null;
  s_review_count: number | string | null;
  provider_name: string;
  provider_email?: string;
  primary_image?: string | null;
}

export const ServiceDetailsView: React.FC<ServiceDetailsViewProps> = ({
  serviceId,
  onBookNow,
  onNavigateToProviderProfile,
  user,
  onNavigate,
  onLogout,
}) => {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);

  useEffect(() => {
    if (serviceId) {
      loadServiceDetails();
      loadReviews();
      loadPackages();
    }
  }, [serviceId]);

  const loadPackages = async () => {
    if (!serviceId) return;

    try {
      setLoadingPackages(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/packages`);

      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && Array.isArray(data.packages)) {
          const mappedPackages: ServicePackage[] = data.packages
            .filter((p: any) => p.sp_is_active)
            .map((p: any) => ({
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
          setPackages(mappedPackages);
        }
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const loadServiceDetails = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}`);
      
      if (resp.ok) {
        const data = await resp.json();
        if (data.ok && data.service) {
          setService(data.service);
          
          // Load service images
          const imagesResp = await fetch(`${getApiBaseUrl()}/api/services/${serviceId}/images`);
          if (imagesResp.ok) {
            const imagesData = await imagesResp.json();
            if (imagesData.ok && imagesData.images) {
              const imageUrls = imagesData.images.map((img: any) => {
                if (img.si_image_url) {
                  if (img.si_image_url.startsWith('/uploads/')) {
                    return `${getApiBaseUrl()}${img.si_image_url}`;
                  }
                  return img.si_image_url;
                }
                return null;
              }).filter((url: string | null) => url !== null);
              setImages(imageUrls);
            }
          }
        } else {
          Alert.alert('Error', 'Service not found');
          onNavigate('dashboard');
        }
      } else {
        Alert.alert('Error', 'Failed to load service details');
        onNavigate('dashboard');
      }
    } catch (error) {
      console.error('Error loading service details:', error);
      Alert.alert('Error', 'Failed to load service details. Please try again.');
      onNavigate('dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    if (!serviceId) {
      console.log('No serviceId provided for loading reviews');
      return;
    }
    
    try {
      setLoadingReviews(true);
      const serviceIdNum = typeof serviceId === 'string' ? parseInt(serviceId, 10) : serviceId;
      console.log('Loading reviews for serviceId:', serviceId, 'parsed as:', serviceIdNum);
      const url = `${getApiBaseUrl()}/api/services/${serviceIdNum}/reviews`;
      console.log('Fetching from URL:', url);
      const resp = await fetch(url);
      
      console.log('Response status:', resp.status);
      if (resp.ok) {
        const data = await resp.json();
        console.log('Reviews API response:', JSON.stringify(data, null, 2));
        if (data.ok && Array.isArray(data.reviews)) {
          console.log('Loaded reviews:', data.reviews.length, 'reviews');
          console.log('Reviews data:', data.reviews);
          setReviews(data.reviews);
        } else {
          console.log('No reviews in response or error:', data);
          setReviews([]);
        }
      } else {
        const errorText = await resp.text();
        console.error('Failed to load reviews, status:', resp.status, 'error:', errorText);
        setReviews([]);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const formatPrice = (price: number | string | null | undefined): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    if (isNaN(numPrice)) return '₱0.00';
    return `₱${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDuration = (minutes: number | string | null | undefined): string => {
    const numMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : (minutes || 0);
    if (isNaN(numMinutes) || numMinutes <= 0) return 'N/A';
    
    const MINUTES_PER_HOUR = 60;
    const MINUTES_PER_DAY = 1440; // 24 hours * 60 minutes
    
    // Handle days (24 hours = 1 day)
    if (numMinutes >= MINUTES_PER_DAY) {
      const days = Math.floor(numMinutes / MINUTES_PER_DAY);
      const remainingMinutes = numMinutes % MINUTES_PER_DAY;
      
      if (remainingMinutes === 0) {
        // Exactly divisible by 1440 (24 hours)
        return days === 1 ? '1 day' : `${days} days`;
      }
      
      // Has days and remaining time
      const hours = Math.floor(remainingMinutes / MINUTES_PER_HOUR);
      const mins = remainingMinutes % MINUTES_PER_HOUR;
      
      let result = days === 1 ? '1 day' : `${days} days`;
      if (hours > 0) {
        result += ` ${hours}hr`;
      }
      if (mins > 0) {
        result += ` ${mins}min`;
      }
      return result;
    }
    
    // If exactly 60 minutes, show as 1hr
    if (numMinutes === 60) {
      return '1hr';
    }
    
    // If divisible by 60, show as hours
    if (numMinutes % 60 === 0) {
      const hours = numMinutes / 60;
      return `${hours}hr`;
    }
    
    // If more than 60, show as hours and minutes
    if (numMinutes > 60) {
      const hours = Math.floor(numMinutes / 60);
      const mins = numMinutes % 60;
      if (mins === 0) {
        return `${hours}hr`;
      }
      return `${hours}hr ${mins}min`;
    }
    
    // Less than 60, show as minutes
    return `${numMinutes}min`;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      'photography': '📸',
      'venue': '🏢',
      'music': '🎵',
      'catering': '🍽️'
    };
    return icons[category?.toLowerCase()] || '🎯';
  };

  const getPricingTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      'fixed': 'Fixed Price',
      'hourly': 'Per Hour',
      'per_person': 'Per Person',
      'package': 'Package',
      'custom': 'Custom'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <AppLayout role="user" activeRoute="dashboard" title="Service Details" user={user} onNavigate={onNavigate} onLogout={onLogout}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Text style={styles.loadingText}>Loading service details...</Text>
        </View>
      </AppLayout>
    );
  }

  if (!service) {
    return (
      <AppLayout role="user" activeRoute="dashboard" title="Service Details" user={user} onNavigate={onNavigate} onLogout={onLogout}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Service not found</Text>
        </View>
      </AppLayout>
    );
  }

  const rating = typeof service.s_rating === 'string' 
    ? parseFloat(service.s_rating) 
    : (service.s_rating || 0);
  const reviewCount = service.s_review_count || 0;
  const mainImage = images.length > 0 ? images[0] : (service.primary_image || null);
  const isWeb = Platform.OS === 'web';
  const isMobileWeb = isWeb && screenWidth < 768;

  return (
    <AppLayout role="user" activeRoute="dashboard" title="Service Details" user={user} onNavigate={onNavigate} onLogout={onLogout}>
    <View style={styles.container}>
      {/* Background Decorative Elements */}
      <View style={styles.backgroundContainer}>
        {isWeb ? (
          <View style={styles.backgroundGradientWeb} />
        ) : (
          <View style={styles.backgroundGradient} />
        )}
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
      </View>

      {/* Web: Centered Card Container */}
      {isWeb ? (
        <View style={styles.webCardContainer}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
        {/* Hero Image Section */}
        <View style={styles.heroImageContainer}>
          {mainImage && !imageError ? (
            <Image
              source={{ uri: mainImage }}
              style={styles.heroImage as any}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Text style={styles.heroImagePlaceholderIcon}>
                {getCategoryIcon(service.s_category)}
              </Text>
            </View>
          )}
          {/* Rating Badge Overlay */}
          {rating >= 4.5 && (
            <View style={styles.ratingBadgeOverlay}>
              <Text style={styles.ratingBadgeIcon}>⭐</Text>
              <Text style={styles.ratingBadgeText}>Top Rated</Text>
            </View>
          )}
        </View>

        {/* Service Info - Modern Card Design */}
        <View style={styles.infoCard}>
          {/* Service Header */}
          <View style={styles.serviceHeader}>
            <View style={styles.serviceHeaderLeft}>
              <Text style={styles.serviceName}>{service.s_name}</Text>
              <View style={styles.serviceMetaRow}>
                <TouchableOpacity 
                  style={styles.providerBadge}
                  onPress={() => {
                    if (service.provider_email && onNavigateToProviderProfile) {
                      onNavigateToProviderProfile(service.provider_email);
                    }
                  }}
                  disabled={!service.provider_email || !onNavigateToProviderProfile}
                  activeOpacity={service.provider_email && onNavigateToProviderProfile ? 0.7 : 1}
                >
                  <Text style={styles.providerBadgeText}>{service.provider_name}</Text>
                </TouchableOpacity>
                {rating > 0 && !isNaN(rating) && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingStar}>⭐</Text>
                    <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                    <Text style={styles.reviewCount}>({reviewCount})</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryIcon}>{getCategoryIcon(service.s_category)}</Text>
            </View>
          </View>

          {/* Price Section - Prominent */}
          <View style={styles.priceCard}>
            <Text style={styles.priceLabel}>Starting at</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.priceValue}>{formatPrice(service.s_base_price)}</Text>
              {service.s_pricing_type && (
                <View style={styles.pricingTypeBadge}>
                  <Text style={styles.pricingTypeText}>
                    {getPricingTypeLabel(service.s_pricing_type)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Available Packages */}
          {packages.length > 0 && (
            <View style={styles.packagesCard}>
              <Text style={styles.cardTitle}>Available Packages</Text>
              <Text style={styles.packagesSubtitle}>
                Select a package for better value or book individual services
              </Text>
              {packages.map(pkg => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  isSelected={selectedPackage?.id === pkg.id}
                  onSelect={(p) => setSelectedPackage(selectedPackage?.id === p.id ? null : p)}
                  showSelectButton={true}
                />
              ))}
            </View>
          )}

          {/* Description */}
          {service.s_description && (
            <View style={styles.descriptionCard}>
              <Text style={styles.cardTitle}>About This Service</Text>
              <Text style={styles.descriptionText}>{service.s_description}</Text>
            </View>
          )}

          {/* Service Details - Modern Grid */}
          <View style={styles.detailsCard}>
            <Text style={styles.cardTitle}>Service Information</Text>
            <View style={styles.detailsGrid}>
              {service.s_duration && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>⏱️</Text>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{formatDuration(service.s_duration)}</Text>
                  </View>
                </View>
              )}

              {service.s_max_capacity && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailIcon}>👥</Text>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Capacity</Text>
                    <Text style={styles.detailValue}>{service.s_max_capacity} people</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Location - Modern Card */}
          {(service.s_address || service.s_city || service.s_state) && (
            <View style={styles.locationCard}>
              <Text style={styles.cardTitle}>📍 Location</Text>
              <View style={styles.locationContent}>
                {service.s_address && (
                  <Text style={styles.locationText}>{service.s_address}</Text>
                )}
                {(service.s_city || service.s_state) && (
                  <Text style={styles.locationCity}>
                    {service.s_city && `${service.s_city}`}
                    {service.s_city && service.s_state && ', '}
                    {service.s_state && `${service.s_state}`}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Additional Images - Gallery */}
          {images.length > 1 && (
            <View style={styles.galleryCard}>
              <Text style={styles.cardTitle}>Photo Gallery</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                style={styles.galleryScroll}
                contentContainerStyle={styles.galleryScrollContent}
              >
                {images.slice(1).map((imageUrl, index) => (
                  <View key={index} style={styles.galleryImageContainer}>
                    <Image
                      source={{ uri: imageUrl }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

              {/* Reviews Section - Always visible */}
              <View style={styles.reviewsCard}>
                <Text style={styles.cardTitle}>⭐ Reviews & Feedback {reviews.length > 0 ? `(${reviews.length})` : ''}</Text>
                {loadingReviews ? (
                  <View style={styles.reviewsLoading}>
                    <ActivityIndicator size="small" color="#4a55e1" />
                    <Text style={styles.reviewsLoadingText}>Loading reviews...</Text>
                  </View>
                ) : reviews.length > 0 ? (
                  <View style={styles.reviewsList}>
                    {reviews.map((review) => (
                      <View key={review.id} style={styles.reviewItem}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewUserInfo}>
                            {review.userProfilePicture ? (
                              <Image
                                source={{
                                  uri: review.userProfilePicture.startsWith('/uploads/')
                                    ? `${getApiBaseUrl()}${review.userProfilePicture}`
                                    : review.userProfilePicture
                                }}
                                style={styles.reviewAvatar}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.reviewAvatarPlaceholder}>
                                <Text style={styles.reviewAvatarText}>
                                  {review.userName.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.reviewUserDetails}>
                              <Text style={styles.reviewUserName}>{review.userName}</Text>
                              <Text style={styles.reviewDate}>
                                {new Date(review.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.reviewRating}>
                            <Text style={styles.reviewRatingText}>
                              {'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </Text>
                          </View>
                        </View>
                        {review.comment && (
                          <Text style={styles.reviewComment}>{review.comment}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.reviewsEmpty}>
                    <Text style={styles.reviewsEmptyIcon}>💬</Text>
                    <Text style={styles.reviewsEmptyText}>No reviews yet. Be the first to review this service!</Text>
                  </View>
                )}
              </View>
          </View>
          </ScrollView>

          {/* Action Buttons - View Profile & Book Now */}
          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              {service?.provider_email && onNavigateToProviderProfile && (
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() => onNavigateToProviderProfile(service.provider_email!)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.viewProfileButtonIcon}>👤</Text>
                  <Text style={styles.viewProfileButtonText}>View Profile</Text>
                </TouchableOpacity>
              )}
              {onBookNow && (
                <TouchableOpacity
                  style={[styles.modernBookButton, !(service?.provider_email && onNavigateToProviderProfile) && styles.modernBookButtonFull]}
                  onPress={() => onBookNow(serviceId)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modernBookButtonIcon}>📅</Text>
                  <Text style={styles.modernBookButtonText}>Book Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Mobile: Full Screen Layout */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Image Section */}
            <View style={styles.heroImageContainer}>
              {mainImage && !imageError ? (
                <Image
                  source={{ uri: mainImage }}
                  style={styles.heroImage as any}
                  onError={() => setImageError(true)}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.heroImagePlaceholder}>
                  <Text style={styles.heroImagePlaceholderIcon}>
                    {getCategoryIcon(service.s_category)}
                  </Text>
                </View>
              )}
              {/* Rating Badge Overlay */}
              {rating >= 4.5 && (
                <View style={styles.ratingBadgeOverlay}>
                  <Text style={styles.ratingBadgeIcon}>⭐</Text>
                  <Text style={styles.ratingBadgeText}>Top Rated</Text>
                </View>
              )}
            </View>

            {/* Service Info - Modern Card Design */}
            <View style={styles.infoCard}>
              {/* Service Header */}
              <View style={styles.serviceHeader}>
                <View style={styles.serviceHeaderLeft}>
                  <Text style={styles.serviceName}>{service.s_name}</Text>
                    <View style={styles.serviceMetaRow}>
                    <TouchableOpacity 
                      style={styles.providerBadge}
                      onPress={() => {
                        if (service.provider_email && onNavigateToProviderProfile) {
                          onNavigateToProviderProfile(service.provider_email);
                        }
                      }}
                      disabled={!service.provider_email || !onNavigateToProviderProfile}
                      activeOpacity={service.provider_email && onNavigateToProviderProfile ? 0.7 : 1}
                    >
                      <Text style={styles.providerBadgeText}>{service.provider_name}</Text>
                    </TouchableOpacity>
                    {rating > 0 && !isNaN(rating) && (
                      <View style={styles.ratingBadge}>
                        <Text style={styles.ratingStar}>⭐</Text>
                        <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                        <Text style={styles.reviewCount}>({reviewCount})</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryIcon}>{getCategoryIcon(service.s_category)}</Text>
                </View>
              </View>

              {/* Price Section - Prominent */}
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Starting at</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.priceValue}>{formatPrice(service.s_base_price)}</Text>
                  {service.s_pricing_type && (
                    <View style={styles.pricingTypeBadge}>
                      <Text style={styles.pricingTypeText}>
                        {getPricingTypeLabel(service.s_pricing_type)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Available Packages (Mobile) */}
              {packages.length > 0 && (
                <View style={styles.packagesCard}>
                  <Text style={styles.cardTitle}>Available Packages</Text>
                  <Text style={styles.packagesSubtitle}>
                    Select a package for better value
                  </Text>
                  {packages.map(pkg => (
                    <PackageCard
                      key={pkg.id}
                      pkg={pkg}
                      isSelected={selectedPackage?.id === pkg.id}
                      onSelect={(p) => setSelectedPackage(selectedPackage?.id === p.id ? null : p)}
                      showSelectButton={true}
                    />
                  ))}
                </View>
              )}

              {/* Description */}
              {service.s_description && (
                <View style={styles.descriptionCard}>
                  <Text style={styles.cardTitle}>About This Service</Text>
                  <Text style={styles.descriptionText}>{service.s_description}</Text>
                </View>
              )}

              {/* Service Details - Modern Grid */}
              <View style={styles.detailsCard}>
                <Text style={styles.cardTitle}>Service Information</Text>
                <View style={styles.detailsGrid}>
                  {service.s_duration && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailIcon}>⏱️</Text>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>{service.s_duration} min</Text>
                      </View>
                    </View>
                  )}

                  {service.s_max_capacity && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailIcon}>👥</Text>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Capacity</Text>
                        <Text style={styles.detailValue}>{service.s_max_capacity} people</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Location - Modern Card */}
              {(service.s_address || service.s_city || service.s_state) && (
                <View style={styles.locationCard}>
                  <Text style={styles.cardTitle}>📍 Location</Text>
                  <View style={styles.locationContent}>
                    {service.s_address && (
                      <Text style={styles.locationText}>{service.s_address}</Text>
                    )}
                    {(service.s_city || service.s_state) && (
                      <Text style={styles.locationCity}>
                        {service.s_city && `${service.s_city}`}
                        {service.s_city && service.s_state && ', '}
                        {service.s_state && `${service.s_state}`}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Additional Images - Gallery */}
              {images.length > 1 && (
                <View style={styles.galleryCard}>
                  <Text style={styles.cardTitle}>Photo Gallery</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    style={styles.galleryScroll}
                    contentContainerStyle={styles.galleryScrollContent}
                  >
                    {images.slice(1).map((imageUrl, index) => (
                      <View key={index} style={styles.galleryImageContainer}>
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.galleryImage as any}
                          resizeMode="cover"
                        />
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Reviews Section - Always visible */}
              <View style={styles.reviewsCard}>
                <Text style={styles.cardTitle}>⭐ Reviews & Feedback {reviews.length > 0 ? `(${reviews.length})` : ''}</Text>
                {loadingReviews ? (
                  <View style={styles.reviewsLoading}>
                    <ActivityIndicator size="small" color="#4a55e1" />
                    <Text style={styles.reviewsLoadingText}>Loading reviews...</Text>
                  </View>
                ) : reviews.length > 0 ? (
                  <View style={styles.reviewsList}>
                    {reviews.map((review) => (
                      <View key={review.id} style={styles.reviewItem}>
                        <View style={styles.reviewHeader}>
                          <View style={styles.reviewUserInfo}>
                            {review.userProfilePicture ? (
                              <Image
                                source={{
                                  uri: review.userProfilePicture.startsWith('/uploads/')
                                    ? `${getApiBaseUrl()}${review.userProfilePicture}`
                                    : review.userProfilePicture
                                }}
                                style={styles.reviewAvatar}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.reviewAvatarPlaceholder}>
                                <Text style={styles.reviewAvatarText}>
                                  {review.userName.charAt(0).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.reviewUserDetails}>
                              <Text style={styles.reviewUserName}>{review.userName}</Text>
                              <Text style={styles.reviewDate}>
                                {new Date(review.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.reviewRating}>
                            <Text style={styles.reviewRatingText}>
                              {'⭐'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </Text>
                          </View>
                        </View>
                        {review.comment && (
                          <Text style={styles.reviewComment}>{review.comment}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.reviewsEmpty}>
                    <Text style={styles.reviewsEmptyIcon}>💬</Text>
                    <Text style={styles.reviewsEmptyText}>No reviews yet. Be the first to review this service!</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons - View Profile & Book Now */}
          <View style={styles.footer}>
            <View style={styles.footerButtons}>
              {service?.provider_email && onNavigateToProviderProfile && (
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() => onNavigateToProviderProfile(service.provider_email!)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.viewProfileButtonIcon}>👤</Text>
                  <Text style={styles.viewProfileButtonText}>View Profile</Text>
                </TouchableOpacity>
              )}
              {onBookNow && (
                <TouchableOpacity
                  style={[styles.modernBookButton, !(service?.provider_email && onNavigateToProviderProfile) && styles.modernBookButtonFull]}
                  onPress={() => onBookNow(serviceId)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modernBookButtonIcon}>📅</Text>
                  <Text style={styles.modernBookButtonText}>Book Now</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </>
      )}
    </View>
    </AppLayout>
  );
};

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isMobile = screenWidth < 768;

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'web' ? (screenWidth < 768 ? 0 : 20) : 10,
    paddingBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 0 : 20) : 10,
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#F0F2F5' : '#F8F9FA',
    position: 'relative',
    ...(Platform.OS === 'web' ? {
      justifyContent: screenWidth < 768 ? 'flex-start' : 'center',
      alignItems: 'center',
    } : {}),
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
    backgroundColor: '#F8F9FA',
  },
  backgroundGradientWeb: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'linear-gradient(135deg, #F0F2F5 0%, #E8F0FE 100%)',
    } : {}),
  },
  webCardContainer: {
    width: screenWidth < 768 ? '100%' : '90%',
    maxWidth: screenWidth < 768 ? '100%' : 900,
    maxHeight: screenWidth < 768 ? '100%' : (screenHeight * 0.95),
    backgroundColor: '#FFFFFF',
    borderRadius: screenWidth < 768 ? 0 : 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: screenWidth < 768 ? 'none' : '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
    } : {}),
  },
  backgroundCircle1: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 500 : 350,
    height: Platform.OS === 'web' ? 500 : 350,
    borderRadius: Platform.OS === 'web' ? 250 : 175,
    backgroundColor: 'rgba(79, 70, 229, 0.06)',
    top: Platform.OS === 'web' ? -150 : -100,
    right: Platform.OS === 'web' ? -150 : -100,
    ...(Platform.OS === 'web' ? {
      filter: 'blur(70px)',
    } : {}),
  },
  backgroundCircle2: {
    position: 'absolute',
    width: Platform.OS === 'web' ? 400 : 300,
    height: Platform.OS === 'web' ? 400 : 300,
    borderRadius: Platform.OS === 'web' ? 200 : 150,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    bottom: Platform.OS === 'web' ? -100 : -80,
    left: Platform.OS === 'web' ? -100 : -80,
    ...(Platform.OS === 'web' ? {
      filter: 'blur(60px)',
    } : {}),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#636E72',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    zIndex: 1,
    maxHeight: Platform.OS === 'web' ? (screenWidth < 768 ? undefined : (screenHeight * 0.95 - 200)) : undefined,
  },
  contentContainer: {
    paddingBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 100 : 24) : (isMobile ? 100 : 40),
    backgroundColor: 'transparent',
  },
  // Modern Hero Image Section
  heroImageContainer: {
    width: '100%',
    height: Platform.OS === 'web' ? (screenWidth < 768 ? 300 : 400) : 350,
    backgroundColor: '#1e293b',
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  heroImagePlaceholderIcon: {
    fontSize: Platform.OS === 'web' ? 120 : 100,
    opacity: 0.3,
  },
  ratingBadgeOverlay: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 16,
    right: Platform.OS === 'web' ? 20 : 16,
    backgroundColor: '#10b981',
    borderRadius: 24,
    paddingHorizontal: Platform.OS === 'web' ? 16 : 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
    } : {
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 6,
    }),
  },
  ratingBadgeIcon: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    marginRight: 6,
  },
  ratingBadgeText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '700',
  },
  // Modern Info Card
  infoCard: {
    marginTop: Platform.OS === 'web' ? (screenWidth < 768 ? -30 : -40) : -30,
    marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
    padding: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 28) : 24,
    position: 'relative',
    zIndex: 2,
    ...(Platform.OS === 'web' ? {
      boxShadow: screenWidth < 768 ? '0 4px 16px rgba(0, 0, 0, 0.08)' : '0 10px 40px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.06)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
    }),
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Platform.OS === 'web' ? 24 : 20,
  },
  serviceHeaderLeft: {
    flex: 1,
  },
  serviceName: {
    fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 24 : 32) : 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 10 : 12) : 10,
    letterSpacing: -0.5,
    lineHeight: Platform.OS === 'web' ? (screenWidth < 768 ? 30 : 40) : 36,
  },
  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  providerBadgeText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#475569',
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    paddingHorizontal: Platform.OS === 'web' ? 14 : 12,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
  },
  ratingStar: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
    marginRight: 4,
  },
  ratingValue: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    fontWeight: '700',
    color: '#92400e',
    marginRight: 4,
  },
  reviewCount: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#92400e',
    fontWeight: '600',
  },
  categoryBadge: {
    width: Platform.OS === 'web' ? 56 : 48,
    height: Platform.OS === 'web' ? 56 : 48,
    borderRadius: Platform.OS === 'web' ? 28 : 24,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  categoryIcon: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
  },
  // Price Card - Prominent
  priceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    padding: Platform.OS === 'web' ? 24 : 20,
    marginBottom: Platform.OS === 'web' ? 24 : 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  priceLabel: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  priceValue: {
    fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 28 : 36) : 32,
    fontWeight: '800',
    color: '#4f46e5',
    letterSpacing: -1,
    marginRight: 8,
  },
  pricingTypeBadge: {
    backgroundColor: '#e0e7ff',
    borderRadius: 12,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 5,
    alignSelf: 'flex-start',
  },
  pricingTypeText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#4f46e5',
    fontWeight: '700',
  },
  // Modern Card Styles
  descriptionCard: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
    padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
    marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
    marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: '#f1f5f9',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }),
  },
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
    padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
    marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
    marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: '#f1f5f9',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }),
  },
  cardTitle: {
    fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 18 : 22) : 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 16,
    letterSpacing: -0.3,
  },
  descriptionText: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#475569',
    lineHeight: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '500',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Platform.OS === 'web' ? 16 : 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: Platform.OS === 'web' ? 16 : 14,
    padding: Platform.OS === 'web' ? 20 : 16,
    flex: Platform.OS === 'web' ? 1 : undefined,
    minWidth: Platform.OS === 'web' ? 200 : '100%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailIcon: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    marginRight: Platform.OS === 'web' ? 16 : 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: Platform.OS === 'web' ? 18 : 16,
    color: '#0f172a',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
    padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
    marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
    marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: '#f1f5f9',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }),
  },
  locationContent: {
    backgroundColor: '#f8fafc',
    borderRadius: Platform.OS === 'web' ? 12 : 10,
    padding: Platform.OS === 'web' ? 20 : 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  locationText: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: '#0f172a',
    marginBottom: 8,
    lineHeight: Platform.OS === 'web' ? 24 : 22,
    fontWeight: '600',
  },
  locationCity: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#64748b',
    fontWeight: '500',
  },
  galleryCard: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
    padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
    marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
    marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: '#f1f5f9',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }),
  },
  galleryScroll: {
    marginTop: 16,
  },
  galleryScrollContent: {
    paddingRight: Platform.OS === 'web' ? 0 : 20,
  },
  galleryImageContainer: {
    marginRight: Platform.OS === 'web' ? 16 : 12,
    borderRadius: Platform.OS === 'web' ? 16 : 12,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }),
  },
  galleryImage: {
    width: Platform.OS === 'web' ? 240 : 200,
    height: Platform.OS === 'web' ? 180 : 150,
  },
  reviewsCard: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 16,
    padding: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 24) : 24,
    marginBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 24 : 32) : 32,
    marginTop: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
    marginHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
    minHeight: 120,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
      borderWidth: 1,
      borderColor: '#f1f5f9',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    }),
  },
  reviewsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  reviewsLoadingText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    color: '#64748b',
  },
  reviewsList: {
    marginTop: 16,
    gap: Platform.OS === 'web' ? 20 : 16,
  },
  reviewItem: {
    paddingBottom: Platform.OS === 'web' ? 20 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reviewUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewAvatar: {
    width: Platform.OS === 'web' ? 48 : 40,
    height: Platform.OS === 'web' ? 48 : 40,
    borderRadius: Platform.OS === 'web' ? 24 : 20,
    marginRight: 12,
  },
  reviewAvatarPlaceholder: {
    width: Platform.OS === 'web' ? 48 : 40,
    height: Platform.OS === 'web' ? 48 : 40,
    borderRadius: Platform.OS === 'web' ? 24 : 20,
    backgroundColor: '#4a55e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewAvatarText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    fontWeight: '700',
  },
  reviewUserDetails: {
    flex: 1,
  },
  reviewUserName: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    color: '#64748b',
  },
  reviewRating: {
    marginLeft: 12,
  },
  reviewRatingText: {
    fontSize: Platform.OS === 'web' ? 16 : 14,
  },
  reviewComment: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: '#334155',
    lineHeight: Platform.OS === 'web' ? 24 : 22,
  },
  reviewsEmpty: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewsEmptyIcon: {
    fontSize: Platform.OS === 'web' ? 48 : 40,
    marginBottom: 12,
  },
  reviewsEmptyText: {
    fontSize: Platform.OS === 'web' ? 15 : 14,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    paddingHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 32) : 20,
    paddingTop: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 20,
    paddingBottom: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 24) : (isMobile ? 20 : 24),
    position: 'relative',
    zIndex: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: screenWidth < 768 ? '0 -2px 8px rgba(0, 0, 0, 0.06)' : '0 -4px 20px rgba(0, 0, 0, 0.08), 0 -2px 8px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  footerButtons: {
    flexDirection: 'row',
    gap: Platform.OS === 'web' ? (screenWidth < 768 ? 12 : 16) : 12,
    alignItems: 'stretch',
  },
  modernBookButton: {
    flex: 1,
    backgroundColor: '#4f46e5',
    paddingVertical: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 18) : 16,
    paddingHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 32) : 20,
    borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 14 : 16) : 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: Platform.OS === 'web' ? (screenWidth < 768 ? 56 : 60) : 56,
    gap: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: screenWidth < 768 ? '0 4px 12px rgba(79, 70, 229, 0.3)' : '0 8px 24px rgba(79, 70, 229, 0.4), 0 4px 8px rgba(79, 70, 229, 0.3)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#4f46e5',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  modernBookButtonFull: {
    ...(Platform.OS === 'web' ? {
      maxWidth: screenWidth < 768 ? '100%' : 400,
      alignSelf: 'center',
      width: '100%',
    } : {}),
  },
  viewProfileButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 18) : 16,
    paddingHorizontal: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 32) : 20,
    borderRadius: Platform.OS === 'web' ? (screenWidth < 768 ? 14 : 16) : 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: Platform.OS === 'web' ? (screenWidth < 768 ? 56 : 60) : 56,
    gap: 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: screenWidth < 768 ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 8px 24px rgba(16, 185, 129, 0.4), 0 4px 8px rgba(16, 185, 129, 0.3)',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    } : {
      shadowColor: '#10b981',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    }),
  },
  viewProfileButtonIcon: {
    fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 24) : 22,
  },
  viewProfileButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 18,
    fontWeight: '800',
    letterSpacing: Platform.OS === 'web' ? (screenWidth < 768 ? 0.3 : 0.5) : 0.3,
  },
  modernBookButtonIcon: {
    fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 20 : 24) : 22,
  },
  modernBookButtonText: {
    color: '#FFFFFF',
    fontSize: Platform.OS === 'web' ? (screenWidth < 768 ? 16 : 20) : 18,
    fontWeight: '800',
    letterSpacing: Platform.OS === 'web' ? (screenWidth < 768 ? 0.3 : 0.5) : 0.3,
  },
  bookNowButton: {
    backgroundColor: '#6366F1',
    paddingVertical: isMobile ? 18 : 16,
    borderRadius: isMobile ? 14 : 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: isMobile ? 56 : undefined,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35), 0 2px 6px rgba(99, 102, 241, 0.25)',
      transition: 'all 0.2s ease',
    } : {
      shadowColor: '#6366F1',
      shadowOffset: { width: 0, height: isMobile ? 6 : 4 },
      shadowOpacity: isMobile ? 0.4 : 0.3,
      shadowRadius: isMobile ? 12 : 8,
      elevation: isMobile ? 8 : 6,
    }),
  },
  bookNowButtonText: {
    color: '#FFFFFF',
    fontSize: isMobile ? 18 : 16,
    fontWeight: '700',
    letterSpacing: isMobile ? 0.5 : 0.3,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#636E72',
  },
  // Package styles
  packagesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: isMobile ? 16 : 20,
    marginBottom: 16,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)' }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 3,
        }),
  },
  packagesSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    marginTop: -4,
  },
});

export default ServiceDetailsView;





