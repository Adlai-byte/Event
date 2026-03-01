import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { User as UserModel } from '../../models/User';
import { AppLayout } from '../../components/layout';
import { useAdminServices, Service } from '../../hooks/useAdminServices';
import { createStyles } from './ServicesView.styles';
import { useBreakpoints } from '../../hooks/useBreakpoints';

interface AdminServicesProps {
  user?: UserModel;
  onNavigate?: (route: string) => void;
  onLogout?: () => void | Promise<void>;
}

export const ServicesView: React.FC<AdminServicesProps> = ({ user, onNavigate, onLogout }) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = useMemo(() => createStyles(isMobile, screenWidth), [isMobile, screenWidth]);

  const {
    submitting,
    activeTab,
    searchQuery,
    filterCategory,
    newService,
    emailError,
    mapLocation,
    mapWebViewRef,
    filteredServices,
    categories,
    setActiveTab,
    setSearchQuery,
    setFilterCategory,
    setNewService: _setNewService,
    handleAddService,
    handleMapMessage,
    handleToggleServiceStatus,
    handleEmailChange,
    updateNewServiceField,
    generateMapHTML,
  } = useAdminServices();

  return (
    <AppLayout
      role="admin"
      activeRoute="services"
      title="Services"
      user={user}
      onNavigate={onNavigate!}
      onLogout={onLogout!}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Services Management</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'list' && styles.tabButtonActive]}
                onPress={() => setActiveTab('list')}
                accessibilityRole="button"
                accessibilityLabel="View all services tab"
              >
                <Text
                  style={[styles.tabButtonText, activeTab === 'list' && styles.tabButtonTextActive]}
                >
                  View All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'add' && styles.tabButtonActive]}
                onPress={() => setActiveTab('add')}
                accessibilityRole="button"
                accessibilityLabel="Add service tab"
              >
                <Text
                  style={[styles.tabButtonText, activeTab === 'add' && styles.tabButtonTextActive]}
                >
                  Add Service
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {activeTab === 'list' && (
            <>
              {/* Search and Filter */}
              <View style={styles.searchContainer}>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search services..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  accessibilityLabel="Search services"
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryFilter}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        filterCategory === cat && styles.categoryChipActive,
                      ]}
                      onPress={() => setFilterCategory(cat)}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${cat}`}
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

              {/* Services List */}
              {filteredServices.map((service: Service, i: number) => (
                <View
                  key={service.id}
                  style={[styles.serviceCard, i % 2 === 1 && styles.serviceCardAlt]}
                >
                  <View style={styles.serviceInfo}>
                    <View style={styles.serviceHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text style={styles.serviceProvider}>Provider: {service.provider}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          service.status === 'active' ? styles.statusActive : styles.statusInactive,
                        ]}
                      >
                        <Text style={styles.statusText}>{service.status}</Text>
                      </View>
                    </View>
                    {service.description ? (
                      <Text style={styles.serviceDescription} numberOfLines={2}>
                        {service.description}
                      </Text>
                    ) : null}
                    <View style={styles.serviceMeta}>
                      <Text style={styles.serviceCategory}>{service.category}</Text>
                      <Text style={styles.servicePrice}>
                        {'\u20B1'} {service.price.toLocaleString()}
                        {service.pricingType === 'per_person' && (
                          <Text style={styles.perPersonLabel}> /person</Text>
                        )}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Feather name="star" size={14} color="#f59e0b" />
                        <Text style={styles.serviceRating}>
                          {service.rating} ({service.bookings})
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.serviceActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        service.status === 'active'
                          ? styles.deactivateButton
                          : styles.activateButton,
                      ]}
                      onPress={() => handleToggleServiceStatus(service)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        service.status === 'active'
                          ? `Deactivate ${service.name}`
                          : `Activate ${service.name}`
                      }
                    >
                      <Text style={styles.actionButtonText}>
                        {service.status === 'active' ? 'Deactivate' : 'Activate'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.editButton}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${service.name}`}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {filteredServices.length === 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No services found</Text>
                  <Text style={styles.emptyStateSubtext}>Add a new service to get started</Text>
                </View>
              )}
            </>
          )}

          {activeTab === 'add' && (
            <View style={styles.addForm}>
              <Text style={styles.formLabel}>Provider Email *</Text>
              <TextInput
                style={[
                  styles.addInputFull,
                  emailError && { borderColor: '#ef4444', borderWidth: 1 },
                ]}
                placeholder="Enter provider email"
                value={newService.providerEmail}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                accessibilityLabel="Provider email"
              />
              {emailError && (
                <Text style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{emailError}</Text>
              )}

              <Text style={styles.formLabel}>Service Name *</Text>
              <TextInput
                style={styles.addInputFull}
                placeholder="Enter service name"
                value={newService.name}
                onChangeText={(text) => updateNewServiceField('name', text)}
                accessibilityLabel="Service name"
              />

              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.addInputFull, styles.textArea]}
                placeholder="Enter service description"
                multiline
                numberOfLines={4}
                value={newService.description}
                onChangeText={(text) => updateNewServiceField('description', text)}
                accessibilityLabel="Service description"
              />

              <Text style={styles.formLabel}>Location *</Text>
              <Text style={styles.mapHint}>
                Click on the map or drag the marker to pin the service location
              </Text>
              <View style={styles.mapContainer}>
                {mapLocation && Platform.OS === 'web' ? (
                  <View style={styles.map} nativeID="map-container" />
                ) : mapLocation ? (
                  <WebView
                    ref={mapWebViewRef}
                    source={{ html: generateMapHTML() }}
                    style={styles.map}
                    onMessage={handleMapMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                  />
                ) : null}
              </View>
              {newService.address ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Feather name="map-pin" size={14} color="#64748B" />
                  <Text style={[styles.addressText, { flex: 1 }]} numberOfLines={2}>
                    {newService.address}
                  </Text>
                </View>
              ) : (
                <Text style={styles.addressPlaceholder}>
                  Location will appear here after pinning
                </Text>
              )}

              <Text style={styles.formLabel}>Category *</Text>
              <View style={styles.categoryGrid}>
                {categories
                  .filter((c) => c !== 'all')
                  .map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        newService.category === cat && styles.categoryOptionSelected,
                      ]}
                      onPress={() => updateNewServiceField('category', cat)}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${cat} category`}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          newService.category === cat && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </View>

              <Text style={styles.formLabel}>Pricing Type *</Text>
              <View style={styles.pricingTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.pricingTypeOption,
                    newService.pricingType === 'fixed' && styles.pricingTypeOptionSelected,
                  ]}
                  onPress={() => updateNewServiceField('pricingType', 'fixed')}
                  accessibilityRole="button"
                  accessibilityLabel="Fixed price"
                >
                  <Text
                    style={[
                      styles.pricingTypeText,
                      newService.pricingType === 'fixed' && styles.pricingTypeTextSelected,
                    ]}
                  >
                    Fixed Price
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pricingTypeOption,
                    newService.pricingType === 'per_person' && styles.pricingTypeOptionSelected,
                  ]}
                  onPress={() => updateNewServiceField('pricingType', 'per_person')}
                  accessibilityRole="button"
                  accessibilityLabel="Per person pricing"
                >
                  <Text
                    style={[
                      styles.pricingTypeText,
                      newService.pricingType === 'per_person' && styles.pricingTypeTextSelected,
                    ]}
                  >
                    Per Person (Per Pax)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formLabel}>
                {newService.pricingType === 'per_person'
                  ? 'Price per Person (\u20B1) *'
                  : 'Price (\u20B1) *'}
              </Text>
              <TextInput
                style={styles.addInputFull}
                placeholder={
                  newService.pricingType === 'per_person' ? 'Enter price per person' : 'Enter price'
                }
                keyboardType="numeric"
                value={newService.price}
                onChangeText={(text) => updateNewServiceField('price', text)}
                accessibilityLabel={
                  newService.pricingType === 'per_person' ? 'Price per person' : 'Price'
                }
              />

              <TouchableOpacity
                style={[styles.addButtonLarge, submitting && styles.addButtonDisabled]}
                onPress={handleAddService}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="Add service"
              >
                {submitting ? (
                  <Text style={styles.addButtonText}>Adding Service...</Text>
                ) : (
                  <Text style={styles.addButtonText}>Add Service</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </AppLayout>
  );
};

export default ServicesView;
