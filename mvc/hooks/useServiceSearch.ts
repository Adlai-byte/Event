import { useState } from 'react';
import { apiClient } from '../services/apiClient';
import { getApiBaseUrl } from '../services/api';
import { ServiceDTO as Service } from '../types/service';
import { ProviderDTO as Provider } from '../types/provider';
import { mapImageUrl } from '../utils/serviceHelpers';

export function useServiceSearch(
  userLocation: { latitude: number; longitude: number } | null,
  selectedCategory: string | null,
  loadCategoryServices: (category: string, useFilters?: boolean, buildFilterQuery?: (baseUrl: string, additionalParams?: { [key: string]: string }) => string) => Promise<void>,
  loadDashboardData: () => Promise<void>,
  setSelectedCategory?: (category: string | null) => void,
) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Service[]>([]);
  const [providerResults, setProviderResults] = useState<Provider[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filterMinPrice, setFilterMinPrice] = useState<string>('');
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterMinRating, setFilterMinRating] = useState<string>('');
  const [filterRadius, setFilterRadius] = useState<string>('100');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showRatingDropdown, setShowRatingDropdown] = useState(false);

  const buildFilterQuery = (baseUrl: string, additionalParams: { [key: string]: string } = {}) => {
    const params = new URLSearchParams();

    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (filterCategory) {
      params.append('category', filterCategory);
    } else if (selectedCategory) {
      params.append('category', selectedCategory);
    }

    if (filterMinPrice.trim()) {
      const minPrice = parseFloat(filterMinPrice);
      if (!isNaN(minPrice) && minPrice >= 0) params.append('minPrice', minPrice.toString());
    }
    if (filterMaxPrice.trim()) {
      const maxPrice = parseFloat(filterMaxPrice);
      if (!isNaN(maxPrice) && maxPrice > 0) params.append('maxPrice', maxPrice.toString());
    }
    if (filterCity.trim()) params.append('city', filterCity.trim());
    if (filterMinRating.trim()) {
      const minRating = parseFloat(filterMinRating);
      if (!isNaN(minRating) && minRating >= 0 && minRating <= 5) params.append('minRating', minRating.toString());
    }
    if (userLocation) {
      params.append('latitude', userLocation.latitude.toString());
      params.append('longitude', userLocation.longitude.toString());
      const radius = filterRadius.trim() ? parseFloat(filterRadius) : 100;
      if (!isNaN(radius) && radius > 0) params.append('radius', radius.toString());
    }

    Object.keys(additionalParams).forEach(key => {
      if (additionalParams[key]) params.append(key, additionalParams[key]);
    });

    return `${baseUrl}?${params.toString()}`;
  };

  const handleSearch = async () => {
    const hasFilters = filterMinPrice || filterMaxPrice || filterCity || filterMinRating || filterCategory;

    if (!searchQuery.trim() && !hasFilters) {
      setSearchResults([]);
      setProviderResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      let providersData: { providers: Provider[] } = { providers: [] };
      let providerServices: Service[] = [];

      if (searchQuery.trim()) {
        try {
          providersData = await apiClient.get('/api/providers/search', { search: searchQuery.trim() });

          if (providersData.providers && providersData.providers.length > 0) {
            const providerEmails = providersData.providers.map((p: Provider) => p.u_email);

            const buildProviderServicesParams = (email: string) => {
              const params: Record<string, string> = { providerEmail: email };
              if (filterCategory) params.category = filterCategory;
              if (filterMinPrice.trim()) {
                const minPrice = parseFloat(filterMinPrice);
                if (!isNaN(minPrice) && minPrice >= 0) params.minPrice = minPrice.toString();
              }
              if (filterMaxPrice.trim()) {
                const maxPrice = parseFloat(filterMaxPrice);
                if (!isNaN(maxPrice) && maxPrice > 0) params.maxPrice = maxPrice.toString();
              }
              if (filterCity.trim()) params.city = filterCity.trim();
              if (filterMinRating.trim()) {
                const minRating = parseFloat(filterMinRating);
                if (!isNaN(minRating) && minRating >= 0 && minRating <= 5) params.minRating = minRating.toString();
              }
              if (userLocation) {
                params.latitude = userLocation.latitude.toString();
                params.longitude = userLocation.longitude.toString();
                const radius = filterRadius.trim() ? parseFloat(filterRadius) : 100;
                if (!isNaN(radius) && radius > 0) params.radius = radius.toString();
              }
              return params;
            };

            const providerServicePromises = providerEmails.map(async (email: string) => {
              try {
                const data = await apiClient.get('/api/services', buildProviderServicesParams(email));
                const activeServices = (data.rows || []).filter((s: any) => {
                  return s.s_is_active === 1 || s.s_is_active === '1' || s.s_is_active === true;
                });
                return activeServices;
              } catch {
                return [];
              }
            });

            const providerServicesArrays = await Promise.all(providerServicePromises);
            providerServices = providerServicesArrays.flat();
          }
        } catch (err) {
          console.error('Provider search error:', err);
        }
      }

      // Search for services using the filter query URL (needs raw fetch for complex URL building)
      const servicesUrl = buildFilterQuery(`${getApiBaseUrl()}/api/services`);
      const servicesResp = await fetch(servicesUrl);

      if (servicesResp.ok) {
        const data = await servicesResp.json();
        const serviceResults = (data.rows || []).map(mapImageUrl);
        const allProviderServices = providerServices.map(mapImageUrl);

        // Merge and deduplicate
        const serviceMap = new Map<number, Service>();
        serviceResults.forEach((service: Service) => {
          serviceMap.set(service.idservice, service);
        });
        allProviderServices.forEach((service: Service) => {
          if (!serviceMap.has(service.idservice)) {
            serviceMap.set(service.idservice, service);
          }
        });

        setSearchResults(Array.from(serviceMap.values()));
        setProviderResults(providersData.providers || []);
        if (setSelectedCategory) setSelectedCategory(null);
      } else {
        setSearchResults([]);
        setProviderResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setProviderResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearFilters = async () => {
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterCity('');
    setFilterMinRating('');
    setFilterRadius('100');
    setFilterCategory('');

    if (selectedCategory) {
      await loadCategoryServices(selectedCategory, false);
    } else if (searchQuery.trim()) {
      await handleSearch();
    } else {
      setSearchResults([]);
      setProviderResults([]);
      setIsSearching(false);
      loadDashboardData();
    }
  };

  const applyFilters = async () => {
    setShowFilters(false);
    await handleSearch();
  };

  return {
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    providerResults, setProviderResults,
    isSearching, setIsSearching,
    showFilters, setShowFilters,
    filterMinPrice, setFilterMinPrice,
    filterMaxPrice, setFilterMaxPrice,
    filterCity, setFilterCity,
    filterMinRating, setFilterMinRating,
    filterRadius, setFilterRadius,
    filterCategory, setFilterCategory,
    showRatingDropdown, setShowRatingDropdown,
    buildFilterQuery,
    handleSearch,
    clearFilters,
    applyFilters,
  };
}
