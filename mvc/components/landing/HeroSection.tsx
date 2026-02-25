import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';

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

export interface HeroSectionProps {
  styles: any;
  featuredService: Service | null;
  trendingServices: Service[];
  onServiceClick: (serviceId: number) => void;
  onRegister: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  styles,
  featuredService,
  trendingServices,
  onServiceClick,
  onRegister,
}) => {
  return (
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
            onPress={() => featuredService ? onServiceClick(featuredService.idservice) : onRegister()}
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
  );
};
