import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createStyles } from '../../views/user/DashboardView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import { getCategoryLabel } from '../../utils/serviceHelpers';
import { semantic } from '../../theme';

interface FilterPanelProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filterCategory: string;
  setFilterCategory: (category: string) => void;
  filterMinPrice: string;
  setFilterMinPrice: (price: string) => void;
  filterMaxPrice: string;
  setFilterMaxPrice: (price: string) => void;
  filterCity: string;
  setFilterCity: (city: string) => void;
  filterMinRating: string;
  setFilterMinRating: (rating: string) => void;
  filterRadius: string;
  setFilterRadius: (radius: string) => void;
  showRatingDropdown: boolean;
  setShowRatingDropdown: (show: boolean) => void;
  userLocation: { latitude: number; longitude: number } | null;
  filterAvailableDate: string;
  setFilterAvailableDate: (date: string) => void;
  clearFilters: () => void;
  applyFilters: () => void;
}

// Rating options for dropdown
const ratingOptions = [
  { label: 'No minimum', value: '' },
  { label: '0.0', value: '0.0' },
  { label: '0.5', value: '0.5' },
  { label: '1.0', value: '1.0' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2.0' },
  { label: '2.5', value: '2.5' },
  { label: '3.0', value: '3.0' },
  { label: '3.5', value: '3.5' },
  { label: '4.0', value: '4.0' },
  { label: '4.5', value: '4.5' },
  { label: '5.0', value: '5.0' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  showFilters,
  setShowFilters,
  filterCategory,
  setFilterCategory,
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
  showRatingDropdown,
  setShowRatingDropdown,
  userLocation,
  filterAvailableDate,
  setFilterAvailableDate,
  clearFilters,
  applyFilters,
}) => {
  const { isMobile, screenWidth, isMobileWeb } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth, isMobileWeb);

  return (
    <>
      {/* Filter Panel */}
      {showFilters ? (
        <View style={styles.filterPanel}>
          <View style={styles.filterPanelHeader}>
            <Text style={styles.filterPanelTitle}>Filter Services</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.filterContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterContentContainer}
          >
            {/* Category Selection */}
            <View style={styles.filterSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="grid" size={16} color="#2563EB" />
                <Text style={styles.filterLabel}>Category</Text>
              </View>
              <View style={styles.categoryButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryFilterButton,
                    filterCategory === '' && styles.categoryFilterButtonActive,
                  ]}
                  onPress={() => setFilterCategory('')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.categoryFilterButtonText,
                      filterCategory === '' && styles.categoryFilterButtonTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {['photography', 'venue', 'music', 'catering'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryFilterButton,
                      filterCategory === category && styles.categoryFilterButtonActive,
                    ]}
                    onPress={() => setFilterCategory(category)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.categoryFilterButtonText,
                        filterCategory === category && styles.categoryFilterButtonTextActive,
                      ]}
                    >
                      {getCategoryLabel(category)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="dollar-sign" size={16} color="#2563EB" />
                <Text style={styles.filterLabel}>Price Range (&#8369;)</Text>
              </View>
              <View style={styles.priceRangeContainer}>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Min</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0"
                    value={filterMinPrice}
                    onChangeText={setFilterMinPrice}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={styles.priceSeparatorContainer}>
                  <Text style={styles.priceSeparator}>-</Text>
                </View>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.priceLabel}>Max</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="No limit"
                    value={filterMaxPrice}
                    onChangeText={setFilterMaxPrice}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>
            </View>

            {/* Location/Area */}
            <View style={styles.filterSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="map-pin" size={16} color="#2563EB" />
                <Text style={styles.filterLabel}>Location</Text>
              </View>
              <TextInput
                style={styles.filterInput}
                placeholder="City name (e.g., Manila)"
                value={filterCity}
                onChangeText={setFilterCity}
                placeholderTextColor="#94a3b8"
              />
              {userLocation && (
                <View style={styles.radiusContainer}>
                  <Text style={styles.radiusLabel}>Radius: {filterRadius} km</Text>
                  <TextInput
                    style={styles.radiusInput}
                    placeholder="100"
                    value={filterRadius}
                    onChangeText={setFilterRadius}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              )}
            </View>

            {/* Rating */}
            <View style={styles.filterSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="star" size={16} color="#f59e0b" />
                <Text style={styles.filterLabel}>Minimum Rating</Text>
              </View>
              <TouchableOpacity
                style={styles.ratingDropdownButton}
                onPress={() => setShowRatingDropdown(true)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.ratingDropdownText,
                    !filterMinRating && styles.ratingDropdownPlaceholder,
                  ]}
                >
                  {filterMinRating
                    ? ratingOptions.find((opt) => opt.value === filterMinRating)?.label ||
                      filterMinRating
                    : 'Select rating'}
                </Text>
                <Feather name="chevron-down" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Available On Date Filter */}
            <View style={styles.filterSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Feather name="calendar" size={16} color="#2563EB" />
                <Text style={styles.filterLabel}>Available On</Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: semantic.border,
                  borderRadius: 8,
                  backgroundColor: semantic.surface,
                  paddingHorizontal: 12,
                }}
              >
                <TextInput
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: semantic.textPrimary,
                  }}
                  placeholder="YYYY-MM-DD"
                  value={filterAvailableDate}
                  onChangeText={setFilterAvailableDate}
                  accessibilityLabel="Filter by available date"
                  maxLength={10}
                  placeholderTextColor="#94a3b8"
                />
                {filterAvailableDate ? (
                  <TouchableOpacity
                    onPress={() => setFilterAvailableDate('')}
                    style={{ padding: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel="Clear date filter"
                  >
                    <Feather name="x" size={16} color={semantic.textSecondary} />
                  </TouchableOpacity>
                ) : (
                  <Feather
                    name="calendar"
                    size={16}
                    color={semantic.textSecondary}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.filterActions}>
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={clearFilters}
              activeOpacity={0.8}
            >
              <Text style={styles.clearFiltersButtonText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyFiltersButton}
              onPress={applyFilters}
              activeOpacity={0.8}
            >
              <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Rating Dropdown Modal */}
      <Modal
        visible={showRatingDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRatingDropdown(false)}
      >
        <TouchableOpacity
          style={styles.ratingModalOverlay}
          activeOpacity={1}
          onPress={() => setShowRatingDropdown(false)}
        >
          <View style={styles.ratingModalContent}>
            <View style={styles.ratingModalHeader}>
              <Text style={styles.ratingModalTitle}>Select Minimum Rating</Text>
              <TouchableOpacity
                onPress={() => setShowRatingDropdown(false)}
                style={styles.ratingModalCloseButton}
              >
                <Feather name="x" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.ratingModalBody}>
              {ratingOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.ratingModalItem,
                    filterMinRating === option.value && styles.ratingModalItemSelected,
                  ]}
                  onPress={() => {
                    setFilterMinRating(option.value);
                    setShowRatingDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.ratingModalItemText,
                      filterMinRating === option.value && styles.ratingModalItemTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {filterMinRating === option.value && (
                    <Feather name="check" size={16} color="#2563EB" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};
