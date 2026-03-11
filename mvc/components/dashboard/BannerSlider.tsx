import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { ServiceDTO as Service } from '../../types/service';
import { getCategoryIcon, getCategoryLabel, formatPrice } from '../../utils/serviceHelpers';
import { getApiBaseUrl } from '../../services/api';

interface BannerSliderProps {
  services: Service[];
  screenWidth: number;
  onViewService: (serviceId: string) => void;
}

export const BannerSlider: React.FC<BannerSliderProps> = ({
  services,
  screenWidth: _screenWidth,
  onViewService,
}) => {
  const { isMobile, isMobileWeb } = useBreakpoints();

  if (!services || services.length === 0) return null;

  const isDesktop = Platform.OS === 'web' && !isMobileWeb;
  const cardWidth = isDesktop ? 320 : isMobileWeb ? 280 : 260;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Top Rated</Text>
        <Text style={s.subtitle}>{services.length} services</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {services.map((service) => {
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
              style={[s.card, { width: cardWidth }]}
              onPress={() => onViewService(service.idservice.toString())}
              activeOpacity={0.7}
            >
              {/* Image */}
              <View style={s.imageContainer}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={s.image} resizeMode="cover" />
                ) : (
                  <View style={s.imagePlaceholder}>
                    <Feather
                      name={getCategoryIcon(service.s_category) as any}
                      size={24}
                      color="#94A3B8"
                    />
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={s.info}>
                <View style={s.categoryRow}>
                  <Feather
                    name={getCategoryIcon(service.s_category) as any}
                    size={11}
                    color="#64748B"
                  />
                  <Text style={s.categoryText}>{getCategoryLabel(service.s_category)}</Text>
                </View>

                <Text style={s.serviceName} numberOfLines={1}>
                  {service.s_name}
                </Text>

                <Text style={s.providerName} numberOfLines={1}>
                  {service.provider_name}
                </Text>

                {rating > 0 && (
                  <View style={s.ratingRow}>
                    <Feather name="star" size={12} color="#F59E0B" />
                    <Text style={s.ratingText}>{rating.toFixed(1)}</Text>
                    {reviewCount > 0 && (
                      <Text style={s.reviewCount}>({reviewCount})</Text>
                    )}
                  </View>
                )}

                <View style={s.bottomRow}>
                  <Text style={s.price}>{formatPrice(service.s_base_price)}</Text>
                  <TouchableOpacity
                    style={s.bookButton}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      onViewService(service.idservice.toString());
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={s.bookButtonText}>View</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    marginBottom: Platform.OS === 'web' ? 24 : 20,
    marginTop: Platform.OS === 'web' ? 16 : 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === 'web' ? 24 : 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.04)',
          cursor: 'pointer' as any,
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.03,
          shadowRadius: 4,
          elevation: 1,
        }),
  },
  imageContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    padding: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 2,
  },
  providerName: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  reviewCount: {
    fontSize: 11,
    color: '#94A3B8',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  bookButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
