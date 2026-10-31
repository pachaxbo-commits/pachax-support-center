import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Flame,
  Layers,
  Cpu,
  Building,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  FileCheck2,
  ChevronRight
} from 'lucide-react';
import { api } from '@/lib/api';
import { IncidentItem } from '@/models/incident';
import { ClientCompany } from '@/models/company';
import { Project } from '@/models/project';
import { AiRepairRun } from '@/models/aiRepair';
import { IncidentStatusBadge } from '@/components/common/Badge';
import { formatRelativeTime } from '@/lib/utils';

export const AdminDashboardPage: React.FC = () => {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [aiRuns, setAiRuns] = useState<AiRepairRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [inc, cl, pr, ai] = await Promise.all([
          api.getIncidentItems(),
          api.getClients(),
          api.getProjects(),
          api.getAiRepairRuns(),
        ]);
        setIncidents(inc);
        setClients(cl);
        setProjects(pr);
        setAiRuns(ai);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const criticalCount = incidents.filter((i) => i.priority === 'urgent' && i.status !== 'closed').length;
  const inProgressCount = incidents.filter((i) => i.status === 'in_progress').length;
  const activeAiRunsCount = aiRuns.filter((r) => r.stage !== 'completed' && r.stage !== 'failed').length;

  return (
    <div className="space-y-6">
      {/* Top Banner with Critical Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Panel de Operaciones & Soporte PACHAX
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión centralizada multi-empresa, triage de incidencias y orquestación de agentes de IA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/ai-repair"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition shadow-sm"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Consola de IA ({activeAiRunsCount} activas)</span>
          </Link>
        </div>
      </div>

      {/* Critical Alert Bar if any urgent incident exists */}
      {criticalCount > 0 && (
        <div className="bg-rose-600 text-white p-4 rounded-xl shadow-lg flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <Flame className="w-6 h-6 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-extrabold">{criticalCount} INCIDENCIA(S) CRÍTICA(S) ACTIVA(S):</span> Atención inmediata requerida.
            </div>
          </div>
          <Link
            to="/admin/incidents?priority=urgent"
            className="px-3 py-1 bg-white text-rose-700 text-xs font-extrabold rounded-lg shadow hover:bg-rose-50 transition shrink-0"
          >
            Atender Ahora
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Incidencias</span>
            <Layers className="w-4 h-4 text-brand-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {incidents.length}
          </div>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            {inProgressCount} en resolución
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Reparaciones con IA</span>
            <Cpu className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {aiRuns.length}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            85% éxito en tests
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Empresas Clientes</span>
            <Building className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {clients.length}
          </div>
          <span className="text-[11px] text-slate-400">
            {projects.length} proyectos activos
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Cumplimiento SLA</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            99.2%
          </div>
          <span className="text-[11px] text-slate-400">
            Meta mensual &gt; 98.0%
          </span>
        </div>
      </div>

      {/* Two Column Section: Incidents Queue Preview & AI Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent & Active Incidents */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-500" />
              <span>Bandeja de Triage Reciente</span>
            </h2>
            <Link
              to="/admin/incidents"
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 space-y-2">
            {incidents.slice(0, 4).map((item) => (
              <div key={item.id} className="pt-2 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate">
                      {item.title}
                    </span>
                    <IncidentStatusBadge status={item.status} />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">
                      {item.moduleAffected}
                    </span>
                    <span>•</span>
                    <span>{formatRelativeTime(item.createdAt)}</span>
                  </div>
                </div>

                {item.aiFixEligible && (
                  <Link
                    to="/admin/ai-repair"
                    className="px-2 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 rounded-md shrink-0 flex items-center gap-1 hover:bg-purple-100"
                  >
                    <Cpu className="w-3 h-3" />
                    <span>IA Fix</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Repairs Activity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-purple-500" />
              <span>Ejecución de Agentes de Corrección IA</span>
            </h2>
            <Link
              to="/admin/ai-repair"
              className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            >
              <span>Consola</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {aiRuns.slice(0, 3).map((run) => (
              <div
                key={run.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                    {run.id} ({run.agentEngine})
                  </span>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200">
                    Modo {run.mode}
                  </span>
                </div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                  Rama: {run.branchName}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Etapa: {run.stage}</span>
                  <span>{formatRelativeTime(run.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
