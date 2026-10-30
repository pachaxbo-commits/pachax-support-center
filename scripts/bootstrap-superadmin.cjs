/**
 * PACHAX Support Center — Script Administrativo de Bootstrap Superadmin
 *
 * Uso:
 *   node scripts/bootstrap-superadmin.cjs <EMAIL_PROPIETARIO>
 *
 * Requiere:
 *   Credenciales de cuenta de servicio de Firebase (serviceAccountKey.json)
 *   o credenciales de aplicación predeterminadas de Google Cloud (gcloud auth application-default login).
 */

const admin = require('firebase-admin');

const targetEmail = process.argv[2];

if (!targetEmail) {
  console.error('\n[Error] Debes especificar el correo del propietario a promover como Superadmin.');
  console.error('Uso: node scripts/bootstrap-superadmin.cjs <correo@pachax.bo>\n');
  process.exit(1);
}

const AUTHORIZED_WHITELIST = [
  'pachax.bo@gmail.com',
  'admin@pachax.bo',
  'gfabrigtrf@gmail.com',
];

if (!AUTHORIZED_WHITELIST.includes(targetEmail.toLowerCase())) {
  console.error(`\n[Denegado] El correo ${targetEmail} no pertenece a la lista blanca de propietarios autorizados.`);
  process.exit(1);
}

// Initialize Admin SDK with default credentials
try {
  admin.initializeApp({
    projectId: 'pachax-support-center',
  });
} catch (e) {
  // Ignored if already initialized
}

async function run() {
  console.log(`\n=== PACHAX Support Center — Bootstrap Administrativo ===`);
  console.log(`Verificando identidad: ${targetEmail}...`);

  try {
    const userRecord = await admin.auth().getUserByEmail(targetEmail);
    console.log(`Usuario encontrado en Firebase Auth: UID = ${userRecord.uid}`);

    // Assign custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'superadmin',
      developerCompanyId: 'dev-pachax-core',
    });
    console.log(`✓ Custom Claims asignados: { role: 'superadmin', developerCompanyId: 'dev-pachax-core' }`);

    // Ensure Firestore profile exists
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: targetEmail,
        displayName: userRecord.displayName || 'Propietario PACHAX',
        role: 'superadmin',
        developerCompanyId: 'dev-pachax-core',
        status: 'active',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`✓ Perfil sincronizado en Firestore (/users/${userRecord.uid})`);

    // Audit record
    await db.collection('auditLogs').add({
      action: 'CLI_BOOTSTRAP_SUPERADMIN_PROMOTED',
      targetUid: userRecord.uid,
      targetEmail,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`\n🎉 Operación completada con éxito. ${targetEmail} ahora es Superadministrador oficial.\n`);
    process.exit(0);
  } catch (err) {
    console.error(`\n[Error al ejecutar bootstrap]:`, err.message);
    process.exit(1);
  }
}

run();
