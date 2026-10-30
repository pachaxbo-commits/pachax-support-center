import { describe, it, expect } from 'vitest';
import { getDefaultPermissions, UserRole } from '@/models/auth';

describe('RBAC Permissions Matrix Verification', () => {
  it('Superadmin should have full access to all capabilities', () => {
    const perms = getDefaultPermissions('superadmin');
    expect(perms.canReportCritical).toBe(true);
    expect(perms.canReportGeneral).toBe(true);
    expect(perms.canRequestChanges).toBe(true);
    expect(perms.canApproveQuotes).toBe(true);
    expect(perms.canManageClientUsers).toBe(true);
    expect(perms.canViewAllClients).toBe(true);
    expect(perms.canManageDevStaff).toBe(true);
    expect(perms.canTriggerAiRepair).toBe(true);
    expect(perms.canPublishToProd).toBe(true);
    expect(perms.canManageIntegrations).toBe(true);
  });

  it('Developer Engineer should be able to trigger AI repair but not manage staff or approve quotes', () => {
    const perms = getDefaultPermissions('dev_engineer');
    expect(perms.canTriggerAiRepair).toBe(true);
    expect(perms.canViewAllClients).toBe(true);
    expect(perms.canManageDevStaff).toBe(false);
    expect(perms.canApproveQuotes).toBe(false);
  });

  it('Client Administrator can approve quotes and manage client users but cannot see other clients or trigger AI repairs', () => {
    const perms = getDefaultPermissions('client_admin');
    expect(perms.canApproveQuotes).toBe(true);
    expect(perms.canManageClientUsers).toBe(true);
    expect(perms.canViewAllClients).toBe(false);
    expect(perms.canTriggerAiRepair).toBe(false);
  });

  it('Client User can report incidents and request changes but cannot approve quotes', () => {
    const perms = getDefaultPermissions('client_user');
    expect(perms.canReportGeneral).toBe(true);
    expect(perms.canReportCritical).toBe(true);
    expect(perms.canRequestChanges).toBe(true);
    expect(perms.canApproveQuotes).toBe(false);
    expect(perms.canManageClientUsers).toBe(false);
  });
});
