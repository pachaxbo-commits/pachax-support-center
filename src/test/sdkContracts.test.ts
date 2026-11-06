import { describe, it, expect } from 'vitest';
import { PachaxSupportClient } from '@/sdk/client';

describe('PACHAX Support SDK Contract Verification', () => {
  it('throws an error if initialized without publicKey', () => {
    expect(() => {
      new PachaxSupportClient({ publicKey: '' });
    }).toThrow('[PachaxSupportSDK] publicKey is required');
  });

  it('initializes client with valid config and PACHAX Platform tenancy context', async () => {
    const client = new PachaxSupportClient({
      publicKey: 'pk_live_sanjose_test',
      platform: 'web',
      pachaxPlatformContext: {
        tenantId: 'embutidos-sanjose',
        userId: 'usr_test_101',
        templateId: 'pos-retail',
        changeScope: 'client_specific',
      },
    });

    const response = await client.reportIncident({
      title: 'Prueba unitaria de integración SDK',
      category: 'general',
      moduleAffected: 'TestModule',
    });

    expect(response.success).toBe(true);
    expect(response.incidentId).toBeDefined();
    expect(response.trackingUrl).toContain('https://support.pachax.bo');
    expect(response.status).toBe('received');
  });
});
