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
} from 'react-native';
import { getApiBaseUrl } from '../../services/api';
import { getShadowStyle } from '../../utils/shadowStyles';

interface ServiceDetailsViewProps {
  serviceId: string;
  onBack: () => void;
  onBookNow?: (serviceId: string) => void;
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
  primary_image?: string | null;
}

export const ServiceDetailsView: React.FC<ServiceDetailsViewProps> = ({
  serviceId,
  onBack,
  onBookNow,
}) => {
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    loadServiceDetails();
  }, [serviceId]);

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
          onBack();
        }
      } else {
        Alert.alert('Error', 'Failed to load service details');
        onBack();
      }
    } catch (error) {
      console.error('Error loading service details:', error);
      Alert.alert('Error', 'Failed to load service details. Please try again.');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | string | null | undefined): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
    if (isNaN(numPrice)) return '₱0.00';
    return `₱${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading service details...</Text>
      </View>
    );
  }

  if (!service) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Service not found</Text>
        </View>
      </View>
    );
  }

  const rating = typeof service.s_rating === 'string' 
    ? parseFloat(service.s_rating) 
    : (service.s_rating || 0);
  const reviewCount = service.s_review_count || 0;
  const mainImage = images.length > 0 ? images[0] : (service.primary_image || null);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Image */}
        <View style={styles.imageContainer}>
          {mainImage && !imageError ? (
            <Image
              source={{ uri: mainImage }}
              style={styles.mainImage}
              onError={() => setImageError(true)}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>
                {getCategoryIcon(service.s_category)}
              </Text>
            </View>
          )}
        </View>

        {/* Service Info */}
        <View style={styles.infoSection}>
          <Text style={styles.serviceName}>{service.s_name}</Text>
          
          <View style={styles.providerRow}>
            <Text style={styles.providerLabel}>Provider:</Text>
            <Text style={styles.providerName}>{service.provider_name}</Text>
          </View>

          {rating > 0 && !isNaN(rating) && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>⭐ {rating.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({reviewCount} reviews)</Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Price:</Text>
            <Text style={styles.priceValue}>{formatPrice(service.s_base_price)}</Text>
            {service.s_pricing_type && (
              <Text style={styles.pricingType}>
                {' '}({getPricingTypeLabel(service.s_pricing_type)})
              </Text>
            )}
          </View>

          {/* Category */}
          <View style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>Category:</Text>
            <Text style={styles.categoryValue}>
              {getCategoryIcon(service.s_category)} {service.s_category.charAt(0).toUpperCase() + service.s_category.slice(1)}
            </Text>
          </View>

          {/* Description */}
          {service.s_description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{service.s_description}</Text>
            </View>
          )}

          {/* Service Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            
            {service.s_duration && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Duration:</Text>
                <Text style={styles.detailValue}>{service.s_duration} minutes</Text>
              </View>
            )}

            {service.s_max_capacity && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Max Capacity:</Text>
                <Text style={styles.detailValue}>{service.s_max_capacity} people</Text>
              </View>
            )}

            {service.s_location_type && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location Type:</Text>
                <Text style={styles.detailValue}>
                  {service.s_location_type.charAt(0).toUpperCase() + service.s_location_type.slice(1)}
                </Text>
              </View>
            )}
          </View>

          {/* Location */}
          {(service.s_address || service.s_city || service.s_state) && (
            <View style={styles.locationSection}>
              <Text style={styles.sectionTitle}>Location</Text>
              {service.s_address && (
                <Text style={styles.locationText}>📍 {service.s_address}</Text>
              )}
              {(service.s_city || service.s_state) && (
                <Text style={styles.locationText}>
                  {service.s_city && `${service.s_city}`}
                  {service.s_city && service.s_state && ', '}
                  {service.s_state && `${service.s_state}`}
                </Text>
              )}
            </View>
          )}

          {/* Additional Images */}
          {images.length > 1 && (
            <View style={styles.imagesSection}>
              <Text style={styles.sectionTitle}>Gallery</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesScroll}>
                {images.slice(1).map((imageUrl, index) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Book Now Button */}
      {onBookNow && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.bookNowButton}
            onPress={() => onBookNow(serviceId)}
            activeOpacity={0.8}
          >
            <Text style={styles.bookNowButtonText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6C63FF',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 300,
    backgroundColor: '#E9ECEF',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E9ECEF',
  },
  imagePlaceholderText: {
    fontSize: 80,
  },
  infoSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  serviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerLabel: {
    fontSize: 14,
    color: '#636E72',
    marginRight: 8,
  },
  providerName: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '600',
    marginRight: 8,
  },
  reviewCount: {
    fontSize: 14,
    color: '#636E72',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  priceLabel: {
    fontSize: 16,
    color: '#636E72',
    marginRight: 8,
  },
  priceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6C63FF',
  },
  pricingType: {
    fontSize: 14,
    color: '#636E72',
    marginLeft: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#636E72',
    marginRight: 8,
  },
  categoryValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  descriptionSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 16,
    color: '#636E72',
    lineHeight: 24,
  },
  detailsSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#636E72',
  },
  detailValue: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '600',
  },
  locationSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  locationText: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 4,
    lineHeight: 20,
  },
  imagesSection: {
    marginBottom: 24,
  },
  imagesScroll: {
    marginTop: 12,
  },
  galleryImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginRight: 12,
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    }),
  },
  bookNowButton: {
    backgroundColor: '#6C63FF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  bookNowButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
});

export default ServiceDetailsView;

