import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ServiceFormState } from '../../hooks/useServiceForm';
import { useCancellationPolicies } from '../../hooks/useCancellationPolicies';
import { createStyles } from '../../views/provider/ServicesView.styles';
import { colors, semantic } from '../../theme';

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

      {/* Section 3: Cancellation Policy */}
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
