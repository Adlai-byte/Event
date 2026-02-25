/**
 * Shared provider-related types used across views.
 * These map to the MySQL database columns (u_ prefix convention).
 */

/** Provider profile as returned by search/dashboard APIs */
export interface ProviderDTO {
  iduser: number;
  u_fname: string;
  u_lname: string;
  u_email: string;
  u_profile_picture?: string | null;
  provider_name: string;
  service_count: number;
  avg_rating: number | string | null;
  review_count: number | string | null;
}

/** Extended provider profile with stats */
export interface ProviderProfile {
  iduser: number;
  u_email: string;
  u_fname: string;
  u_lname: string;
  u_phone?: string;
  u_address?: string;
  u_city?: string;
  u_state?: string;
  u_profile_picture?: string;
  u_provider_status?: string;
  total_services?: number;
  total_bookings?: number;
  average_rating?: number;
  total_reviews?: number;
}
