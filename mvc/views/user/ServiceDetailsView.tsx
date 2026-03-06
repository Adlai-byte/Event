import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SkeletonCard } from '../../components/ui';
import { Feather } from '@expo/vector-icons';
import { AppLayout } from '../../components/layout';
import {
  ServiceHeroImage,
  ServicePhotoGallery,
} from '../../components/services/ServiceImageGallery';
import { ServiceInfoSection } from '../../components/services/ServiceInfoSection';
import { ReviewsSection } from '../../components/services/ReviewsSection';
import { useServiceDetails } from '../../hooks/useServiceDetails';
import { createStyles } from './ServiceDetailsView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface ServiceDetailsViewProps {
  serviceId: string;
  onBookNow?: (serviceId: string, packageId?: number) => void;
  onNavigateToProviderProfile?: (providerEmail: string) => void;
  user?: { firstName?: string; lastName?: string; email?: string; profilePicture?: string };
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

const formatDuration = (minutes: number | string | null | undefined): string => {
  const numMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes || 0;
  if (isNaN(numMinutes) || numMinutes <= 0) return 'N/A';

  const MINUTES_PER_HOUR = 60;
  const MINUTES_PER_DAY = 1440; // 24 hours * 60 minutes

  // Handle days (24 hours = 1 day)
  if (numMinutes >= MINUTES_PER_DAY) {
    const days = Math.floor(numMinutes / MINUTES_PER_DAY);
    const remainingMinutes = numMinutes % MINUTES_PER_DAY;

    if (remainingMinutes === 0) {
      return days === 1 ? '1 day' : `${days} days`;
    }

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

  if (numMinutes === 60) {
    return '1hr';
  }

  if (numMinutes % 60 === 0) {
    const hours = numMinutes / 60;
    return `${hours}hr`;
  }

  if (numMinutes > 60) {
    const hours = Math.floor(numMinutes / 60);
    const mins = numMinutes % 60;
    if (mins === 0) {
      return `${hours}hr`;
    }
    return `${hours}hr ${mins}min`;
  }

  return `${numMinutes}min`;
};

const getPricingTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    fixed: 'Fixed Price',
    hourly: 'Per Hour',
    per_person: 'Per Person',
    package: 'Package',
    custom: 'Custom',
  };
  return labels[type] || type;
};

export const ServiceDetailsView: React.FC<ServiceDetailsViewProps> = ({
  serviceId,
  onBookNow,
  onNavigateToProviderProfile,
  user,
  onNavigate,
  onLogout,
}) => {
  const { isMobile, screenWidth, screenHeight } = useBreakpoints();
  const styles = useMemo(
    () => createStyles(isMobile, screenWidth, screenHeight),
    [isMobile, screenWidth, screenHeight],
  );

  const {
    service,
    loading,
    images,
    imageError,
    setImageError,
    reviews,
    loadingReviews,
    packages,
    selectedPackage,
    setSelectedPackage,
  } = useServiceDetails(serviceId, onNavigate);

  if (loading) {
    return (
      <AppLayout
        role="user"
        activeRoute="dashboard"
        title="Service Details"
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <View style={{ padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </AppLayout>
    );
  }

  if (!service) {
    return (
      <AppLayout
        role="user"
        activeRoute="dashboard"
        title="Service Details"
        user={user}
        onNavigate={onNavigate}
        onLogout={onLogout}
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Service not found</Text>
        </View>
      </AppLayout>
    );
  }

  const rating =
    typeof service.s_rating === 'string' ? parseFloat(service.s_rating) : service.s_rating || 0;
  const reviewCount = service.s_review_count || 0;
  const mainImage = images.length > 0 ? images[0] : service.primary_image || null;
  const isWeb = Platform.OS === 'web';

  const scrollContent = (
    <>
      {/* Hero Image */}
      <ServiceHeroImage
        mainImage={mainImage}
        imageError={imageError}
        onImageError={() => setImageError(true)}
        category={service.s_category}
        rating={rating}
      />

      {/* Service Info Card (gallery + reviews rendered inside via children) */}
      <ServiceInfoSection
        service={service}
        rating={rating}
        reviewCount={reviewCount}
        packages={packages}
        selectedPackage={selectedPackage}
        onSelectPackage={setSelectedPackage}
        onNavigateToProviderProfile={onNavigateToProviderProfile}
        formatDuration={formatDuration}
        getPricingTypeLabel={getPricingTypeLabel}
        isMobile={!isWeb}
      >
        <ServicePhotoGallery images={images} />
        <ReviewsSection reviews={reviews} loadingReviews={loadingReviews} />
      </ServiceInfoSection>
    </>
  );

  const footerContent = (
    <View style={styles.footer}>
      <View style={styles.footerButtons}>
        {service?.provider_email && onNavigateToProviderProfile && (
          <TouchableOpacity
            style={styles.viewProfileButton}
            onPress={() => onNavigateToProviderProfile(service.provider_email!)}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="View provider profile"
          >
            <Feather name="user" size={16} color="#4a55e1" style={{ marginRight: 6 }} />
            <Text style={styles.viewProfileButtonText}>View Profile</Text>
          </TouchableOpacity>
        )}
        {onBookNow && (
          <TouchableOpacity
            style={[
              styles.modernBookButton,
              !(service?.provider_email && onNavigateToProviderProfile) &&
                styles.modernBookButtonFull,
            ]}
            onPress={() => onBookNow(serviceId, selectedPackage?.id)}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Book this service"
          >
            <Feather name="calendar" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.modernBookButtonText}>Book Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <AppLayout
      role="user"
      activeRoute="dashboard"
      title="Service Details"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
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
              {scrollContent}
            </ScrollView>
            {footerContent}
          </View>
        ) : (
          <>
            {/* Mobile: Full Screen Layout */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {scrollContent}
            </ScrollView>
            {footerContent}
          </>
        )}
      </View>
    </AppLayout>
  );
};

export default ServiceDetailsView;
