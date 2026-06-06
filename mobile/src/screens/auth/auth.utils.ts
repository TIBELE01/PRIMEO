// Ivory Coast phone validation and normalisation (+225)
export function normalizeIvorianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('225') && digits.length === 13) return `+${digits}`;
  if (digits.length === 10) return `+225${digits}`;
  if (digits.length === 8)  return `+225${digits}`;  // legacy 8-digit numbers
  return null;
}

export function isValidIvorianPhone(raw: string): boolean {
  return normalizeIvorianPhone(raw) !== null;
}

/** Password rules must match backend: 8+ chars, 1 uppercase, 1 lowercase, 1 digit. */
export function validatePassword(pw: string): string | null {
  if (pw.length < 8)         return 'Minimum 8 caractères';
  if (!/[A-Z]/.test(pw))    return 'Au moins une lettre majuscule';
  if (!/[a-z]/.test(pw))    return 'Au moins une lettre minuscule';
  if (!/[0-9]/.test(pw))    return 'Au moins un chiffre';
  return null;
}
