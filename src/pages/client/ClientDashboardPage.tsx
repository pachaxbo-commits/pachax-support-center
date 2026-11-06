import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Flame,
  PlusCircle,
  FileCheck2,
  CheckCircle2,
  Clock,
  ArrowRight,
  FolderKanban,
  ShieldCheck,
  History,
  Building,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { IncidentReport } from '@/models/incident';
import { Quote } from '@/models/quote';
import { Project } from '@/models/project';
import { ClientCompany } from '@/models/company';
import { Badge } from '@/components/common/Badge';
import { formatDate, formatCurrency } from '@/lib/utils';

export const ClientDashboardPage: React.FC = () => {
  const { currentUser, isDevStaff } = useAuth();
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientCompany, setClientCompany] = useState<ClientCompany | null>(null);
  const [submittedToday, setSubmittedToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const clientId = currentUser?.clientCompanyId;
        if (!clientId) {
          // Staff user inspecting client portal or user without clientCompanyId
          const [allProjects, allClients] = await Promise.all([
            api.getProjects(),
            api.getClients(),
          ]);
          setProjects(allProjects);
          setClientCompany(allClients[0] || null);
          setReports([]);
          setQuotes([]);
          setSubmittedToday(false);
        } else {
          const [repData, quoteData, projData, clientsData, todayCheck] = await Promise.all([
            api.getIncidentReports({ clientCompanyId: clientId }),
            api.getQuotes(clientId),
            api.getProjects(clientId),
            api.getClients(),
            api.hasSubmittedGeneralReportToday(clientId),
          ]);
          setReports(repData);
          setQuotes(quoteData);
          setProjects(projData);
          setClientCompany(clientsData.find((c) => c.id === clientId) || null);
          setSubmittedToday(todayCheck.alreadySubmitted);
        }
      } catch (err: any) {
        setError(err?.message || 'Error al cargar datos del portal desde Firestore.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [currentUser]);

  const pendingQuotes = quotes.filter((q) => q.status === 'sent');
  const activeReports = reports.filter((r) => r.status !== 'closed' && r.status !== 'verified');

  const slaText = clientCompany?.slaConfig?.criticalResponseHours
    ? `SLA Crítico < ${clientCompany.slaConfig.criticalResponseHours}h`
    : 'SLA según contrato vigente';

  return (
    <div className="space-y-6">
      {/* Notice if staff user is viewing Client Portal */}
      {isDevStaff && !currentUser?.clientCompanyId && (
        <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-brand-900 dark:text-brand-200">
            <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
            <span>
              Estás visualizando el <strong>Portal de Cliente</strong> con tu cuenta administrativa (<strong>{currentUser?.email}</strong>). Para gestionar empresas, proyectos y usuarios ve al Panel Administrativo.
            </span>
          </div>
          <Link
            to="/admin/dashboard"
            className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold shrink-0 self-start"
          >
            Ir a Dashboard Admin
          </Link>
        </div>
      )}

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-brand-200 backdrop-blur-sm mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-300" />
              <span>
                {clientCompany
                  ? `${clientCompany.name} • ${slaText}`
                  : 'Soporte Corporativo PACHAX • Política SLA según contrato vigente'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Hola, {currentUser?.displayName}
            </h1>
            <p className="text-brand-100/80 text-xs sm:text-sm mt-1 max-w-xl">
              Gestiona reportes técnicos, adjunta capturas anotadas, supervisa el estado de corrección de tus sistemas y aprueba cotizaciones.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/client/report-general"
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white text-brand-900 hover:bg-brand-50 transition shadow-lg flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Reportar Incidencias</span>
            </Link>
            <Link
              to="/client/report-critical"
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 text-white transition shadow-lg shadow-rose-600/30 flex items-center gap-2"
            >
              <Flame className="w-4 h-4" />
              <span>Emergencia Crítica (24/7)</span>
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Daily General Incident */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <Badge variant={submittedToday ? 'warning' : 'success'}>
                {submittedToday ? 'Lote diario enviado hoy' : 'Disponible hoy (1/día)'}
              </Badge>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Incidencias Generales
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Agrupa múltiples observaciones, errores visuales o ajustes menores en un solo envío diario con capturas marcadas.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/client/report-general"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 flex items-center justify-between"
            >
              <span>{submittedToday ? 'Ver estado del envío diario' : 'Crear lote de incidencias'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card 2: Critical 24/7 */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-rose-200/70 dark:border-rose-900/40 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <Badge variant="danger">Atención 24/7</Badge>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Incidencia Crítica
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Exclusivo para caídas de sistema, bloqueos de facturación/ventas o pérdida de datos operativos urgentes.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/client/report-critical"
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-500 flex items-center justify-between"
            >
              <span>Reportar bloqueo crítico</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Card 3: Feature Request */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <PlusCircle className="w-5 h-5" />
              </div>
              <Badge variant="info">Nuevos Módulos / Mejoras</Badge>
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Solicitud de Implementación
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Solicita nuevas funciones, reportes a medida o integraciones con evaluación técnica y cotización formal.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link
              to="/client/request-feature"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 flex items-center justify-between"
            >
              <span>Solicitar cambio o mejora</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Quotes Alert (If any) */}
      {pendingQuotes.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <FileCheck2 className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Tienes {pendingQuotes.length} cotización(es) pendiente(s) de revisión
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Aprueba el presupuesto desde tu portal para que el equipo de ingeniería de PACHAX inicie la implementación.
              </p>
            </div>
          </div>
          <Link
            to="/client/quotes"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shrink-0 text-center transition shadow"
          >
            Revisar Cotizaciones ({formatCurrency(pendingQuotes[0].subtotal, pendingQuotes[0].currency)})
          </Link>
        </div>
      )}

      {/* Two Column Section: Recent Reports & Connected Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Reports */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-brand-500" />
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                Reportes Recientes ({activeReports.length} activos)
              </h2>
            </div>
            <Link
              to="/client/history"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              Ver todo el historial
            </Link>
          </div>

          {loading ? (
            <div className="py-10 text-center text-xs text-slate-400">Cargando reportes...</div>
          ) : reports.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No tienes reportes registrados todavía.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {reports.slice(0, 4).map((rep) => (
                <div
                  key={rep.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={rep.category === 'critical' ? 'danger' : 'info'}>
                        {rep.category === 'critical' ? 'CRÍTICO 24/7' : 'GENERAL'}
                      </Badge>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {rep.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Proyecto: {rep.projectName || rep.projectId}</span>
                      <span>•</span>
                      <span>{rep.itemsCount} ítem(s)</span>
                      <span>•</span>
                      <span>{formatDate(rep.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Badge
                      variant={
                        rep.status === 'fixed' || rep.status === 'verified'
                          ? 'success'
                          : rep.status === 'in_progress'
                          ? 'warning'
                          : 'neutral'
                      }
                    >
                      {rep.status === 'received' && 'Recibido'}
                      {rep.status === 'triaged' && 'Clasificado'}
                      {rep.status === 'in_progress' && 'En Reparación'}
                      {rep.status === 'review' && 'En Pruebas QA'}
                      {rep.status === 'fixed' && 'Corregido'}
                      {rep.status === 'verified' && 'Verificado'}
                      {rep.status === 'closed' && 'Cerrado'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Active Projects */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <FolderKanban className="w-4 h-4 text-brand-500" />
            <h2 className="font-bold text-base text-slate-900 dark:text-white">
              Sistemas Conectados ({projects.length})
            </h2>
          </div>

          {projects.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Building className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto" />
              <p className="text-xs text-slate-500">
                Aún no hay proyectos vinculados a tu cuenta.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {proj.name}
                    </span>
                    <Badge variant="success">Activo</Badge>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {proj.description || `Código: ${proj.code}`}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="font-mono">{proj.code}</span>
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Conectado
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 p-3.5 rounded-xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-900/50">
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-800 dark:text-brand-300">
              <Clock className="w-4 h-4 text-brand-500" />
              <span>Acuerdo de Nivel de Servicio (SLA)</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              {clientCompany?.slaConfig?.criticalResponseHours ? (
                <>
                  Incidencias críticas: respuesta menor a{' '}
                  <strong>{clientCompany.slaConfig.criticalResponseHours} hora(s)</strong>. Reportes
                  generales: revisión dentro de{' '}
                  <strong>{clientCompany.slaConfig.generalResponseHours || 24} horas</strong>.
                </>
              ) : (
                'Los tiempos de respuesta para incidencias críticas y lotes generales se rigen según las condiciones del contrato de soporte vigente de tu organización.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
