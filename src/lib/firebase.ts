import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator, Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    firebaseConfig.apiKey !== 'AIzaSy...'
  );
}

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;

if (isFirebaseConfigured()) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  // Connect emulators if enabled
  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    const authPort = Number(import.meta.env.VITE_EMULATOR_AUTH_PORT || 9099);
    const firestorePort = Number(import.meta.env.VITE_EMULATOR_FIRESTORE_PORT || 8080);
    const storagePort = Number(import.meta.env.VITE_EMULATOR_STORAGE_PORT || 9199);
    const functionsPort = Number(import.meta.env.VITE_EMULATOR_FUNCTIONS_PORT || 5001);

    try {
      connectAuthEmulator(auth, `http://localhost:${authPort}`);
      connectFirestoreEmulator(db, 'localhost', firestorePort);
      connectStorageEmulator(storage, 'localhost', storagePort);
      connectFunctionsEmulator(functions, 'localhost', functionsPort);
      console.info('[Firebase] Connected to local Emulators');
    } catch {
      // Ignored if already connected
    }
  }
} else {
  console.warn(
    '[Firebase] Configuration missing or incomplete. Operating in Demo/Fallback mode.'
  );
}

export { app, auth, db, storage, functions };
