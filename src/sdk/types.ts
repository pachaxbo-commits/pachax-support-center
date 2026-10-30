export interface PachaxSupportConfig {
  publicKey: string;
  endpointUrl?: string; // Default: https://support.pachax.bo/api/v1
  appName?: string;
  appVersion?: string;
  platform?: 'android' | 'ios' | 'web';
  pachaxPlatformContext?: {
    tenantId: string;
    userId: string;
    templateId?: string;
    appVersion?: string;
    changeScope?: 'client_specific' | 'template' | 'core';
  };
}

export interface ReportIncidentOptions {
  title: string;
  category: 'general' | 'critical';
  description?: string;
  moduleAffected?: string;
  evidenceBase64?: string;
  systemLogs?: string;
  deviceMetadata?: Record<string, any>;
}

export interface ReportIncidentResponse {
  success: boolean;
  incidentId: string;
  trackingUrl: string;
  status: string;
}
