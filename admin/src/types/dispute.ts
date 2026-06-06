// Admin dispute types
export type DisputeStatus = 'open' | 'under_review' | 'resolved_client' | 'resolved_professional' | 'rejected';

export type DisputeResolution = 'full_refund' | 'partial_refund' | 'no_refund';

export interface AdminDispute {
  id: string;
  bookingId: string;
  clientId: string;
  clientName: string;
  professionalId: string;
  professionalName: string;
  propertyTitle: string;
  reason: string;
  description: string;
  requestedRefundAmount: number;
  status: DisputeStatus;
  resolution?: DisputeResolution;
  resolvedAmount?: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeMessage {
  id: string;
  disputeId: string;
  authorId: string;
  authorName: string;
  authorRole: 'client' | 'professional' | 'admin';
  content: string;
  attachments?: string[];
  createdAt: string;
}
