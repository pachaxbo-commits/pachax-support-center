export interface DeveloperCompany {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  supportEmail: string;
  supportPhone?: string;
  slaConfig: {
    criticalResponseHours: number;
    generalResponseHours: number;
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
  billingTier: 'starter' | 'business' | 'enterprise';
  status: 'active' | 'paused' | 'suspended';
  allowedDomains: string[];
  maxDailyGeneralReports: number; // Default: 1
  createdAt: string;
}
