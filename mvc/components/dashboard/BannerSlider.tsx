import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../../views/user/DashboardView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { ServiceDTO as Service } from '../../types/service';
import { getCategoryIcon, getCategoryLabel, formatPrice } from '../../utils/serviceHelpers';
import { getApiBaseUrl } from '../../services/api';

interface BannerSliderProps {
  services: Service[];
  screenWidth: number;
  onViewService: (serviceId: string) => void;
  onBookService: (service: Service) => void;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({
  services,
  screenWidth,
  onViewService,
  onBookService,
}) => {
  const { isMobile, isMobileWeb } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, isMobileWeb);
  const [bannerCurrentIndex, setBannerCurrentIndex] = useState(0);
  const bannerScrollRef = useRef<ScrollView>(null);

  // Auto-scroll banner
  useEffect(() => {
    if (!services || services.length <= 1) return;

    let interval: NodeJS.Timeout | null = null;

    // Wait a bit for the ref to be ready
    const timeout = setTimeout(() => {
      if (!bannerScrollRef.current) return;

      interval = setInterval(() => {
        if (bannerScrollRef.current && services.length > 1) {
          setBannerCurrentIndex((prevIndex) => {
            const nextIndex = (prevIndex + 1) % services.length;
            try {
              const slideWidth = Platform.OS === 'web' ? screenWidth - 48 : screenWidth - 32;
              bannerScrollRef.current?.scrollTo({
                x: nextIndex * slideWidth,
                animated: true,
              });
            } catch (error) {
              if (__DEV__) console.error('Banner scroll error:', error);
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
  }, [services.length]);

  if (!services || services.length === 0) return null;

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Feather name="star" size={16} color="#2563EB" />
          <Text style={styles.bannerTitle}>Best Services of the Day</Text>
        </View>
      </View>
      <ScrollView
        ref={bannerScrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          try {
            const slideWidth = Platform.OS === 'web' ? screenWidth - 48 : screenWidth - 32;
            const index = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
            setBannerCurrentIndex(index);
          } catch (error) {
            if (__DEV__) console.error('Banner scroll end error:', error);
          }
        }}
        style={styles.bannerScrollView}
        contentContainerStyle={styles.bannerScrollContent}
      >
        {services.map((service, _index) => {
          const rating =
            typeof service.s_rating === 'string'
              ? parseFloat(service.s_rating)
              : service.s_rating || 0;
          const reviewCount =
            typeof service.s_review_count === 'string'
              ? parseInt(service.s_review_count) || 0
              : service.s_review_count || 0;
          const imageUrl = service.primary_image
            ? service.primary_image.startsWith('http://') ||
              service.primary_image.startsWith('https://') ||
              service.primary_image.startsWith('data:image')
              ? service.primary_image
              : `${getApiBaseUrl()}${service.primary_image}`
            : null;

          return (
            <TouchableOpacity
              key={service.idservice}
              style={styles.bannerSlide}
              onPress={() => onViewService(service.idservice.toString())}
              activeOpacity={0.9}
            >
              <View style={styles.bannerCard}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.bannerImage} resizeMode="cover" />
                ) : (
                  <View style={styles.bannerImagePlaceholder}>
                    <Feather
                      name={getCategoryIcon(service.s_category) as any}
                      size={48}
                      color="#64748B"
                    />
                  </View>
                )}
                <View style={styles.bannerOverlay} />
                <View style={styles.bannerContent}>
                  <View style={styles.bannerBadgesRow}>
                    <View style={styles.bannerBadge}>
                      <Text style={styles.bannerBadgeText}>Top Rated</Text>
                    </View>
                    <View style={[styles.categoryTag, styles.bannerCategoryTag]}>
                      <Feather
                        name={getCategoryIcon(service.s_category) as any}
                        size={12}
                        color="#64748B"
                      />
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="star" size={14} color="#f59e0b" />
                        <Text style={styles.bannerRatingText}>{rating.toFixed(1)}</Text>
                      </View>
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
                      onPress={() => onViewService(service.idservice.toString())}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.bannerViewButtonText}>View Details</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.bannerBookButton}
                      onPress={() => onBookService(service)}
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
      {services.length > 1 && (
        <View style={styles.bannerPagination}>
          {services.map((_, index) => (
            <View
              key={index}
              style={[styles.bannerDot, index === bannerCurrentIndex && styles.bannerDotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};
