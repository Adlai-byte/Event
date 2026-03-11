import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ServiceDTO } from '../../types/service';
import { ServicePackage } from '../../models/Package';
import { getCategoryIcon, formatPrice } from '../../utils/serviceHelpers';
import { PackageCard } from '../PackageCard';
import { createStyles } from '../../views/user/ServiceDetailsView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

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
  const { screenWidth, screenHeight } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, screenHeight);

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
                <Feather name="star" size={14} color="#f59e0b" />
                <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                <Text style={styles.reviewCount}>({reviewCount})</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.categoryBadge}>
          <Feather name={getCategoryIcon(service.s_category) as any} size={20} color="#64748B" />
        </View>
      </View>

      {/* Price Section - Only show when no packages */}
      {packages.length === 0 && (
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
      )}

      {/* Deposit & Cancellation Policy */}
      <DepositPolicySection service={service} styles={styles} />

      {/* Available Packages */}
      {packages.length > 0 && (
        <View style={styles.packagesCard}>
          <Text style={styles.cardTitle}>Available Packages</Text>
          <Text style={styles.packagesSubtitle}>
            {isMobile
              ? 'Select a package for better value'
              : 'Select a package for better value or book individual services'}
          </Text>
          {packages.map((pkg) => (
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
              <Feather name="clock" size={18} color="#64748B" />
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
              <Feather name="users" size={18} color="#64748B" />
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="map-pin" size={16} color="#64748B" />
            <Text style={styles.cardTitle}>Location</Text>
          </View>
          <View style={styles.locationContent}>
            {service.s_address && <Text style={styles.locationText}>{service.s_address}</Text>}
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

/** Deposit percentage and cancellation policy display */
const DepositPolicySection: React.FC<{
  service: ServiceDTO;
  styles: ReturnType<typeof createStyles>;
}> = ({ service, styles }) => {
  const [expanded, setExpanded] = useState(false);

  const depositPercent = Number(service.s_deposit_percent) || 0;
  const hasDeposit = depositPercent > 0 && depositPercent < 100;
  const policyName = service.policy_name;
  const policyRules = service.policy_rules;
  const hasPolicyRules = Array.isArray(policyRules) && policyRules.length > 0;

  if (!hasDeposit && !hasPolicyRules) return null;

  const formatRuleLabel = (daysBefore: number, index: number, total: number): string => {
    if (index === 0) return `${daysBefore}+ days before event`;
    const prevDays = policyRules![index - 1].days_before;
    if (daysBefore === 0) return index === total - 1 ? `Less than ${prevDays} days` : `0 days`;
    return `${daysBefore}–${prevDays - 1} days before`;
  };

  return (
    <View style={styles.detailsCard}>
      {hasDeposit && (
        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Feather name="credit-card" size={18} color="#64748B" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Deposit Required</Text>
              <Text style={styles.detailValue}>
                {depositPercent}% at booking
                {Number(service.s_base_price) > 0
                  ? ` (${formatPrice(Math.round((Number(service.s_base_price) * depositPercent) / 100))})`
                  : ''}
              </Text>
            </View>
          </View>
        </View>
      )}

      {hasPolicyRules && (
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} cancellation policy`}
          style={{ marginTop: hasDeposit ? 12 : 0 }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Feather name="shield" size={18} color="#64748B" />
              <View>
                <Text style={styles.detailLabel}>Cancellation Policy</Text>
                <Text style={styles.detailValue}>{policyName || 'Standard'}</Text>
              </View>
            </View>
            <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
          </View>
        </TouchableOpacity>
      )}

      {expanded && hasPolicyRules && (
        <View style={{ marginTop: 12, gap: 6 }}>
          {[...policyRules!]
            .sort((a, b) => b.days_before - a.days_before)
            .map((rule, i, arr) => (
              <View
                key={rule.days_before}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 4,
                }}
              >
                <Text style={styles.detailLabel}>
                  {formatRuleLabel(rule.days_before, i, arr.length)}
                </Text>
                <Text
                  style={[
                    styles.detailValue,
                    { color: rule.refund_percent > 0 ? '#16a34a' : '#dc2626' },
                  ]}
                >
                  {rule.refund_percent > 0 ? `${rule.refund_percent}% refund` : 'No refund'}
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
};
