/**
 * PACHAX Support Center - User Roles
 * Strictly enforced across backend rules, cloud functions and frontend gates.
 */
export type UserRole =
  | 'superadmin'        // Superadministrador de PACHAX Support Center
  | 'dev_owner'         // Propietario de empresa desarrolladora
  | 'dev_admin'         // Administrador de empresa desarrolladora
  | 'dev_engineer'      // Desarrollador o técnico
  | 'dev_commercial'    // Responsable comercial
  | 'client_admin'      // Administrador de empresa cliente
  | 'client_user';      // Usuario autorizado de empresa cliente

export interface UserPermissions {
  canReportCritical: boolean;
  canReportGeneral: boolean;
  canRequestChanges: boolean;
  canApproveQuotes: boolean;
  canManageClientUsers: boolean;
  canViewAllClients: boolean;
  canManageDevStaff: boolean;
  canTriggerAiRepair: boolean;
  canPublishToProd: boolean;
  canManageIntegrations: boolean;
  canViewAuditLogs: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  role: UserRole;
  developerCompanyId?: string; // Present for dev staff & superadmin
  clientCompanyId?: string;    // Present for client users
  status: 'active' | 'suspended' | 'invited';
  createdAt: string;
  lastLoginAt?: string;
  permissionsOverride?: Partial<UserPermissions>;
}

export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  developerCompanyId?: string;
  clientCompanyId?: string;
  invitedBy: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
  createdAt: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadministrador PACHAX',
  dev_owner: 'Propietario Desarrolladora',
  dev_admin: 'Administrador Desarrolladora',
  dev_engineer: 'Desarrollador / Técnico',
  dev_commercial: 'Responsable Comercial',
  client_admin: 'Administrador de Cliente',
  client_user: 'Usuario de Cliente',
};

export function getDefaultPermissions(role: UserRole): UserPermissions {
  switch (role) {
    case 'superadmin':
      return {
        canReportCritical: true,
        canReportGeneral: true,
        canRequestChanges: true,
        canApproveQuotes: true,
        canManageClientUsers: true,
        canViewAllClients: true,
        canManageDevStaff: true,
        canTriggerAiRepair: true,
        canPublishToProd: true,
        canManageIntegrations: true,
        canViewAuditLogs: true,
      };
    case 'dev_owner':
    case 'dev_admin':
      return {
        canReportCritical: true,
        canReportGeneral: true,
        canRequestChanges: true,
        canApproveQuotes: true,
        canManageClientUsers: true,
        canViewAllClients: true,
        canManageDevStaff: true,
        canTriggerAiRepair: true,
        canPublishToProd: true,
        canManageIntegrations: true,
        canViewAuditLogs: true,
      };
    case 'dev_engineer':
      return {
        canReportCritical: true,
        canReportGeneral: true,
        canRequestChanges: false,
        canApproveQuotes: false,
        canManageClientUsers: false,
        canViewAllClients: true,
        canManageDevStaff: false,
        canTriggerAiRepair: true,
        canPublishToProd: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
      };
    case 'dev_commercial':
      return {
        canReportCritical: false,
        canReportGeneral: false,
        canRequestChanges: false,
        canApproveQuotes: true,
        canManageClientUsers: false,
        canViewAllClients: true,
        canManageDevStaff: false,
        canTriggerAiRepair: false,
        canPublishToProd: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
      };
    case 'client_admin':
      return {
        canReportCritical: true,
        canReportGeneral: true,
        canRequestChanges: true,
        canApproveQuotes: true,
        canManageClientUsers: true,
        canViewAllClients: false,
        canManageDevStaff: false,
        canTriggerAiRepair: false,
        canPublishToProd: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
      };
    case 'client_user':
      return {
        canReportCritical: true,
        canReportGeneral: true,
        canRequestChanges: true,
        canApproveQuotes: false,
        canManageClientUsers: false,
        canViewAllClients: false,
        canManageDevStaff: false,
        canTriggerAiRepair: false,
        canPublishToProd: false,
        canManageIntegrations: false,
        canViewAuditLogs: false,
      };
  }
}
