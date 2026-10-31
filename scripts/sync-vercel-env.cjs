const { spawnSync } = require('child_process');

const envVars = {
  'VITE_FIREBASE_API_KEY': 'AIzaSyBq5vlUYoIZfn9-Gi2FaJK3oGyIYWL-IFo',
  'VITE_FIREBASE_AUTH_DOMAIN': 'pachax-support-center.firebaseapp.com',
  'VITE_FIREBASE_PROJECT_ID': 'pachax-support-center',
  'VITE_FIREBASE_STORAGE_BUCKET': 'pachax-support-center.firebasestorage.app',
  'VITE_FIREBASE_MESSAGING_SENDER_ID': '536862838309',
  'VITE_FIREBASE_APP_ID': '1:536862838309:web:89e2c476b758c2ddeb39cc',
  'VITE_APP_MODE': 'live',
  'VITE_APP_NAME': 'PACHAX Support Center',
  'VITE_SUPPORT_DOMAIN': 'support.pachax.bo',
  'VITE_USE_FIREBASE_EMULATORS': 'false',
};

const targets = ['preview'];

for (const targetEnv of targets) {
  for (const [key, val] of Object.entries(envVars)) {
    // For preview, Vercel asks for value then branch (empty for all branches)
    const res = spawnSync('npx', ['vercel', 'env', 'add', key, targetEnv], {
      input: val + '\n\n',
      encoding: 'utf-8',
      shell: true,
      timeout: 10000,
    });
    const isOk = (res.stdout || '').includes('Added');
    console.log(`[${targetEnv}] ${key}: ${isOk ? 'OK' : 'Notice/Error'}`);
    if (!isOk) {
      console.log(res.stdout || res.stderr);
    }
  }
}
