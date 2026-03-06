export interface Service {
  id: string;
  providerId: string;
  name: string;
  description: string;
  category: ServiceCategory;
  basePrice: number;
  pricingType: PricingType;
  duration: number; // in minutes
  maxCapacity: number;
  location: ServiceLocation;
  availability: ServiceAvailability;
  images: string[];
  rating: number;
  reviewCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum ServiceCategory {
  VENUE = 'venue',
  CATERING = 'catering',
  PHOTOGRAPHY = 'photography',
  MUSIC = 'music',
  DECORATION = 'decoration',
  TRANSPORTATION = 'transportation',
  ENTERTAINMENT = 'entertainment',
  PLANNING = 'planning',
  OTHER = 'other',
}

export enum PricingType {
  FIXED = 'fixed',
  HOURLY = 'hourly',
  PER_PERSON = 'per_person',
  PACKAGE = 'package',
  CUSTOM = 'custom',
}

export interface ServiceLocation {
  type: 'physical' | 'virtual' | 'both';
  address?: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // for service area
}

export interface ServiceAvailability {
  monday: TimeSlot[];
  tuesday: TimeSlot[];
  wednesday: TimeSlot[];
  thursday: TimeSlot[];
  friday: TimeSlot[];
  saturday: TimeSlot[];
  sunday: TimeSlot[];
  blackoutDates: string[]; // YYYY-MM-DD format
  advanceBookingDays: number;
  cancellationPolicy: CancellationPolicy;
}

export interface TimeSlot {
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  isAvailable: boolean;
  price?: number; // override base price
}

export interface CancellationPolicy {
  freeCancellationHours: number;
  partialRefundHours: number;
  noRefundHours: number;
  refundPercentage: number; // for partial refunds
}

export interface DynamicPricing {
  baseMultiplier: number;
  demandMultiplier: number;
  locationMultiplier: number;
  timeMultiplier: number;
  seasonalMultiplier: number;
  customRules: PricingRule[];
}

export interface PricingRule {
  condition: string;
  multiplier: number;
  description: string;
}

export class ServiceModel {
  constructor(
    public id: string = '',
    public providerId: string = '',
    public name: string = '',
    public description: string = '',
    public category: ServiceCategory = ServiceCategory.OTHER,
    public basePrice: number = 0,
    public pricingType: PricingType = PricingType.FIXED,
    public duration: number = 60,
    public maxCapacity: number = 1,
    public location: ServiceLocation = {
      type: 'physical',
      city: '',
      state: '',
      zipCode: '',
    },
    public availability: ServiceAvailability = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
      blackoutDates: [],
      advanceBookingDays: 30,
      cancellationPolicy: {
        freeCancellationHours: 24,
        partialRefundHours: 12,
        noRefundHours: 2,
        refundPercentage: 50,
      },
    },
    public images: string[] = [],
    public rating: number = 0,
    public reviewCount: number = 0,
    public isActive: boolean = true,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  // Calculate price based on pricing type and parameters
  calculatePrice(attendees?: number, duration?: number, _date?: Date): number {
    let price = this.basePrice;

    switch (this.pricingType) {
      case PricingType.HOURLY: {
        const hours = duration ? duration / 60 : this.duration / 60;
        price = this.basePrice * hours;
        break;
      }
      case PricingType.PER_PERSON: {
        const people = attendees || 1;
        price = this.basePrice * people;
        break;
      }
      case PricingType.PACKAGE:
        // Package pricing is fixed
        break;
      case PricingType.CUSTOM:
        // Custom pricing logic would be implemented here
        break;
    }

    return Math.round(price * 100) / 100; // Round to 2 decimal places
  }

  // Check if service is available at specific time
  isAvailableAtTime(date: Date, startTime: string, endTime: string): boolean {
    const dayOfWeek = this.getDayOfWeek(date);
    const daySlots = this.availability[dayOfWeek];

    if (!Array.isArray(daySlots) || daySlots.length === 0) return false;

    // Check if date is blacked out
    const dateStr = this.formatDate(date);
    if (this.availability.blackoutDates.includes(dateStr)) return false;

    // Check if time slot is available
    return (daySlots as TimeSlot[]).some(
      (slot) => slot.isAvailable && slot.startTime <= startTime && slot.endTime >= endTime,
    );
  }

  // Get day of week as string
  private getDayOfWeek(date: Date): keyof ServiceAvailability {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()] as keyof ServiceAvailability;
  }

  // Format date as YYYY-MM-DD
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Validate service data
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name.trim()) errors.push('Service name is required');
    if (!this.description.trim()) errors.push('Service description is required');
    if (!this.providerId) errors.push('Provider ID is required');
    if (this.basePrice < 0) errors.push('Base price cannot be negative');
    if (this.duration <= 0) errors.push('Duration must be positive');
    if (this.maxCapacity <= 0) errors.push('Max capacity must be positive');
    if (this.rating < 0 || this.rating > 5) errors.push('Rating must be between 0 and 5');

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
