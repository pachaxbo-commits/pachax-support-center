# Checklist de Configuración para el Propietario — PACHAX Support Center

Este documento detalla el estado exacto de cada una de las acciones requeridas para la puesta en marcha en producción de **PACHAX Support Center**.

---

## 1. Estado de Infraestructura & Servicios

| Acción | Estado | Detalle / Acción Requerida |
| :--- | :---: | :--- |
| **Crear Repositorio GitHub Privado** | **COMPLETADO** | Creado en `pachaxbo-commits/pachax-support-center` |
| **Crear Proyecto Firebase** | **COMPLETADO** | Creado en Google Cloud: `pachax-support-center` (ID `536862838309`) |
| **Registrar Aplicación Web Firebase** | **COMPLETADO** | Web App `PACHAX Support Center Web` (`1:536862838309:web:89e2c476b758c2ddeb39cc`) |
| **Vincular Proyecto con Vercel** | **COMPLETADO** | Vinculado a `pachaxbo-8256s-projects/pachax-support-center` y conectado a GitHub |
| **Activar Firebase Authentication** | **ACCIÓN REQUERIDA** | Entrar a Firebase Console > Auth y presionar "Comenzar" habilitando Email/Password |
| **Activar Cloud Firestore en Modo Producción** | **ACCIÓN REQUERIDA** | Entrar a Firebase Console > Firestore y presionar "Crear base de datos" en `us-central1` |
| **Habilitar Cloud Storage** | **ACCIÓN REQUERIDA** | Entrar a Firebase Console > Storage y presionar "Comenzar" |
| **Desplegar Reglas de Seguridad** | **PREPARADO** | Archivos `firestore.rules` y `storage.rules` listos. Ejecutar `firebase deploy` tras activar Firestore |
| **Inicializar Primer Superadministrador** | **PREPARADO** | Cloud Function `bootstrapSuperadmin` preparada. Iniciar sesión con la cuenta de propietario y reclamar ownership |
| **Configurar Variables de Entorno en Vercel** | **PREPARADO** | Valores listos en `.env.local` y documentados en `docs/VERCEL_SETUP.md` |
| **Vincular Dominio `support.pachax.bo`** | **ACCIÓN REQUERIDA** | Agregar CNAME `support` apuntando a `cname.vercel-dns.com` en el proveedor DNS |
| **Configurar Bot de Telegram (Opcional)** | **PREPARADO** | Crear bot con `@BotFather` y registrar token en Cloud Functions |

---

## 2. Pasos Guiados para el Propietario

### Paso 1: Habilitar Firestore y Auth en la Consola de Firebase (5 minutos)
1. Abre [Firebase Console - Authentication](https://console.firebase.google.com/project/pachax-support-center/authentication) con la cuenta `pachax.bo@gmail.com`.
2. Haz clic en **Comenzar** (**Get Started**).
3. En proveedores nativos, haz clic en **Correo electrónico/contraseña** (**Email/Password**) y activa el primer interruptor.
4. Abre [Firebase Console - Firestore](https://console.firebase.google.com/project/pachax-support-center/firestore).
5. Haz clic en **Crear base de datos**, selecciona **Modo Producción** y la región `us-central1`.
6. Abre [Firebase Console - Storage](https://console.firebase.google.com/project/pachax-support-center/storage) y activa el almacenamiento predeterminado.

### Paso 2: Desplegar Reglas de Seguridad desde la Terminal (1 minuto)
Una vez creadas las bases en la consola, ejecuta en la terminal del proyecto:
```bash
firebase deploy --only firestore,storage --project pachax-support-center
```

### Paso 3: Asignar Variables de Entorno en Vercel (3 minutos)
1. Entra a [Vercel Dashboard](https://vercel.com/pachaxbo-8256s-projects/pachax-support-center/settings/environment-variables).
2. Copia las variables provistas en `docs/VERCEL_SETUP.md` (o utiliza `vercel env pull` / `vercel env add`).

### Paso 4: Configurar DNS para `support.pachax.bo` (2 minutos)
1. En tu proveedor de DNS para el dominio `pachax.bo`, añade el siguiente registro:
   - **Tipo:** `CNAME`
   - **Host:** `support`
   - **Destino:** `cname.vercel-dns.com`
2. En Vercel > Settings > Domains, añade `support.pachax.bo`. Vercel validará el certificado SSL automáticamente.
