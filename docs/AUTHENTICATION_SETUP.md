# Autenticación y Control de Acceso (RBAC) — PACHAX Support Center

## 1. Principio de Seguridad: Sin Registro Público

A diferencia de aplicaciones de consumo, **PACHAX Support Center tiene el registro público totalmente deshabilitado**:
- Ningún usuario anónimo puede crear una cuenta por sí mismo desde el frontend.
- Todos los usuarios deben ser **creados o invitados formalmente** por una identidad administrativa autorizada.
- Cada invitación genera un enlace de un solo uso con vencimiento configurable (por defecto 48 horas).

---

## 2. Jerarquía de Roles y Matriz de Permisos

El sistema distingue siete (7) roles específicos con validación tanto en el frontend como en las reglas de seguridad de Firestore y Cloud Functions:

| Rol | Alcance | Capacidades Principales |
| :--- | :--- | :--- |
| **`superadmin`** | Plataforma Global | Control total de empresas, proyectos, configuración de IA, secretos y auditoría global. |
| **`dev_owner`** | Empresa Desarrolladora | Administra el estudio técnico (PACHAX), sus clientes, proyectos, facturación y activación de IA. |
| **`dev_admin`** | Empresa Desarrolladora | Gestión operativa, invitación de desarrolladores, triage de incidencias y cotizaciones. |
| **`dev_engineer`** | Empresa Desarrolladora | Asignación y resolución técnica de bugs, disparo de reparaciones con IA, revisión de código. |
| **`dev_commercial`**| Empresa Desarrolladora | Elaboración y seguimiento comercial de cotizaciones para nuevas implementaciones. |
| **`client_admin`** | Empresa Cliente | Representante legal/técnico del cliente. Aprueba presupuestos y gestiona usuarios de su empresa. |
| **`client_user`** | Empresa Cliente | Operador autorizado. Reporta incidencias diarias, emergencias críticas y solicita cambios. |

---

## 3. Inicialización del Primer Superadministrador (Bootstrap)

Para evitar la vulnerabilidad común donde el primer usuario registrado se convierte automáticamente en superadministrador, PACHAX Support Center implementa una Cloud Function protegida:

```typescript
// functions/src/index.ts -> bootstrapSuperadmin
```

### Procedimiento Seguro de Inicialización
1. El propietario autenticado en Firebase Auth con correo administrativo (ej. `pachax.bo@gmail.com` o `admin@pachax.bo`) invoca la función por única vez.
2. La función verifica en Firestore si ya existe algún documento con `role: 'superadmin'`.
3. Si existe, la solicitud es **rechazada inmediatamente con error `already-exists`**.
4. Si no existe ninguno, asigna el Custom Claim `{ role: 'superadmin' }` en Firebase Auth y crea el perfil inmutable en la colección `/users/{uid}`.
