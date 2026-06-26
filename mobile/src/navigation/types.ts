// TypeScript types for all navigation stacks and routes
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { Panorama } from '../types/property';

// ─── Auth Stack ───────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: { role?: string };
  ProRegister: undefined;
  ForgotPassword: undefined;
  OtpVerification: {
    phone: string;
    context: 'registration' | 'reset';
    bypassCode?: string;
    // Documents KYC à téléverser après vérification OTP (inscription pro)
    kycDocuments?: Array<{ key: string; uri: string; name: string }>;
    kycBusinessInfo?: { businessName: string; rccm?: string; taxId?: string; street?: string };
  };
  TwoFactor: { userId: string };
  ResetPassword: { recoveryToken: string };
};

// ─── Client Stack ─────────────────────────────────────────────────────────────
export type ClientStackParamList = {
  Home: undefined;
  Search: { query?: string; type?: string; checkIn?: string; checkOut?: string; guests?: number };
  SectorScreen: { sectorType: string; title: string };
  ResidencesCategory: { category: 'residence' };
  HotelsCategory: { category: 'hotel' };
  ImmobilierCategory: { category: 'immobilier' };
  RestaurantsCategory: { category: 'restaurant' };
  PropertyDetail: { propertyId: string };
  VirtualTour: { panoramas: Panorama[]; initialPanoramaIndex?: number; propertyName: string };
  Booking: { propertyId: string; checkIn: string; checkOut: string; guests?: number; propertyName?: string; pricePerNight?: number; mode?: 'stay' | 'table' | 'interest'; reservationTime?: string; interestMessage?: string };
  GeniusPayWebView: { checkoutUrl: string; bookingId: string; amountOnline: number; paymentOption: 'full_online' | 'ten_percent_online' };
  BookingConfirmation: { bookingId: string; checkoutUrl?: string };
  MyBookings: undefined;
  BookingDetail: { bookingId: string };
  Conversations: undefined;
  Chat: { bookingId: string; recipientName: string };
  Favorites: undefined;
  WriteReview: { bookingId: string; propertyId: string };
  MyReviews: undefined;
  DisputeList: undefined;
  DisputeDetail: { disputeId: string };
  NewDispute: { bookingId: string };
  ReceivedRatings: undefined;
  Referral: undefined;
  Profile: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  TwoFactorSetup: undefined;
  LegalLinks: undefined;
  SupportChatbot: undefined;
  SupportTickets: undefined;
  SupportTicketDetail: { ticketId: string };
  RestaurantMenu: { propertyId?: string } | undefined;
  RestaurantOrderCart: { propertyId: string; propertyName: string };
  RestaurantOrderTracking: { orderId: string };
  MyRestaurantOrders: undefined;
};

// ─── Professional Stacks ──────────────────────────────────────────────────────
export type ResidenceStackParamList = {
  Dashboard: undefined;
  PropertiesList: undefined;
  AddProperty: undefined;
  EditProperty: { propertyId: string };
  PropertyCalendar: { propertyId: string };
  Bookings: undefined;
  BookingDetail: { bookingId: string };
  RateClient: { bookingId: string; clientId: string };
  Subscriptions: undefined;
  Boosts: undefined;
  Analytics: undefined;
  DataExports: undefined;
  ReceivedReviews: undefined;
  CollaboratorsAccess: undefined;
  Messages: undefined;
  Settings: undefined;
  SupportChatbot: undefined;
  SupportTickets: undefined;
  SupportTicketDetail: { ticketId: string };
};

export type HotelStackParamList = {
  Dashboard: undefined;
  PropertiesList: undefined;
  AddProperty: undefined;
  EditProperty: { propertyId: string };
  PropertyCalendar: { propertyId: string };
  Bookings: undefined;
  BookingDetail: { bookingId: string };
  RateClient: { bookingId: string; clientId: string };
  Subscriptions: undefined;
  Boosts: undefined;
  Analytics: undefined;
  DataExports: undefined;
  ReceivedReviews: undefined;
  CollaboratorsAccess: undefined;
  Messages: undefined;
  Settings: undefined;
  SupportChatbot: undefined;
  SupportTickets: undefined;
  SupportTicketDetail: { ticketId: string };
};

export type ImmobilierStackParamList = {
  Dashboard: undefined;
  PropertiesList: undefined;
  AddProperty: undefined;
  EditProperty: { propertyId: string };
  PropertyCalendar: { propertyId: string };
  Bookings: undefined;
  BookingDetail: { bookingId: string };
  RateClient: { bookingId: string; clientId: string };
  Subscriptions: undefined;
  Boosts: undefined;
  Analytics: undefined;
  DataExports: undefined;
  ReceivedReviews: undefined;
  CollaboratorsAccess: undefined;
  Messages: undefined;
  Settings: undefined;
  SupportChatbot: undefined;
  SupportTickets: undefined;
  SupportTicketDetail: { ticketId: string };
};

export type RestaurantStackParamList = {
  Dashboard: undefined;
  PropertiesList: undefined;
  AddProperty: undefined;
  EditProperty: { propertyId: string };
  Bookings: undefined;
  BookingDetail: { bookingId: string };
  RateClient: { bookingId: string; clientId: string };
  MenuManagement: undefined;
  AddMenuItem: undefined;
  SpecialMenus: undefined;
  TimeSlots: undefined;
  Promotions: undefined;
  Subscriptions: undefined;
  DataExports: undefined;
  CollaboratorsAccess: undefined;
  Messages: undefined;
  Settings: undefined;
  SupportChatbot: undefined;
  SupportTickets: undefined;
  SupportTicketDetail: { ticketId: string };
  FoodOrders: undefined;
  FoodOrderDetail: { orderId: string };
};

// Screen props helpers
export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type ClientScreenProps<T extends keyof ClientStackParamList> = NativeStackScreenProps<ClientStackParamList, T>;
export type ResidenceScreenProps<T extends keyof ResidenceStackParamList> = NativeStackScreenProps<ResidenceStackParamList, T>;
