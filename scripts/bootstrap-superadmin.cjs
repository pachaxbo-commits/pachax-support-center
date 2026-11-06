/**
 * PACHAX Support Center — Script Administrativo de Bootstrap Superadmin
 *
 * Procedimiento administrativo oficial para inicializar el primer superadministrador
 * con credenciales autorizadas de Google Cloud / Firebase Admin SDK.
 *
 * Características de seguridad y consistencia:
 * 1. Ejecución exclusiva por terminal (sin endpoints públicos).
 * 2. Comprueba existencia estricta de UID y Email previamente registrados en Firebase Auth.
 * 3. EXIGE VERIFICACIÓN DE CORREO: Rechaza cuentas cuyo `emailVerified` sea false.
 * 4. NO crea cuentas nuevas; valida que el usuario esté activo y no deshabilitado.
 * 5. Cero uso de flags peligrosos como `--force`.
 * 6. Consistencia estricta en dos fases con reversión (rollback) automática:
 *    - Si la transacción en Firestore falla, revierte los Custom Claims en Auth.
 * 7. Transacción Firestore atómica para garantizar concurrencia e idempotencia.
 * 8. Auditoría inmutable obligatoria en 'auditLogs'.
 * 9. Soporte de modo `--dry-run` para validar requisitos sin aplicar cambios.
 *
 * Uso:
 *   node scripts/bootstrap-superadmin.cjs <EMAIL> --uid <TARGET_UID> [--dry-run]
 */

const path = require('path');
const { execSync } = require('child_process');
const admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));
const { Firestore } = require(path.resolve(__dirname, '../functions/node_modules/@google-cloud/firestore'));

// Whitelist de seguridad estricta para el primer superadministrador
const EXPECTED_PROJECT_ID = 'pachax-support-center';
const CONFIRMED_SUPERADMIN_UID = 'NH3DaEHYt3aiFfg0gq85kHirPO12';
const CONFIRMED_SUPERADMIN_EMAIL = 'pachax.bo@gmail.com';

// Parse CLI Arguments
const args = process.argv.slice(2);
let targetIdentifier = null;
let expectedUid = null;
let isDryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dry-run') {
    isDryRun = true;
  } else if (args[i] === '--uid' && args[i + 1]) {
    expectedUid = args[i + 1].trim();
    i++;
  } else if (!args[i].startsWith('--') && !targetIdentifier) {
    targetIdentifier = args[i].trim();
  }
}

// Fallback to confirmed account if not passed, but encourage explicit invocation
if (!targetIdentifier) {
  targetIdentifier = CONFIRMED_SUPERADMIN_EMAIL;
}
if (!expectedUid) {
  expectedUid = CONFIRMED_SUPERADMIN_UID;
}

// Get gcloud auth access token for seamless execution
let accessToken;
try {
  accessToken = execSync('gcloud auth print-access-token').toString().trim();
} catch (err) {
  console.error('\n[Error] No se pudo obtener el token de acceso de gcloud CLI:', err.message);
  console.error('Asegúrese de haber ejecutado: gcloud auth login\n');
  process.exit(1);
}

process.env.GOOGLE_CLOUD_QUOTA_PROJECT = EXPECTED_PROJECT_ID;

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: {
      getAccessToken: () => Promise.resolve({ access_token: accessToken, expires_in: 3600 }),
    },
    projectId: EXPECTED_PROJECT_ID,
  });
} catch (e) {
  // Ignored if already initialized
}

// Initialize Cloud Firestore SDK with gcloud auth client
const db = new Firestore({
  projectId: EXPECTED_PROJECT_ID,
  authClient: {
    getRequestHeaders: async () => ({
      Authorization: 'Bearer ' + accessToken,
      'x-goog-user-project': EXPECTED_PROJECT_ID,
    }),
  },
});

