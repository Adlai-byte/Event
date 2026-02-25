import { getApiBaseUrl } from '../services/api';

/** Map category slug to display emoji */
export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    photography: '📸',
    venue: '🏢',
    music: '🎵',
    catering: '🍽️',
  };
  return icons[category?.toLowerCase()] || '🎯';
};

/** Map category slug to human-readable label */
export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    photography: 'Photography',
    venue: 'Venues',
    music: 'Music',
    catering: 'Catering',
  };
  return labels[category?.toLowerCase()] || category.charAt(0).toUpperCase() + category.slice(1);
};

/** Format a price value as Philippine Peso string */
export const formatPrice = (price: number | string | null | undefined): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : (price || 0);
  if (isNaN(numPrice)) return '₱0.00';
  return `₱${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/** Resolve a potentially relative image path to a full URL */
export const mapImageUrl = <T extends { primary_image?: string | null }>(item: T): T => ({
  ...item,
  primary_image: item.primary_image
    ? (item.primary_image.startsWith('/uploads/')
        ? `${getApiBaseUrl()}${item.primary_image}`
        : item.primary_image)
    : null,
});

/** Group an array of items by a key extractor */
export const groupByProvider = <T extends { provider_email?: string | null; provider_name?: string }>(
  items: T[],
): Record<string, T[]> => {
  const grouped: Record<string, T[]> = {};
  items.forEach((item) => {
    const key = item.provider_email || item.provider_name || 'Unknown Provider';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  return grouped;
};
