import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { ProviderService } from '../../hooks/useServicesList';
import { createStyles } from '../../views/provider/ServicesView.styles';

interface ServiceListTabProps {
  services: ProviderService[];
  filteredServices: ProviderService[];
  searchQuery: string;
  onSearchChange: (text: string) => void;
  filterCategory: string;
  onFilterChange: (category: string) => void;
  categories: string[];
  successMessage: string;
  onDismissSuccess: () => void;
  onToggleStatus: (service: ProviderService) => void;
  onEdit: (service: ProviderService) => void;
  isMobile: boolean;
  screenWidth: number;
}

export const ServiceListTab: React.FC<ServiceListTabProps> = ({
  filteredServices,
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
  categories,
  successMessage,
  onDismissSuccess,
  onToggleStatus,
  onEdit,
  isMobile,
  screenWidth,
}) => {
  const styles = createStyles(isMobile, screenWidth);

  const renderServiceRow = (service: ProviderService, i: number) => (
    <View key={service.id} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
      <View style={styles.tableColImage}>
        {service.image &&
        (service.image.startsWith('http://') ||
          service.image.startsWith('https://') ||
          service.image.startsWith('data:image')) ? (
          <Image
            source={{ uri: service.image }}
            style={styles.tableImage}
            onError={(e) => {
              console.error('Image load error for service:', service.name);
              console.error('Error details:', e.nativeEvent?.error || 'Unknown error');
              console.log('Image URL:', service.image);
              console.log('Image URL length:', service.image?.length);
            }}
            onLoad={() =>
              console.log(
                'Image loaded for service:',
                service.name,
                'URL:',
                service.image?.substring(0, 60),
              )
            }
          />
        ) : (
          <View style={styles.tableImagePlaceholder}>
            <Text style={styles.tableImagePlaceholderText}>📷</Text>
          </View>
        )}
      </View>
      <View style={styles.tableColName}>
        <Text style={[styles.tableCell, { fontWeight: '600' }]} numberOfLines={1}>
          {service.name}
        </Text>
      </View>
      <View style={styles.tableColCategory}>
        <Text style={styles.tableCell}>
          {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
        </Text>
      </View>
      <View style={styles.tableColPrice}>
        <Text style={[styles.tableCell, { fontWeight: '600' }]}>
          ₱{service.price.toLocaleString()}
        </Text>
      </View>
      <View style={styles.tableColRating}>
        <Text style={[styles.tableCell, { fontSize: 13 }]}>
          ⭐ {service.rating} ({service.bookings})
        </Text>
      </View>
      <View style={styles.tableColStatus}>
        <View
          style={[
            styles.statusBadge,
            service.status === 'active' ? styles.statusActive : styles.statusInactive,
          ]}
        >
          <Text style={styles.statusText}>{service.status}</Text>
        </View>
      </View>
      <View style={styles.tableColActions}>
        <View style={styles.tableActions}>
          <TouchableOpacity
            style={[
              styles.tableActionButton,
              service.status === 'active' ? styles.deactivateButton : styles.activateButton,
            ]}
            onPress={() => onToggleStatus(service)}
          >
            <Text style={styles.tableActionButtonText}>
              {service.status === 'active' ? 'Deactivate' : 'Activate'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tableActionButton, styles.editButton]}
            onPress={() => onEdit(service)}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderTableHeader = () => (
    <View style={styles.tableHeader}>
      <Text style={[styles.tableHeaderText, styles.tableColImage]}>Photo</Text>
      <Text style={[styles.tableHeaderText, styles.tableColName]}>Service Name</Text>
      <Text style={[styles.tableHeaderText, styles.tableColCategory]}>Category</Text>
      <Text style={[styles.tableHeaderText, styles.tableColPrice]}>Price</Text>
      <Text style={[styles.tableHeaderText, styles.tableColRating]}>Rating</Text>
      <Text style={[styles.tableHeaderText, styles.tableColStatus]}>Status</Text>
      <Text style={[styles.tableHeaderText, styles.tableColActions]}>Actions</Text>
    </View>
  );

  return (
    <>
      {successMessage ? (
        <View style={styles.successMessage}>
          <Text style={styles.successMessageText}>{successMessage}</Text>
          <TouchableOpacity onPress={onDismissSuccess} style={styles.successCloseButton}>
            <Text style={styles.successCloseText}>x</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search services..."
          value={searchQuery}
          onChangeText={onSearchChange}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, filterCategory === cat && styles.categoryChipActive]}
              onPress={() => onFilterChange(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  filterCategory === cat && styles.categoryChipTextActive,
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Services Table */}
      {isMobile ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.tableScrollContainer}
          contentContainerStyle={styles.tableScrollContent}
        >
          <View style={styles.tableContainer}>
            {renderTableHeader()}
            {filteredServices.map((service, i) => renderServiceRow(service, i))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.tableContainer}>
          {renderTableHeader()}
          {filteredServices.map((service, i) => renderServiceRow(service, i))}
        </View>
      )}

      {filteredServices.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No services found</Text>
          <Text style={styles.emptyStateSubtext}>Add your first service to get started</Text>
        </View>
      )}
    </>
  );
};
