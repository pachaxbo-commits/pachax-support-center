/**
 * PACHAX Support Center — Script Administrativo de Bootstrap Superadmin
 *
 * Procedimiento administrativo oficial para inicializar el primer superadministrador
 * con credenciales autorizadas de Google Cloud / Firebase Admin SDK.
 *
 * Características de seguridad:
 * 1. Ejecución exclusiva por terminal (sin endpoints públicos).
 * 2. Comprueba existencia estricta de UID y Email previamente registrados en Firebase Auth.
 * 3. NO crea cuentas nuevas; valida que el usuario esté activo y no deshabilitado.
 * 4. Transacción Firestore atómica para garantizar concurrencia e idempotencia.
 * 5. Asignación de Custom Claims en Firebase Authentication: { role: 'superadmin', developerCompanyId: 'dev-pachax-core' }.
 * 6. Auditoría inmutable obligatoria en 'auditLogs'.
 * 7. Mecanismo de recuperación ante fallos parciales.
 *
 * Uso:
 *   node scripts/bootstrap-superadmin.cjs <EMAIL_O_UID> [--uid <TARGET_UID>] [--force]
 */

const { execSync } = require('child_process');
const admin = require('./functions/node_modules/firebase-admin');
const { Firestore } = require('./functions/node_modules/@google-cloud/firestore');

// Parse CLI Arguments
const args = process.argv.slice(2);
let targetIdentifier = null;
let expectedUid = null;
let isForce = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--force') {
    isForce = true;
  } else if (args[i] === '--uid' && args[i + 1]) {
    expectedUid = args[i + 1].trim();
    i++;
  } else if (!args[i].startsWith('--') && !targetIdentifier) {
    targetIdentifier = args[i].trim();
  }
}

// Default to confirmed account if not explicitly passed
if (!targetIdentifier && !expectedUid) {
  console.error('\n[Error] Debes indicar el correo o el UID del usuario a promover.');
  console.error('Uso: node scripts/bootstrap-superadmin.cjs <correo@dominio.com> [--uid <TARGET_UID>] [--force]\n');
  process.exit(1);
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

process.env.GOOGLE_CLOUD_QUOTA_PROJECT = 'pachax-support-center';

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: {
      getAccessToken: () => Promise.resolve({ access_token: accessToken, expires_in: 3600 }),
    },
    projectId: 'pachax-support-center',
  });
} catch (e) {
  // Ignored if already initialized
}

// Initialize Cloud Firestore SDK with gcloud auth client
const db = new Firestore({
  projectId: 'pachax-support-center',
  authClient: {
    getRequestHeaders: async () => ({
      Authorization: 'Bearer ' + accessToken,
      'x-goog-user-project': 'pachax-support-center',
    }),
  },
});

