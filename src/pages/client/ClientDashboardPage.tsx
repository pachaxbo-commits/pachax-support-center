import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Flame,
  PlusCircle,
  Clock,
  CheckCircle2,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { IncidentReport } from '@/models/incident';
import { FeatureRequestItem } from '@/models/featureRequest';
import { Quote } from '@/models/quote';
import { IncidentStatusBadge } from '@/components/common/Badge';
import { formatDate, formatRelativeTime } from '@/lib/utils';

export const ClientDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [requests, setRequests] = useState<FeatureRequestItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [inc, req, q] = await Promise.all([
          api.getIncidentReports({ clientCompanyId: currentUser?.clientCompanyId }),
          api.getFeatureRequests(currentUser?.clientCompanyId),
          api.getQuotes(currentUser?.clientCompanyId),
        ]);
        setIncidents(inc);
        setRequests(req);
        setQuotes(q);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  const activeIncidentsCount = incidents.filter((i) => i.status !== 'closed' && i.status !== 'verified').length;
  const pendingQuotesCount = quotes.filter((q) => q.status === 'sent').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-900 via-brand-800 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/30 text-brand-200 border border-brand-400/30 mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-300" />
            Canal Oficial de Soporte PACHAX
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Hola, {currentUser?.displayName || 'Cliente'}
          </h1>
          <p className="text-slate-300 text-sm sm:text-base mt-2 leading-relaxed">
            Reporta incidencias diarias, solicita mejoras a medida y aprueba cotizaciones con trazabilidad total.
          </p>

          {/* SLA Indicator */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
              <span>SLA Incidencias Críticas: &lt; 1 hora</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-brand-400"></span>
              <span>SLA Incidencias Generales: &lt; 12 horas</span>
            </div>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-600/20 to-transparent pointer-events-none" />
      </div>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/client/report-general"
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-brand-500 dark:hover:border-brand-500 transition shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Reportar Incidencia General
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Envío diario acumulado. Agrega múltiples errores con capturas editadas.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:translate-x-1 transition">
            <span>Iniciar reporte</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/client/report-critical"
          className="group p-5 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950/60 rounded-xl hover:border-rose-500 dark:hover:border-rose-500 transition shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Incidencia Crítica (24/7)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Para caídas de facturación o paradas totales de producción.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 group-hover:translate-x-1 transition">
            <span>Notificar emergencia</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        <Link
          to="/client/feature-request"
          className="group p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:border-brand-500 dark:hover:border-brand-500 transition shadow-sm hover:shadow-md flex flex-col justify-between"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Solicitud de Implementación
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Nuevas funciones, exportaciones personalizadas o ajustes de plantilla.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition">
            <span>Solicitar cambio</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 font-medium">Incidencias Activas</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {activeIncidentsCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 font-medium">Cotizaciones Pendientes</span>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {pendingQuotesCount}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 font-medium">Solicitudes en Curso</span>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {requests.length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <span className="text-xs text-slate-500 font-medium">SLA Promedio</span>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            99.4%
          </p>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Historial de Solicitudes Recientes
          </h2>
          <Link
            to="/client/history"
            className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            <span>Ver todo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {incidents.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">
            No tienes incidencias registradas recientemente.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {incidents.slice(0, 5).map((inc) => (
              <div key={inc.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {inc.title}
                    </span>
                    <IncidentStatusBadge status={inc.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                    <span>{inc.projectName}</span>
                    <span>•</span>
                    <span>{inc.itemsCount} error(es)</span>
                    <span>•</span>
                    <span>{formatRelativeTime(inc.createdAt)}</span>
                  </div>
                </div>

                <Link
                  to={`/client/history`}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                >
                  Detalle
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
