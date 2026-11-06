import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Bell,
  Mail,
  Send,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Cpu,
  MessageSquare,
  Building2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { DeveloperCompany } from '@/models/company';
import { Badge } from '@/components/common/Badge';

export const IntegrationsSettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const devCompanyId = currentUser?.developerCompanyId || 'dev-pachax-core';

  const [devCompany, setDevCompany] = useState<DeveloperCompany | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // PACHAX Developer Company Onboarding Form State
  const [name, setName] = useState('PACHAX');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [adminEmail, setAdminEmail] = useState('pachax.bo@gmail.com');
  const [supportEmail, setSupportEmail] = useState('pachax.bo@gmail.com');
  const [supportPhone, setSupportPhone] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('https://support.pachax.bo');
  const [defaultCurrency, setDefaultCurrency] = useState<'USD' | 'BOB'>('USD');
  const [defaultDailyQuota, setDefaultDailyQuota] = useState<number>(1);
  const [policyNotes, setPolicyNotes] = useState(
    'Política de SLA sujeta a las condiciones del contrato vigente de cada empresa cliente.'
  );

  const loadDevCompany = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDeveloperCompany(devCompanyId);
      setDevCompany(data);
      if (data) {
        setName(data.name || 'PACHAX');
        setLegalName(data.legalName || '');
        setTaxId(data.taxId || '');
        setAdminEmail(data.adminEmail || currentUser?.email || 'pachax.bo@gmail.com');
        setSupportEmail(data.supportEmail || currentUser?.email || 'pachax.bo@gmail.com');
        setSupportPhone(data.supportPhone || '');
        setAddress(data.address || '');
        setWebsite(data.website || 'https://support.pachax.bo');
        setDefaultCurrency(data.commercialConfig?.defaultCurrency || 'USD');
        setDefaultDailyQuota(data.incidentPolicies?.defaultDailyGeneralQuota || 1);
        setPolicyNotes(
          data.slaConfig?.policyNotes ||
            'Política de SLA sujeta a las condiciones del contrato vigente de cada empresa cliente.'
        );
      } else if (currentUser?.email) {
        setAdminEmail(currentUser.email);
        setSupportEmail(currentUser.email);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al consultar la configuración de PACHAX en Firestore.');
    } finally {
      setLoading(false);
    }
  }, [devCompanyId, currentUser?.email]);

  useEffect(() => {
    loadDevCompany();
  }, [loadDevCompany]);

  const handleSaveDevCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const updated = await api.upsertDeveloperCompany({
        id: devCompanyId,
        name: name.trim() || 'PACHAX',
        legalName: legalName.trim() || undefined,
        taxId: taxId.trim() || undefined,
        slug: 'pachax',
        adminEmail: adminEmail.trim(),
        supportEmail: supportEmail.trim(),
        supportPhone: supportPhone.trim() || undefined,
        address: address.trim() || undefined,
        website: website.trim() || 'https://support.pachax.bo',
        slaConfig: {
          policyNotes: policyNotes.trim(),
        },
        incidentPolicies: {
          defaultDailyGeneralQuota: defaultDailyQuota,
          requireVisualEvidence: false,
          criticalRequiresJustification: true,
        },
        commercialConfig: {
          defaultCurrency,
          quoteValidityDays: 15,
        },
        performedByUid: currentUser.uid,
      });
      setDevCompany(updated);
      setSuccessMsg(
        `Configuración administrativa de ${updated.name} (${devCompanyId}) guardada en Firestore.`
      );
    } catch (err: any) {
      setError(err?.message || 'Error al guardar la configuración en Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const sdkSnippet = `import { createPachaxSupportClient } from '@pachax/support-sdk';

// Inicializa el cliente oficial en tu aplicación React, Vite, Next.js o Android WebView
export const supportClient = createPachaxSupportClient({
  publicKey: process.env.VITE_PACHAX_PUBLIC_KEY!,
  projectCode: process.env.VITE_PACHAX_PROJECT_CODE!,
  environment: 'production',
  enableTelemetry: true,
});

// Abrir el widget o reportar incidencia crítica programáticamente
await supportClient.captureCriticalError({
  title: 'Excepción no controlada en módulo principal',
  moduleAffected: 'Core / Servicios',
  justification: 'Bloqueo operativo detectado en producción',
});`;

  const handleCopySdk = () => {
    navigator.clipboard.writeText(sdkSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-500" />
            <span>Onboarding PACHAX, Políticas e Integraciones</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configuración real en Firestore de la empresa desarrolladora (<code className="font-mono">{devCompanyId}</code>), canales de alerta y SDK.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDevCompany}
          disabled={loading}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition flex items-center gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Recargar</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[11px] underline">
            Cerrar
          </button>
        </div>
      )}

      {/* PACHAX Developer Company Onboarding Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-brand-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Perfil Corporativo de Empresa Desarrolladora (PACHAX)
              </h2>
              <p className="text-xs text-slate-500">
                Documento Firestore: <code className="font-mono">developerCompanies/{devCompanyId}</code>
              </p>
            </div>
          </div>
          <Badge variant={devCompany ? 'success' : 'warning'}>
            {devCompany ? 'CONFIGURADO EN FIRESTORE' : 'PENDIENTE DE GUARDAR'}
          </Badge>
        </div>

        <form onSubmit={handleSaveDevCompany} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre Comercial *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Razón Social Legal (Opcional)
              </label>
              <input
                type="text"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Pendiente de configuración"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                NIT Tributario (Opcional)
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="Pendiente de configuración"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correo Principal de Administración *
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correo de Recepción de Soporte *
              </label>
              <input
                type="email"
                required
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Teléfono de Guardia / Soporte (Opcional)
              </label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="Pendiente de configuración"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Dirección Comercial (Opcional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Pendiente de configuración"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Moneda Comercial por Defecto
              </label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value as 'USD' | 'BOB')}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="USD">USD (Dólares Americanos)</option>
                <option value="BOB">BOB (Bolivianos)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cuota Diaria Lotes Generales por Defecto
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={defaultDailyQuota}
                onChange={(e) => setDefaultDailyQuota(Number(e.target.value) || 1)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Nota de Política de SLA General
            </label>
            <input
              type="text"
              value={policyNotes}
              onChange={(e) => setPolicyNotes(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 shadow transition"
            >
              {saving ? 'Guardando en Firestore...' : 'Guardar Configuración PACHAX en Firestore'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notifications Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Canales de Alerta Crítica (24/7)
              </h2>
            </div>
            <Badge variant="warning">VÍA SECRET MANAGER</Badge>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Telegram Bot API (Cloud Functions)
                  </span>
                </div>
                <Badge variant="neutral">SERVIDOR</Badge>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Por seguridad, los tokens de Telegram (<code className="font-mono">TELEGRAM_BOT_TOKEN</code> y <code className="font-mono">TELEGRAM_CHAT_ID</code>) nunca se almacenan ni exponen en el navegador. Se configuran directamente en Google Cloud Secret Manager para la función <code className="font-mono">submitCriticalIncident</code>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-brand-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Notificaciones Transaccionales por Correo (Resend)
                  </span>
                </div>
                <Badge variant="neutral">SERVIDOR</Badge>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Configurado mediante <code className="font-mono">RESEND_API_KEY</code> en el entorno de Cloud Functions. Si las credenciales externas aún no están definidas, toda alerta crítica queda registrada de forma segura en la colección <code className="font-mono">notificationQueue</code> de Firestore.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    WhatsApp Business Cloud API
                  </span>
                </div>
                <Badge variant="neutral">FASE FUTURA</Badge>
              </div>
              <p className="text-[11px] text-slate-500">
                Conector opcional previsto para etapas posteriores mediante Webhooks de Meta Cloud API.
              </p>
            </div>
          </div>
        </div>

        {/* AI & GitHub Config Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-5 h-5 text-purple-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Agentes IA & GitHub (Fase 3)
              </h2>
            </div>
            <Badge variant="warning">FASE 3 PENDIENTE</Badge>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-1.5">
              <span className="font-bold text-amber-900 dark:text-amber-300 block">
                Ejecución Autónoma Deshabilitada en Fase 2.4
              </span>
              <p className="text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                La conexión de agentes Codex SDK / Claude Agent SDK y la apertura automática de Pull Requests se activarán exclusivamente en la Fase 3 tras la validación operativa del sistema base.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2 text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Aislamiento de Credenciales:</strong> Ninguna API Key privada (<code className="font-mono">OPENAI_API_KEY</code>, <code className="font-mono">ANTHROPIC_API_KEY</code>, <code className="font-mono">GITHUB_APP_PRIVATE_KEY</code>) se expone en el cliente web.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SDK Integration Guide */}
      <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-brand-400" />
            <div>
              <h2 className="text-base font-bold">
                Guía de Integración del SDK (@pachax/support-sdk)
              </h2>
              <p className="text-xs text-slate-400">
                Conecta las aplicaciones web o móviles de tus clientes utilizando la clave pública generada al registrar un proyecto.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopySdk}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 self-start transition"
          >
            {copiedCode ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Código Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Snippet</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed">
          {sdkSnippet}
        </pre>
      </div>
    </div>
  );
};