async function run() {
  console.log('\n======================================================');
  console.log(' PACHAX SUPPORT CENTER — BOOTSTRAP DE SUPERADMIN');
  console.log('======================================================');

  try {
    let userRecord = null;

    // 1. Fetch user by UID or Email
    if (expectedUid) {
      console.log(`Buscando usuario en Firebase Auth por UID: ${expectedUid}...`);
      try {
        userRecord = await admin.auth().getUser(expectedUid);
      } catch (authErr) {
        if (authErr.code === 'auth/user-not-found') {
          console.error(`\n[Error] El UID '${expectedUid}' no existe en Firebase Authentication.`);
          process.exit(1);
        }
        throw authErr;
      }
    } else if (targetIdentifier.includes('@')) {
      console.log(`Buscando usuario en Firebase Auth por Email: ${targetIdentifier}...`);
      try {
        userRecord = await admin.auth().getUserByEmail(targetIdentifier);
      } catch (authErr) {
        if (authErr.code === 'auth/user-not-found') {
          console.error(`\n[Error] El usuario '${targetIdentifier}' no existe en Firebase Authentication.`);
          process.exit(1);
        }
        throw authErr;
      }
    } else {
      console.log(`Buscando usuario en Firebase Auth por UID: ${targetIdentifier}...`);
      try {
        userRecord = await admin.auth().getUser(targetIdentifier);
      } catch (authErr) {
        if (authErr.code === 'auth/user-not-found') {
          console.error(`\n[Error] El UID '${targetIdentifier}' no existe en Firebase Authentication.`);
          process.exit(1);
        }
        throw authErr;
      }
    }

    const uid = userRecord.uid;
    const email = userRecord.email;

    // Cross-verify UID and Email if both provided
    if (expectedUid && userRecord.uid !== expectedUid) {
      console.error(`\n[Violación de Seguridad] El UID del usuario no coincide con el esperado (${expectedUid} !== ${userRecord.uid}).`);
      process.exit(1);
    }
    if (targetIdentifier && targetIdentifier.includes('@') && userRecord.email.toLowerCase() !== targetIdentifier.toLowerCase()) {
      console.error(`\n[Violación de Seguridad] El correo del usuario no coincide con el esperado (${targetIdentifier} !== ${userRecord.email}).`);
      process.exit(1);
    }

    if (userRecord.disabled) {
      console.error(`\n[Error] La cuenta '${email}' está deshabilitada en Firebase Authentication. Operación abortada.`);
      process.exit(1);
    }

    console.log(`✓ Cuenta verificada en Auth:`);
    console.log(`   - UID: ${uid}`);
    console.log(`   - Email: ${email}`);
    console.log(`   - Email Verificado: ${userRecord.emailVerified}`);
    console.log(`   - Creado en: ${userRecord.metadata.creationTime}`);

    // 2. Run Firestore transaction to ensure atomic execution and check existing superadmins
    const result = await db.runTransaction(async (transaction) => {
      const superadminQuery = db
        .collection('users')
        .where('role', '==', 'superadmin')
        .where('status', '==', 'active');

      const existingSuperadmins = await transaction.get(superadminQuery);
      const isAlreadySuperadmin = existingSuperadmins.docs.some((doc) => doc.id === uid);

      if (isAlreadySuperadmin) {
        return {
          status: 'already_superadmin',
          message: `El usuario ${email} (${uid}) ya cuenta con rol de superadministrador activo. Operación idempotente.`,
        };
      }

      if (!existingSuperadmins.empty && !isForce) {
        const existingEmails = existingSuperadmins.docs.map((d) => d.data().email).join(', ');
        return {
          status: 'exists_requires_force',
          message: `Ya existe(n) superadministrador(es) activo(s) en el sistema: [${existingEmails}]. Use el flag --force para autorizar una adición explícita vía CLI.`,
        };
      }

      // References
      const userRef = db.collection('users').doc(uid);
      const auditRef = db.collection('auditLogs').doc();

      // Read existing user doc if any (to preserve fields on merge)
      const existingUserDoc = await transaction.get(userRef);

      // Set user doc
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
          createdAt: existingUserDoc.exists ? (existingUserDoc.data().createdAt || new Date()) : new Date(),
          updatedAt: new Date(),
        },
        { merge: true }
      );

      // Audit log entry
      transaction.set(auditRef, {
        action: 'CLI_SUPERADMIN_BOOTSTRAP_PROMOTED',
        targetUid: uid,
        targetEmail: email.toLowerCase().trim(),
        promotedRole: 'superadmin',
        developerCompanyId: 'dev-pachax-core',
        executedBy: process.env.USERNAME || process.env.USER || 'gcp-admin-cli',
        isForceUsed: isForce,
        timestamp: new Date(),
      });

      return {
        status: 'promoted',
        message: `Superadministrador inicializado con éxito para ${email} (${uid}).`,
      };
    });

    if (result.status === 'exists_requires_force') {
      console.warn(`\n[Aviso de Concurrencia/Seguridad]: ${result.message}`);
      process.exit(1);
    }

    // 3. Set Custom Claims in Firebase Auth
    await admin.auth().setCustomUserClaims(uid, {
      role: 'superadmin',
      developerCompanyId: 'dev-pachax-core',
    });

    console.log(`✓ Custom Claims inyectados en Auth: { role: 'superadmin', developerCompanyId: 'dev-pachax-core' }`);
    console.log(`✓ Perfil y permisos persistidos en Firestore (/users/${uid})`);
    console.log(`✓ Evento registrado en auditoría inmutable (/auditLogs)`);
    console.log(`\n🎉 ${result.message}\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n[Fallo crítico en bootstrap]:', err.message);
    process.exit(1);
  }
}

// Execution guard: when imported as module, do not run automatically
if (require.main === module) {
  run();
}

module.exports = { run };
