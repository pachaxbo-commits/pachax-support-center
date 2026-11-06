// @vitest-environment node
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';

const PROJECT_ID = 'pachax-support-center-storage-test';

async function assertStorageFails(promise: Promise<unknown>) {
  try {
    await promise;
    expect.unreachable('Expected storage operation to fail, but it succeeded.');
  } catch (err: any) {
    const isPermissionDenied =
      err.code === 'storage/unauthorized' ||
      err.code === 'storage/unknown' ||
      err.status === 403 ||
      (err.message && (err.message.includes('permission') || err.message.includes('unauthorized')));
    expect(isPermissionDenied).toBe(true);
  }
}

async function assertStorageSucceeds(promise: Promise<unknown>) {
  await promise;
}

describe('Firebase Emulator Suite — Storage Security & Multi-Tenant Isolation', () => {
  let testEnv: RulesTestEnvironment | null = null;

  beforeAll(async () => {
    // Check if Storage emulator is active on port 9199
    const isEmulatorUp = await fetch('http://127.0.0.1:9199')
      .then(() => true)
      .catch(() => false);

    if (!isEmulatorUp) {
      console.warn(
        '\n[Firebase Emulator Suite] Emulador de Storage inactivo en 127.0.0.1:9199.\n' +
        'Para ejecutar las pruebas reales contra el emulador, ejecute: firebase emulators:start --only storage\n'
      );
      return;
    }

    const rulesPath = path.resolve(process.cwd(), 'storage.rules');
    const rules = fs.readFileSync(rulesPath, 'utf8');

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      storage: {
        rules,
        host: '127.0.0.1',
        port: 9199,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it('1. Unauthenticated user CANNOT read or upload evidence to client path', async () => {
    if (!testEnv) return;
    const unauthStorage = testEnv.unauthenticatedContext().storage();
    const fileRef = ref(
      unauthStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/img1.png'
    );
    const smallPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await assertStorageFails(uploadBytes(fileRef, smallPng, { contentType: 'image/png' }));
    await assertStorageFails(getBytes(fileRef));
  });

  it('2. Authorized client user CAN upload original and annotated PNG images to their company project', async () => {
    if (!testEnv) return;
    const clientUserStorage = testEnv
      .authenticatedContext('user_client_sj', {
        clientCompanyId: 'client-san-jose',
        role: 'user',
      })
      .storage();

    const origRef = ref(
      clientUserStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/item1_original_123.png'
    );
    const annotRef = ref(
      clientUserStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/item1_annotated_123.png'
    );

    const smallPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await assertStorageSucceeds(uploadBytes(origRef, smallPng, { contentType: 'image/png' }));
    await assertStorageSucceeds(uploadBytes(annotRef, smallPng, { contentType: 'image/png' }));
  });

  it('3. Client user CANNOT upload to another client company path (Cross-tenant upload blocked)', async () => {
    if (!testEnv) return;
    const clientSanJoseStorage = testEnv
      .authenticatedContext('user_client_sj', {
        clientCompanyId: 'client-san-jose',
        role: 'user',
      })
      .storage();

    // Attempt to write to client-qb-insumos path
    const crossTenantRef = ref(
      clientSanJoseStorage,
      'tenants/dev-pachax-core/clients/client-qb-insumos/projects/proj-crm/incidents/rep-2/malicious.png'
    );
    const smallPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await assertStorageFails(uploadBytes(crossTenantRef, smallPng, { contentType: 'image/png' }));
  });

  it('4. Client user CANNOT read evidence images belonging to another client company (Cross-tenant read blocked)', async () => {
    if (!testEnv) return;
    const clientQBStorage = testEnv
      .authenticatedContext('user_client_qb', {
        clientCompanyId: 'client-qb-insumos',
        role: 'user',
      })
      .storage();

    const sanJoseRef = ref(
      clientQBStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/item1_original_123.png'
    );

    await assertStorageFails(getBytes(sanJoseRef));
  });

  it('5. Developer Engineer/Admin of dev-pachax-core CAN read client evidence files for diagnosis', async () => {
    if (!testEnv) return;
    const devEngineerStorage = testEnv
      .authenticatedContext('dev_eng_1', {
        developerCompanyId: 'dev-pachax-core',
        role: 'engineer',
      })
      .storage();

    const sanJoseRef = ref(
      devEngineerStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/item1_original_123.png'
    );

    await assertStorageSucceeds(getBytes(sanJoseRef));
  });

  it('6. Developer of a different company CANNOT read or write into dev-pachax-core tenants', async () => {
    if (!testEnv) return;
    const rivalDevStorage = testEnv
      .authenticatedContext('dev_rival_1', {
        developerCompanyId: 'dev-rival-corp',
        role: 'admin',
      })
      .storage();

    const sanJoseRef = ref(
      rivalDevStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/item1_original_123.png'
    );

    await assertStorageFails(getBytes(sanJoseRef));
  });

  it('7. Superadmin has global access to read and manage evidence across all tenants', async () => {
    if (!testEnv) return;
    const superAdminStorage = testEnv
      .authenticatedContext('superadmin_uid', {
        role: 'superadmin',
      })
      .storage();

    const sanJoseRef = ref(
      superAdminStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/item1_original_123.png'
    );

    await assertStorageSucceeds(getBytes(sanJoseRef));
  });

  it('8. File uploads with disallowed MIME type (e.g. application/x-executable, text/html) are REJECTED', async () => {
    if (!testEnv) return;
    const clientUserStorage = testEnv
      .authenticatedContext('user_client_sj', {
        clientCompanyId: 'client-san-jose',
        role: 'user',
      })
      .storage();

    const badFileRef = ref(
      clientUserStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/malware.exe'
    );

    await assertStorageFails(uploadBytes(badFileRef, new Uint8Array([1, 2, 3]), { contentType: 'application/x-msdownload' }));

    const badHtmlRef = ref(
      clientUserStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/phish.html'
    );

    await assertStorageFails(uploadBytes(badHtmlRef, new Uint8Array([1, 2, 3]), { contentType: 'text/html' }));
  });

  it('9. File uploads exceeding 10 MB for images are REJECTED', async () => {
    if (!testEnv) return;
    const clientUserStorage = testEnv
      .authenticatedContext('user_client_sj', {
        clientCompanyId: 'client-san-jose',
        role: 'user',
      })
      .storage();

    const hugeFileRef = ref(
      clientUserStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/huge.png'
    );

    // 10MB + 1KB buffer
    const hugeBuffer = new Uint8Array(10 * 1024 * 1024 + 1024);

    await assertStorageFails(uploadBytes(hugeFileRef, hugeBuffer, { contentType: 'image/png' }));
  });

  it('10. Authorized users CAN delete files without contentType errors', async () => {
    if (!testEnv) return;
    const clientUserStorage = testEnv
      .authenticatedContext('user_client_sj', {
        clientCompanyId: 'client-san-jose',
        role: 'user',
      })
      .storage();

    const deleteTargetRef = ref(
      clientUserStorage,
      'tenants/dev-pachax-core/clients/client-san-jose/projects/proj-pos/incidents/rep-1/to_delete.png'
    );
    const smallPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    await assertStorageSucceeds(uploadBytes(deleteTargetRef, smallPng, { contentType: 'image/png' }));
    await assertStorageSucceeds(deleteObject(deleteTargetRef));
  });
});
