# Configuración de Firebase — PACHAX Support Center

## 1. Identificación del Proyecto Firebase Creado

El proyecto Firebase exclusivo para PACHAX Support Center ha sido inicializado exitosamente en Google Cloud y Firebase:

- **Nombre en Consola:** PACHAX Support Center
- **Project ID:** `pachax-support-center`
- **Project Number:** `536862838309`
- **Web App ID:** `1:536862838309:web:89e2c476b758c2ddeb39cc`
- **Storage Bucket:** `pachax-support-center.firebasestorage.app`
- **Auth Domain:** `pachax-support-center.firebaseapp.com`
- **Cuenta Propietaria:** `pachax.bo@gmail.com`
- **Consola Firebase:** [https://console.firebase.google.com/project/pachax-support-center/overview](https://console.firebase.google.com/project/pachax-support-center/overview)

---

## 2. Variables de Entorno del Frontend (`.env.local`)

El archivo `.env.local` (excluido de Git por `.gitignore`) contiene la configuración real de la aplicación web:

```bash
VITE_FIREBASE_API_KEY=AIzaSyBq5vlUYoIZfn9-Gi2FaJK3oGyIYWL-IFo
VITE_FIREBASE_AUTH_DOMAIN=pachax-support-center.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pachax-support-center
VITE_FIREBASE_STORAGE_BUCKET=pachax-support-center.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=536862838309
VITE_FIREBASE_APP_ID=1:536862838309:web:89e2c476b758c2ddeb39cc

VITE_APP_MODE=live
VITE_APP_NAME="PACHAX Support Center"
VITE_SUPPORT_DOMAIN=support.pachax.bo
VITE_USE_FIREBASE_EMULATORS=false
```

---

## 3. Acciones en la Consola de Firebase Requeridas por el Propietario

Aunque los recursos de Google Cloud y la aplicación web ya están creados, Google requiere que el propietario active manualmente los servicios de base de datos desde la consola:

### 3.1 Activar Firebase Authentication
1. Ingresa a la consola: [Firebase Auth Console](https://console.firebase.google.com/project/pachax-support-center/authentication)
2. Haz clic en **Comenzar** (**Get Started**).
3. En la pestaña **Sign-in method**, habilita el proveedor **Correo electrónico/contraseña** (**Email/Password**).
4. **Desactiva** la opción de registro de usuarios anónimos o auto-registro público libre.

### 3.2 Crear la Base de Datos Cloud Firestore
1. Ingresa a: [Cloud Firestore Console](https://console.firebase.google.com/project/pachax-support-center/firestore)
2. Haz clic en **Crear base de datos**.
3. Selecciona la ubicación regional preferida (ej. `us-central1` o `southamerica-east1`).
4. Selecciona **Modo Producción**.
5. Las reglas locales de `firestore.rules` del repositorio serán desplegadas en el paso 4.

### 3.3 Habilitar Cloud Storage for Firebase
1. Ingresa a: [Cloud Storage Console](https://console.firebase.google.com/project/pachax-support-center/storage)
2. Haz clic en **Comenzar**.
3. Configura el bucket en Modo Producción.

---

## 4. Despliegue de Reglas e Índices desde la CLI

Una vez activados Firestore y Storage en la consola web, ejecuta:

```bash
# Desplegar reglas de seguridad de Firestore
firebase deploy --only firestore:rules --project pachax-support-center

# Desplegar índices compuestos optimizados
firebase deploy --only firestore:indexes --project pachax-support-center

# Desplegar reglas de Cloud Storage
firebase deploy --only storage --project pachax-support-center
```

---

## 5. Emuladores Locales para Pruebas sin Consumo de Cuota

Para desarrollo offline o pruebas automatizadas con el Firebase Emulator Suite:

```bash
# Iniciar emuladores de Auth, Firestore, Storage y Functions
firebase emulators:start
```
La interfaz del emulador estará disponible en `http://localhost:4000`.
Para conectar la app web a los emuladores, asigna en `.env.local`:
```bash
VITE_USE_FIREBASE_EMULATORS=true
```
