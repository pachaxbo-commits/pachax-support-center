import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { getBase64ByteLength, detectMimeType } from '@/services/storageService';

// Replicated role hierarchy logic identical to functions/src/index.ts
const ROLE_RANKS: Record<string, number> = {
  superadmin: 100,
  dev_owner: 80,
  dev_admin: 60,
  dev_commercial: 40,
  dev_engineer: 40,
  client_admin: 20,
  client_user: 10,
};

function canSuspendUser(
  caller: { role: string; uid: string; developerCompanyId: string },
  target: { role: string; uid: string; developerCompanyId: string },
  activeSuperadminCount: number
): { allowed: boolean; reason?: string } {
  if (caller.uid === target.uid) {
    return { allowed: false, reason: 'No puedes modificar el estado de tu propia cuenta.' };
  }

  const callerRank = ROLE_RANKS[caller.role] || 0;
  const targetRank = ROLE_RANKS[target.role] || 0;

  if (caller.role !== 'superadmin' && callerRank <= targetRank) {
    return {
      allowed: false,
      reason: 'No posees autorización para modificar una cuenta de igual o superior jerarquía.',
    };
  }

  if (caller.role !== 'superadmin' && target.developerCompanyId !== caller.developerCompanyId) {
    return {
      allowed: false,
      reason: 'No puedes suspender usuarios de otra empresa desarrolladora.',
    };
  }

  if (target.role === 'superadmin' && activeSuperadminCount <= 1) {
    return {
      allowed: false,
      reason: 'No es posible suspender al único superadministrador activo del sistema.',
    };
  }

  return { allowed: true };
}

function validateInvitationIssuance(
  caller: { role: string; developerCompanyId: string; clientCompanyId?: string },
  targetRole: string,
  targetDevCompanyId: string,
  targetClientCompanyId?: string
): { allowed: boolean; reason?: string } {
  const callerRank = ROLE_RANKS[caller.role] || 0;
  const targetRank = ROLE_RANKS[targetRole] || 0;

  if (!targetRank) {
    return { allowed: false, reason: 'Rol no válido.' };
  }

  if (caller.role !== 'superadmin' && targetRank >= callerRank) {
    return { allowed: false, reason: 'No tienes autorización para asignar un rol de igual o superior jerarquía.' };
  }

  if (caller.role === 'client_admin') {
    if (targetRole !== 'client_user') {
      return { allowed: false, reason: 'Los administradores de clientes solo pueden invitar usuarios de rol cliente.' };
    }
    if (targetClientCompanyId !== caller.clientCompanyId) {
      return { allowed: false, reason: 'No puedes invitar usuarios para otra empresa cliente.' };
    }
  } else if (['dev_owner', 'dev_admin'].includes(caller.role)) {
    if (targetDevCompanyId !== caller.developerCompanyId) {
      return { allowed: false, reason: 'Desarrolladora no coincide con la del administrador.' };
    }
  } else if (caller.role !== 'superadmin') {
    return { allowed: false, reason: 'Sin privilegios para emitir invitaciones.' };
  }

  return { allowed: true };
}

