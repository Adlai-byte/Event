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
  onRemoveImage: () => void;
  onSubmit: () => void;
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
  onSubmit,
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

  const hasValidImage =
    newService.image &&
    typeof newService.image === 'string' &&
    (newService.image.startsWith('data:image') ||
      newService.image.startsWith('http://') ||
      newService.image.startsWith('https://') ||
      newService.image.startsWith('/uploads/'));

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

      <Text style={styles.formLabel}>Service Name *</Text>
      <TextInput
        style={styles.addInputFull}
        placeholder="Enter service name"
        value={newService.name}
        onChangeText={(text) => onFieldChange('name', text)}
      />

      <Text style={styles.formLabel}>Description</Text>
      <TextInput
        style={[styles.addInputFull, styles.textArea]}
        placeholder="Enter service description"
        multiline
        numberOfLines={4}
        value={newService.description}
        onChangeText={(text) => onFieldChange('description', text)}
      />

      <Text style={styles.formLabel}>Service Photo</Text>
      {hasValidImage ? (
        <View style={styles.imagePreviewContainer}>
          <Image
            source={{ uri: newService.image! }}
            style={styles.imagePreview}
            onError={(e) => {
              if (__DEV__) console.error('Image display error in edit form');
              if (__DEV__) console.error('Error details:', e.nativeEvent?.error || 'Unknown error');
            }}
            onLoad={() => {}}
          />
          <TouchableOpacity style={styles.removeImageButton} onPress={onRemoveImage}>
            <Text style={styles.removeImageText}>Remove Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.imageUploadButton} onPress={onImagePick}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Feather name="camera" size={16} color="#64748B" />
            <Text style={styles.imageUploadText}>Choose Photo</Text>
          </View>
        </TouchableOpacity>
      )}

      <Text style={styles.formLabel}>Location *</Text>
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

      <Text style={styles.formLabel}>Max Capacity</Text>
      <TextInput
        style={styles.addInputFull}
        placeholder="1"
        keyboardType="numeric"
        value={newService.maxCapacity}
        onChangeText={(text) => onFieldChange('maxCapacity', text)}
        accessibilityLabel="Max capacity"
      />

      {/* Cancellation Policy */}
      <Text style={styles.formLabel}>Cancellation Policy</Text>
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

      <TouchableOpacity
        style={[styles.addButtonLarge, submitting && styles.addButtonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
        accessibilityRole="button"
        accessibilityLabel={activeTab === 'edit' ? 'Update service' : 'Add service'}
      >
        {submitting ? (
          <Text style={styles.addButtonText}>
            {activeTab === 'edit' ? 'Updating Service...' : 'Adding Service...'}
          </Text>
        ) : (
          <Text style={styles.addButtonText}>
            {activeTab === 'edit' ? 'Update Service' : 'Add Service'}
          </Text>
        )}
      </TouchableOpacity>
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
