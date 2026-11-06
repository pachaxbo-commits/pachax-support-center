import { describe, it, expect } from 'vitest';
import { IncidentReport } from '@/models/incident';

function filterReportsByTenant(
  reports: IncidentReport[],
  userRole: string,
  userClientId?: string
): IncidentReport[] {
  if (userRole === 'superadmin' || userRole.startsWith('dev_')) {
    // Developers & superadmin can see all associated tenant reports
    return reports;
  }
  // Client users can ONLY see reports matching their own clientCompanyId
  return reports.filter((r) => r.clientCompanyId === userClientId);
}

describe('Multi-Tenant Data Isolation Enforcement', () => {
  const sampleReports: IncidentReport[] = [
    {
      id: 'rep-1',
      clientCompanyId: 'client-sanjose',
      developerCompanyId: 'dev-pachax',
      projectId: 'proj-sanjose',
      reportedBy: { uid: 'u1', displayName: 'San Jose User', email: 'sj@sanjose.com' },
      category: 'general',
      title: 'Reporte San Jose',
      itemsCount: 1,
      status: 'received',
      createdAt: '2026-10-30T00:00:00Z',
      updatedAt: '2026-10-30T00:00:00Z',
    },
    {
      id: 'rep-2',
      clientCompanyId: 'client-qbinsumos',
      developerCompanyId: 'dev-pachax',
      projectId: 'proj-qb',
      reportedBy: { uid: 'u2', displayName: 'QB User', email: 'qb@qbinsumos.bo' },
      category: 'general',
      title: 'Reporte QB Insumos',
      itemsCount: 1,
      status: 'received',
      createdAt: '2026-10-30T00:00:00Z',
      updatedAt: '2026-10-30T00:00:00Z',
    },
  ];

  it('strictly isolates client-sanjose data so they cannot see client-qbinsumos records', () => {
    const visibleReports = filterReportsByTenant(sampleReports, 'client_admin', 'client-sanjose');
    expect(visibleReports.length).toBe(1);
    expect(visibleReports[0].id).toBe('rep-1');
    expect(visibleReports[0].clientCompanyId).toBe('client-sanjose');
  });

  it('strictly isolates client-qbinsumos data so they cannot see client-sanjose records', () => {
    const visibleReports = filterReportsByTenant(sampleReports, 'client_user', 'client-qbinsumos');
    expect(visibleReports.length).toBe(1);
    expect(visibleReports[0].id).toBe('rep-2');
  });

  it('allows superadmin and dev engineers to review across all tenant queues', () => {
    const visibleReports = filterReportsByTenant(sampleReports, 'dev_engineer');
    expect(visibleReports.length).toBe(2);
  });
});
