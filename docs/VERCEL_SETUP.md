# Configuración de Vercel — PACHAX Support Center

## 1. Vinculación del Proyecto

El proyecto está vinculado formalmente en Vercel y conectado con el repositorio de GitHub:

- **Equipo / Scope de Vercel:** `pachaxbo-8256s-projects`
- **Nombre del Proyecto:** `pachax-support-center`
- **Repositorio Conectado:** `pachaxbo-commits/pachax-support-center`
- **Framework:** Vite
- **Comando de Build:** `npm run build`
- **Directorio de Salida:** `dist`

---

## 2. Enrutamiento SPA y Encabezados de Seguridad (`vercel.json`)

Para soportar las rutas de React Router (`/client/dashboard`, `/admin/ai-repair`, etc.) y cumplir con estándares de seguridad bancaria/empresarial, se definió `vercel.json`:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

---

## 3. Configuración de Variables de Entorno en Vercel Dashboard

En el panel de Vercel (**Project Settings > Environment Variables**), agrega las siguientes variables para los entornos **Production** y **Preview**:

| Variable | Valor Recomendado | Entorno |
| :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Clave API del proyecto Firebase | Production / Preview |
| `VITE_FIREBASE_AUTH_DOMAIN` | `pachax-support-center.firebaseapp.com` | Production / Preview |
| `VITE_FIREBASE_PROJECT_ID` | `pachax-support-center` | Production / Preview |
| `VITE_FIREBASE_STORAGE_BUCKET` | `pachax-support-center.firebasestorage.app` | Production / Preview |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| `536862838309` | Production / Preview |
| `VITE_FIREBASE_APP_ID` | `1:536862838309:web:89e2c476b758c2ddeb39cc` | Production / Preview |
| `VITE_APP_MODE` | `live` (o `demo` si se desea modo sandbox) | Production / Preview |
| `VITE_SUPPORT_DOMAIN` | `support.pachax.bo` | Production |

---

## 4. Configuración del Dominio `support.pachax.bo`

1. En el panel de Vercel, dirígete a **Settings > Domains**.
2. Agrega el dominio `support.pachax.bo`.
3. Vercel solicitará la configuración del registro DNS en el proveedor de `pachax.bo`:
   - **Tipo:** `CNAME`
   - **Nombre / Host:** `support`
   - **Valor / Destino:** `cname.vercel-dns.com`
4. Una vez propagado el registro DNS, Vercel emitirá y renovará automáticamente el certificado SSL Let's Encrypt.
