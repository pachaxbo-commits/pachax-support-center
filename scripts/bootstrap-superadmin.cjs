/**
 * PACHAX Support Center — Script Administrativo de Bootstrap Superadmin
 *
 * Procedimiento administrativo oficial para inicializar el superadministrador
 * con credenciales autorizadas de Google Cloud / Firebase Admin SDK.
 *
 * Características de seguridad:
 * 1. Ejecución exclusiva por terminal (sin endpoints públicos).
 * 2. Transacción Firestore atómica para garantizar concurrencia e idempotencia.
 * 3. Auditoría obligatoria en 'auditLogs'.
 * 4. Asignación inmediata de Custom Claims en Firebase Authentication.
 *
 * Uso:
 *   node scripts/bootstrap-superadmin.cjs <EMAIL_SUPERADMIN> [--force]
 */

const admin = require('firebase-admin');

const targetEmail = process.argv[2];
const isForce = process.argv.includes('--force');

if (!targetEmail || targetEmail.startsWith('--')) {
  console.error('\n[Error] Debes indicar el correo del usuario que será promovido a Superadministrador.');
  console.error('Uso: node scripts/bootstrap-superadmin.cjs <correo@dominio.com> [--force]\n');
  process.exit(1);
}

// Initialize Admin SDK with Application Default Credentials or GOOGLE_APPLICATION_CREDENTIALS
try {
  admin.initializeApp({
    projectId: process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT || 'pachax-support-center',
  });
} catch (e) {
  // Ignored if already initialized
}

const db = admin.firestore();

async function run() {
  console.log('\n======================================================');
  console.log(' PACHAX SUPPORT CENTER — BOOTSTRAP DE SUPERADMIN');
  console.log('======================================================');
  console.log(`Buscando usuario en Firebase Auth para: ${targetEmail}...`);

  try {
    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(targetEmail);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        console.error(`\n[Error] El usuario '${targetEmail}' no existe en Firebase Authentication.`);
        console.error('El usuario debe estar registrado en Authentication antes de poder ser promovido a Superadministrador.\n');
        process.exit(1);
      }
      throw authErr;
    }

    const uid = userRecord.uid;
    console.log(`✓ Usuario verificado en Auth: UID = ${uid}`);

    // Run Firestore transaction to ensure atomic execution and check existing superadmins
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
          message: `El usuario ${targetEmail} ya cuenta con rol de superadministrador activo. Operación idempotente.`,
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

      // Set user doc
      transaction.set(
        userRef,
        {
          uid,
          email: targetEmail.toLowerCase().trim(),
          displayName: userRecord.displayName || 'Superadministrador PACHAX',
          role: 'superadmin',
          developerCompanyId: 'dev-pachax-core',
          clientCompanyId: null,
          status: 'active',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Audit log entry
      transaction.set(auditRef, {
        action: 'CLI_SUPERADMIN_BOOTSTRAP_PROMOTED',
        targetUid: uid,
        targetEmail: targetEmail.toLowerCase().trim(),
        executedBy: process.env.USERNAME || process.env.USER || 'gcp-admin-cli',
        isForceUsed: isForce,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        status: 'promoted',
        message: `Superadministrador inicializado con éxito para ${targetEmail}.`,
      };
    });

    if (result.status === 'exists_requires_force') {
      console.warn(`\n[Aviso de Concurrencia/Seguridad]: ${result.message}`);
      process.exit(1);
    }

    // Set Custom Claims in Firebase Auth
    await admin.auth().setCustomUserClaims(uid, {
      role: 'superadmin',
      developerCompanyId: 'dev-pachax-core',
    });

    console.log(`✓ Custom Claims actualizados en Auth: { role: 'superadmin', developerCompanyId: 'dev-pachax-core' }`);
    console.log(`✓ Perfil y permisos persistidos en Firestore (/users/${uid})`);
    console.log(`✓ Evento registrado en auditoría (/auditLogs)`);
    console.log(`\n🎉 ${result.message}\n`);
    process.exit(0);
  } catch (err) {
    console.error('\n[Fallo crítico en bootstrap]:', err.message);
    process.exit(1);
  }
}

run();
