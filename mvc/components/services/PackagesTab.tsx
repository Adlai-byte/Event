import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ServicePackage, formatPeso, calculatePackagePrice } from '../../models/Package';
import { ProviderService } from '../../hooks/useServicesList';
import { createStyles } from '../../views/provider/ServicesView.styles';

interface PackagesTabProps {
  services: ProviderService[];
  packages: Record<string, ServicePackage[]>;
  loadingPackages: boolean;
  successMessage: string;
  onDismissSuccess: () => void;
  onCreatePackage: (service: ProviderService) => void;
  onEditPackage: (pkg: ServicePackage, service: ProviderService) => void;
  onDeletePackage: (pkg: ServicePackage) => void;
  isMobile: boolean;
  screenWidth: number;
}

export const PackagesTab: React.FC<PackagesTabProps> = ({
  services,
  packages,
  loadingPackages,
  successMessage,
  onDismissSuccess,
  onCreatePackage,
  onEditPackage,
  onDeletePackage,
  isMobile,
  screenWidth,
}) => {
  const styles = createStyles(isMobile, screenWidth);

  return (
    <View style={styles.packagesContainer}>
      {successMessage ? (
        <View style={styles.successMessage}>
          <Text style={styles.successMessageText}>{successMessage}</Text>
          <TouchableOpacity onPress={onDismissSuccess} style={styles.successCloseButton}>
            <Text style={styles.successCloseText}>x</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loadingPackages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading packages...</Text>
        </View>
      ) : services.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No services yet</Text>
          <Text style={styles.emptyStateSubtext}>Create a service first to add packages</Text>
        </View>
      ) : (
        <>
          {services.map((service) => (
            <View key={service.id} style={styles.servicePackageSection}>
              <View style={styles.servicePackageHeader}>
                <View style={styles.servicePackageInfo}>
                  <Text style={styles.servicePackageName}>{service.name}</Text>
                  <Text style={styles.servicePackageCategory}>
                    {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.createPackageButton}
                  onPress={() => onCreatePackage(service)}
                >
                  <Text style={styles.createPackageIcon}>+</Text>
                  <Text style={styles.createPackageText}>Add Package</Text>
                </TouchableOpacity>
              </View>

              {packages[service.id]?.length > 0 ? (
                <View style={styles.packagesList}>
                  {packages[service.id].map((pkg) => {
                    const price =
                      pkg.priceType === 'calculated'
                        ? calculatePackagePrice(pkg)
                        : pkg.basePrice || 0;

                    return (
                      <View key={pkg.id} style={styles.packageCard}>
                        <View style={styles.packageCardHeader}>
                          <View style={styles.packageCardInfo}>
                            <Text style={styles.packageCardName}>{pkg.name}</Text>
                            {pkg.description && (
                              <Text style={styles.packageCardDescription} numberOfLines={2}>
                                {pkg.description}
                              </Text>
                            )}
                          </View>
                          <View style={styles.packageCardPrice}>
                            <Text style={styles.packagePriceLabel}>
                              {pkg.priceType === 'per_person' ? 'Per Person' : 'Total'}
                            </Text>
                            <Text style={styles.packagePriceValue}>{formatPeso(price)}</Text>
                            {pkg.discountPercent > 0 && (
                              <Text style={styles.packageDiscount}>
                                {pkg.discountPercent}% off
                              </Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.packageCardMeta}>
                          {pkg.minGuests && (
                            <Text style={styles.packageMetaText}>Min: {pkg.minGuests} guests</Text>
                          )}
                          {pkg.maxGuests && (
                            <Text style={styles.packageMetaText}>Max: {pkg.maxGuests} guests</Text>
                          )}
                          <Text style={styles.packageMetaText}>
                            {pkg.categories.length} categories
                          </Text>
                          <Text style={styles.packageMetaText}>
                            {pkg.categories.reduce((sum, c) => sum + c.items.length, 0)} items
                          </Text>
                        </View>

                        <View style={styles.packageCardActions}>
                          <TouchableOpacity
                            style={[styles.packageActionButton, styles.packageEditButton]}
                            onPress={() => onEditPackage(pkg, service)}
                          >
                            <Text style={styles.packageEditButtonText}>Edit</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.packageActionButton, styles.packageDeleteButton]}
                            onPress={() => onDeletePackage(pkg)}
                          >
                            <Text style={styles.packageDeleteButtonText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.noPackages}>
                  <Text style={styles.noPackagesText}>No packages yet</Text>
                </View>
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );
};
