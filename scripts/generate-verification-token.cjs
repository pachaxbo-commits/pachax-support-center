const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const admin = require(path.resolve(__dirname, '../functions/node_modules/firebase-admin'));

let accessToken;
try {
  accessToken = execSync('gcloud auth print-access-token').toString().trim();
} catch (err) {
  console.error('[Error] No se pudo obtener el token de autenticación de gcloud:', err.message);
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

async function generateSecureLink() {
  const targetUid = 'NH3DaEHYt3aiFfg0gq85kHirPO12';
  const targetEmail = 'pachax.bo@gmail.com';

  const user = await admin.auth().getUser(targetUid);
  if (!user || user.email.toLowerCase() !== targetEmail.toLowerCase()) {
    console.error(`[Error] La cuenta no coincide con el objetivo autorizado: ${targetEmail}`);
    process.exit(1);
  }

  if (user.emailVerified) {
    console.log(`✓ La cuenta ${targetEmail} (UID: ${targetUid}) ya se encuentra formalmente verificada.`);
    process.exit(0);
  }

  const actionCodeSettings = {
    url: 'https://pachax-support-center.vercel.app/login',
    handleCodeInApp: false,
  };

  const link = await admin.auth().generateEmailVerificationLink(targetEmail, actionCodeSettings);

  const outputPath = path.resolve(__dirname, '../.secure-verification-link.txt');
  fs.writeFileSync(outputPath, link.trim() + '\n', { mode: 0o600 });

  console.log('\n================================================================');
  console.log(' ENLACE DE VERIFICACIÓN OFICIAL GENERADO DE FORMA SEGURA');
  console.log('================================================================');
  console.log(`Destinatario:   ${targetEmail}`);
  console.log(`UID:            ${targetUid}`);
  console.log(`Archivo Local:  .secure-verification-link.txt`);
  console.log('----------------------------------------------------------------');
  console.log('Por seguridad, el código oobCode y la URL NO se muestran en el chat.');
  console.log('Abra el archivo local .secure-verification-link.txt en su editor,');
  console.log('copie la URL y péguela en su navegador para completar la verificación.');
  console.log('================================================================\n');
}

generateSecureLink().catch(err => {
  console.error('Error al generar enlace seguro:', err.message);
  process.exit(1);
});
