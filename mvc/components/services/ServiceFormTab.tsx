import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { ServiceFormState } from '../../hooks/useServiceForm';
import { generateMapHTML } from '../../utils/leafletMap';
import { createStyles } from '../../views/provider/ServicesView.styles';

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
  onServiceChange: _onServiceChange,
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

  const hasValidImage =
    newService.image &&
    typeof newService.image === 'string' &&
    (newService.image.startsWith('data:image') ||
      newService.image.startsWith('http://') ||
      newService.image.startsWith('https://') ||
      newService.image.startsWith('/uploads/'));

  console.log('Image preview check:', {
    hasImage: !!newService.image,
    imageLength: newService.image?.length || 0,
    isDataURI: newService.image?.startsWith('data:image') || false,
    isURL:
      newService.image?.startsWith('http') || newService.image?.startsWith('/uploads/') || false,
    willShow: hasValidImage,
  });

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
              console.error('Image display error in edit form');
              console.error('Error details:', e.nativeEvent?.error || 'Unknown error');
              console.log('Image URI length:', newService.image?.length);
              console.log('Image URI start:', newService.image?.substring(0, 50));
              console.log(
                'Image URI end:',
                newService.image?.substring(newService.image!.length - 20),
              );
            }}
            onLoad={() => {
              console.log('Image loaded successfully in edit form');
              console.log('Image size:', newService.image?.length);
            }}
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
            <View
              style={styles.map}
              // @ts-expect-error - web-specific prop
              nativeID="map-container"
            />
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
                  console.error('WebView error: ', nativeEvent);
                }}
                onLoadEnd={() => {
                  console.log('Map WebView loaded successfully');
                }}
                onLoadStart={() => {
                  console.log('Map WebView loading started');
                }}
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
      />

      <TouchableOpacity
        style={[styles.addButtonLarge, submitting && styles.addButtonDisabled]}
        onPress={onSubmit}
        disabled={submitting}
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
