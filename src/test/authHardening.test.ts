import { describe, it, expect } from 'vitest';

const AUTHORIZED_SUPERADMIN_EMAILS = [
  'pachax.bo@gmail.com',
  'admin@pachax.bo',
  'gfabrigtrf@gmail.com',
];

function evaluateBootstrapPermission(callerEmail: string, isAuthenticated: boolean) {
  if (!isAuthenticated) {
    return { allowed: false, reason: 'unauthenticated' };
  }
  const isAuthorized = AUTHORIZED_SUPERADMIN_EMAILS.some(
    (allowed) => allowed.toLowerCase() === callerEmail.toLowerCase()
  );
  if (!isAuthorized) {
    return { allowed: false, reason: 'permission-denied' };
  }
  return { allowed: true };
}

describe('Superadmin Bootstrap Security Hardening', () => {
  it('denies bootstrap if caller is not authenticated', () => {
    const result = evaluateBootstrapPermission('pachax.bo@gmail.com', false);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('unauthenticated');
  });

  it('denies bootstrap if caller email is not on the authorized owner whitelist', () => {
    const result = evaluateBootstrapPermission('random-attacker@domain.com', true);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('permission-denied');
  });

  it('allows bootstrap for authorized owner email', () => {
    const result = evaluateBootstrapPermission('pachax.bo@gmail.com', true);
    expect(result.allowed).toBe(true);
  });
});
