// Package Item - individual items within a category
export interface PackageItem {
  id?: number;
  categoryId?: number;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  isOptional: boolean;
  displayOrder: number;
}

// Package Category - groups related items (e.g., "Food", "Drinks")
export interface PackageCategory {
  id?: number;
  packageId?: number;
  name: string;
  description?: string;
  displayOrder: number;
  items: PackageItem[];
}

// Service Package - a complete package with categories and items
export interface ServicePackage {
  id?: number;
  serviceId: number;
  name: string;
  description?: string;
  minPax?: number;
  maxPax?: number;
  basePrice?: number;
  priceType: 'fixed' | 'calculated' | 'per_person';
  discountPercent: number;
  calculatedPrice?: number;
  isActive: boolean;
  displayOrder: number;
  categories: PackageCategory[];
  createdAt?: string;
  updatedAt?: string;
}

// Booking Package - snapshot of package at booking time
export interface BookingPackage {
  id?: number;
  bookingId: number;
  packageId: number;
  paxCount: number;
  unitPrice: number;
  totalPrice: number;
  removedItems?: number[];  // Array of item IDs removed by user
  snapshot?: ServicePackage; // Full package snapshot at booking time
  notes?: string;
}

// Helper function to calculate package price
export function calculatePackagePrice(
  pkg: ServicePackage,
  paxCount: number = 1,
  removedItemIds: number[] = []
): number {
  if (pkg.priceType === 'fixed' && pkg.basePrice) {
    return pkg.basePrice;
  }

  if (pkg.priceType === 'per_person' && pkg.basePrice) {
    return pkg.basePrice * paxCount;
  }

  // Calculate from items (calculated type)
  let total = 0;
  for (const category of pkg.categories || []) {
    for (const item of category.items || []) {
      // Skip removed items
      if (item.id && removedItemIds.includes(item.id)) {
        continue;
      }
      total += item.quantity * item.unitPrice;
    }
  }

  // Apply discount
  const discount = pkg.discountPercent || 0;
  return total * (1 - discount / 100);
}

// Helper function to calculate category subtotal
export function calculateCategorySubtotal(
  category: PackageCategory,
  removedItemIds: number[] = []
): number {
  let total = 0;
  for (const item of category.items || []) {
    if (item.id && removedItemIds.includes(item.id)) {
      continue;
    }
    total += item.quantity * item.unitPrice;
  }
  return total;
}

// Helper to format price in Philippine Peso
export function formatPeso(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Create empty package template
export function createEmptyPackage(serviceId: number): ServicePackage {
  return {
    serviceId,
    name: '',
    description: '',
    minPax: 1,
    maxPax: undefined,
    basePrice: undefined,
    priceType: 'calculated',
    discountPercent: 0,
    isActive: true,
    displayOrder: 0,
    categories: [],
  };
}

// Create empty category template
export function createEmptyCategory(packageId?: number): PackageCategory {
  return {
    packageId,
    name: '',
    description: '',
    displayOrder: 0,
    items: [],
  };
}

// Create empty item template
export function createEmptyItem(categoryId?: number): PackageItem {
  return {
    categoryId,
    name: '',
    description: '',
    quantity: 1,
    unit: 'pc',
    unitPrice: 0,
    isOptional: false,
    displayOrder: 0,
  };
}
