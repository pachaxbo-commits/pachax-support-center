import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const PROJECT_ID = 'pachax-support-center-test';

describe('Firebase Emulator Suite — Firestore Security & Multi-Tenant Isolation', () => {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
    // Check if Firestore emulator is active on port 8080
    const isEmulatorUp = await fetch('http://127.0.0.1:8080')
      .then(() => true)
      .catch(() => false);

    if (!isEmulatorUp) {
      console.warn(
        '\n[Firebase Emulator Suite] Emulador de Firestore inactivo en 127.0.0.1:8080.\n' +
        'Para ejecutar las pruebas reales contra el emulador, ejecute: npm run test:emulator\n'
      );
      return;
    }

    const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    // Connect to Firestore Emulator
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();

      // Seed core multi-tenant test hierarchy with admin privileges (bypassing rules)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();

        // 1. Developer Companies
        await setDoc(doc(db, 'developerCompanies', 'dev-pachax'), {
          id: 'dev-pachax',
          name: 'PACHAX Core Dev',
          status: 'active',
        });
        await setDoc(doc(db, 'developerCompanies', 'dev-other'), {
          id: 'dev-other',
          name: 'Empresa Desarrolladora Rival',
          status: 'active',
        });

        // 2. Client Companies
        await setDoc(doc(db, 'clientCompanies', 'client-sanjose'), {
          id: 'client-sanjose',
          developerCompanyId: 'dev-pachax',
          name: 'Embutidos San José',
          status: 'active',
        });
        await setDoc(doc(db, 'clientCompanies', 'client-rival'), {
          id: 'client-rival',
          developerCompanyId: 'dev-other',
          name: 'Cliente de Otra Empresa',
          status: 'active',
        });

        // 3. Projects
        await setDoc(doc(db, 'projects', 'proj-sanjose-pos'), {
          id: 'proj-sanjose-pos',
          developerCompanyId: 'dev-pachax',
          clientCompanyId: 'client-sanjose',
          name: 'POS San José',
        });
        await setDoc(doc(db, 'projects', 'proj-rival-app'), {
          id: 'proj-rival-app',
          developerCompanyId: 'dev-other',
          clientCompanyId: 'client-rival',
          name: 'App Rival',
        });

        // 4. Incident Reports & Items
        await setDoc(doc(db, 'incidentReports', 'rep-sanjose-1'), {
          id: 'rep-sanjose-1',
          developerCompanyId: 'dev-pachax',
          clientCompanyId: 'client-sanjose',
          projectId: 'proj-sanjose-pos',
          category: 'critical',
          status: 'received',
          reportedBy: 'user-sanjose-admin',
          criticalJustification: 'Servidor detenido en hora punta',
        });
        await setDoc(doc(db, 'incidentItems', 'item-sanjose-1'), {
          id: 'item-sanjose-1',
          reportId: 'rep-sanjose-1',
          developerCompanyId: 'dev-pachax',
          clientCompanyId: 'client-sanjose',
          projectId: 'proj-sanjose-pos',
          status: 'received',
          title: 'Error de impresión',
        });

        // 5. Quotes
        await setDoc(doc(db, 'quotes', 'quote-sanjose-1'), {
          id: 'quote-sanjose-1',
          developerCompanyId: 'dev-pachax',
          clientCompanyId: 'client-sanjose',
          totalAmount: 1500,
          status: 'sent',
        });

        // 6. Users profiles
        await setDoc(doc(db, 'users', 'user-pachax-owner'), {
          uid: 'user-pachax-owner',
          email: 'owner@pachax.bo',
          role: 'dev_owner',
          developerCompanyId: 'dev-pachax',
          status: 'active',
        });
        await setDoc(doc(db, 'users', 'user-pachax-eng'), {
          uid: 'user-pachax-eng',
          email: 'eng@pachax.bo',
          role: 'dev_engineer',
          developerCompanyId: 'dev-pachax',
          status: 'active',
        });
        await setDoc(doc(db, 'users', 'user-pachax-comm'), {
          uid: 'user-pachax-comm',
          email: 'ventas@pachax.bo',
          role: 'dev_commercial',
          developerCompanyId: 'dev-pachax',
          status: 'active',
        });
        await setDoc(doc(db, 'users', 'user-other-admin'), {
          uid: 'user-other-admin',
          email: 'admin@dev-other.com',
          role: 'dev_admin',
          developerCompanyId: 'dev-other',
          status: 'active',
        });
        await setDoc(doc(db, 'users', 'user-sanjose-admin'), {
          uid: 'user-sanjose-admin',
          email: 'admin@sanjose.bo',
          role: 'client_admin',
          developerCompanyId: 'dev-pachax',
          clientCompanyId: 'client-sanjose',
          status: 'active',
        });
        await setDoc(doc(db, 'users', 'user-sanjose-op'), {
          uid: 'user-sanjose-op',
          email: 'operador@sanjose.bo',
          role: 'client_user',
          developerCompanyId: 'dev-pachax',
          clientCompanyId: 'client-sanjose',
          status: 'active',
        });
        await setDoc(doc(db, 'users', 'user-rival-user'), {
          uid: 'user-rival-user',
          email: 'usuario@rival.com',
          role: 'client_user',
          developerCompanyId: 'dev-other',
          clientCompanyId: 'client-rival',
          status: 'active',
        });
        await setDoc(doc(db, 'users', 'user-superadmin'), {
          uid: 'user-superadmin',
          email: 'pachax.bo@gmail.com',
          role: 'superadmin',
          developerCompanyId: 'dev-pachax',
          status: 'active',
        });
      });
    }
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Aislamiento entre desarrolladoras (Cross-Developer Isolation)
  // ---------------------------------------------------------------------------
  it('1. Debe impedir que una empresa desarrolladora lea o modifique datos de otra desarrolladora', async () => {
    if (!testEnv) return;
    // Other developer admin context
    const otherDevDb = testEnv
      .authenticatedContext('user-other-admin', {
        role: 'dev_admin',
        developerCompanyId: 'dev-other',
      })
      .firestore();

    // Pachax dev owner context
    const pachaxDevDb = testEnv
      .authenticatedContext('user-pachax-owner', {
        role: 'dev_owner',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    // MUST FAIL: dev-other cannot read dev-pachax company document
    await assertFails(getDoc(doc(otherDevDb, 'developerCompanies', 'dev-pachax')));

    // MUST FAIL: dev-other cannot read project belonging to dev-pachax
    await assertFails(getDoc(doc(otherDevDb, 'projects', 'proj-sanjose-pos')));

    // MUST FAIL: dev-other cannot update dev-pachax project
    await assertFails(
      updateDoc(doc(otherDevDb, 'projects', 'proj-sanjose-pos'), {
        name: 'Hacked Project Name',
      })
    );

    // MUST SUCCEED: pachax owner can read its own company
    await assertSucceeds(getDoc(doc(pachaxDevDb, 'developerCompanies', 'dev-pachax')));
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Aislamiento entre clientes (Cross-Client Isolation)
  // ---------------------------------------------------------------------------
  it('2. Debe impedir que clientes de distintas empresas lean incidencias o datos ajenos', async () => {
    if (!testEnv) return;
    const rivalClientDb = testEnv
      .authenticatedContext('user-rival-user', {
        role: 'client_user',
        clientCompanyId: 'client-rival',
        developerCompanyId: 'dev-other',
      })
      .firestore();

    const sanjoseClientDb = testEnv
      .authenticatedContext('user-sanjose-op', {
        role: 'client_user',
        clientCompanyId: 'client-sanjose',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    // MUST FAIL: Rival client cannot read San Jose's incident report
    await assertFails(getDoc(doc(rivalClientDb, 'incidentReports', 'rep-sanjose-1')));

    // MUST FAIL: Rival client cannot read San Jose's incident item
    await assertFails(getDoc(doc(rivalClientDb, 'incidentItems', 'item-sanjose-1')));

    // MUST SUCCEED: San Jose client can read its own incident report
    await assertSucceeds(getDoc(doc(sanjoseClientDb, 'incidentReports', 'rep-sanjose-1')));
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Modificación no autorizada y transferencia entre empresas
  // ---------------------------------------------------------------------------
  it('3. Debe impedir la transferencia no autorizada de proyectos o clientes entre empresas desarrolladoras', async () => {
    if (!testEnv) return;
    const pachaxDevDb = testEnv
      .authenticatedContext('user-pachax-owner', {
        role: 'dev_owner',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    // MUST FAIL: Cannot change developerCompanyId on a client company (immutability)
    await assertFails(
      updateDoc(doc(pachaxDevDb, 'clientCompanies', 'client-sanjose'), {
        developerCompanyId: 'dev-other',
      })
    );

    // MUST FAIL: Cannot transfer project to another client or developer company
    await assertFails(
      updateDoc(doc(pachaxDevDb, 'projects', 'proj-sanjose-pos'), {
        developerCompanyId: 'dev-other',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Escalamiento de roles y protección de perfiles
  // ---------------------------------------------------------------------------
  it('4. Debe impedir que un usuario se auto-promueva a superadmin o dev_admin', async () => {
    if (!testEnv) return;
    const clientUserDb = testEnv
      .authenticatedContext('user-sanjose-op', {
        role: 'client_user',
        clientCompanyId: 'client-sanjose',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    // MUST FAIL: User cannot change their own role to superadmin
    await assertFails(
      updateDoc(doc(clientUserDb, 'users', 'user-sanjose-op'), {
        role: 'superadmin',
      })
    );

    // MUST FAIL: User cannot change their developerCompanyId or clientCompanyId
    await assertFails(
      updateDoc(doc(clientUserDb, 'users', 'user-sanjose-op'), {
        developerCompanyId: 'dev-other',
      })
    );

    // MUST SUCCEED: User can update their own displayName
    await assertSucceeds(
      updateDoc(doc(clientUserDb, 'users', 'user-sanjose-op'), {
        displayName: 'Operador Modificado San José',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Manipulación de cotizaciones comerciales
  // ---------------------------------------------------------------------------
  it('5. Debe impedir que clientes alteren montos de cotizaciones o que ingenieros técnicos creen cotizaciones comerciales', async () => {
    if (!testEnv) return;
    const clientAdminDb = testEnv
      .authenticatedContext('user-sanjose-admin', {
        role: 'client_admin',
        clientCompanyId: 'client-sanjose',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    const techEngineerDb = testEnv
      .authenticatedContext('user-pachax-eng', {
        role: 'dev_engineer',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    const commercialDb = testEnv
      .authenticatedContext('user-pachax-comm', {
        role: 'dev_commercial',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    // MUST FAIL: Client admin cannot alter total amount of a quote
    await assertFails(
      updateDoc(doc(clientAdminDb, 'quotes', 'quote-sanjose-1'), {
        totalAmount: 10, // Attempting to discount to 10 USD
      })
    );

    // MUST FAIL: Technical engineer cannot create quotes
    await assertFails(
      setDoc(doc(techEngineerDb, 'quotes', 'quote-fake-tech'), {
        developerCompanyId: 'dev-pachax',
        clientCompanyId: 'client-sanjose',
        totalAmount: 500,
        status: 'draft',
      })
    );

    // MUST SUCCEED: Commercial staff can create a quote
    await assertSucceeds(
      setDoc(doc(commercialDb, 'quotes', 'quote-comm-new'), {
        developerCompanyId: 'dev-pachax',
        clientCompanyId: 'client-sanjose',
        totalAmount: 2200,
        status: 'draft',
      })
    );

    // MUST SUCCEED: Client admin can formally approve a quote (changing ONLY status/approval fields)
    await assertSucceeds(
      updateDoc(doc(clientAdminDb, 'quotes', 'quote-sanjose-1'), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: 'user-sanjose-admin',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Acceso indebido a ejecuciones de IA (aiRepairRuns)
  // ---------------------------------------------------------------------------
  it('6. Debe impedir que clientes accedan o fabriquen ejecuciones del motor de reparación de IA', async () => {
    if (!testEnv) return;
    const clientAdminDb = testEnv
      .authenticatedContext('user-sanjose-admin', {
        role: 'client_admin',
        clientCompanyId: 'client-sanjose',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    const techEngineerDb = testEnv
      .authenticatedContext('user-pachax-eng', {
        role: 'dev_engineer',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    // MUST FAIL: Client cannot create an AI repair run
    await assertFails(
      setDoc(doc(clientAdminDb, 'aiRepairRuns', 'ai-run-fake'), {
        developerCompanyId: 'dev-pachax',
        mode: 'autonomous',
        status: 'completed',
      })
    );

    // MUST SUCCEED: Developer Engineer can create an AI repair run for their company
    await assertSucceeds(
      setDoc(doc(techEngineerDb, 'aiRepairRuns', 'ai-run-legit'), {
        developerCompanyId: 'dev-pachax',
        mode: 'delegated_pr',
        status: 'analyzing',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Prevención de bypass directo de cuotas diarias
  // ---------------------------------------------------------------------------
  it('7. Debe impedir que un cliente se salte la cuota diaria escribiendo reportes generales directamente a Firestore', async () => {
    if (!testEnv) return;
    const clientUserDb = testEnv
      .authenticatedContext('user-sanjose-op', {
        role: 'client_user',
        clientCompanyId: 'client-sanjose',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    // MUST FAIL: Direct creation of category 'general' is rejected by security rules
    // (General incident batches must be submitted via Cloud Function to enforce atomic daily quota)
    await assertFails(
      setDoc(doc(clientUserDb, 'incidentReports', 'rep-direct-bypass'), {
        category: 'general',
        clientCompanyId: 'client-sanjose',
        developerCompanyId: 'dev-pachax',
        projectId: 'proj-sanjose-pos',
        reportedBy: 'user-sanjose-op',
        status: 'received',
        title: 'Bypass attempt',
        createdAt: new Date().toISOString(),
      })
    );

    // MUST SUCCEED: Critical incidents (24/7) with justification can be created directly by verified client
    await assertSucceeds(
      setDoc(doc(clientUserDb, 'incidentReports', 'rep-critical-allowed'), {
        category: 'critical',
        clientCompanyId: 'client-sanjose',
        developerCompanyId: 'dev-pachax',
        projectId: 'proj-sanjose-pos',
        reportedBy: 'user-sanjose-op',
        status: 'received',
        criticalJustification: 'Servidor caído completamente - SLA emergencia',
        createdAt: new Date().toISOString(),
      })
    );

    // MUST FAIL: Client cannot write directly to dailyQuotas collection
    await assertFails(
      setDoc(doc(clientUserDb, 'dailyQuotas', 'client-sanjose_2026-10-30'), {
        clientCompanyId: 'client-sanjose',
        count: 0,
      })
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Protección de invitaciones y auditoría contra manipulación
  // ---------------------------------------------------------------------------
  it('8. Debe impedir que usuarios escriban directamente en invitaciones o registros de auditoría', async () => {
    if (!testEnv) return;
    const clientAdminDb = testEnv
      .authenticatedContext('user-sanjose-admin', {
        role: 'client_admin',
        clientCompanyId: 'client-sanjose',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    // MUST FAIL: Client admin cannot forge audit logs directly
    await assertFails(
      setDoc(doc(clientAdminDb, 'auditLogs', 'fake-log'), {
        action: 'SUPERADMIN_BYPASS',
        targetUid: 'user-sanjose-admin',
      })
    );

    // MUST FAIL: Client admin cannot forge invitations directly in userInvitations
    await assertFails(
      setDoc(doc(clientAdminDb, 'userInvitations', 'fake-invite'), {
        email: 'attacker@evil.com',
        role: 'superadmin',
        status: 'pending',
      })
    );
  });

  // ---------------------------------------------------------------------------
  // SCENARIO 9: Restricción de AppInstallations
  // ---------------------------------------------------------------------------
  it('9. Debe impedir que cualquier usuario arbitrario cree AppInstallations no autorizadas', async () => {
    if (!testEnv) return;
    const clientUserDb = testEnv
      .authenticatedContext('user-sanjose-op', {
        role: 'client_user',
        clientCompanyId: 'client-sanjose',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    const pachaxDevDb = testEnv
      .authenticatedContext('user-pachax-owner', {
        role: 'dev_owner',
        developerCompanyId: 'dev-pachax',
      })
      .firestore();

    // MUST FAIL: Ordinary client user cannot create app installations
    await assertFails(
      setDoc(doc(clientUserDb, 'appInstallations', 'install-fake'), {
        developerCompanyId: 'dev-pachax',
        clientCompanyId: 'client-sanjose',
        apiKeyHash: 'xyz',
      })
    );

    // MUST SUCCEED: Dev owner can create valid app installation for their client
    await assertSucceeds(
      setDoc(doc(pachaxDevDb, 'appInstallations', 'install-legit'), {
        developerCompanyId: 'dev-pachax',
        clientCompanyId: 'client-sanjose',
        apiKeyHash: 'hash-abc-123',
      })
    );
  });
});
