export interface Booking {
  id: string;
  title: string;
  date: string;
  dateStr?: string; // YYYY-MM-DD format for calendar
  time: string;
  startTime?: string;
  endTime?: string;
  location: string;
  attendees: number;
  status: 'upcoming' | 'past' | 'completed';
  bookingStatus: 'pending' | 'confirmed' | 'completed' | 'cancelled'; // Database status
  image: string;
  description: string;
  suppliers: string[];
  services?: Array<{
    serviceId?: number;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalCost: number;
  isPaid?: boolean; // Payment status
  depositPaid?: boolean; // Phase 2: whether deposit has been paid
  balanceDueDate?: string | null; // Phase 2: when balance is due (YYYY-MM-DD)
}
