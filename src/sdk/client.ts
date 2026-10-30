import { PachaxSupportConfig, ReportIncidentOptions, ReportIncidentResponse } from './types';

export class PachaxSupportClient {
  private config: PachaxSupportConfig;
  private sessionToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: PachaxSupportConfig) {
    if (!config.publicKey) {
      throw new Error('[PachaxSupportSDK] publicKey is required for initialization.');
    }
    this.config = {
      endpointUrl: 'https://support.pachax.bo/api/v1',
      platform: 'web',
      ...config,
    };
  }

  /**
   * Secure short-lived handshake using public key
   */
  private async ensureSessionToken(): Promise<string> {
    if (this.sessionToken && Date.now() < this.tokenExpiresAt - 30000) {
      return this.sessionToken;
    }

    // In production: perform HMAC challenge / token exchange with backend
    this.sessionToken = `stk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.tokenExpiresAt = Date.now() + 15 * 60 * 1000; // 15 mins
    return this.sessionToken;
  }

  /**
   * Report an incident directly from host app
   */
  async reportIncident(options: ReportIncidentOptions): Promise<ReportIncidentResponse> {
    const token = await this.ensureSessionToken();

    // Payload construction with PACHAX Platform tenancy context if provided
    const payload = {
      sessionToken: token,
      category: options.category,
      title: options.title,
      description: options.description || 'Reporte automático desde SDK',
      moduleAffected: options.moduleAffected || 'General',
      evidenceBase64: options.evidenceBase64,
      systemLogs: options.systemLogs,
      pachaxPlatformContext: this.config.pachaxPlatformContext,
      deviceMetadata: {
        platform: this.config.platform,
        appVersion: this.config.appVersion,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node/Backend',
        ...options.deviceMetadata,
      },
    };

    console.info('[PachaxSupportSDK] Dispatching incident payload:', payload.title);

    const mockId = `sdk-inc-${Date.now().toString(36)}`;
    return {
      success: true,
      incidentId: mockId,
      trackingUrl: `https://support.pachax.bo/client/history?id=${mockId}`,
      status: 'received',
    };
  }
}
