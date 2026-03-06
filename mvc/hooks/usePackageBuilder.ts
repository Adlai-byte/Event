import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import {
  ServicePackage,
  PackageCategory,
  PackageItem,
  createEmptyPackage,
  createEmptyCategory,
  createEmptyItem,
  calculatePackagePrice,
  calculateCategorySubtotal,
} from '../models/Package';
import { getApiBaseUrl } from '../services/api';

interface UsePackageBuilderOptions {
  visible: boolean;
  serviceId: number;
  packageToEdit?: ServicePackage | null;
  onSave: (pkg: ServicePackage) => void;
  onClose: () => void;
}

export function usePackageBuilder({
  visible,
  serviceId,
  packageToEdit,
  onSave,
  onClose,
}: UsePackageBuilderOptions) {
  const [pkg, setPkg] = useState<ServicePackage>(createEmptyPackage(serviceId));
  const [loading, _setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingItemIndex, setEditingItemIndex] = useState<{
    catIdx: number;
    itemIdx: number;
  } | null>(null);

  // Reset or load package when modal opens
  useEffect(() => {
    if (visible) {
      if (packageToEdit) {
        setPkg(packageToEdit);
        // Expand all categories by default when editing
        const expanded = new Set<number>();
        packageToEdit.categories.forEach((_, idx) => expanded.add(idx));
        setExpandedCategories(expanded);
      } else {
        setPkg(createEmptyPackage(serviceId));
        setExpandedCategories(new Set());
      }
    }
  }, [visible, packageToEdit, serviceId]);

  const handleSave = async () => {
    // Validation
    if (!pkg.name.trim()) {
      Alert.alert('Error', 'Package name is required');
      return;
    }

    if (pkg.categories.length === 0) {
      Alert.alert('Error', 'Please add at least one category');
      return;
    }

    // Check if any category has items
    const hasItems = pkg.categories.some((cat) => cat.items.length > 0);
    if (!hasItems && pkg.priceType === 'calculated') {
      Alert.alert('Error', 'Please add at least one item to calculate the price');
      return;
    }

    setSaving(true);
    try {
      const baseUrl = getApiBaseUrl();
      const isEditing = pkg.id !== undefined;

      const url = isEditing
        ? `${baseUrl}/api/packages/${pkg.id}`
        : `${baseUrl}/api/services/${serviceId}/packages`;

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: pkg.name.trim(),
          description: pkg.description?.trim() || null,
          minPax: pkg.minPax || 1,
          maxPax: pkg.maxPax || null,
          basePrice: pkg.basePrice || null,
          priceType: pkg.priceType,
          discountPercent: pkg.discountPercent || 0,
          isActive: pkg.isActive,
          displayOrder: pkg.displayOrder || 0,
          categories: pkg.categories.map((cat, catIdx) => ({
            name: cat.name.trim(),
            description: cat.description?.trim() || null,
            displayOrder: catIdx,
            items: cat.items.map((item, itemIdx) => ({
              name: item.name.trim(),
              description: item.description?.trim() || null,
              quantity: item.quantity || 1,
              unit: item.unit || 'pc',
              unitPrice: item.unitPrice || 0,
              isOptional: item.isOptional || false,
              displayOrder: itemIdx,
            })),
          })),
        }),
      });

      const data = await response.json();
      if (data.ok) {
        onSave(pkg);
        onClose();
      } else {
        Alert.alert('Error', data.error || 'Failed to save package');
      }
    } catch (error) {
      if (__DEV__) console.error('Save package error:', error);
      Alert.alert('Error', 'Failed to save package. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    const newCategory = createEmptyCategory();
    setPkg((prev) => ({
      ...prev,
      categories: [...prev.categories, newCategory],
    }));
    // Expand the new category
    setExpandedCategories((prev) => new Set([...prev, pkg.categories.length]));
    setEditingCategoryIndex(pkg.categories.length);
  };

  const updateCategory = (index: number, updates: Partial<PackageCategory>) => {
    setPkg((prev) => ({
      ...prev,
      categories: prev.categories.map((cat, i) => (i === index ? { ...cat, ...updates } : cat)),
    }));
  };

  const deleteCategory = (index: number) => {
    Alert.alert(
      'Delete Category',
      'Are you sure you want to delete this category and all its items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setPkg((prev) => ({
              ...prev,
              categories: prev.categories.filter((_, i) => i !== index),
            }));
            setExpandedCategories((prev) => {
              const next = new Set(prev);
              next.delete(index);
              return next;
            });
          },
        },
      ],
    );
  };

  const toggleCategoryExpanded = (index: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addItem = (categoryIndex: number) => {
    const newItem = createEmptyItem();
    setPkg((prev) => ({
      ...prev,
      categories: prev.categories.map((cat, i) =>
        i === categoryIndex ? { ...cat, items: [...cat.items, newItem] } : cat,
      ),
    }));
    setEditingItemIndex({
      catIdx: categoryIndex,
      itemIdx: pkg.categories[categoryIndex].items.length,
    });
  };

  const updateItem = (categoryIndex: number, itemIndex: number, updates: Partial<PackageItem>) => {
    setPkg((prev) => ({
      ...prev,
      categories: prev.categories.map((cat, catIdx) =>
        catIdx === categoryIndex
          ? {
              ...cat,
              items: cat.items.map((item, itemIdx) =>
                itemIdx === itemIndex ? { ...item, ...updates } : item,
              ),
            }
          : cat,
      ),
    }));
  };

  const deleteItem = (categoryIndex: number, itemIndex: number) => {
    setPkg((prev) => ({
      ...prev,
      categories: prev.categories.map((cat, catIdx) =>
        catIdx === categoryIndex
          ? { ...cat, items: cat.items.filter((_, i) => i !== itemIndex) }
          : cat,
      ),
    }));
  };

  const updatePackageField = (updates: Partial<ServicePackage>) => {
    setPkg((prev) => ({ ...prev, ...updates }));
  };

  const calculatedPrice = calculatePackagePrice(pkg);

  return {
    pkg,
    setPkg,
    loading,
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
    calculatedPrice,
    calculateCategorySubtotal,
  };
}
