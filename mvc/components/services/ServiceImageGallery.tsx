import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getCategoryIcon } from '../../utils/serviceHelpers';
import { createStyles } from '../../views/user/ServiceDetailsView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

/* ---- Hero Image (rendered at the top of the scroll area) ---- */

interface ServiceHeroImageProps {
  mainImage: string | null;
  imageError: boolean;
  onImageError: () => void;
  category: string;
  rating: number;
}

export const ServiceHeroImage: React.FC<ServiceHeroImageProps> = ({
  mainImage,
  imageError,
  onImageError,
  category,
  rating,
}) => {
  const { isMobile, screenWidth, screenHeight } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, screenHeight);

  return (
    <View style={styles.heroImageContainer}>
      {mainImage && !imageError ? (
        <Image
          source={{ uri: mainImage }}
          style={styles.heroImage as any}
          onError={onImageError}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.heroImagePlaceholder}>
          <Feather name={getCategoryIcon(category) as any} size={48} color="#94a3b8" />
        </View>
      )}
      {/* Rating Badge Overlay */}
      {rating >= 4.5 && (
        <View style={styles.ratingBadgeOverlay}>
          <Feather name="star" size={14} color="#f59e0b" />
          <Text style={styles.ratingBadgeText}>Top Rated</Text>
        </View>
      )}
    </View>
  );
};

/* ---- Photo Gallery (rendered inside the info card) ---- */

interface ServicePhotoGalleryProps {
  images: string[];
}

export const ServicePhotoGallery: React.FC<ServicePhotoGalleryProps> = ({ images }) => {
  const { isMobile, screenWidth, screenHeight } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, screenHeight);

  if (images.length <= 1) return null;

  return (
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
            <Image source={{ uri: imageUrl }} style={styles.galleryImage} resizeMode="cover" />
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

/**
 * Combined gallery component (backward-compat convenience wrapper).
 * Renders both the hero image and the photo gallery together.
 */
interface ServiceImageGalleryProps {
  mainImage: string | null;
  imageError: boolean;
  onImageError: () => void;
  category: string;
  rating: number;
  images: string[];
}

export const ServiceImageGallery: React.FC<ServiceImageGalleryProps> = ({
  mainImage,
  imageError,
  onImageError,
  category,
  rating,
  images,
}) => {
  return (
    <>
      <ServiceHeroImage
        mainImage={mainImage}
        imageError={imageError}
        onImageError={onImageError}
        category={category}
        rating={rating}
      />
      <ServicePhotoGallery images={images} />
    </>
  );
};
