import React, { useEffect, useState, useCallback } from 'react';
import {
  Cpu,
  GitBranch,
  GitPullRequest,
  ShieldCheck,
  Terminal,
  RefreshCw,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { AiRepairRun, AiRepairStage } from '@/models/aiRepair';
import { Badge } from '@/components/common/Badge';
import { formatDate } from '@/lib/utils';

const STAGE_LABELS: Record<AiRepairStage, string> = {
  queued: 'En Cola',
  inspecting_repository: 'Inspeccionando Repositorio',
  diagnosing_root_cause: 'Diagnosticando Causa Raíz',
  generating_patch: 'Generando Parche de Código',
  running_test_suite: 'Ejecutando Suite de Tests',
  retrying_corrections: 'Reintentando Corrección',
  creating_pull_request: 'Abriendo Pull Request',
  canary_deploying: 'Despliegue Canary',
  completed: 'Completado y Validado',
  failed: 'Falló Validación',
};

export const AiRepairCenterPage: React.FC = () => {
  const { currentUser } = useAuth();
  const devCompanyId = currentUser?.developerCompanyId || 'dev-pachax-core';

  const [runs, setRuns] = useState<AiRepairRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AiRepairRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rData = await api.getAiRepairRuns(devCompanyId);
      setRuns(rData);
      if (rData.length > 0 && !selectedRun) {
        setSelectedRun(rData[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al consultar ejecuciones en Firestore.');
    } finally {
      setLoading(false);
    }
  }, [devCompanyId, selectedRun]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-slate-900 text-white p-6 rounded-2xl border border-purple-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Fase 3 — Pendiente de Activación
              </span>
              <span className="text-xs text-slate-400">
                • Sin ejecuciones simuladas en producción
              </span>
            </div>
            <h1 className="text-2xl font-bold mt-1.5">
              Centro de Reparación Autónoma con IA
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Integración planificada con OpenAI Codex SDK y Claude Agent SDK para diagnóstico de repositorios y creación de Pull Requests verificados.
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5 self-start"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Consultar Firestore</span>
          </button>
        </div>
      </div>

      {/* Phase 3 Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold">
            Estado Real del Motor de Agentes Autónomos (Fase 3):
          </p>
          <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
            Por política de seguridad e integridad operativa, la generación de ejecuciones simuladas en memoria ha sido deshabilitada definitivamente. Esta vista consulta directamente la colección <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">aiRepairRuns</code> de Firestore ({runs.length} registros reales). La activación de los runners de Codex SDK y Claude Agent SDK se realizará en la Fase 3.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-purple-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Consultando colección aiRepairRuns en Firestore...</p>
        </div>
      ) : runs.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            0 Ejecuciones de Reparación con IA en Firestore
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No existen registros en <code className="font-mono">aiRepairRuns</code>. Cuando se habiliten los agentes autónomos en la Fase 3, podrás auditar aquí cada rama, diff y resultado de tests.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-purple-500" />
                <span>Historial Real ({runs.length})</span>
              </h2>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {runs.map((run) => {
                const isSelected = selectedRun?.id === run.id;
                return (
                  <button
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className={`w-full text-left p-4 transition space-y-2 ${
                      isSelected
                        ? 'bg-purple-50/70 dark:bg-purple-950/30 border-l-4 border-purple-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                        {run.id}
                      </span>
                      <Badge
                        variant={
                          run.stage === 'completed'
                            ? 'success'
                            : run.stage === 'failed'
                            ? 'danger'
                            : 'purple'
                        }
                      >
                        {STAGE_LABELS[run.stage]}
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      Rama: {run.branchName}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Motor: {run.agentEngine}</span>
                      <span>{formatDate(run.createdAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2">
            {selectedRun && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Ejecución #{selectedRun.id}
                      </span>
                      <Badge variant="purple">{selectedRun.mode.toUpperCase()}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <GitBranch className="w-3.5 h-3.5 text-brand-500" />
                        {selectedRun.branchName}
                      </span>
                      {selectedRun.pullRequestUrl && (
                        <a
                          href={selectedRun.pullRequestUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                        >
                          <GitPullRequest className="w-3.5 h-3.5" />
                          PR #{selectedRun.pullRequestNumber}
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-3 max-h-[420px] overflow-y-auto border border-slate-800">
                  {selectedRun.logs.map((log) => (
                    <div key={log.id} className="space-y-1.5 border-l-2 border-slate-800 pl-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {log.stage}
                        </span>
                      </div>
                      <p className="text-slate-200">{log.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
