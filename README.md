# PACHAX Support Center

Plataforma empresarial multi-tenant para administración de incidencias, cotizaciones de software, seguimiento de acuerdos de nivel de servicio (SLA) y orquestación de reparaciones de código asistidas por inteligencia artificial (Codex SDK / Claude Agent SDK).

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Tests](https://img.shields.io/badge/tests-11%20passed-success)
![TypeScript](https://img.shields.io/badge/typescript-strict-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)

---

## Características Principales

- **Portal de Cliente Intuitivo:** Diseñado con enfoque móvil para operadores en campo y gerentes de sucursales.
- **Reporte Consolidado Diario:** Política de 1 lote diario que permite agrupar múltiples errores independientes con el botón **+ Agregar error**.
- **Canal de Incidencias Críticas (24/7):** Atención prioritaria inmediata con SLA menor a 60 minutos para caídas de facturación o paradas operativas esenciales.
- **Editor de Anotaciones sobre Imágenes:** Lienzo táctil (HTML5 Canvas) para dibujar a mano alzada, flechas direccionales, rectángulos, círculos, resaltador traslúcido y textos explicativos sobre las capturas de pantalla.
- **Solicitud de Implementaciones & Cambios:** Formulario con justificación de valor comercial y opción para indicar si el cliente considera que corresponde a garantía o exención de costo.
- **Aprobación de Cotizaciones:** Visualizador de presupuestos desglosados en tareas, tarifas por hora y firma digital de aprobación o rechazo.
- **Panel Administrativo Multicompañía:** Bandeja de triage con filtrado avanzado, asignación de responsables y estados cronológicos.
- **Consola de Reparación con IA:** Orquestación de agentes con 3 modos de operación (*Manual Supervisado*, *Delegado con Pull Request*, y *Autónomo Autorizado*).
- **PACHAX Support SDK:** Especificación y contratos TypeScript para incrustar el botón de reporte en aplicaciones Android y Web sin exponer credenciales administrativas.

---

## Pila Tecnológica

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Lucide React, React Router 7.
- **Backend & Almacenamiento:** Cloud Firestore (Multi-tenant), Cloud Storage for Firebase, Cloud Functions Gen 2.
- **Control de Acceso:** Firebase Authentication con 7 roles granulares (RBAC), Firebase App Check.
- **Repositorio & CI/CD:** GitHub (`pachaxbo-commits/pachax-support-center`), GitHub Actions (Lint, Typecheck, Build, Vitest).
- **Hospedaje & Edge:** Vercel (`pachaxbo-8256s-projects/pachax-support-center`).
- **Dominio Previsto:** `support.pachax.bo`.

---

## Estructura del Proyecto

```text
pachax-support-center/
├── .github/workflows/          # Flujos de CI y verificación de previews
├── docs/                       # Documentación técnica exhaustiva
│   ├── ARCHITECTURE.md         # Arquitectura multi-tenant y diagramas
│   ├── FIREBASE_SETUP.md       # Configuración del proyecto Firebase creado
│   ├── GITHUB_SETUP.md         # Repositorio, ramas y workflow
│   ├── VERCEL_SETUP.md         # Despliegue en Vercel y dominio
│   ├── AUTHENTICATION_SETUP.md # Roles RBAC y procedimiento de bootstrap
│   ├── SECURITY.md             # Reglas de seguridad y protección de datos
│   ├── DEPLOYMENT.md           # Guía de publicación en producción
│   ├── INTEGRATIONS.md         # SDK de clientes, Codex y Claude Agent
│   ├── ROADMAP.md              # Hoja de ruta de desarrollo
│   └── OWNER_SETUP_CHECKLIST.md# Checklist de acciones del propietario
├── functions/                  # Cloud Functions Gen 2 (Backend)
├── src/
│   ├── components/             # Editor de imágenes, layout, badges, modales
│   ├── context/                # AuthContext (con simulador de roles) y ThemeContext
│   ├── lib/                    # Firebase modular, store unificado y datos demo
│   ├── models/                 # Modelos TypeScript estrictos
│   ├── pages/                  # Vistas de cliente, administración y autenticación
│   ├── sdk/                    # Implementación de referencia del SDK
│   └── test/                   # Suite de pruebas unitarias
├── firestore.rules             # Reglas estrictas de aislamiento multi-tenant
├── storage.rules               # Reglas de Cloud Storage (límites y MIME)
├── vercel.json                 # SPA rewrites y encabezados de seguridad
├── vite.config.ts              # Configuración de empaquetado Vite
└── vitest.config.ts            # Configuración de pruebas Vitest
```

---

## Puesta en Marcha Local

### 1. Clonar e Instalar Dependencias
```bash
git clone https://github.com/pachaxbo-commits/pachax-support-center.git
cd pachax-support-center
npm install
```

### 2. Variables de Entorno
Copia el archivo de plantilla:
```bash
cp .env.example .env.local
```
*(Para desarrollo local inmediato, la aplicación incluye un modo sandbox completo con simulador de roles que permite probar todas las funciones sin necesidad de credenciales en vivo).*

### 3. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

### 4. Ejecutar Pruebas y Control de Calidad
```bash
npm run typecheck   # Verificación de tipos TypeScript
npm run test        # Ejecución de pruebas unitarias con Vitest
npm run build       # Verificación del empaquetado de producción
```

---

## Roles Disponibles en el Simulador

Para agilizar la revisión del sistema sin requerir múltiples cuentas de correo, la barra superior incluye un **Simulador de Roles** interactivo:
1. **Superadministrador PACHAX** (acceso total a empresas, proyectos y consola IA).
2. **Director Técnico Desarrolladora** (propietario del estudio de software).
3. **Ingeniero de Soporte** (triage y resolución técnica de errores).
4. **Responsable Comercial** (emisión de cotizaciones).
5. **Administrador de Cliente** (aprobación de presupuestos y gestión de usuarios del cliente).
6. **Operador de Cliente** (reporte de incidencias y seguimiento).

---

## Licencia
Propiedad exclusiva de **PACHAX**. Todos los derechos reservados.
