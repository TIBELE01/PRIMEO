// Form validators for admin dashboard
export const validators = {
  email: (v: string) => !v ? 'Email requis' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Email invalide' : undefined,
  password: (v: string) => !v ? 'Mot de passe requis' : v.length < 8 ? 'Minimum 8 caractères' : undefined,
  required: (label: string) => (v: string) => !v?.trim() ? `${label} requis` : undefined,
  minLength: (min: number) => (v: string) => v.length < min ? `Minimum ${min} caractères` : undefined,
  maxLength: (max: number) => (v: string) => v.length > max ? `Maximum ${max} caractères` : undefined,
  positiveNumber: (v: string | number) => isNaN(Number(v)) || Number(v) <= 0 ? 'Doit être un nombre positif' : undefined,
  totp: (v: string) => !v ? 'Code requis' : !/^\d{6}$/.test(v) ? 'Le code doit contenir 6 chiffres' : undefined,
};
