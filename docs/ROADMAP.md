# Hoja de Ruta (Roadmap) — PACHAX Support Center

## Fase 1: Fundaciones, Interfaz, Editor & Multi-Tenant (Completada Actual)
- [x] Repositorio privado creado en `pachaxbo-commits/pachax-support-center`.
- [x] Proyecto Firebase `pachax-support-center` creado con Web App oficial.
- [x] Proyecto Vercel vinculado y conectado con el repositorio GitHub.
- [x] Arquitectura de componentes React 19 + TypeScript + Vite + Tailwind CSS.
- [x] Editor completo de anotaciones sobre imágenes (HTML5 Canvas, táctil y mouse).
- [x] Formulario de reporte de incidencias generales con lote dinámico (`+ Agregar error`) y cuota diaria.
- [x] Formulario de incidencias críticas (24/7) con advertencia de uso responsable.
- [x] Formulario de solicitud de implementaciones y cambios con opción de solicitud de garantía.
- [x] Panel administrativo con bandeja de triage, visor de capturas y simulador de roles.
- [x] Consola de orquestación de reparaciones con IA (3 modos de ejecución).
- [x] Modelo de datos multi-tenant y reglas de seguridad de Firestore y Storage.
- [x] Flujos de trabajo de CI con GitHub Actions (Lint, Typecheck, Build, Tests).
- [x] Suite de pruebas unitarias (Vitest).

---

## Fase 2: Conexión Activa de Servicios & Notificaciones en Vivo
- [ ] Activación de Authentication (Email/Password) en consola de Firebase.
- [ ] Inicialización del primer Superadministrador mediante la Cloud Function `bootstrapSuperadmin`.
- [ ] Despliegue de reglas e índices en producción (`firebase deploy`).
- [ ] Conexión del bot de Telegram para alertas inmediatas al grupo privado de guardia.
- [ ] Vinculación del dominio personalizado `support.pachax.bo` en Vercel.

---

## Fase 3: Worker de Reparación de Software con IA (Codex & Claude)
- [ ] Configuración del contenedor efímero de ejecución segura en Google Cloud Run Jobs.
- [ ] Integración de GitHub Apps con permisos granulares de lectura y apertura de PRs en repositorios de clientes autorizados.
- [ ] Implementación del motor de análisis estático y ejecución de pruebas unitarias automatizadas.
- [ ] Panel móvil para aprobación de parches diff mediante un toque.

---

## Fase 4: Despliegue del SDK de Cliente & Onboarding
- [ ] Publicación del paquete `@pachax/support-sdk` en registro privado npm.
- [ ] Integración del SDK en la aplicación móvil Android de Embutidos San José.
- [ ] Integración en el panel administrativo de QB Insumos.
- [ ] Capacitación de usuarios y arranque oficial en producción.
