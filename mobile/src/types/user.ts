// User, UserRole, AuthResponse types

export type UserRole =
  | 'client'
  | 'professional_hebergement'
  | 'professional_immobilier'
  | 'restaurateur'
  | 'admin';

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl: string | null;
  totpEnabled: boolean;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TotpRequiredResponse {
  requiresTotp: true;
  userId: string;
}

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
