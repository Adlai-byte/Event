// Shared test constants used across spec files

export const TEST_EMAILS = {
  valid: 'testuser@example.com',
  invalid: 'not-an-email',
  noDomain: 'user@',
  noTld: 'user@domain',
} as const;

export const TEST_PASSWORDS = {
  valid: 'Password123',
  short: 'abc',
  mismatch: 'Different456',
} as const;

export const VALIDATION_ERRORS = {
  emailRequired: 'Email is required',
  emailInvalid: 'Please enter a valid email address',
  passwordRequired: 'Password is required',
  passwordShort: 'Password must be at least 6 characters long',
  firstNameRequired: 'First name is required',
  lastNameRequired: 'Last name is required',
  confirmPasswordRequired: 'Confirm password is required',
  passwordsMismatch: 'Passwords do not match',
} as const;

export const CATEGORIES = [
  'venue',
  'catering',
  'photography',
  'music',
  'decoration',
  'transportation',
] as const;

export const CATEGORY_LABELS = [
  'Venue',
  'Catering',
  'Photography',
  'Music',
  'Decoration',
  'Transportation',
] as const;

export const LANDING_CONTENT = {
  topBarText: 'Plan your perfect event with E-VENT',
  logo: 'E-VENT',
  searchPlaceholder: 'Search events, services...',
  aboutTitle: 'About E-VENT',
  contactTitle: 'Contact Us',
  contactEmail: 'support@e-vent.com',
  contactPhone: '+63 123 456 7890',
  contactAddress: 'City of Mati, Davao Oriental, Philippines',
  ctaTitle: 'Ready to Plan Your Event?',
  copyright: '© 2025 E-VENT. All rights reserved.',
  aboutFeatures: ['Wide Selection', 'Quality Assured', 'Easy Booking'],
  footerColumns: ['About Us', 'My Account', 'Services', 'Support', 'Download App'],
  upcomingEventsTitle: 'Upcoming Events',
  allServicesTitle: 'All Services',
} as const;

export const PROTECTED_ROUTES = [
  '/user/dashboard',
  '/provider/dashboard',
  '/admin/dashboard',
  '/user/bookings',
  '/user/messages',
] as const;

export const TEST_USERS = {
  customer: {
    email: 'e2e-customer@test-event.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Customer',
  },
  provider: {
    email: 'e2e-provider@test-event.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Provider',
  },
  admin: {
    email: 'e2e-admin@test-event.com',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'Admin',
  },
} as const;

export const API_BASE = 'http://localhost:3001';
