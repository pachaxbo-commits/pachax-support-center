const path = require('path');
const { execSync } = require('child_process');
const admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));

let accessToken;
try {
  accessToken = execSync('gcloud auth print-access-token').toString().trim();
} catch (err) {
  console.error('[Error] No se pudo obtener el token de gcloud:', err.message);
  process.exit(1);
}

process.env.GOOGLE_CLOUD_QUOTA_PROJECT = 'pachax-support-center';

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

async function checkStatus() {
  const targetUid = 'NH3DaEHYt3aiFfg0gq85kHirPO12';
  const user = await admin.auth().getUser(targetUid);
  
  console.log('\n================================================================');
  console.log(' ESTADO ACTUAL DE VERIFICACIÓN DE CORREO (FIREBASE AUTH)');
  console.log('================================================================');
  console.log(`UID:              ${user.uid}`);
  console.log(`Email:            ${user.email}`);
  console.log(`Email Verificado: ${user.emailVerified ? 'SÍ (true)' : 'NO (false)'}`);
  console.log(`Deshabilitado:    ${user.disabled ? 'SÍ (true)' : 'NO (false)'}`);
  console.log(`Custom Claims:    ${JSON.stringify(user.customClaims || {})}`);
  
  if (!user.emailVerified) {
    console.log('\n[AVISO] El correo de la cuenta aún NO ha sido verificado (emailVerified: false).');
    console.log('Por seguridad, el enlace y código oobCode no se imprimen en logs ni en consola.');
    console.log('Siga el procedimiento oficial desde la consola de Firebase o desde la aplicación para enviar el correo.');
  } else {
    console.log('\n✓ La cuenta ya ha sido verificada formalmente.');
    console.log('Listo para proceder con la promoción cuando el propietario lo autorice.\n');
  }
}

checkStatus().catch(err => {
  console.error('Error al consultar estado:', err.message);
  process.exit(1);
});
