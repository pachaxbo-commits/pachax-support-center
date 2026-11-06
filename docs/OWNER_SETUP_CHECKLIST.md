# Checklist de Configuración para el Propietario — PACHAX Support Center (Fase 2)

Este documento detalla el estado exacto de cada una de las acciones requeridas para la puesta en marcha de **PACHAX Support Center**.

---

## 1. ESTADO DE INFRAESTRUCTURA & SERVICIOS

| Servicio / Componente | Estado Real | Detalle / Acción Requerida |
| :--- | :---: | :--- |
| **Repositorio GitHub** | **COMPLETADO (PÚBLICO)** | [`pachaxbo-commits/pachax-support-center`](https://github.com/pachaxbo-commits/pachax-support-center) sin secretos filtrados. |
| **Vercel — Despliegue Preview** | **● READY (OPERATIVO)** | [https://pachax-support-center-ey0qh7lwe-pachaxbo-8256s-projects.vercel.app](https://pachax-support-center-ey0qh7lwe-pachaxbo-8256s-projects.vercel.app) |
| **Vercel — Despliegue Producción** | **● READY (OPERATIVO)** | [https://pachax-support-center.vercel.app](https://pachax-support-center.vercel.app) |
| **Cloud Firestore** | **ACTIVO & DESPLEGADO** | Base `(default)` en producción. Reglas e índices compuestos desplegados exitosamente. |
| **Cloud Storage** | **ACCIÓN REQUERIDA (1 clic)** | Entrar a [Firebase Storage](https://console.firebase.google.com/project/pachax-support-center/storage) y presionar "Comenzar" (**Get Started**). |
| **Firebase Authentication** | **ACCIÓN REQUERIDA (1 clic)** | Entrar a [Firebase Auth](https://console.firebase.google.com/project/pachax-support-center/authentication), presionar "Comenzar" y habilitar **Email/Password**. |
| **Bootstrap Primer Superadmin** | **PREPARADO & BLINDADO** | Lista blanca de propietarios activa (`pachax.bo@gmail.com`, `admin@pachax.bo`). Script disponible: `node scripts/bootstrap-superadmin.cjs`. |
| **Dominio Personalizado** | **ACCIÓN REQUERIDA (DNS)** | Agregar registro CNAME `support` apuntando a `cname.vercel-dns.com` para `support.pachax.bo`. |

---

## 2. PASOS CONCRETOS PARA EL PROPIETARIO

### Paso 1: Activar Authentication y Storage en la Consola (3 minutos)
1. Abre [Firebase Console — Authentication](https://console.firebase.google.com/project/pachax-support-center/authentication) con la cuenta `pachax.bo@gmail.com`.
2. Presiona **Comenzar** (**Get Started**).
3. En la pestaña **Sign-in method**, activa el proveedor **Correo electrónico/contraseña**.
4. Abre [Firebase Console — Storage](https://console.firebase.google.com/project/pachax-support-center/storage) y presiona **Comenzar** (**Get Started**).
5. Tras habilitar Storage, ejecuta en la terminal local:
   ```bash
   firebase deploy --only storage --project pachax-support-center
   ```

### Paso 2: Crear el Primer Superadministrador de Forma Segura
El sistema tiene el auto-registro libre deshabilitado y bloquea cualquier intento de escalamiento. Una vez activado Auth:
1. Registra tu cuenta en Firebase Auth con tu correo autorizado (`pachax.bo@gmail.com`).
2. En la terminal del proyecto, ejecuta:
   ```bash
   node scripts/bootstrap-superadmin.cjs pachax.bo@gmail.com
   ```
   El script validará la lista blanca, asignará el Custom Claim `{ role: 'superadmin' }` en Firebase Auth y creará tu perfil en Firestore.

### Paso 3: Configurar Dominio `support.pachax.bo`
1. En tu proveedor DNS (donde gestionas el dominio `pachax.bo`), crea un registro:
   - **Tipo:** `CNAME`
   - **Nombre:** `support`
   - **Destino:** `cname.vercel-dns.com`
2. En el panel de Vercel, el dominio se validará automáticamente.
