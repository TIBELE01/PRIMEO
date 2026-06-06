// Shared user types used by backend and mobile
export type UserRole =
  | 'client'
  | 'professional_hebergement'
  | 'professional_immobilier'
  | 'restaurateur'
  | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  totpEnabled: boolean;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}
