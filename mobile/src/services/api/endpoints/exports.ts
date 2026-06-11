// Exports API endpoints — export de données professionnel (CSV/PDF asynchrone)
import { apiClient } from '../client';

export type ExportType = 'bookings' | 'properties' | 'transactions' | 'advanced_stats';
export type ExportFormat = 'csv' | 'pdf';

export interface DataExport {
  id: string;
  type: ExportType;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'ready' | 'failed' | 'expired';
  periodFrom: string | null;
  periodTo: string | null;
  fileUrl: string | null;
  rowCount: number | null;
  error: string | null;
  expiresAt: string | null;
  createdAt: string;
  completedAt: string | null;
}

export const exportsApi = {
  create: (params: { type: ExportType; format: ExportFormat; from?: string; to?: string }) =>
    apiClient.post('/exports', params),
  list: () => apiClient.get('/exports'),
  get: (id: string) => apiClient.get(`/exports/${id}`),
};