async function run() {
  console.log('\n================================================================');
  console.log(' PACHAX SUPPORT CENTER — BOOTSTRAP DE SUPERADMINISTRADOR');
  if (isDryRun) {
    console.log(' [MODO VALIDACIÓN / DRY-RUN — NO SE APLICARÁN CAMBIOS]');
  }
  console.log('================================================================');

  try {
    // 1. Strict Target Cross-Verification
    console.log(`1. Verificando parámetros de seguridad:`);
    console.log(`   - Proyecto esperado: ${EXPECTED_PROJECT_ID}`);
    console.log(`   - UID esperado:      ${expectedUid}`);
    console.log(`   - Correo esperado:   ${targetIdentifier}`);

    if (expectedUid !== CONFIRMED_SUPERADMIN_UID) {
      console.error(`\n[Violación de Seguridad] El UID indicado '${expectedUid}' no coincide con el UID autorizado del propietario ('${CONFIRMED_SUPERADMIN_UID}').`);
      process.exit(1);
    }

    if (targetIdentifier.toLowerCase() !== CONFIRMED_SUPERADMIN_EMAIL.toLowerCase()) {
      console.error(`\n[Violación de Seguridad] El correo indicado '${targetIdentifier}' no coincide con el correo autorizado del propietario ('${CONFIRMED_SUPERADMIN_EMAIL}').`);
      process.exit(1);
    }

    // 2. Fetch user from Firebase Authentication (Read-only, zero account creation)
    console.log(`\n2. Consultando cuenta en Firebase Authentication...`);
    let userRecord = null;
    try {
      userRecord = await admin.auth().getUser(expectedUid);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        console.error(`\n[Error] El UID '${expectedUid}' no existe en Firebase Authentication.`);
        console.error('El usuario debe estar registrado en Authentication antes de poder ser promovido.');
        process.exit(1);
      }
      throw authErr;
    }

    const uid = userRecord.uid;
    const email = userRecord.email;

    // Cross-verify Auth record against expected email
    if (!email || email.toLowerCase() !== CONFIRMED_SUPERADMIN_EMAIL.toLowerCase()) {
      console.error(`\n[Violación de Seguridad] El correo de la cuenta (${email}) no coincide con el correo esperado (${CONFIRMED_SUPERADMIN_EMAIL}).`);
      process.exit(1);
    }

    if (userRecord.disabled) {
      console.error(`\n[Error] La cuenta '${email}' (${uid}) está deshabilitada en Firebase Authentication.`);
      process.exit(1);
    }

    console.log(`   ✓ Cuenta localizada en Auth:`);
    console.log(`      • UID: ${uid}`);
    console.log(`      • Email: ${email}`);
    console.log(`      • Email Verificado: ${userRecord.emailVerified ? 'SÍ (true)' : 'NO (false)'}`);
    console.log(`      • Creado en: ${userRecord.metadata.creationTime}`);

    // 3. MANDATORY EMAIL VERIFICATION CHECK
    console.log(`\n3. Validando estado de verificación de correo...`);
    if (!userRecord.emailVerified) {
      console.error(`\n[Bloqueo de Seguridad] El correo '${email}' NO ha sido verificado aún en Firebase Authentication (emailVerified === false).`);
      console.error('Por políticas de seguridad, el superadministrador debe verificar la titularidad de su correo antes de ser promovido.');
      console.error('Por favor, abra el enlace oficial de verificación generado y confirme su correo primero.\n');
      process.exit(1);
    }
    console.log(`   ✓ Correo electrónico formalmente verificado.`);

    // 4. Audit Existing Superadmins in Firestore
    console.log(`\n4. Comprobando existencia de otros superadministradores en Firestore...`);
    const superadminSnap = await db
      .collection('users')
      .where('role', '==', 'superadmin')
      .where('status', '==', 'active')
      .get();

    const otherSuperadmins = superadminSnap.docs.filter((d) => d.id !== uid);
    if (otherSuperadmins.length > 0) {
      const otherEmails = otherSuperadmins.map((d) => d.data().email).join(', ');
      console.error(`\n[Conflicto de Jerarquía] Ya existe otro superadministrador activo en el sistema: [${otherEmails}].`);
      console.error('No se permite promover cuentas adicionales sin revisión de arquitectura.');
      process.exit(1);
    }
    console.log(`   ✓ No existen otros superadministradores activos.`);

    // 5. Check Idempotency (Already fully promoted)
    const existingUserDoc = await db.collection('users').doc(uid).get();
    const hasAuthClaim = userRecord.customClaims && userRecord.customClaims.role === 'superadmin';
    const hasFirestoreRole = existingUserDoc.exists && existingUserDoc.data().role === 'superadmin';

    if (hasAuthClaim && hasFirestoreRole) {
      console.log(`\n✓ [Idempotencia] El usuario ${email} (${uid}) ya cuenta con Custom Claims y perfil de superadministrador activo.`);
      console.log('No se requieren modificaciones adicionales.\n');
      process.exit(0);
    }

    if (isDryRun) {
      console.log(`\n================================================================`);
      console.log(' ✓ RESULTADO DEL DRY-RUN: TODAS LAS VALIDACIONES SUPERADAS');
      console.log('   - UID y Correo coinciden con el propietario.');
      console.log('   - Cuenta existente, activa y con email verificado.');
      console.log('   - Cero conflictos con otros superadministradores.');
      console.log('   - Cero modificaciones aplicadas (Modo Simulación).');
      console.log('================================================================\n');
      process.exit(0);
    }

    // 6. ATOMIC TWO-PHASE COMMIT WITH ROLLBACK COMPENSATION
    console.log(`\n5. Ejecutando promoción atómica con recuperación ante fallos...`);

    const previousCustomClaims = userRecord.customClaims || {};
    const newCustomClaims = {
      role: 'superadmin',
      developerCompanyId: 'dev-pachax-core',
    };

    // Step A: Set Custom Claims in Firebase Authentication
    console.log(`   -> Asignando Custom Claims en Firebase Authentication...`);
    await admin.auth().setCustomUserClaims(uid, newCustomClaims);

    // Step B: Set Profile and Audit in Cloud Firestore (within transaction)
    console.log(`   -> Guardando perfil y auditoría en Cloud Firestore...`);
    try {
      await db.runTransaction(async (transaction) => {
        const userRef = db.collection('users').doc(uid);
        const auditRef = db.collection('auditLogs').doc();

        // Read inside transaction to lock and verify
        const currentDoc = await transaction.get(userRef);

        transaction.set(
          userRef,
          {
            uid,
            email: email.toLowerCase().trim(),
            displayName: userRecord.displayName || 'Superadministrador PACHAX',
            role: 'superadmin',
            developerCompanyId: 'dev-pachax-core',
            clientCompanyId: null,
            status: 'active',
            emailVerified: true,
            createdAt: currentDoc.exists ? (currentDoc.data().createdAt || new Date()) : new Date(),
            updatedAt: new Date(),
          },
          { merge: true }
        );

        transaction.set(auditRef, {
          action: 'CLI_SUPERADMIN_BOOTSTRAP_PROMOTED',
          targetUid: uid,
          targetEmail: email.toLowerCase().trim(),
          promotedRole: 'superadmin',
          developerCompanyId: 'dev-pachax-core',
          executedBy: process.env.USERNAME || process.env.USER || 'gcp-admin-cli',
          emailVerifiedAtPromotion: true,
          timestamp: new Date(),
        });
      });
    } catch (firestoreErr) {
      // Step C: Rollback Custom Claims if Firestore fails to preserve strict consistency
      console.error(`\n[Fallo en Transacción Firestore]:`, firestoreErr.message);
      console.warn(`[Compensación / Rollback] Revirtiendo Custom Claims en Firebase Authentication...`);
      try {
        await admin.auth().setCustomUserClaims(uid, Object.keys(previousCustomClaims).length > 0 ? previousCustomClaims : null);
        console.log(`✓ Rollback exitoso: Custom Claims revertidos a su estado original.`);
      } catch (rollbackErr) {
        console.error(`[Error crítico en rollback]:`, rollbackErr.message);
      }
      process.exit(1);
    }

    console.log(`\n================================================================`);
    console.log(`🎉 SUPERADMINISTRADOR PROMOVIDO EXITOSAMENTE`);
    console.log(`   • UID:      ${uid}`);
    console.log(`   • Email:    ${email}`);
    console.log(`   • Rol:      superadmin`);
    console.log(`   • Empresa:  dev-pachax-core`);
    console.log(`   • Claims:   { role: 'superadmin', developerCompanyId: 'dev-pachax-core' }`);
    console.log(`   • Firestore: /users/${uid} (Activo)`);
    console.log(`   • Auditoría: /auditLogs (Registrado inmutable)`);
    console.log(`================================================================\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n[Fallo crítico en bootstrap]:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
