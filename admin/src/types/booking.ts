// Admin booking types
export type BookingStatus = 'interest_expressed' | 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'disputed' | 'refunded';
export type PaymentOption = 'full_online' | 'ten_percent_online' | 'zero_online';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';

export interface AdminBooking {
  id: string;
  propertyId: string;
  propertyTitle: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestCount: number;
  totalAmount: number;
  commissionAmount: number;
  netAmount: number;
  paymentOption: PaymentOption;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
}
