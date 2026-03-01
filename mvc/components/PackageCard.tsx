import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  ServicePackage,
  PackageCategory,
  calculatePackagePrice,
  calculateCategorySubtotal,
  formatPeso,
} from '../models/Package';
import { colors, semantic } from '../theme';
import { useBreakpoints } from '../hooks/useBreakpoints';

interface PackageCardProps {
  pkg: ServicePackage;
  isSelected?: boolean;
  onSelect?: (pkg: ServicePackage) => void;
  showSelectButton?: boolean;
  paxCount?: number;
}

export const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  isSelected = false,
  onSelect,
  showSelectButton = true,
  paxCount = 1,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);
  const [expanded, setExpanded] = useState(false);

  const price = calculatePackagePrice(pkg, paxCount);
  const priceLabel =
    pkg.priceType === 'per_person' ? `${formatPeso(pkg.basePrice || 0)}/person` : formatPeso(price);

  const totalItems = pkg.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const optionalItems = pkg.categories.reduce(
    (sum, cat) => sum + cat.items.filter((item) => item.isOptional).length,
    0,
  );

  const renderCategory = (category: PackageCategory) => {
    const subtotal = calculateCategorySubtotal(category);

    return (
      <View key={category.id || category.name} style={styles.categorySection}>
        <View style={styles.categoryHeader}>
          <Text style={styles.categoryName}>{category.name}</Text>
          <Text style={styles.categorySubtotal}>{formatPeso(subtotal)}</Text>
        </View>

        <View style={styles.itemsList}>
          {category.items.map((item, idx) => (
            <View key={item.id || idx} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {item.name}
                  {item.isOptional && <Text style={styles.optionalTag}> (optional)</Text>}
                </Text>
                <Text style={styles.itemDetails}>
                  {item.quantity} {item.unit} x {formatPeso(item.unitPrice)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatPeso(item.quantity * item.unitPrice)}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.card, isSelected && styles.cardSelected]}>
      {/* Header */}
      <TouchableOpacity
        style={styles.cardHeader}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <View style={styles.expandIconContainer}>
            <Feather name={expanded ? 'chevron-down' : 'chevron-right'} size={16} color="#64748B" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.packageName}>{pkg.name}</Text>
            {pkg.description && (
              <Text style={styles.packageDescription} numberOfLines={expanded ? undefined : 2}>
                {pkg.description}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.priceLabel}>
            {pkg.priceType === 'per_person' ? 'Per Person' : 'Package Price'}
          </Text>
          <Text style={styles.priceValue}>{priceLabel}</Text>
          {pkg.discountPercent > 0 && (
            <Text style={styles.discountBadge}>{pkg.discountPercent}% off</Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Meta info */}
      <View style={styles.metaRow}>
        {pkg.minPax && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Min</Text>
            <Text style={styles.metaValue}>{pkg.minPax} pax</Text>
          </View>
        )}
        {pkg.maxPax && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Max</Text>
            <Text style={styles.metaValue}>{pkg.maxPax} pax</Text>
          </View>
        )}
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Categories</Text>
          <Text style={styles.metaValue}>{pkg.categories.length}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Items</Text>
          <Text style={styles.metaValue}>{totalItems}</Text>
        </View>
        {optionalItems > 0 && (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Optional</Text>
            <Text style={styles.metaValue}>{optionalItems}</Text>
          </View>
        )}
      </View>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {pkg.categories.map((category) => renderCategory(category))}

          {/* Price summary */}
          <View style={styles.priceSummary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                {formatPeso(
                  pkg.categories.reduce((sum, cat) => sum + calculateCategorySubtotal(cat), 0),
                )}
              </Text>
            </View>
            {pkg.discountPercent > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount ({pkg.discountPercent}%)</Text>
                <Text style={[styles.summaryValue, styles.discountValue]}>
                  -
                  {formatPeso(
                    pkg.categories.reduce((sum, cat) => sum + calculateCategorySubtotal(cat), 0) *
                      (pkg.discountPercent / 100),
                  )}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPeso(price)}</Text>
            </View>
            {pkg.priceType === 'per_person' && paxCount > 1 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>For {paxCount} persons</Text>
                <Text style={styles.summaryValue}>{formatPeso(price * paxCount)}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Select button */}
      {showSelectButton && onSelect && (
        <TouchableOpacity
          style={[styles.selectButton, isSelected && styles.selectButtonSelected]}
          onPress={() => onSelect(pkg)}
        >
          <Text style={[styles.selectButtonText, isSelected && styles.selectButtonTextSelected]}>
            {isSelected ? 'Selected' : 'Select Package'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const createStyles = (isMobile: boolean, screenWidth: number) => {
  const isExtraSmall = screenWidth < 360;
  return StyleSheet.create({
    card: {
      backgroundColor: semantic.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: semantic.border,
      marginBottom: 12,
      overflow: 'hidden',
      ...(Platform.OS === 'web'
        ? { boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }
        : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
          }),
    },
    cardSelected: {
      borderColor: semantic.primary,
      borderWidth: 2,
      ...(Platform.OS === 'web' ? { boxShadow: '0 0 0 3px rgba(74, 85, 225, 0.1)' } : {}),
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: isMobile ? 12 : 16,
    },
    headerLeft: {
      flexDirection: 'row',
      flex: 1,
    },
    expandIconContainer: {
      width: 24,
      paddingTop: 2,
    },
    expandIcon: {
      fontSize: 12,
      color: semantic.textSecondary,
    },
    headerInfo: {
      flex: 1,
      marginRight: 12,
    },
    packageName: {
      fontSize: isMobile ? 14 : 16,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    packageDescription: {
      fontSize: 13,
      color: semantic.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    priceLabel: {
      fontSize: 11,
      color: semantic.textMuted,
      textTransform: 'uppercase',
    },
    priceValue: {
      fontSize: isMobile ? 16 : 18,
      fontWeight: '700',
      color: colors.success[600],
    },
    discountBadge: {
      fontSize: 11,
      color: colors.error[600],
      fontWeight: '500',
      marginTop: 2,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: isMobile ? 12 : 16,
      paddingBottom: 12,
      gap: isExtraSmall ? 8 : 12,
    },
    metaItem: {
      alignItems: 'center',
    },
    metaLabel: {
      fontSize: 10,
      color: semantic.textMuted,
      textTransform: 'uppercase',
    },
    metaValue: {
      fontSize: 13,
      color: semantic.textPrimary,
      fontWeight: '500',
    },
    expandedContent: {
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      padding: isMobile ? 12 : 16,
    },
    categorySection: {
      marginBottom: 16,
    },
    categoryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: semantic.background,
      marginBottom: 8,
    },
    categoryName: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    categorySubtotal: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.success[600],
    },
    itemsList: {
      paddingLeft: 8,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    itemInfo: {
      flex: 1,
      marginRight: 12,
    },
    itemName: {
      fontSize: 13,
      color: semantic.textPrimary,
    },
    optionalTag: {
      fontSize: 11,
      color: semantic.textMuted,
      fontStyle: 'italic',
    },
    itemDetails: {
      fontSize: 11,
      color: semantic.textSecondary,
      marginTop: 1,
    },
    itemTotal: {
      fontSize: 13,
      color: semantic.textPrimary,
      fontWeight: '500',
    },
    priceSummary: {
      backgroundColor: '#F9FAFB',
      borderRadius: 8,
      padding: 12,
      marginTop: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    summaryLabel: {
      fontSize: 13,
      color: semantic.textSecondary,
    },
    summaryValue: {
      fontSize: 13,
      color: semantic.textPrimary,
    },
    discountValue: {
      color: colors.error[600],
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: semantic.border,
      paddingTop: 8,
      marginTop: 4,
    },
    totalLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    totalValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.success[600],
    },
    selectButton: {
      backgroundColor: semantic.background,
      paddingVertical: 12,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: semantic.border,
    },
    selectButtonSelected: {
      backgroundColor: semantic.primary,
    },
    selectButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: semantic.textPrimary,
    },
    selectButtonTextSelected: {
      color: semantic.surface,
    },
  });
};

export default PackageCard;
