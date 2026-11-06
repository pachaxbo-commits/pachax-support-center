import { describe, it, expect } from 'vitest';

const CONFIRMED_SUPERADMIN_UID = 'NH3DaEHYt3aiFfg0gq85kHirPO12';
const CONFIRMED_SUPERADMIN_EMAIL = 'pachax.bo@gmail.com';

interface BootstrapCandidate {
  uid: string;
  email: string;
  emailVerified: boolean;
  disabled: boolean;
}

function evaluateSuperadminBootstrapEligibility(candidate: BootstrapCandidate | null) {
  if (!candidate) {
    return { eligible: false, reason: 'user-not-found' };
  }
  if (candidate.uid !== CONFIRMED_SUPERADMIN_UID) {
    return { eligible: false, reason: 'unauthorized-uid' };
  }
  if (candidate.email.toLowerCase() !== CONFIRMED_SUPERADMIN_EMAIL.toLowerCase()) {
    return { eligible: false, reason: 'unauthorized-email' };
  }
  if (candidate.disabled) {
    return { eligible: false, reason: 'account-disabled' };
  }
  if (!candidate.emailVerified) {
    return { eligible: false, reason: 'unverified-email' };
  }
  return { eligible: true };
}

describe('Superadmin Bootstrap Security & Verification Hardening', () => {
  it('denies bootstrap if candidate user record does not exist', () => {
    const result = evaluateSuperadminBootstrapEligibility(null);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('user-not-found');
  });

  it('denies bootstrap if email is NOT verified (emailVerified === false)', () => {
    const unverifiedUser: BootstrapCandidate = {
      uid: CONFIRMED_SUPERADMIN_UID,
      email: CONFIRMED_SUPERADMIN_EMAIL,
      emailVerified: false,
      disabled: false,
    };
    const result = evaluateSuperadminBootstrapEligibility(unverifiedUser);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('unverified-email');
  });

  it('denies bootstrap if UID does not match confirmed superadmin UID', () => {
    const wrongUidUser: BootstrapCandidate = {
      uid: 'ATTACKER_FAKE_UID_99999',
      email: CONFIRMED_SUPERADMIN_EMAIL,
      emailVerified: true,
      disabled: false,
    };
    const result = evaluateSuperadminBootstrapEligibility(wrongUidUser);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('unauthorized-uid');
  });

  it('denies bootstrap if email does not match confirmed owner email', () => {
    const wrongEmailUser: BootstrapCandidate = {
      uid: CONFIRMED_SUPERADMIN_UID,
      email: 'attacker@evil.com',
      emailVerified: true,
      disabled: false,
    };
    const result = evaluateSuperadminBootstrapEligibility(wrongEmailUser);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('unauthorized-email');
  });

  it('denies bootstrap if account is disabled in Firebase Auth', () => {
    const disabledUser: BootstrapCandidate = {
      uid: CONFIRMED_SUPERADMIN_UID,
      email: CONFIRMED_SUPERADMIN_EMAIL,
      emailVerified: true,
      disabled: true,
    };
    const result = evaluateSuperadminBootstrapEligibility(disabledUser);
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('account-disabled');
  });

  it('approves bootstrap ONLY when UID, Email match, account is active AND email is verified', () => {
    const validUser: BootstrapCandidate = {
      uid: CONFIRMED_SUPERADMIN_UID,
      email: CONFIRMED_SUPERADMIN_EMAIL,
      emailVerified: true,
      disabled: false,
    };
    const result = evaluateSuperadminBootstrapEligibility(validUser);
    expect(result.eligible).toBe(true);
  });
});
