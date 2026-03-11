import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../../views/user/DashboardView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { ServiceDTO as Service } from '../../types/service';
import { getCategoryIcon, getCategoryLabel, formatPriceDisplay } from '../../utils/serviceHelpers';

interface ServiceCardProps {
  service: Service;
  onView: (serviceId: string) => void;
}

export const ServiceCard: React.FC<ServiceCardProps> = React.memo(({ service, onView }) => {
  const { isMobile, screenWidth, isMobileWeb } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, isMobileWeb);

  const rating =
    typeof service.s_rating === 'string' ? parseFloat(service.s_rating) : service.s_rating || 0;
  const reviewCount = service.s_review_count || 0;

  return (
    <View key={service.idservice} style={[styles.modernServiceCard]}>
      <TouchableOpacity onPress={() => onView(service.idservice.toString())} activeOpacity={0.9}>
        {/* Image with Badge */}
        <View style={styles.modernServiceImageContainer}>
          {service.primary_image &&
          (service.primary_image.startsWith('http://') ||
            service.primary_image.startsWith('https://') ||
            service.primary_image.startsWith('data:image')) ? (
            <Image
              source={{ uri: service.primary_image }}
              style={styles.modernServiceImage as any}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.modernServiceImagePlaceholder}>
              <Feather
                name={getCategoryIcon(service.s_category) as any}
                size={32}
                color="#64748B"
              />
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
            <Text style={styles.modernServiceTitle} numberOfLines={2}>
              {service.s_name}
            </Text>
            <View style={styles.categoryTag}>
              <Feather
                name={getCategoryIcon(service.s_category) as any}
                size={12}
                color="#64748B"
              />
              <Text style={styles.categoryTagText}>{getCategoryLabel(service.s_category)}</Text>
            </View>
          </View>
          <Text style={styles.modernServiceProvider} numberOfLines={1}>
            {service.provider_name}
          </Text>

          {/* Rating and Location Row */}
          <View style={styles.modernServiceMeta}>
            {rating > 0 && !isNaN(rating) ? (
              <View style={styles.modernRatingContainer}>
                <Feather name="star" size={14} color="#f59e0b" />
                <Text style={styles.modernRatingText}>{rating.toFixed(1)}</Text>
                <Text style={styles.modernReviewCount}>({reviewCount})</Text>
              </View>
            ) : (
              <Text style={styles.newBadge}>New</Text>
            )}
            {(service.s_city || service.s_state || service.s_address) && (
              <View style={styles.modernLocationContainer}>
                <Feather name="map-pin" size={12} color="#64748B" />
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
                    if (
                      service.s_city &&
                      !locationParts.some((part) =>
                        part.toLowerCase().includes(service.s_city!.toLowerCase()),
                      )
                    ) {
                      locationParts.push(service.s_city);
                    }

                    // Add state if not already in address
                    if (
                      service.s_state &&
                      !locationParts.some((part) =>
                        part.toLowerCase().includes(service.s_state!.toLowerCase()),
                      )
                    ) {
                      locationParts.push(service.s_state);
                    }

                    return locationParts.length > 0
                      ? locationParts.join(', ')
                      : 'Location not specified';
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
            {(() => {
              const { label, price } = formatPriceDisplay(
                service.s_base_price,
                service.min_package_price,
                service.max_package_price,
              );
              return (
                <>
                  <Text style={styles.modernPriceLabel}>{label}</Text>
                  <Text style={styles.modernPrice}>{price}</Text>
                </>
              );
            })()}
          </View>
        </View>
      </TouchableOpacity>

      {/* Action Button */}
      <View style={styles.modernServiceActions}>
        <TouchableOpacity
          style={[styles.modernViewButton, { flex: 1 }]}
          onPress={() => onView(service.idservice.toString())}
          activeOpacity={0.8}
        >
          <Text style={styles.modernViewButtonText}>View Services</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
