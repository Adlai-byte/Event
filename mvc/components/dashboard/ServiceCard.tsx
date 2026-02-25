import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { styles } from '../../views/user/DashboardView.styles';
import { ServiceDTO as Service } from '../../types/service';
import { getCategoryIcon, getCategoryLabel, formatPrice } from '../../utils/serviceHelpers';

interface ServiceCardProps {
  service: Service;
  onView: (serviceId: string) => void;
  onBook: (service: Service) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, onView, onBook }) => {
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
        onPress={() => onView(service.idservice.toString())}
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
              <Text style={styles.featuredBadgeText}>Top Rated</Text>
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
                <Text style={styles.modernRatingStar}>&#11088;</Text>
                <Text style={styles.modernRatingText}>{rating.toFixed(1)}</Text>
                <Text style={styles.modernReviewCount}>({reviewCount})</Text>
              </View>
            ) : (
              <Text style={styles.newBadge}>New</Text>
            )}
            {(service.s_city || service.s_state || service.s_address) && (
              <View style={styles.modernLocationContainer}>
                <Text style={styles.modernLocationIcon}>&#128205;</Text>
                <Text style={styles.modernLocationText} numberOfLines={2}>
                  {(() => {
                    // Build full location string
                    const locationParts: string[] = [];

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
                  <Text style={styles.modernDistanceText}> {service.distance_km}km</Text>
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
          onPress={() => onView(service.idservice.toString())}
          activeOpacity={0.8}
        >
          <Text style={styles.modernViewButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.modernBookButton}
          onPress={() => onBook(service)}
          activeOpacity={0.8}
        >
          <Text style={styles.modernBookButtonText}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
