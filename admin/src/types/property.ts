// Admin property types
export type PropertyType = 'residence' | 'hotel' | 'apartment' | 'villa' | 'office' | 'commercial' | 'restaurant';

export type PropertyStatus = 'draft' | 'pending_review' | 'active' | 'suspended' | 'rejected' | 'archived';

export type PropertySector = 'hebergement' | 'immobilier' | 'restaurant';

export interface AdminProperty {
  id: string;
  title: string;
  type: PropertyType;
  sector: PropertySector;
  status: PropertyStatus;
  city: string;
  country: string;
  ownerId: string;
  ownerName: string;
  pricePerNight: number;
  rating: number;
  reviewCount: number;
  isBoosted: boolean;
  hasVirtualTour: boolean;
  mainImageUrl?: string;
  submittedAt: string;
  updatedAt: string;
  rejectionReason?: string;
}

export interface OwnerLegalDoc {
  id: string;
  type: string;
  fileUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
}

export interface PropertyDetail extends AdminProperty {
  description: string;
  amenities: string[];
  images: string[];
  latitude: number | null;
  longitude: number | null;
  rules: string[];
  bookingsCount: number;
  totalRevenue: number;
  // Owner legal info
  ownerEmail?: string;
  ownerPhone?: string;
  ownerKycStatus?: 'verified' | 'pending' | 'rejected' | 'none';
  ownerSubscriptionPlan?: string;
  ownerLegalDocs?: OwnerLegalDoc[];
}
