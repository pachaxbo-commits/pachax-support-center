import { describe, it, expect } from 'vitest';

interface IncidentQuotaRecord {
  clientCompanyId: string;
  category: 'general' | 'critical';
  submittedAt: string;
}

function evaluateSubmissionAllowed(
  clientCompanyId: string,
  category: 'general' | 'critical',
  existingRecordsToday: IncidentQuotaRecord[]
): { allowed: boolean; reason?: string } {
  if (category === 'critical') {
    // Critical incidents can be reported 24/7 without daily quota restriction
    return { allowed: true };
  }

  // General incidents: max 1 consolidated batch per day
  const todayCount = existingRecordsToday.filter(
    (r) => r.clientCompanyId === clientCompanyId && r.category === 'general'
  ).length;

  if (todayCount >= 1) {
    return {
      allowed: false,
      reason: 'Límite alcanzado: solo se permite 1 reporte general consolidado al día por cliente.',
    };
  }

  return { allowed: true };
}

describe('Incident Daily Quota Enforcement', () => {
  const clientId = 'client-sanjose';

  it('allows critical incidents anytime even if a general report was already submitted today', () => {
    const existingRecords: IncidentQuotaRecord[] = [
      {
        clientCompanyId: clientId,
        category: 'general',
        submittedAt: new Date().toISOString(),
      },
    ];

    const result = evaluateSubmissionAllowed(clientId, 'critical', existingRecords);
    expect(result.allowed).toBe(true);
  });

  it('blocks a second general report on the same day for the same client', () => {
    const existingRecords: IncidentQuotaRecord[] = [
      {
        clientCompanyId: clientId,
        category: 'general',
        submittedAt: new Date().toISOString(),
      },
    ];

    const result = evaluateSubmissionAllowed(clientId, 'general', existingRecords);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Límite alcanzado');
  });

  it('allows general report if no reports exist today', () => {
    const result = evaluateSubmissionAllowed(clientId, 'general', []);
    expect(result.allowed).toBe(true);
  });
});
