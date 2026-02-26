import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  ServicePackage,
  PackageCategory,
  PackageItem,
  calculateCategorySubtotal,
  formatPeso,
} from '../models/Package';
import { usePackageBuilder } from '../hooks/usePackageBuilder';
import { createStyles } from './PackageBuilder.styles';
import { useBreakpoints } from '../hooks/useBreakpoints';

interface PackageBuilderProps {
  visible: boolean;
  serviceId: number;
  serviceName: string;
  packageToEdit?: ServicePackage | null;
  onClose: () => void;
  onSave: (pkg: ServicePackage) => void;
}

export const PackageBuilder: React.FC<PackageBuilderProps> = ({
  visible,
  serviceId,
  serviceName,
  packageToEdit,
  onClose,
  onSave,
}) => {
  const { isMobile, screenWidth } = useBreakpoints();
  const styles = createStyles(isMobile, screenWidth);

  const {
    pkg,
    saving,
    expandedCategories,
    editingCategoryIndex,
    setEditingCategoryIndex,
    editingItemIndex,
    setEditingItemIndex,
    handleSave,
    addCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryExpanded,
    addItem,
    updateItem,
    deleteItem,
    updatePackageField,
  } = usePackageBuilder({ visible, serviceId, packageToEdit, onSave, onClose });

  const renderPriceSummary = () => {
    let subtotal = 0;
    pkg.categories.forEach((cat) => {
      subtotal += calculateCategorySubtotal(cat);
    });
    const discount = pkg.discountPercent || 0;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;

    return (
      <View style={styles.priceSummary}>
        <Text style={styles.priceSummaryTitle}>Price Summary</Text>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Subtotal</Text>
          <Text style={styles.priceValue}>{formatPeso(subtotal)}</Text>
        </View>
        {discount > 0 && (
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Discount ({discount}%)</Text>
            <Text style={[styles.priceValue, styles.discountValue]}>
              -{formatPeso(discountAmount)}
            </Text>
          </View>
        )}
        <View style={[styles.priceRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatPeso(total)}</Text>
        </View>
      </View>
    );
  };

  const renderItem = (item: PackageItem, itemIndex: number, categoryIndex: number) => {
    const isEditing =
      editingItemIndex?.catIdx === categoryIndex && editingItemIndex?.itemIdx === itemIndex;
    const itemTotal = (item.quantity || 1) * (item.unitPrice || 0);

    return (
      <View key={itemIndex} style={styles.itemRow}>
        {isEditing ? (
          <View style={styles.itemEditForm}>
            <View style={styles.itemEditRow}>
              <TextInput
                style={[styles.itemInput, styles.itemNameInput]}
                value={item.name}
                onChangeText={(text) => updateItem(categoryIndex, itemIndex, { name: text })}
                placeholder="Item name"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={styles.itemEditRow}>
              <TextInput
                style={[styles.itemInput, styles.itemQtyInput]}
                value={item.quantity?.toString() || '1'}
                onChangeText={(text) =>
                  updateItem(categoryIndex, itemIndex, {
                    quantity: parseInt(text) || 1,
                  })
                }
                placeholder="Qty"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.itemInput, styles.itemUnitInput]}
                value={item.unit || 'pc'}
                onChangeText={(text) => updateItem(categoryIndex, itemIndex, { unit: text })}
                placeholder="Unit"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={[styles.itemInput, styles.itemPriceInput]}
                value={item.unitPrice?.toString() || '0'}
                onChangeText={(text) =>
                  updateItem(categoryIndex, itemIndex, {
                    unitPrice: parseFloat(text) || 0,
                  })
                }
                placeholder="Price"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.itemEditActions}>
              <TouchableOpacity
                style={styles.optionalToggle}
                onPress={() =>
                  updateItem(categoryIndex, itemIndex, {
                    isOptional: !item.isOptional,
                  })
                }
              >
                <View style={[styles.checkbox, item.isOptional && styles.checkboxChecked]}>
                  {item.isOptional && <Feather name="check" size={12} color="#fff" />}
                </View>
                <Text style={styles.optionalLabel}>Optional</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemDoneButton}
                onPress={() => setEditingItemIndex(null)}
              >
                <Text style={styles.itemDoneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>
                {item.name || 'Unnamed item'}
                {item.isOptional && <Text style={styles.optionalBadge}> (optional)</Text>}
              </Text>
              <Text style={styles.itemDetails}>
                {item.quantity} {item.unit} × {formatPeso(item.unitPrice)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatPeso(itemTotal)}</Text>
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.itemActionButton}
                onPress={() => setEditingItemIndex({ catIdx: categoryIndex, itemIdx: itemIndex })}
              >
                <Feather name="edit-2" size={16} color="#2563EB" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.itemActionButton}
                onPress={() => deleteItem(categoryIndex, itemIndex)}
              >
                <Feather name="trash-2" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const renderCategory = (category: PackageCategory, index: number) => {
    const isExpanded = expandedCategories.has(index);
    const isEditing = editingCategoryIndex === index;
    const categorySubtotal = calculateCategorySubtotal(category);

    return (
      <View key={index} style={styles.categoryCard}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => toggleCategoryExpanded(index)}
        >
          <View style={styles.categoryHeaderLeft}>
            <Feather
              name={isExpanded ? 'chevron-down' : 'chevron-right'}
              size={16}
              color="#6B7280"
            />
            {isEditing ? (
              <TextInput
                style={styles.categoryNameInput}
                value={category.name}
                onChangeText={(text) => updateCategory(index, { name: text })}
                placeholder="Category name"
                placeholderTextColor="#9CA3AF"
                autoFocus
                onBlur={() => setEditingCategoryIndex(null)}
              />
            ) : (
              <Text style={styles.categoryName}>{category.name || 'Unnamed category'}</Text>
            )}
          </View>
          <View style={styles.categoryHeaderRight}>
            <Text style={styles.categorySubtotal}>{formatPeso(categorySubtotal)}</Text>
            <TouchableOpacity
              style={styles.categoryActionButton}
              onPress={() => setEditingCategoryIndex(index)}
            >
              <Feather name="edit-2" size={16} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.categoryActionButton}
              onPress={() => deleteCategory(index)}
            >
              <Feather name="trash-2" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.categoryContent}>
            {/* Items table header */}
            <View style={styles.itemsHeader}>
              <Text style={[styles.itemsHeaderText, styles.itemNameCol]}>Item</Text>
              <Text style={[styles.itemsHeaderText, styles.itemTotalCol]}>Total</Text>
              <Text style={[styles.itemsHeaderText, styles.itemActionsCol]}>Actions</Text>
            </View>

            {/* Items list */}
            {category.items.map((item, itemIdx) => renderItem(item, itemIdx, index))}

            {/* Add item button */}
            <TouchableOpacity style={styles.addItemButton} onPress={() => addItem(index)}>
              <Text style={styles.addItemIcon}>+</Text>
              <Text style={styles.addItemText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderLeft}>
              <Text style={styles.modalTitle}>
                {packageToEdit ? 'Edit Package' : 'Create Package'}
              </Text>
              <Text style={styles.modalSubtitle}>for {serviceName}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Feather name="x" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Package Basic Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Package Details</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Package Name *</Text>
                <TextInput
                  style={styles.input}
                  value={pkg.name}
                  onChangeText={(text) => updatePackageField({ name: text })}
                  placeholder="e.g., Family Package"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={pkg.description}
                  onChangeText={(text) => updatePackageField({ description: text })}
                  placeholder="Package description..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Min Pax</Text>
                  <TextInput
                    style={styles.input}
                    value={pkg.minPax?.toString() || '1'}
                    onChangeText={(text) => updatePackageField({ minPax: parseInt(text) || 1 })}
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Max Pax</Text>
                  <TextInput
                    style={styles.input}
                    value={pkg.maxPax?.toString() || ''}
                    onChangeText={(text) =>
                      updatePackageField({ maxPax: text ? parseInt(text) : undefined })
                    }
                    placeholder="No limit"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Price Type</Text>
                  <View style={styles.priceTypeButtons}>
                    {(['calculated', 'fixed', 'per_person'] as const).map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={[
                          styles.priceTypeButton,
                          pkg.priceType === type && styles.priceTypeButtonActive,
                        ]}
                        onPress={() => updatePackageField({ priceType: type })}
                      >
                        <Text
                          style={[
                            styles.priceTypeButtonText,
                            pkg.priceType === type && styles.priceTypeButtonTextActive,
                          ]}
                        >
                          {type === 'calculated'
                            ? 'Auto'
                            : type === 'fixed'
                              ? 'Fixed'
                              : 'Per Person'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[styles.inputGroup, styles.halfInput]}>
                  <Text style={styles.inputLabel}>Discount %</Text>
                  <TextInput
                    style={styles.input}
                    value={pkg.discountPercent?.toString() || '0'}
                    onChangeText={(text) =>
                      updatePackageField({ discountPercent: parseFloat(text) || 0 })
                    }
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {pkg.priceType !== 'calculated' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {pkg.priceType === 'fixed' ? 'Fixed Price' : 'Price Per Person'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={pkg.basePrice?.toString() || ''}
                    onChangeText={(text) =>
                      updatePackageField({ basePrice: parseFloat(text) || undefined })
                    }
                    placeholder="0.00"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                </View>
              )}
            </View>

            {/* Categories Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categories & Items</Text>
                <TouchableOpacity style={styles.addCategoryButton} onPress={addCategory}>
                  <Text style={styles.addCategoryIcon}>+</Text>
                  <Text style={styles.addCategoryText}>Add Category</Text>
                </TouchableOpacity>
              </View>

              {pkg.categories.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No categories yet. Add a category to start building your package.
                  </Text>
                </View>
              ) : (
                pkg.categories.map((cat, idx) => renderCategory(cat, idx))
              )}
            </View>

            {/* Price Summary */}
            {pkg.priceType === 'calculated' && renderPriceSummary()}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {packageToEdit ? 'Update Package' : 'Create Package'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default PackageBuilder;
