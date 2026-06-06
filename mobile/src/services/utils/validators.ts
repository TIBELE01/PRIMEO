// validators: form field validation helpers
export const validators = {
  email: (value: string): string | undefined => {
    if (!value) return 'Email requis';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email invalide';
  },

  phone: (value: string): string | undefined => {
    if (!value) return 'Téléphone requis';
    if (!/^\+?[\d\s-]{8,15}$/.test(value)) return 'Numéro de téléphone invalide';
  },

  password: (value: string): string | undefined => {
    if (!value) return 'Mot de passe requis';
    if (value.length < 8) return 'Minimum 8 caractères';
    if (!/[A-Z]/.test(value)) return 'Au moins une majuscule';
    if (!/[0-9]/.test(value)) return 'Au moins un chiffre';
  },

  required: (label: string) => (value: string): string | undefined => {
    if (!value?.trim()) return `${label} requis`;
  },

  minLength: (min: number) => (value: string): string | undefined => {
    if (value.length < min) return `Minimum ${min} caractères`;
  },
};
