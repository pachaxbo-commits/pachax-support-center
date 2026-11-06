import { IncidentCategory, IncidentItem } from './incident';

export interface SdkHandshakeRequest {
  publicKey: string;
  appVersion: string;
  platform: 'android' | 'ios' | 'web';
  deviceInfo?: {
    model?: string;
    osVersion?: string;
    screenResolution?: string;
  };
  clientMetadata?: {
    tenantId?: string;
    userId?: string;
    userName?: string;
    userEmail?: string;
  };
}

export interface SdkHandshakeResponse {
  sessionToken: string;
  expiresInSeconds: number;
  projectId: string;
  developerCompanyId: string;
  allowedFeatures: {
    canReportCritical: boolean;
    canReportGeneral: boolean;
    canSubmitFeatureRequest: boolean;
  };
}

export interface SdkReportIncidentPayload {
  sessionToken: string;
  category: IncidentCategory;
  title: string;
  items: Omit<IncidentItem, 'id' | 'reportId' | 'clientCompanyId' | 'developerCompanyId' | 'projectId' | 'createdAt' | 'updatedAt'>[];
  pachaxPlatformContext?: {
    tenantId: string;
    userId: string;
    templateId: string;
    appVersion: string;
    moduleAffected: string;
    changeScope: 'client_specific' | 'template' | 'core';
  };
}
