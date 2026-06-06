// User roles — 6 types matching the Primeo business model
export const UserRole = {
  CLIENT: 'client',
  PROFESSIONAL_HEBERGEMENT: 'professional_hebergement',
  PROFESSIONAL_HOTEL: 'professional_hotel',
  PROFESSIONAL_IMMOBILIER: 'professional_immobilier',
  RESTAURATEUR: 'restaurateur',
  ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const PROFESSIONAL_ROLES: UserRole[] = [
  UserRole.PROFESSIONAL_HEBERGEMENT,
  UserRole.PROFESSIONAL_HOTEL,
  UserRole.PROFESSIONAL_IMMOBILIER,
  UserRole.RESTAURATEUR,
];

export function isProfessional(role: UserRole): boolean {
  return PROFESSIONAL_ROLES.includes(role);
}
