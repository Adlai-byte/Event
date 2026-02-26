import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../../views/user/DashboardView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { ServiceDTO as Service } from '../../types/service';
import { ProviderDTO as Provider } from '../../types/provider';
import {
  getCategoryIcon,
  getCategoryLabel,
  formatPrice,
  groupByProvider,
} from '../../utils/serviceHelpers';
import { getApiBaseUrl } from '../../services/api';

interface SearchResultsSectionProps {
  searchResults: Service[];
  providerResults: Provider[];
  isSearching: boolean;
  searchQuery: string;
  filterMinPrice: string;
  filterMaxPrice: string;
  filterCity: string;
  filterMinRating: string;
  filterCategory: string;
  onBack: () => void;
  onNavigateToProviderProfile: (providerEmail: string) => void;
  onBookNow: (service: Service) => void;
  onViewService: (serviceId: string) => void;
}

export const SearchResultsSection: React.FC<SearchResultsSectionProps> = ({
  searchResults,
  providerResults,
  isSearching,
  searchQuery,
  filterMinPrice,
  filterMaxPrice,
  filterCity,
  filterMinRating,
  filterCategory,
  onBack,
  onNavigateToProviderProfile,
  onBookNow,
  onViewService,
}) => {
  const { isMobile, screenWidth, isMobileWeb } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, isMobileWeb);

  return (
    <>
      {/* Search Results View */}
      <View style={styles.searchResultsHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="arrow-left" size={20} color="#1E293B" />
            <Text style={styles.backButtonText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.searchResultsTitle}>
          {searchQuery ? `Search Results for "${searchQuery}"` : 'Filtered Results'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {isSearching && searchResults.length === 0 && providerResults.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a55e1" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <ScrollView style={styles.searchResultsScroll}>
          {/* Provider Results */}
          {providerResults.length > 0 && (
            <View style={styles.providersSection}>
              <Text style={styles.sectionTitle}>Providers</Text>
              <View style={styles.providersContainer}>
                {providerResults.map((provider) => (
                  <TouchableOpacity
                    key={provider.iduser}
                    style={styles.providerCard}
                    onPress={() => onNavigateToProviderProfile(provider.u_email)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.providerImageContainer}>
                      {provider.u_profile_picture ? (
                        <Image
                          source={{
                            uri: provider.u_profile_picture.startsWith('/uploads/')
                              ? `${getApiBaseUrl()}${provider.u_profile_picture}`
                              : provider.u_profile_picture,
                          }}
                          style={styles.providerImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.providerImagePlaceholder}>
                          <Text style={styles.providerImagePlaceholderText}>
                            {provider.provider_name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.providerInfo}>
                      <Text style={styles.providerName} numberOfLines={1}>
                        {provider.provider_name}
                      </Text>
                      <Text style={styles.providerServicesCount}>
                        {provider.service_count}{' '}
                        {provider.service_count === 1 ? 'service' : 'services'}
                      </Text>
                      {provider.avg_rating && parseFloat(String(provider.avg_rating)) > 0 ? (
                        <View style={styles.providerRating}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Feather name="star" size={14} color="#f59e0b" />
                            <Text style={styles.providerRatingText}>
                              {parseFloat(String(provider.avg_rating)).toFixed(1)}
                            </Text>
                          </View>
                          {provider.review_count && (
                            <Text style={styles.providerReviewCount}>
                              ({provider.review_count}{' '}
                              {parseInt(String(provider.review_count)) === 1 ? 'review' : 'reviews'}
                              )
                            </Text>
                          )}
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.providerArrow}>
                      <Feather name="chevron-right" size={18} color="#2563EB" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Service Results - Grouped by Provider */}
          {searchResults.length > 0 ? (
            <>
              {Object.entries(groupByProvider(searchResults)).map(
                ([providerKey, providerServices]) => {
                  const firstService = providerServices[0];
                  const providerName = firstService.provider_name || providerKey;
                  const providerEmail = firstService.provider_email || providerKey;

                  return (
                    <View key={providerKey} style={styles.providerGroup}>
                      {/* Provider Header */}
                      <TouchableOpacity
                        style={styles.providerGroupHeader}
                        onPress={() => onNavigateToProviderProfile(providerEmail)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.providerGroupHeaderContent}>
                          <Text style={styles.providerGroupTitle}>{providerName}</Text>
                          <Text style={styles.providerGroupCount}>
                            {providerServices.length}{' '}
                            {providerServices.length === 1 ? 'service' : 'services'}
                          </Text>
                        </View>
                        <Feather name="chevron-right" size={18} color="#2563EB" />
                      </TouchableOpacity>

                      {/* Services Grid for this Provider */}
                      <View style={styles.servicesGrid}>
                        {providerServices.map((serviceItem, index) => {
                          // On mobile: 1 item per row, on web: 2 items per row
                          const itemsPerRow = Platform.OS === 'web' ? 2 : 1;
                          if (index % itemsPerRow === 0) {
                            const rowItems = providerServices.slice(index, index + itemsPerRow);
                            return (
                              <View key={`row-${providerKey}-${index}`} style={styles.servicesRow}>
                                {rowItems.map((item) => (
                                  <View
                                    key={item.idservice.toString()}
                                    style={styles.serviceCardWrapper}
                                  >
                                    <View style={[styles.serviceCard, styles.serviceCardGrid]}>
                                      <TouchableOpacity
                                        onPress={() => onViewService(item.idservice.toString())}
                                        activeOpacity={0.7}
                                      >
                                        <View style={styles.serviceImageContainer}>
                                          {item.primary_image &&
                                          (item.primary_image.startsWith('http://') ||
                                            item.primary_image.startsWith('https://') ||
                                            item.primary_image.startsWith('data:image')) ? (
                                            <Image
                                              source={{ uri: item.primary_image }}
                                              style={styles.serviceImage as any}
                                              resizeMode="cover"
                                            />
                                          ) : (
                                            <Feather
                                              name={getCategoryIcon(item.s_category) as any}
                                              size={32}
                                              color="#64748B"
                                            />
                                          )}
                                        </View>
                                        <View style={styles.serviceInfo}>
                                          <View style={styles.serviceTitleRow}>
                                            <Text style={styles.serviceTitle} numberOfLines={1}>
                                              {item.s_name}
                                            </Text>
                                            <View style={styles.categoryTag}>
                                              <Feather
                                                name={getCategoryIcon(item.s_category) as any}
                                                size={12}
                                                color="#64748B"
                                              />
                                              <Text style={styles.categoryTagText}>
                                                {getCategoryLabel(item.s_category)}
                                              </Text>
                                            </View>
                                          </View>
                                          {(() => {
                                            const rating =
                                              typeof item.s_rating === 'string'
                                                ? parseFloat(item.s_rating)
                                                : item.s_rating || 0;
                                            const reviewCount = item.s_review_count || 0;
                                            return rating > 0 && !isNaN(rating) ? (
                                              <View style={styles.ratingContainer}>
                                                <View
                                                  style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                  }}
                                                >
                                                  <Feather name="star" size={14} color="#f59e0b" />
                                                  <Text style={styles.ratingText}>
                                                    {rating.toFixed(1)}
                                                  </Text>
                                                </View>
                                                <Text style={styles.reviewCount}>
                                                  ({reviewCount})
                                                </Text>
                                              </View>
                                            ) : null;
                                          })()}
                                          <Text style={styles.servicePrice}>
                                            {formatPrice(item.s_base_price)}
                                          </Text>
                                          {(item.s_city || item.s_state || item.s_address) && (
                                            <View
                                              style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 4,
                                              }}
                                            >
                                              <Feather name="map-pin" size={14} color="#64748B" />
                                              <Text
                                                style={[styles.serviceLocation, { flex: 1 }]}
                                                numberOfLines={2}
                                              >
                                                {(() => {
                                                  const locationParts: string[] = [];
                                                  if (item.s_address) {
                                                    const address = item.s_address.trim();
                                                    const coordsMatch =
                                                      address.match(/\(([\d.-]+),([\d.-]+)\)/);
                                                    if (coordsMatch) {
                                                      locationParts.push(
                                                        address
                                                          .replace(/\s*\([\d.-]+,[\d.-]+\)\s*/, '')
                                                          .trim(),
                                                      );
                                                    } else {
                                                      locationParts.push(address);
                                                    }
                                                  }
                                                  if (
                                                    item.s_city &&
                                                    !locationParts.some((part) =>
                                                      part
                                                        .toLowerCase()
                                                        .includes(item.s_city!.toLowerCase()),
                                                    )
                                                  ) {
                                                    locationParts.push(item.s_city);
                                                  }
                                                  if (
                                                    item.s_state &&
                                                    !locationParts.some((part) =>
                                                      part
                                                        .toLowerCase()
                                                        .includes(item.s_state!.toLowerCase()),
                                                    )
                                                  ) {
                                                    locationParts.push(item.s_state);
                                                  }
                                                  return locationParts.length > 0
                                                    ? locationParts.join(', ')
                                                    : 'Location not specified';
                                                })()}
                                              </Text>
                                            </View>
                                          )}
                                        </View>
                                      </TouchableOpacity>
                                      <View style={styles.serviceActions}>
                                        <TouchableOpacity
                                          style={styles.viewDetailsButton}
                                          onPress={() => onViewService(item.idservice.toString())}
                                          activeOpacity={0.8}
                                        >
                                          <Text style={styles.viewDetailsButtonText}>
                                            View Details
                                          </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          style={styles.bookNowButton}
                                          onPress={() => onBookNow(item)}
                                          activeOpacity={0.8}
                                        >
                                          <Text style={styles.bookNowButtonText}>Book Now</Text>
                                        </TouchableOpacity>
                                      </View>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            );
                          }
                          return null;
                        })}
                      </View>
                    </View>
                  );
                },
              )}
            </>
          ) : null}

          {/* Empty State */}
          {searchResults.length === 0 && providerResults.length === 0 && !isSearching ? (
            <View style={styles.emptyState}>
              <Feather name="search" size={48} color="#94A3B8" />
              <Text style={styles.emptyStateText}>No data found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery.trim() ||
                filterMinPrice ||
                filterMaxPrice ||
                filterCity ||
                filterMinRating ||
                filterCategory
                  ? 'Try adjusting your search or filters'
                  : 'No results available at the moment'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </>
  );
};
