import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { styles } from '../../views/user/DashboardView.styles';
import { getCategoryLabel } from '../../utils/serviceHelpers';

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
  clearFilters,
  applyFilters,
}) => {
  return (
    <>
      {/* Filter Panel */}
      {showFilters ? (
        <View style={styles.filterPanel}>
          <View style={styles.filterPanelHeader}>
            <Text style={styles.filterPanelTitle}>Filter Services</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Text style={styles.filterCloseButton}>{'\u2715'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.filterContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.filterContentContainer}
          >
            {/* Category Selection */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>&#127991;&#65039; Category</Text>
              <View style={styles.categoryButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryFilterButton,
                    filterCategory === '' && styles.categoryFilterButtonActive
                  ]}
                  onPress={() => setFilterCategory('')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.categoryFilterButtonText,
                    filterCategory === '' && styles.categoryFilterButtonTextActive
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                {['photography', 'venue', 'music', 'catering'].map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryFilterButton,
                      filterCategory === category && styles.categoryFilterButtonActive
                    ]}
                    onPress={() => setFilterCategory(category)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.categoryFilterButtonText,
                      filterCategory === category && styles.categoryFilterButtonTextActive
                    ]}>
                      {getCategoryLabel(category)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>&#128176; Price Range (&#8369;)</Text>
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
              <Text style={styles.filterLabel}>&#128205; Location</Text>
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
              <Text style={styles.filterLabel}>&#11088; Minimum Rating</Text>
              <TouchableOpacity
                style={styles.ratingDropdownButton}
                onPress={() => setShowRatingDropdown(true)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.ratingDropdownText,
                  !filterMinRating && styles.ratingDropdownPlaceholder
                ]}>
                  {filterMinRating ? ratingOptions.find(opt => opt.value === filterMinRating)?.label || filterMinRating : 'Select rating'}
                </Text>
                <Text style={styles.ratingDropdownArrow}>{'\u25BC'}</Text>
              </TouchableOpacity>
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
                <Text style={styles.ratingModalCloseText}>{'\u2715'}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.ratingModalBody}>
              {ratingOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.ratingModalItem,
                    filterMinRating === option.value && styles.ratingModalItemSelected
                  ]}
                  onPress={() => {
                    setFilterMinRating(option.value);
                    setShowRatingDropdown(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.ratingModalItemText,
                    filterMinRating === option.value && styles.ratingModalItemTextSelected
                  ]}>
                    {option.label}
                  </Text>
                  {filterMinRating === option.value && (
                    <Text style={styles.ratingModalCheckmark}>{'\u2713'}</Text>
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
