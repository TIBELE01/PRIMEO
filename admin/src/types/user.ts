// Admin user types
export type AdminRole = 'super_admin' | 'moderateur' | 'support' | 'analyste';

export type UserRole = 'client' | 'professional_hebergement' | 'professional_hotel' | 'professional_immobilier' | 'restaurateur' | 'admin';

export type UserStatus = 'active' | 'suspended' | 'banned' | 'pending_kyc' | 'pending_email';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  lastLoginAt: string | null;
  createdAt: string;
  isTotpEnabled: boolean;
}

export interface PlatformUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  kycVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  avatarUrl?: string;
  internalNote?: string;
  referralCode?: string;
  subscription?: { planType: string; status: string };
}

export interface KycDocument {
  id: string;
  userId: string;
  type: 'identity' | 'rccm' | 'tax_number' | 'operating_license';
  fileUrl: string;
  uploadedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface UserDetail extends PlatformUser {
  kycDocuments: KycDocument[];
  propertiesCount: number;
  bookingsCount: number;
  totalRevenue: number;
  loginLogs: LoginLog[];
}

export interface LoginLog {
  id: string;
  ip: string;
  userAgent: string;
  success: boolean;
  createdAt: string;
}
