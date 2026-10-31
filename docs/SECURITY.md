# Modelo de Seguridad & Protección Multi-Tenant

## 1. Principio de Denegación por Defecto
Todas las solicitudes a Cloud Firestore y Cloud Storage son denegadas automáticamente a menos que coincidan explícitamente con una regla de autorización comprobada:

```javascript
// firestore.rules
match /{document=**} {
  allow read, write: if false;
}
```

---

## 2. Aislamiento Estricto entre Empresas (Multi-Tenancy)
1. **Clientes cruzados:** Un usuario de `client-sanjose` jamás tiene acceso de lectura ni escritura a las incidencias, cotizaciones o archivos de `client-qbinsumos`.
2. **Empresas desarrolladoras aisladas:** Si coexisten múltiples entidades desarrolladoras, cada una administra exclusivamente sus proyectos vinculados.
3. **Inmutabilidad de campos sensibles:** Un cliente puede actualizar la descripción o evidencia de su incidencia, pero las reglas bloquean cualquier intento de modificar `status`, `assignedTo`, `developerCompanyId` o `clientCompanyId` desde el cliente.

---

## 3. Seguridad en Cloud Storage
Las reglas de almacenamiento imponen:
- Validación de tipo MIME: Solo se admiten `image/*` para capturas y `application/pdf` o archivos de texto para evidencias documentales.
- Restricción de tamaño máximo:
  - Imágenes y capturas anotadas: Máximo 10 MB.
  - Documentos técnicos y logs: Máximo 25 MB.
- Rutas aisladas por jerarquía:
  `/tenants/{devId}/clients/{clientId}/projects/{projId}/...`

---

## 4. Firebase App Check
Para evitar que clientes maliciosos o scripts automatizados consuman la cuota de Firebase y de la API de Cloud Functions, se implementa **Firebase App Check**:
- En entorno Web: Verificación mediante **reCAPTCHA Enterprise**.
- En entorno Android (PACHAX Support SDK): Verificación mediante **Play Integrity API**.
- Toda solicitud sin un token de App Check válido es descartada a nivel de pasarela antes de alcanzar Firestore.

---

## 5. Google Secret Manager
- Las credenciales sensibles de integración técnica (tokens de GitHub con alcance a repositorios, API keys de Anthropic Claude y OpenAI Codex, tokens de bot de Telegram) **nunca residen en el frontend**.
- Se almacenan en **Google Secret Manager** y son consumidas únicamente por las Cloud Functions Gen 2 en tiempo de ejecución.
