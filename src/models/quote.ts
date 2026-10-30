export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface QuoteLineItem {
  id: string;
  description: string;
  hours: number;
  hourlyRate: number;
  total: number;
}

export interface Quote {
  id: string;
  featureRequestId?: string;
  incidentItemId?: string;
  clientCompanyId: string;
  developerCompanyId: string;
  projectId: string;
  title: string;
  description: string;
  items: QuoteLineItem[];
  subtotal: number;
  currency: 'USD' | 'BOB';
  estimatedDeliveryDays: number;
  validUntil: string;
  status: QuoteStatus;
  approvedBy?: {
    uid: string;
    displayName: string;
    email: string;
  };
  approvedAt?: string;
  rejectedBy?: {
    uid: string;
    displayName: string;
  };
  rejectedAt?: string;
  rejectionReason?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}
