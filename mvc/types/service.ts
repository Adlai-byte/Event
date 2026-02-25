/**
 * Shared service-related types used across views.
 * These map to the MySQL database columns (s_ prefix convention).
 */

/** Full service record as returned by the API */
export interface ServiceDTO {
  idservice: number;
  s_name: string;
  s_description: string;
  s_category: string;
  s_base_price: number | string;
  s_pricing_type?: string;
  s_duration?: number;
  s_max_capacity?: number;
  s_city: string | null;
  s_state: string | null;
  s_address: string | null;
  s_location_type?: string;
  s_rating: number | string | null;
  s_review_count: number | string | null;
  provider_name: string;
  provider_email?: string | null;
  primary_image?: string | null;
  distance_km?: number;
}

/** Minimal service fields used in listings and cards */
export interface ServiceSummary {
  idservice: number;
  s_name: string;
  s_category: string;
  s_base_price: number | string;
  s_rating: number | string | null;
  s_review_count: number | string | null;
  primary_image?: string | null;
}
