import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Platform,
  Image,
} from 'react-native';
import { createStyles } from './DashboardView.styles';
import { User } from '../../models/User';
import { AuthState } from '../../models/AuthState';
import { BookingModal } from '../../components/BookingModal';
import { AppLayout } from '../../components/layout';
import { getCategoryIcon, getCategoryLabel, formatPriceDisplay } from '../../utils/serviceHelpers';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useServiceSearch } from '../../hooks/useServiceSearch';
import { ServiceCard } from '../../components/dashboard/ServiceCard';
import { ServiceDTO } from '../../types/service';
import { CategoryCard } from '../../components/dashboard/CategoryCard';
import { BannerSlider } from '../../components/dashboard/BannerSlider';
import { FilterPanel } from '../../components/dashboard/FilterPanel';
import { SearchResultsSection } from '../../components/dashboard/SearchResultsSection';
import { SkeletonCard } from '../../components/ui';
import { Feather } from '@expo/vector-icons';

interface DashboardViewProps {
  user: User;
  authState: AuthState;
  onLogout: () => Promise<boolean>;
  onNavigate: (route: string) => void;
  onNavigateToBookings?: () => void;

  onNavigateToHiring?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToMessages?: () => void;
  onNavigateToLikes?: () => void;
  onNavigateToFeatured?: () => void;
  onNavigateToNearby?: () => void;
  onNavigateToPhotography?: () => void;
  onNavigateToVenues?: () => void;
  onNavigateToMusic?: () => void;
  onNavigateToEventDetails?: (eventId: string) => void;
  onNavigateToProviderProfile?: (providerEmail: string) => void;
  serviceIdToBook?: string | null;
  packageIdToBook?: number;
  onBookingModalClosed?: () => void;
  onNavigateToPersonalInfo?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  authState: _authState,
  onLogout,
  onNavigate,
  onNavigateToBookings: _onNavigateToBookings,
  onNavigateToMessages: _onNavigateToMessages,
  onNavigateToHiring: _onNavigateToHiring,
  onNavigateToProfile,
  onNavigateToNotifications: _onNavigateToNotifications,
  onNavigateToLikes: _onNavigateToLikes,
  onNavigateToFeatured: _onNavigateToFeatured,
  onNavigateToNearby: _onNavigateToNearby,
  onNavigateToPhotography: _onNavigateToPhotography,
  onNavigateToVenues: _onNavigateToVenues,
  onNavigateToMusic: _onNavigateToMusic,
  onNavigateToEventDetails,
  onNavigateToProviderProfile,
  serviceIdToBook,
  packageIdToBook,
  onBookingModalClosed,
  onNavigateToPersonalInfo,
}) => {
  const { screenWidth, isMobile, isMobileWeb } = useBreakpoints();
  const styles = useMemo(
    () => createStyles(isMobile, screenWidth, isMobileWeb),
    [isMobile, screenWidth, isMobileWeb],
  );

  const {
    loading,
    featuredServices,
    bannerServices,
    nearbyServices,
    // photographyServices, venueServices, musicServices also available from hook
    categoryCounts,
    userLocation,
    selectedCategory,
    setSelectedCategory,
    categoryServices,
    loadingCategory,
    showBookingModal,
    selectedService,
    loadDashboardData,
    loadCategoryServices,
    clearCategoryFilter,
    handleBookNow: _handleBookNow,
    handleCloseBookingModal,
    handleConfirmBooking,
    getCategoryImage,
  } = useDashboardData(user, serviceIdToBook, onBookingModalClosed);

  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    providerResults,
    setProviderResults,
    isSearching,
    setIsSearching,
    showFilters,
    setShowFilters,
    filterMinPrice,
    setFilterMinPrice,
    filterMaxPrice,
    setFilterMaxPrice,
    filterCity,
    setFilterCity,
    filterMinRating,
    setFilterMinRating,
    filterRadius,
    setFilterRadius,
    filterCategory,
    setFilterCategory,
    filterAvailableDate,
    setFilterAvailableDate,
    showRatingDropdown,
    setShowRatingDropdown,
    handleSearch,
    clearFilters,
    applyFilters,
  } = useServiceSearch(
    userLocation,
    selectedCategory,
    loadCategoryServices,
    loadDashboardData,
    setSelectedCategory,
  );

  // Wrapper for handleCategoryClick that also clears search/filter state
  const handleCategoryClick = async (category: string, _categoryName: string) => {
    // Clear all filters when clicking a category to show all services
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterCity('');
    setFilterMinRating('');
    setFilterRadius('100');
    setFilterCategory('');
    setFilterAvailableDate('');
    setSearchQuery('');
    setProviderResults([]);
    // Load category services without filters
    await loadCategoryServices(category);
  };

  return (
    <AppLayout
      role="user"
      activeRoute="dashboard"
      title="Dashboard"
      user={user}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          bounces={true}
        >
          {/* Hero Section with Gradient Background */}
          <View style={styles.heroSection}>
            <View style={styles.heroContent}>
              <Text style={styles.heroTitle}>Welcome back, {user.getFullName()}!</Text>
              <Text style={styles.heroSubtitle}>
                Discover amazing events and services around you
              </Text>

              {/* Modern Search Bar */}
              <View style={styles.modernSearchContainer}>
                <View style={styles.searchIconContainer}>
                  <Feather name="search" size={20} color="#94a3b8" />
                </View>
                <TextInput
                  style={styles.modernSearchInput}
                  placeholder={
                    isMobileWeb ? 'Search...' : 'Search events, services, or providers...'
                  }
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#94a3b8"
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    (filterMinPrice ||
                      filterMaxPrice ||
                      filterCity ||
                      filterMinRating ||
                      filterCategory ||
                      filterAvailableDate) &&
                      styles.filterButtonActive,
                  ]}
                  onPress={() => setShowFilters(!showFilters)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Feather
                      name={showFilters ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={
                        filterMinPrice ||
                        filterMaxPrice ||
                        filterCity ||
                        filterMinRating ||
                        filterCategory ||
                        filterAvailableDate
                          ? '#FFFFFF'
                          : '#64748B'
                      }
                    />
                    <Text
                      style={[
                        filterMinPrice ||
                        filterMaxPrice ||
                        filterCity ||
                        filterMinRating ||
                        filterCategory ||
                        filterAvailableDate
                          ? styles.filterButtonTextActive
                          : styles.filterButtonText,
                      ]}
                    >
                      {isMobileWeb ? 'Filter' : 'Filters'}
                    </Text>
                  </View>
                  {filterMinPrice ||
                  filterMaxPrice ||
                  filterCity ||
                  filterMinRating ||
                  filterCategory ||
                  filterAvailableDate ? (
                    <View style={styles.filterBadge} />
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modernSearchButton}
                  onPress={() => {
                    handleSearch();
                  }}
                  activeOpacity={0.8}
                  disabled={false}
                >
                  <Text style={styles.modernSearchButtonText}>Search</Text>
                </TouchableOpacity>
              </View>

              <FilterPanel
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                filterCategory={filterCategory}
                setFilterCategory={setFilterCategory}
                filterMinPrice={filterMinPrice}
                setFilterMinPrice={setFilterMinPrice}
                filterMaxPrice={filterMaxPrice}
                setFilterMaxPrice={setFilterMaxPrice}
                filterCity={filterCity}
                setFilterCity={setFilterCity}
                filterMinRating={filterMinRating}
                setFilterMinRating={setFilterMinRating}
                filterRadius={filterRadius}
                setFilterRadius={setFilterRadius}
                showRatingDropdown={showRatingDropdown}
                setShowRatingDropdown={setShowRatingDropdown}
                userLocation={userLocation}
                filterAvailableDate={filterAvailableDate}
                setFilterAvailableDate={setFilterAvailableDate}
                clearFilters={clearFilters}
                applyFilters={applyFilters}
              />
            </View>
          </View>

          {loading ? (
            <View style={{ padding: 16 }}>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : searchResults.length > 0 ||
            providerResults.length > 0 ||
            isSearching ||
            filterMinPrice ||
            filterMaxPrice ||
            filterCity ||
            filterMinRating ||
            filterCategory ||
            filterAvailableDate ? (
            <SearchResultsSection
              searchResults={searchResults}
              providerResults={providerResults}
              isSearching={isSearching}
              searchQuery={searchQuery}
              filterMinPrice={filterMinPrice}
              filterMaxPrice={filterMaxPrice}
              filterCity={filterCity}
              filterMinRating={filterMinRating}
              filterCategory={filterCategory}
              onBack={async () => {
                setSearchResults([]);
                setProviderResults([]);
                setSearchQuery('');
                setIsSearching(false);
                setFilterMinPrice('');
                setFilterMaxPrice('');
                setFilterCity('');
                setFilterMinRating('');
                setFilterRadius('100');
                setFilterCategory('');
                setFilterAvailableDate('');
                await loadDashboardData();
              }}
              onNavigateToProviderProfile={(email) => onNavigateToProviderProfile?.(email)}
              onViewService={(id) => onNavigateToEventDetails?.(id)}
            />
          ) : selectedCategory ? (
            <>
              {/* Category Filter View */}
              <View style={styles.categoryFilterHeader}>
                <TouchableOpacity onPress={clearCategoryFilter} style={styles.backButton}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Feather name="arrow-left" size={20} color="#1E293B" />
                    <Text style={styles.backButtonText}>Back</Text>
                  </View>
                </TouchableOpacity>
                <Text style={styles.categoryFilterTitle}>
                  {selectedCategory === 'venue'
                    ? 'Venues'
                    : selectedCategory === 'photography'
                      ? 'Photography'
                      : selectedCategory === 'music'
                        ? 'Music'
                        : selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
                </Text>
                <View style={styles.placeholder} />
              </View>

              {loadingCategory ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#64748B" />
                  <Text style={styles.loadingText}>Loading services...</Text>
                </View>
              ) : categoryServices.length > 0 ? (
                <View style={[styles.servicesContainer, styles.servicesGrid]}>
                  {categoryServices.map((item, index) => {
                    // On mobile: 1 item per row, on web: 2 items per row
                    const itemsPerRow = Platform.OS === 'web' ? 2 : 1;
                    if (index % itemsPerRow === 0) {
                      const rowItems = categoryServices.slice(index, index + itemsPerRow);
                      return (
                        <View key={`row-${index}`} style={styles.servicesRow}>
                          {rowItems.map((serviceItem) => (
                            <View
                              key={serviceItem.idservice.toString()}
                              style={styles.serviceCardWrapper}
                            >
                              <View style={[styles.serviceCard, styles.serviceCardGrid]}>
                                <TouchableOpacity
                                  onPress={() =>
                                    onNavigateToEventDetails?.(serviceItem.idservice.toString())
                                  }
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.serviceImageContainer}>
                                    {serviceItem.primary_image &&
                                    (serviceItem.primary_image.startsWith('http://') ||
                                      serviceItem.primary_image.startsWith('https://') ||
                                      serviceItem.primary_image.startsWith('data:image')) ? (
                                      <Image
                                        source={{ uri: serviceItem.primary_image }}
                                        style={styles.serviceImage as any}
                                        resizeMode="cover"
                                      />
                                    ) : (
                                      <Feather
                                        name={getCategoryIcon(serviceItem.s_category) as any}
                                        size={32}
                                        color="#64748B"
                                      />
                                    )}
                                  </View>
                                  <View style={styles.serviceInfo}>
                                    <Text style={styles.serviceTitle} numberOfLines={1}>
                                      {serviceItem.s_name}
                                    </Text>
                                    <Text style={styles.serviceProvider} numberOfLines={1}>
                                      {serviceItem.provider_name}
                                    </Text>
                                    {(() => {
                                      const rating =
                                        typeof serviceItem.s_rating === 'string'
                                          ? parseFloat(serviceItem.s_rating)
                                          : serviceItem.s_rating || 0;
                                      const reviewCount = serviceItem.s_review_count || 0;
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
                                          <Text style={styles.reviewCount}>({reviewCount})</Text>
                                        </View>
                                      ) : null;
                                    })()}
                                    <Text style={styles.servicePrice}>
                                      {formatPriceDisplay(
                                        serviceItem.s_base_price,
                                        serviceItem.min_package_price,
                                        serviceItem.max_package_price,
                                      ).price}
                                    </Text>
                                    {(serviceItem.s_city ||
                                      serviceItem.s_state ||
                                      serviceItem.s_address) && (
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
                                            const locationParts = [];
                                            if (serviceItem.s_address) {
                                              const address = serviceItem.s_address.trim();
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
                                              serviceItem.s_city &&
                                              !locationParts.some((part) =>
                                                part
                                                  .toLowerCase()
                                                  .includes(serviceItem.s_city!.toLowerCase()),
                                              )
                                            ) {
                                              locationParts.push(serviceItem.s_city);
                                            }
                                            if (
                                              serviceItem.s_state &&
                                              !locationParts.some((part) =>
                                                part
                                                  .toLowerCase()
                                                  .includes(serviceItem.s_state!.toLowerCase()),
                                              )
                                            ) {
                                              locationParts.push(serviceItem.s_state);
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
                                    style={[styles.viewDetailsButton, { flex: 1 }]}
                                    onPress={() =>
                                      onNavigateToEventDetails?.(serviceItem.idservice.toString())
                                    }
                                    activeOpacity={0.8}
                                  >
                                    <Text style={styles.viewDetailsButtonText}>View Services</Text>
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
              ) : (
                <View style={styles.emptyState}>
                  <Feather
                    name={getCategoryIcon(selectedCategory) as any}
                    size={48}
                    color="#94A3B8"
                  />
                  <Text style={styles.emptyStateText}>No data found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {filterMinPrice ||
                    filterMaxPrice ||
                    filterCity ||
                    filterMinRating ||
                    filterCategory
                      ? 'No services match your filters. Try adjusting your filter criteria.'
                      : `There are no ${selectedCategory} services available at the moment.`}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Banner Slider - Top 3 High-Rated Services */}
              <BannerSlider
                services={bannerServices}
                screenWidth={screenWidth}
                onViewService={(id) => onNavigateToEventDetails?.(id)}
              />

              {/* Categories */}
              <View style={styles.categoriesContainer}>
                <Text style={styles.sectionTitle}>Categories</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoriesScrollView}
                  contentContainerStyle={styles.categoriesScrollContent}
                  nestedScrollEnabled={true}
                >
                  {[
                    'photography',
                    'venue',
                    'music',
                    'catering',
                    'decoration',
                    'planning',
                    'entertainment',
                    'transport',
                    'other',
                  ].map((category) => {
                    const count = categoryCounts[category] || 0;
                    return (
                      <View key={category}>
                        <CategoryCard
                          icon={getCategoryIcon(category)}
                          label={getCategoryLabel(category)}
                          count={count}
                          categoryImage={getCategoryImage(category)}
                          onPress={() => handleCategoryClick(category, getCategoryLabel(category))}
                        />
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Nearby Services */}
              {nearbyServices.length > 0 && (
                <View style={styles.servicesContainer}>
                  <Text style={styles.sectionTitle}>Nearby Services</Text>
                  <View style={styles.servicesGrid}>
                    {nearbyServices.map((service: ServiceDTO) => (
                      <ServiceCard
                        key={service.idservice}
                        service={service}
                        onView={(id) => onNavigateToEventDetails?.(id)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* All Services */}
              {featuredServices.length > 0 && (
                <View style={styles.servicesContainer}>
                  <Text style={styles.sectionTitle}>All Services</Text>
                  <View style={styles.servicesGrid}>
                    {featuredServices.map((service: ServiceDTO) => (
                      <ServiceCard
                        key={service.idservice}
                        service={service}
                        onView={(id) => onNavigateToEventDetails?.(id)}
                      />
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Booking Modal */}
        {selectedService && (
          <BookingModal
            visible={showBookingModal}
            serviceId={selectedService.idservice}
            serviceName={selectedService.s_name}
            preSelectedPackageId={packageIdToBook}
            onClose={handleCloseBookingModal}
            onConfirm={handleConfirmBooking}
            user={user}
            onNavigateToPersonalInfo={() => {
              handleCloseBookingModal();
              // Navigate directly to personal info page
              if (onNavigateToPersonalInfo) {
                onNavigateToPersonalInfo();
              } else if (onNavigateToProfile) {
                // Fallback to profile if personalInfo navigation not available
                onNavigateToProfile();
              }
            }}
          />
        )}
      </View>
    </AppLayout>
  );
};
