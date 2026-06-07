// Endpoints API espace professionnel — KYC et profil
import { apiClient } from '../client';

export interface KycDocument {
  id: string;
  type: string;
  url: string;
  uploadedAt: string;
  rejectedReason: string | null;
}

export interface KycStatus {
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verifiedAt: string | null;
  verificationNotes: string | null;
  businessName: string;
  rccm: string | null;
  taxId: string | null;
  touristLicense: string | null;
  documents: KycDocument[];
}

export const professionalApi = {
  getProfile: () => apiClient.get('/professional/profile'),
  getKycStatus: () => apiClient.get<KycStatus>('/professional/kyc/status'),
  // form : multipart construit par buildKycFormData (voir services/kycUpload.ts)
  submitKyc: (form: FormData) =>
    apiClient.post('/professional/kyc', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000, // upload de plusieurs documents
    }),
};
