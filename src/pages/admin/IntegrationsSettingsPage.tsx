import React, { useState } from 'react';
import {
  Settings,
  Send,
  MessageSquare,
  Shield,
  Key,
  Copy,
  Check,
  Smartphone,
  Globe,
  Layers,
  Code2,
  Terminal,
  ExternalLink,
  Zap
} from 'lucide-react';

export const IntegrationsSettingsPage: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [whatsAppText, setWhatsAppText] = useState('¡Hola! Tenemos una actualización sobre la incidencia [SANJOSE-POS-101]. El parche está listo para verificación.');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestTelegram = () => {
    setTelegramStatus('testing');
    setTimeout(() => {
      setTelegramStatus('success');
      setTimeout(() => setTelegramStatus('idle'), 3000);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">
          Integraciones, SDKs & Notificaciones
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Arquitectura de conexión de aplicaciones externas, PACHAX Support SDK y despachadores de alertas.
        </p>
      </div>

      {/* PACHAX Support SDK Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-xl">
              <Code2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                PACHAX Support SDK — Contratos de Conexión
              </h2>
              <span className="text-xs text-slate-400">
                Librería cliente para Android, Web React y SaaS Multi-tenant
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Handshake Criptográfico Temporal
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          El SDK de PACHAX Support Center permite a cualquier aplicación Android o Web reportar errores directamente desde el dispositivo o interfaz del cliente sin exponer secretos administrativos. Se utiliza un <strong>Public Token</strong> para solicitar un token de sesión de corta duración firmado con HMAC por el backend.
        </p>

        {/* Integration Code Sample Carousel */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Ejemplo de Inicialización en Aplicaciones Cliente (Web / React / Android)</span>
            <button
              onClick={() =>
                handleCopy(
                  `import { PachaxSupportClient } from '@pachax/support-sdk';\n\nconst support = new PachaxSupportClient({\n  publicKey: 'pk_live_sanjose_9f823a1',\n  pachaxPlatformContext: {\n    tenantId: 'embutidos-sanjose',\n    userId: 'user_4821',\n    templateId: 'pos-retail-v2',\n    appVersion: '2.4.1',\n    changeScope: 'client_specific'\n  }\n});\n\n// Captura automática de pantalla y reporte asistido\nawait support.reportIncident({\n  title: 'Error de cálculo en impuesto ICE',\n  category: 'general',\n  moduleAffected: 'Facturación SIN'\n});`,
                  'sdk-code'
                )
              }
              className="flex items-center gap-1 text-brand-600 dark:text-brand-400 hover:underline"
            >
              {copiedKey === 'sdk-code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'sdk-code' ? 'Copiado' : 'Copiar snippet'}</span>
            </button>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 overflow-x-auto shadow-inner">
            <pre className="text-slate-300">
{`import { PachaxSupportClient } from '@pachax/support-sdk';

const support = new PachaxSupportClient({
  publicKey: 'pk_live_sanjose_9f823a1',
  pachaxPlatformContext: {
    tenantId: 'embutidos-sanjose',
    userId: 'user_4821',
    templateId: 'pos-retail-v2',
    appVersion: '2.4.1',
    changeScope: 'client_specific' // 'client_specific' | 'template' | 'core'
  }
});

// Captura automática y despacho seguro
await support.reportIncident({
  title: 'Error de sincronización en cierre de lote',
  category: 'general',
  moduleAffected: 'Cierre Z'
});`}
            </pre>
          </div>
        </div>
      </div>

      {/* Notifications Channels Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Telegram Bot */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-sky-500/20 text-sky-500 rounded-xl">
                <Send className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Alertas Inmediatas en Telegram
                </h3>
                <span className="text-[11px] text-slate-400">Canal de Guardia @PachaxSupportAlerts</span>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Las incidencias críticas (24/7) y las fallas de alta prioridad envían automáticamente un aviso con formato markdown al grupo privado del equipo técnico.
          </p>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Canal: -1002345678901</span>
            <button
              onClick={handleTestTelegram}
              disabled={telegramStatus === 'testing'}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow transition flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{telegramStatus === 'testing' ? 'Enviando...' : telegramStatus === 'success' ? '¡Alerta Enviada!' : 'Probar Alerta'}</span>
            </button>
          </div>
        </div>

        {/* WhatsApp Manual / Cloud API Generator */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl">
                <MessageSquare className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Generador de Mensajes WhatsApp
                </h3>
                <span className="text-[11px] text-slate-400">Envío oficial o enlace rápido wa.me</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Genera enlaces estructurados y plantillas pre-aprobadas para informar al cliente por WhatsApp sin depender de tokens externos frágiles.
          </p>

          <div className="space-y-2">
            <textarea
              rows={2}
              value={whatsAppText}
              onChange={(e) => setWhatsAppText(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none"
            />
            <div className="flex justify-end">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(whatsAppText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
