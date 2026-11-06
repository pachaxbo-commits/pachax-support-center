export interface DeveloperCompany {
  id: string;
  name: string;
  legalName?: string;
  taxId?: string;
  slug: string;
  logoUrl?: string;
  adminEmail: string;
  supportEmail: string;
  supportPhone?: string;
  address?: string;
  website?: string;
  slaConfig: {
    criticalResponseHours?: number;
    generalResponseHours?: number;
    policyNotes?: string;
  };
  incidentPolicies?: {
    defaultDailyGeneralQuota: number;
    requireVisualEvidence: boolean;
    criticalRequiresJustification: boolean;
  };
  commercialConfig?: {
    defaultCurrency: 'USD' | 'BOB';
    defaultHourlyRate?: number;
    quoteValidityDays: number;
  };
  telegramConfig?: {
    botEnabled: boolean;
    channelId?: string;
  };
  emailConfig?: {
    senderAddress: string;
    senderName: string;
  };
  createdAt: string;
  updatedAt?: string;
  status: 'active' | 'suspended';
}

export interface ClientCompany {
  id: string;
  developerCompanyId: string;
  name: string;
  taxId?: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  billingTier: 'starter' | 'business' | 'enterprise';
  status: 'active' | 'paused' | 'suspended' | 'archived';
  allowedDomains: string[];
  maxDailyGeneralReports: number; // Default: 1
  slaConfig?: {
    criticalResponseHours?: number;
    generalResponseHours?: number;
    contractReference?: string;
  };
  createdAt: string;
  updatedAt?: string;
}
