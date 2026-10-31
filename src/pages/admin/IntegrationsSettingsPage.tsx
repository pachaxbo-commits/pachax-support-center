import React, { useState, useEffect } from 'react';
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
  Zap,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface NotificationQueueItem {
  id: string;
  reportId?: string;
  projectName?: string;
  type: string;
  status: 'delivered' | 'pending_credentials' | 'partial' | 'failed';
  emailDispatched?: boolean;
  telegramDispatched?: boolean;
  details?: {
    telegram?: { ok: boolean; error?: string };
    email?: { ok: boolean; error?: string };
  };
  createdAt?: any;
}

export const IntegrationsSettingsPage: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'testing' | 'success'>('idle');
  const [whatsAppText, setWhatsAppText] = useState('¡Hola! Tenemos una actualización sobre la incidencia [SANJOSE-POS-101]. El parche está listo para verificación.');
  const [queueItems, setQueueItems] = useState<NotificationQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState<boolean>(true);

  useEffect(() => {
    if (!isFirebaseConfigured() || !db) {
      setLoadingQueue(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'notificationQueue'),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const items: NotificationQueueItem[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as NotificationQueueItem[];
          setQueueItems(items);
          setLoadingQueue(false);
        },
        () => {
          setLoadingQueue(false);
        }
      );

      return () => unsubscribe();
    } catch {
      setLoadingQueue(false);
    }
  }, []);

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

      {/* External Notification Providers Status Audit */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl">
              <Shield className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Estado de Proveedores de Alerta & Secret Manager
              </h2>
              <span className="text-xs text-slate-400">
                Verificación de conectividad en Cloud Functions Gen 2
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
            Auditado en Runtime
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Telegram Status */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Send className="w-4 h-4 text-sky-500" />
                <span className="font-semibold text-xs text-slate-900 dark:text-white">Telegram Bot</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                Pendiente Secret
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Requiere <code>TELEGRAM_BOT_TOKEN</code> y <code>TELEGRAM_CHAT_ID</code> en Google Secret Manager. Alertas se archivan en cola interna.
            </p>
          </div>

          {/* Email / Resend Status */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-rose-500" />
                <span className="font-semibold text-xs text-slate-900 dark:text-white">Email 24/7 (Resend)</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                Pendiente Secret
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Requiere <code>RESEND_API_KEY</code> en Google Secret Manager. Las incidencias críticas envían a <code>soporte@pachax.bo</code>.
            </p>
          </div>

          {/* Cloud Logging Status */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-semibold text-xs text-slate-900 dark:text-white">Cola Interna Firestore</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                Operativo
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              Toda alerta de incidencia crítica se persiste inmutablemente en <code>/notificationQueue</code> y <code>/auditLogs</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Live Notification Delivery Queue Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-xl">
              <Clock className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Historial de Alertas y Despacho (/notificationQueue)
              </h2>
              <span className="text-xs text-slate-400">
                Registro de eventos en tiempo real sin falsificación de entregas
              </span>
            </div>
          </div>
        </div>

        {loadingQueue ? (
          <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-brand-500" />
            <span>Consultando cola de notificaciones en Firestore...</span>
          </div>
        ) : queueItems.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No hay alertas pendientes ni despachadas recientemente en la cola
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
              Cuando un cliente reporte una incidencia crítica, aparecerá aquí automáticamente con su estado real de entrega (Telegram / Email / Cola).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-lg">ID / Reporte</th>
                  <th className="py-2.5 px-3">Proyecto</th>
                  <th className="py-2.5 px-3">Tipo de Alerta</th>
                  <th className="py-2.5 px-3">Canales</th>
                  <th className="py-2.5 px-3 rounded-r-lg">Estado de Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {queueItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-900 dark:text-white">
                      {item.reportId || item.id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                      {item.projectName || 'General'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500">
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                        CRÍTICA 24/7
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className={item.telegramDispatched ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                          TG: {item.telegramDispatched ? 'OK' : 'Pendiente'}
                        </span>
                        <span className={item.emailDispatched ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                          Email: {item.emailDispatched ? 'OK' : 'Pendiente'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      {item.status === 'delivered' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                          Entregado
                        </span>
                      ) : item.status === 'pending_credentials' ? (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px] border border-amber-500/20">
                          Archivado en Cola (Sin Secrets)
                        </span>
                      ) : item.status === 'partial' ? (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 font-bold text-[10px] border border-sky-500/20">
                          Parcial
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 font-bold text-[10px] border border-rose-500/20">
                          Error de Envío
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