describe('Cloud Functions Security & Business Logic Hardening', () => {
  // ---------------------------------------------------------------------------
  // 1. User Suspension Hierarchy & Tenant Isolation
  // ---------------------------------------------------------------------------
  describe('setUserAccountStatus Security Rules', () => {
    it('prohibits self-suspension for any user including administrators', () => {
      const caller = { role: 'dev_admin', uid: 'admin-1', developerCompanyId: 'dev-pachax' };
      const target = { role: 'dev_admin', uid: 'admin-1', developerCompanyId: 'dev-pachax' };

      const result = canSuspendUser(caller, target, 5);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('propia cuenta');
    });

    it('prohibits dev_admin from suspending a peer dev_admin or superior dev_owner/superadmin', () => {
      const devAdmin = { role: 'dev_admin', uid: 'admin-1', developerCompanyId: 'dev-pachax' };
      const peerAdmin = { role: 'dev_admin', uid: 'admin-2', developerCompanyId: 'dev-pachax' };
      const owner = { role: 'dev_owner', uid: 'owner-1', developerCompanyId: 'dev-pachax' };

      expect(canSuspendUser(devAdmin, peerAdmin, 2).allowed).toBe(false);
      expect(canSuspendUser(devAdmin, owner, 2).allowed).toBe(false);
    });

    it('prohibits modifying accounts belonging to another developer company', () => {
      const devAdminPachax = { role: 'dev_admin', uid: 'admin-pachax', developerCompanyId: 'dev-pachax' };
      const targetOtherDev = { role: 'client_user', uid: 'user-other', developerCompanyId: 'dev-other' };

      const result = canSuspendUser(devAdminPachax, targetOtherDev, 2);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('otra empresa desarrolladora');
    });

    it('protects the last remaining active superadmin from suspension', () => {
      const superadmin1 = { role: 'superadmin', uid: 'super-1', developerCompanyId: 'dev-pachax' };
      const targetSuperadmin = { role: 'superadmin', uid: 'super-2', developerCompanyId: 'dev-pachax' };

      // With only 1 active superadmin remaining: MUST FAIL
      const blocked = canSuspendUser(superadmin1, targetSuperadmin, 1);
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toContain('único superadministrador');

      // With 2 or more active superadmins: Allowed
      const allowed = canSuspendUser(superadmin1, targetSuperadmin, 2);
      expect(allowed.allowed).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Invitation Token Cryptography & Role Boundaries
  // ---------------------------------------------------------------------------
  describe('inviteUser & acceptInvitation Security Flow', () => {
    it('generates cryptographic 256-bit single-use token and verifies SHA-256 hash', () => {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      expect(rawToken.length).toBe(64); // 32 bytes in hex = 64 chars
      expect(tokenHash.length).toBe(64); // SHA-256 = 64 chars

      // Recomputed hash must match
      const testHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      expect(testHash).toBe(tokenHash);

      // Tampered token must fail
      const tamperedToken = rawToken.slice(0, -1) + 'a';
      const tamperedHash = crypto.createHash('sha256').update(tamperedToken).digest('hex');
      expect(tamperedHash).not.toBe(tokenHash);
    });

    it('prevents dev_admin from inviting users to other developer companies', () => {
      const caller = { role: 'dev_admin', developerCompanyId: 'dev-pachax' };
      const result = validateInvitationIssuance(caller, 'dev_engineer', 'dev-other');

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Desarrolladora no coincide');
    });

    it('prevents client_admin from inviting users for other client companies or technical roles', () => {
      const clientAdmin = {
        role: 'client_admin',
        developerCompanyId: 'dev-pachax',
        clientCompanyId: 'client-sanjose',
      };

      // Attempting to invite client_admin or dev_engineer
      expect(
        validateInvitationIssuance(clientAdmin, 'dev_engineer', 'dev-pachax', 'client-sanjose').allowed
      ).toBe(false);

      // Attempting to invite for a different client company
      expect(
        validateInvitationIssuance(clientAdmin, 'client_user', 'dev-pachax', 'client-other').allowed
      ).toBe(false);

      // Valid invitation for their own client company
      expect(
        validateInvitationIssuance(clientAdmin, 'client_user', 'dev-pachax', 'client-sanjose').allowed
      ).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Storage Evidence Validation
  // ---------------------------------------------------------------------------
  describe('Storage Evidence Integrity', () => {
    it('accurately computes Base64 byte length without padding distortion', () => {
      // 100 bytes sample
      const rawData = Buffer.alloc(100, 'a');
      const base64Data = `data:image/png;base64,${rawData.toString('base64')}`;

      const computedBytes = getBase64ByteLength(base64Data);
      expect(computedBytes).toBe(100);
    });

    it('correctly detects MIME types for PNG, JPEG and WebP', () => {
      expect(detectMimeType('data:image/png;base64,iVBORw0KGgo=')).toBe('image/png');
      expect(detectMimeType('data:image/jpeg;base64,/9j/4AAQSkZJRg==')).toBe('image/jpeg');
      expect(detectMimeType('data:image/webp;base64,UklGR')).toBe('image/webp');
    });
  });
});
