/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_APP_MODE?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_SUPPORT_DOMAIN?: string;
  readonly VITE_USE_FIREBASE_EMULATORS?: string;
  readonly VITE_EMULATOR_AUTH_PORT?: string;
  readonly VITE_EMULATOR_FIRESTORE_PORT?: string;
  readonly VITE_EMULATOR_STORAGE_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
