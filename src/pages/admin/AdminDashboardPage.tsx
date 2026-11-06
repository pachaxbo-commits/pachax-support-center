import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Building,
  Layers,
  Flame,
  Cpu,
  FileCheck2,
  ArrowRight,
  GitPullRequest,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Plus,
  RefreshCw,
  FolderKanban,
  Users,
  Settings,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ClientCompany, DeveloperCompany } from '@/models/company';
import { Project } from '@/models/project';
import { IncidentItem } from '@/models/incident';
import { Quote } from '@/models/quote';
import { AiRepairRun } from '@/models/aiRepair';
import { UserProfile } from '@/models/auth';
import { Badge } from '@/components/common/Badge';
import { formatDate, formatCurrency } from '@/lib/utils';

export const AdminDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const devCompanyId = currentUser?.developerCompanyId || 'dev-pachax-core';

  const [devCompany, setDevCompany] = useState<DeveloperCompany | null>(null);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [items, setItems] = useState<IncidentItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [aiRuns, setAiRuns] = useState<AiRepairRun[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializingDev, setInitializingDev] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devData, cData, pData, iData, qData, aiData, uData] = await Promise.all([
        api.getDeveloperCompany(devCompanyId),
        api.getClients(devCompanyId),
        api.getProjects(undefined, devCompanyId),
        api.getIncidentItems(undefined, undefined, devCompanyId),
        api.getQuotes(undefined, devCompanyId),
        api.getAiRepairRuns(devCompanyId),
        api.getUsers({ developerCompanyId: devCompanyId }),
      ]);
      setDevCompany(devData);
      setClients(cData);
      setProjects(pData);
      setItems(iData);
      setQuotes(qData);
      setAiRuns(aiData);
      setUsers(uData);
    } catch (err: any) {
      setError(err?.message || 'Error al consultar las colecciones de Firestore.');
    } finally {
      setLoading(false);
    }
  }, [devCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInitializeDeveloperCompany = async () => {
    if (!currentUser) return;
    setInitializingDev(true);
    setError(null);
    try {
      const initialized = await api.upsertDeveloperCompany({
        id: devCompanyId,
        name: 'PACHAX',
        slug: 'pachax',
        adminEmail: currentUser.email,
        supportEmail: currentUser.email,
        website: 'https://support.pachax.bo',
        slaConfig: {
          policyNotes: 'Política de SLA sujeta a contrato vigente de cada empresa cliente.',
        },
        incidentPolicies: {
          defaultDailyGeneralQuota: 1,
          requireVisualEvidence: false,
          criticalRequiresJustification: true,
        },
        commercialConfig: {
          defaultCurrency: 'USD',
          quoteValidityDays: 15,
        },
        performedByUid: currentUser.uid,
      });
      setDevCompany(initialized);
    } catch (err: any) {
      setError(err?.message || 'No se pudo inicializar el perfil de la empresa desarrolladora PACHAX.');
    } finally {
      setInitializingDev(false);
    }
  };

  const openItems = items.filter((i) => !['fixed', 'verified', 'closed'].includes(i.status));
  const criticalOpen = openItems.filter((i) => i.priority === 'urgent');
  const pendingQuotes = quotes.filter((q) => q.status === 'sent' || q.status === 'draft');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 dark:bg-slate-900/90 text-white p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
              Consola Central PACHAX
            </span>
            <span className="text-xs text-slate-400">
              • {devCompany ? devCompany.name : 'PACHAX Support Center'} ({devCompanyId})
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1.5">
            Panel de Control y Operaciones Técnicas
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Supervisión en tiempo real conectada a Firebase Firestore ({clients.length} empresas clientes, {projects.length} proyectos, {users.length} usuarios).
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
          <Link
            to="/admin/clients"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25 transition flex items-center gap-1.5"
          >
            <Building className="w-4 h-4" />
            <span>Empresas Clientes</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span><strong>Error de Firestore:</strong> {error}</span>
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* PACHAX Developer Company Onboarding Banner */}
      {!loading && !devCompany && (
        <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span>Inicialización Administrativa de Empresa Desarrolladora (PACHAX)</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400/90 max-w-2xl">
              El registro maestro <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">developerCompanies/{devCompanyId}</code> aún no ha sido inicializado en Firestore. Inicialízalo ahora con los datos confirmados de PACHAX (<code className="font-mono">{currentUser?.email}</code>) o configúralo en Integraciones.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInitializeDeveloperCompany}
              disabled={initializingDev}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow transition disabled:opacity-50"
            >
              {initializingDev ? 'Inicializando en Firestore...' : 'Inicializar Perfil PACHAX'}
            </button>
            <Link
              to="/admin/integrations"
              className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100/50 transition"
            >
              Configurar Detalles
            </Link>
          </div>
        </div>
      )}

      {/* Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Empresas Clientes
            </span>
            <Building className="w-5 h-5 text-brand-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {loading ? '...' : clients.length}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
            <span>{projects.length} proyectos registrados</span>
            <Link to="/admin/clients" className="text-brand-600 dark:text-brand-400 font-semibold hover:underline">
              Gestionar
            </Link>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Incidencias Activas
            </span>
            <Flame className={`w-5 h-5 ${criticalOpen.length > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {loading ? '...' : openItems.length}
          </div>
          <div className="text-xs mt-1">
            {criticalOpen.length > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold">
                {criticalOpen.length} urgentes (Críticas 24/7)
              </span>
            ) : (
              <span className="text-slate-500">0 incidencias críticas activas</span>
            )}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Ejecuciones IA
            </span>
            <Cpu className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {loading ? '...' : aiRuns.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {aiRuns.length === 0 ? 'Fase 3 pendiente de activación' : `${aiRuns.length} ejecuciones registradas`}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Cotizaciones Emitidas
            </span>
            <FileCheck2 className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            {loading ? '...' : quotes.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {pendingQuotes.length > 0
              ? `${pendingQuotes.length} pendientes (${formatCurrency(pendingQuotes.reduce((s, q) => s + q.subtotal, 0))})`
              : 'Sin cotizaciones pendientes'}
          </div>
        </div>
      </div>

      {/* Onboarding Quick Guide when 0 clients */}
      {!loading && clients.length === 0 && (
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                Sistema Limpio • Listo para Producción
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Todavía no hay empresas clientes registradas
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                La base de datos Firestore se encuentra limpia y sin datos de demostración. Sigue estos pasos para incorporar tu primera empresa cliente real:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <Link
              to="/admin/clients"
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition group bg-slate-50/50 dark:bg-slate-800/30"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <Building className="w-4 h-4 text-slate-400 group-hover:text-brand-500" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Registrar Empresa Cliente
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Da de alta la razón social, correo de contacto, dominios autorizados y cuota diaria.
              </p>
            </Link>

            <Link
              to="/admin/projects"
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition group bg-slate-50/50 dark:bg-slate-800/30"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <FolderKanban className="w-4 h-4 text-slate-400 group-hover:text-brand-500" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Vincular Proyecto o App
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Crea el proyecto asociado al cliente, define su código identificador y obtén su Public Key SDK.
              </p>
            </Link>

            <Link
              to="/admin/users"
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 transition group bg-slate-50/50 dark:bg-slate-800/30"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-7 h-7 rounded-lg bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <Users className="w-4 h-4 text-slate-400 group-hover:text-brand-500" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Invitar Usuarios del Cliente
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Emite invitaciones para los administradores u operadores autorizados de la empresa cliente.
              </p>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Urgent Incidents Queue */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Cola Técnica de Incidencias Recientes
              </h2>
            </div>
            <Link
              to="/admin/incidents"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>Ver bandeja completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {items.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No existen incidencias registradas en Firestore
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cuando los usuarios autorizados de tus empresas clientes envíen reportes generales o críticos, aparecerán aquí en tiempo real.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.slice(0, 5).map((item) => {
                const client = clients.find((c) => c.id === item.clientCompanyId);
                return (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={
                            item.priority === 'urgent'
                              ? 'danger'
                              : item.priority === 'high'
                              ? 'warning'
                              : 'info'
                          }
                        >
                          {item.priority.toUpperCase()}
                        </Badge>
                        <span className="text-xs font-bold text-slate-500">
                          {client?.name || item.clientCompanyId}
                        </span>
                        <span className="text-xs text-slate-400">• {item.moduleAffected}</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        to="/admin/incidents"
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition"
                      >
                        Gestionar
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Column: System & Users Status */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Usuarios Activos ({users.length})
              </h2>
            </div>
            <Link
              to="/admin/users"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Ver todos
            </Link>
          </div>

          <div className="p-4 space-y-3 flex-1">
            {users.map((u) => (
              <div
                key={u.uid}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {u.displayName}
                  </span>
                  <Badge variant={u.status === 'active' ? 'success' : 'danger'}>
                    {u.role}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-mono truncate">
                  {u.email}
                </p>
              </div>
            ))}

            <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-1.5 mt-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-300">
                <Cpu className="w-4 h-4 text-purple-600" />
                <span>Estado Motor IA (Fase 3)</span>
              </div>
              <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80 leading-relaxed">
                La orquestación autónoma con Codex SDK y Claude Agent SDK se encuentra marcada para Fase 3. No se generan reparaciones simuladas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
