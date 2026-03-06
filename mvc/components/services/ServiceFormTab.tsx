import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { ServiceFormState } from '../../hooks/useServiceForm';
import { useCancellationPolicies } from '../../hooks/useCancellationPolicies';
import { generateMapHTML } from '../../utils/leafletMap';
import { createStyles } from '../../views/provider/ServicesView.styles';
import { colors, semantic } from '../../theme';

const TagListInput: React.FC<{
  label: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
  suggestions?: string[];
  styles: any;
}> = ({ label, items, onAdd, onRemove, placeholder, suggestions, styles }) => {
  const [inputValue, setInputValue] = React.useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !items.includes(trimmed)) {
      onAdd(trimmed);
      setInputValue('');
    }
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={styles.tagInputRow}>
        <TextInput
          style={styles.tagInput}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={placeholder}
          onSubmitEditing={handleAdd}
          accessibilityLabel={label}
        />
        <TouchableOpacity
          style={styles.tagAddButton}
          onPress={handleAdd}
          accessibilityRole="button"
          accessibilityLabel={`Add ${label.toLowerCase()}`}
        >
          <Feather name="plus" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      {suggestions && suggestions.length > 0 && items.length === 0 && (
        <View style={[styles.tagChipContainer, { marginBottom: 6 }]}>
          {suggestions.map((s) => (
            <TouchableOpacity key={s} onPress={() => onAdd(s)}>
              <View style={[styles.tagChip, { backgroundColor: '#F1F5F9' }]}>
                <Text style={[styles.tagChipText, { color: '#64748B' }]}>+ {s}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View style={styles.tagChipContainer}>
        {items.map((item, index) => (
          <View key={item} style={styles.tagChip}>
            <Text style={styles.tagChipText}>{item}</Text>
            <TouchableOpacity
              style={styles.tagRemove}
              onPress={() => onRemove(index)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item}`}
            >
              <Feather name="x" size={10} color="#2563EB" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const CollapsibleSection: React.FC<{
  title: string;
  required?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
  styles: any;
}> = ({ title, required, defaultOpen = false, children, styles }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <View style={styles.formSection}>
      <TouchableOpacity
        style={styles.formSectionHeader}
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityLabel={`${title} section, ${open ? 'collapse' : 'expand'}`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.formSectionTitle}>{title}</Text>
          {required && <Text style={styles.formSectionRequired}>Required</Text>}
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
      </TouchableOpacity>
      {open && <View style={styles.formSectionBody}>{children}</View>}
    </View>
  );
};

interface ServiceFormTabProps {
  activeTab: 'add' | 'edit';
  newService: ServiceFormState;
  onFieldChange: (field: string, value: string) => void;
  onServiceChange: (updater: (prev: ServiceFormState) => ServiceFormState) => void;
  submitting: boolean;
  errorMessage: string;
  onDismissError: () => void;
  mapLocation: { lat: number; lng: number } | null;
  mapWebViewRef: React.RefObject<WebView | null>;
  onMapMessage: (event: any) => void;
  onImagePick: () => void;
  onRemoveImage: (index: number) => void;
  onSetPrimaryImage: (index: number) => void;
  onSubmit: () => void;
  onSaveAsDraft?: () => void;
  categories: string[];
  isMobile: boolean;
  screenWidth: number;
}

export const ServiceFormTab: React.FC<ServiceFormTabProps> = ({
  activeTab,
  newService,
  onFieldChange,
  onServiceChange,
  submitting,
  errorMessage,
  onDismissError,
  mapLocation,
  mapWebViewRef,
  onMapMessage,
  onImagePick,
  onRemoveImage,
  onSetPrimaryImage,
  onSubmit,
  onSaveAsDraft,
  categories,
  isMobile,
  screenWidth,
}) => {
  const styles = createStyles(isMobile, screenWidth);

  // Fetch cancellation policies
  const { data: policiesData } = useCancellationPolicies();
  const policies = policiesData?.rows || [];

  const handlePolicyChange = useCallback(
    (policyId: number | null) => {
      onServiceChange((prev) => ({
        ...prev,
        cancellationPolicyId: policyId,
      }));
    },
    [onServiceChange],
  );

  return (
    <View style={styles.addForm}>
      {activeTab === 'edit' && <Text style={styles.formTitle}>Edit Service</Text>}

      {errorMessage ? (
        <View style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
          <TouchableOpacity onPress={onDismissError} style={styles.errorCloseButton}>
            <Text style={styles.errorCloseText}>x</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Section 1: Basic Information */}
      <CollapsibleSection title="Basic Information" required defaultOpen styles={styles}>
        <Text style={styles.formLabel}>Service Name *</Text>
        <TextInput
          style={styles.addInputFull}
          placeholder="Enter service name"
          value={newService.name}
          onChangeText={(text) => onFieldChange('name', text)}
        />

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
                onPress={() => onFieldChange('category', cat)}
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

        <Text style={styles.formLabel}>Description</Text>
        <TextInput
          style={[styles.addInputFull, styles.textArea]}
          placeholder="Enter service description"
          multiline
          numberOfLines={4}
          value={newService.description}
          onChangeText={(text) => onFieldChange('description', text)}
        />
      </CollapsibleSection>

      {/* Section 2: Photos */}
      <CollapsibleSection title="Photos" defaultOpen styles={styles}>
        <Text style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
          First photo is the cover image. Tap photo to set as primary. Up to 10 photos.
        </Text>
        <View style={styles.photoGallery}>
          {newService.images.map((img, index) => (
            <TouchableOpacity
              key={index}
              style={styles.photoThumb}
              onPress={() => onSetPrimaryImage(index)}
              accessibilityRole="button"
              accessibilityLabel={`Photo ${index + 1}${img.isPrimary ? ', primary' : ''}`}
            >
              <Image source={{ uri: img.uri }} style={styles.photoThumbImage} />
              <TouchableOpacity
                style={styles.photoRemoveButton}
                onPress={() => onRemoveImage(index)}
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
              >
                <Feather name="x" size={12} color="#FFFFFF" />
              </TouchableOpacity>
              {img.isPrimary && (
                <View style={styles.photoPrimaryBadge}>
                  <Text style={styles.photoPrimaryText}>Cover</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
          {newService.images.length < 10 && (
            <TouchableOpacity
              style={styles.photoAddButton}
              onPress={onImagePick}
              accessibilityRole="button"
              accessibilityLabel="Add photo"
            >
              <Feather name="plus" size={24} color="#94A3B8" />
              <Text style={styles.photoCount}>{newService.images.length}/10</Text>
            </TouchableOpacity>
          )}
        </View>
      </CollapsibleSection>

      {/* Section 3: Location */}
      <CollapsibleSection title="Location" required defaultOpen styles={styles}>
        <Text style={styles.mapHint}>
          Click on the map or drag the marker to pin your service location
        </Text>
        <View style={styles.mapContainer}>
          {mapLocation ? (
            Platform.OS === 'web' ? (
              <View style={styles.map} nativeID="map-container" />
            ) : (
              <View style={{ flex: 1, position: 'relative' }}>
                <WebView
                  ref={mapWebViewRef}
                  source={{ html: generateMapHTML(mapLocation.lat, mapLocation.lng) }}
                  style={styles.map}
                  onMessage={onMapMessage}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  startInLoadingState={true}
                  scalesPageToFit={true}
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                  allowFileAccess={true}
                  mixedContentMode="always"
                  originWhitelist={['*']}
                  onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    if (__DEV__) console.error('WebView error: ', nativeEvent);
                  }}
                  onLoadEnd={() => {}}
                  onLoadStart={() => {}}
                  renderLoading={() => (
                    <View style={styles.mapLoadingContainer}>
                      <ActivityIndicator size="large" color="#4a55e1" />
                      <Text style={styles.mapLoadingText}>Loading map...</Text>
                    </View>
                  )}
                />
              </View>
            )
          ) : (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator size="large" color="#4a55e1" />
              <Text style={styles.mapLoadingText}>Loading map...</Text>
            </View>
          )}
        </View>

        {newService.address && newService.address.trim() ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="map-pin" size={14} color="#64748B" />
            <Text style={styles.addressText} numberOfLines={3}>
              {newService.address}
            </Text>
          </View>
        ) : newService.latitude && newService.longitude ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="map-pin" size={14} color="#64748B" />
            <Text style={styles.addressText} numberOfLines={3}>
              {newService.latitude}, {newService.longitude}
            </Text>
          </View>
        ) : (
          <Text style={styles.addressPlaceholder}>Location will appear here after pinning</Text>
        )}

        {newService.category !== 'venue' && (
          <View style={{ marginBottom: 16 }}>
            <Text style={styles.formLabel}>Service Area (Travel Radius)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={[styles.addInputFull, { flex: 1 }]}
                value={newService.travelRadiusKm}
                onChangeText={(v) => onFieldChange('travelRadiusKm', v.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 50"
                keyboardType="numeric"
                accessibilityLabel="Travel radius in kilometers"
              />
              <Text style={{ fontSize: 14, color: '#64748B' }}>km from base location</Text>
            </View>
          </View>
        )}
      </CollapsibleSection>

      {/* Section 4: Pricing */}
      <CollapsibleSection title="Pricing" required defaultOpen styles={styles}>
        {newService.category === 'catering' ? (
          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>Price (₱) *</Text>
              <TextInput
                style={styles.addInput}
                placeholder="Enter price per person"
                keyboardType="numeric"
                value={newService.price}
                onChangeText={(text) => onFieldChange('price', text)}
              />
            </View>
          </View>
        ) : (
          <View style={styles.formRow}>
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>Hourly Price (₱) *</Text>
              <TextInput
                style={styles.addInput}
                placeholder="Enter hourly price"
                keyboardType="numeric"
                value={newService.hourlyPrice}
                onChangeText={(text) => onFieldChange('hourlyPrice', text)}
              />
            </View>
            <View style={styles.formCol}>
              <Text style={styles.formLabel}>Per Day Price (₱) *</Text>
              <TextInput
                style={styles.addInput}
                placeholder="Enter per day price"
                keyboardType="numeric"
                value={newService.perDayPrice}
                onChangeText={(text) => onFieldChange('perDayPrice', text)}
              />
            </View>
          </View>
        )}
      </CollapsibleSection>

      {/* Section 5: Booking Rules */}
      <CollapsibleSection title="Booking Rules" styles={styles}>
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.formLabel}>Booking Duration Limits</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                Minimum (hours)
              </Text>
              <TextInput
                style={styles.addInputFull}
                value={newService.minBookingHours}
                onChangeText={(v) => onFieldChange('minBookingHours', v.replace(/[^0-9.]/g, ''))}
                placeholder="e.g. 2"
                keyboardType="numeric"
                accessibilityLabel="Minimum booking hours"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>
                Maximum (hours)
              </Text>
              <TextInput
                style={styles.addInputFull}
                value={newService.maxBookingHours}
                onChangeText={(v) => onFieldChange('maxBookingHours', v.replace(/[^0-9.]/g, ''))}
                placeholder="e.g. 12"
                keyboardType="numeric"
                accessibilityLabel="Maximum booking hours"
              />
            </View>
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <Text style={styles.formLabel}>Advance Booking Required</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              style={[styles.addInputFull, { width: 80 }]}
              value={newService.leadTimeDays}
              onChangeText={(v) => onFieldChange('leadTimeDays', v.replace(/[^0-9]/g, ''))}
              placeholder="0"
              keyboardType="numeric"
              accessibilityLabel="Minimum days in advance for booking"
            />
            <Text style={{ fontSize: 14, color: '#64748B' }}>days before event date</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
            Customers must book at least this many days in advance. Set to 0 for no restriction.
          </Text>
        </View>

        <Text style={styles.formLabel}>Max Capacity</Text>
        <TextInput
          style={styles.addInputFull}
          placeholder="1"
          keyboardType="numeric"
          value={newService.maxCapacity}
          onChangeText={(text) => onFieldChange('maxCapacity', text)}
          accessibilityLabel="Max capacity"
        />
      </CollapsibleSection>

      {/* Section 6: Details */}
      <CollapsibleSection title="Details" styles={styles}>
        <TagListInput
          label="Tags & Amenities"
          items={newService.tags}
          onAdd={(tag) => onServiceChange((prev) => ({ ...prev, tags: [...prev.tags, tag] }))}
          onRemove={(i) =>
            onServiceChange((prev) => ({ ...prev, tags: prev.tags.filter((_, idx) => idx !== i) }))
          }
          placeholder="e.g. outdoor, parking, wheelchair accessible"
          suggestions={[
            'Indoor',
            'Outdoor',
            'Parking',
            'WiFi',
            'Pet Friendly',
            'Wheelchair Accessible',
          ]}
          styles={styles}
        />

        <TagListInput
          label="What's Included"
          items={newService.inclusions}
          onAdd={(item) =>
            onServiceChange((prev) => ({ ...prev, inclusions: [...prev.inclusions, item] }))
          }
          onRemove={(i) =>
            onServiceChange((prev) => ({
              ...prev,
              inclusions: prev.inclusions.filter((_, idx) => idx !== i),
            }))
          }
          placeholder="e.g. setup, sound system, 100 edited photos"
          styles={styles}
        />
      </CollapsibleSection>

      {/* Section 7: Cancellation Policy */}
      <CollapsibleSection title="Cancellation Policy" styles={styles}>
        <Text style={policyStyles.helperText}>Sets deposit % and refund rules for bookings</Text>
        <View style={policyStyles.policyList}>
          <TouchableOpacity
            style={[
              policyStyles.policyOption,
              !newService.cancellationPolicyId && policyStyles.policyOptionSelected,
            ]}
            onPress={() => handlePolicyChange(null)}
            accessibilityRole="button"
            accessibilityLabel="No policy - full payment upfront"
          >
            <View style={policyStyles.policyOptionContent}>
              <Feather
                name="x-circle"
                size={16}
                color={!newService.cancellationPolicyId ? semantic.surface : semantic.textSecondary}
              />
              <View style={policyStyles.policyOptionTextWrap}>
                <Text
                  style={[
                    policyStyles.policyOptionText,
                    !newService.cancellationPolicyId && policyStyles.policyOptionTextSelected,
                  ]}
                >
                  No Policy (100% upfront)
                </Text>
                <Text
                  style={[
                    policyStyles.policyOptionDetail,
                    !newService.cancellationPolicyId && policyStyles.policyOptionDetailSelected,
                  ]}
                >
                  Full payment required at booking
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {policies.map((policy) => {
            const isSelected = newService.cancellationPolicyId === policy.id;
            return (
              <TouchableOpacity
                key={policy.id}
                style={[policyStyles.policyOption, isSelected && policyStyles.policyOptionSelected]}
                onPress={() => handlePolicyChange(policy.id)}
                accessibilityRole="button"
                accessibilityLabel={`${policy.name} - ${policy.depositPercent}% deposit`}
              >
                <View style={policyStyles.policyOptionContent}>
                  <Feather
                    name="shield"
                    size={16}
                    color={isSelected ? semantic.surface : semantic.textSecondary}
                  />
                  <View style={policyStyles.policyOptionTextWrap}>
                    <Text
                      style={[
                        policyStyles.policyOptionText,
                        isSelected && policyStyles.policyOptionTextSelected,
                      ]}
                    >
                      {policy.name}
                    </Text>
                    <Text
                      style={[
                        policyStyles.policyOptionDetail,
                        isSelected && policyStyles.policyOptionDetailSelected,
                      ]}
                    >
                      Deposit: {policy.depositPercent}% | {policy.rules.length} refund rule
                      {policy.rules.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </CollapsibleSection>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
        {activeTab === 'add' && onSaveAsDraft && (
          <TouchableOpacity
            style={[
              styles.addButtonLarge,
              { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', flex: 1 },
            ]}
            onPress={onSaveAsDraft}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityLabel="Save as draft"
          >
            <Text style={[styles.addButtonText, { color: '#64748B' }]}>Save Draft</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.addButtonLarge, submitting && styles.addButtonDisabled, { flex: 1 }]}
          onPress={onSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={activeTab === 'edit' ? 'Update service' : 'Add service'}
        >
          <Text style={styles.addButtonText}>
            {submitting
              ? activeTab === 'edit'
                ? 'Updating Service...'
                : 'Adding Service...'
              : activeTab === 'edit'
                ? 'Update Service'
                : 'Publish Service'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const policyStyles = StyleSheet.create({
  helperText: {
    fontSize: 12,
    color: semantic.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  policyList: {
    marginTop: 4,
    marginBottom: 12,
    gap: 8,
  },
  policyOption: {
    borderWidth: 1,
    borderColor: semantic.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: semantic.background,
  },
  policyOptionSelected: {
    borderColor: semantic.primary,
    backgroundColor: semantic.primary,
  },
  policyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  policyOptionTextWrap: {
    flex: 1,
  },
  policyOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: semantic.textPrimary,
  },
  policyOptionTextSelected: {
    color: semantic.surface,
  },
  policyOptionDetail: {
    fontSize: 12,
    color: semantic.textSecondary,
    marginTop: 2,
  },
  policyOptionDetailSelected: {
    color: colors.primary[100],
  },
});
