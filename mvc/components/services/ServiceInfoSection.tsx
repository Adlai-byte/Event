import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ServiceDTO } from '../../types/service';
import { ServicePackage } from '../../models/Package';
import { getCategoryIcon, formatPrice } from '../../utils/serviceHelpers';
import { PackageCard } from '../PackageCard';
import { styles } from '../../views/user/ServiceDetailsView.styles';

interface ServiceInfoSectionProps {
  service: ServiceDTO;
  rating: number;
  reviewCount: number | string;
  packages: ServicePackage[];
  selectedPackage: ServicePackage | null;
  onSelectPackage: (pkg: ServicePackage | null) => void;
  onNavigateToProviderProfile?: (providerEmail: string) => void;
  /** Duration formatting function */
  formatDuration: (minutes: number | string | null | undefined) => string;
  /** Pricing type label function */
  getPricingTypeLabel: (type: string) => string;
  /** Whether this is the mobile variant (slightly different subtitle text and duration display) */
  isMobile?: boolean;
  /** Children rendered inside the info card (gallery, reviews, etc.) */
  children?: React.ReactNode;
}

export const ServiceInfoSection: React.FC<ServiceInfoSectionProps> = ({
  service,
  rating,
  reviewCount,
  packages,
  selectedPackage,
  onSelectPackage,
  onNavigateToProviderProfile,
  formatDuration,
  getPricingTypeLabel,
  isMobile = false,
  children,
}) => {
  return (
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
            {isMobile
              ? 'Select a package for better value'
              : 'Select a package for better value or book individual services'}
          </Text>
          {packages.map(pkg => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={selectedPackage?.id === pkg.id}
              onSelect={(p) => onSelectPackage(selectedPackage?.id === p.id ? null : p)}
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
                <Text style={styles.detailValue}>
                  {isMobile ? `${service.s_duration} min` : formatDuration(service.s_duration)}
                </Text>
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

      {/* Gallery, Reviews, and other content passed as children */}
      {children}
    </View>
  );
};
