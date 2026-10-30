import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Cpu,
  GitBranch,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCw,
  Terminal,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Zap,
  Sliders
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { AiRepairRun, AiRepairMode, AiRepairStage } from '@/models/aiRepair';
import { IncidentItem } from '@/models/incident';
import { formatDate } from '@/lib/utils';

export const AiRepairCenterPage: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [searchParams] = useSearchParams();
  const queryItemId = searchParams.get('itemId');

  const [runs, setRuns] = useState<AiRepairRun[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<AiRepairRun | null>(null);

  // New repair trigger form
  const [targetItemId, setTargetItemId] = useState<string>(queryItemId || '');
  const [selectedMode, setSelectedMode] = useState<AiRepairMode>('delegated');
  const [selectedEngine, setSelectedEngine] = useState<'codex-sdk' | 'claude-agent-sdk'>('claude-agent-sdk');
  const [isTriggering, setIsTriggering] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      const [r, items] = await Promise.all([
        api.getAiRepairRuns(),
        api.getIncidentItems(),
      ]);
      setRuns(r);
      setIncidents(items);
      if (r.length > 0) {
        setSelectedRun(r[0]);
      }
      if (queryItemId) {
        setTargetItemId(queryItemId);
      } else if (items.length > 0) {
        setTargetItemId(items[0].id);
      }
    }
    load();
  }, [queryItemId]);

  const handleLaunchAiRepair = async () => {
    if (!targetItemId) {
      alert('Selecciona una incidencia objetivo.');
      return;
    }

    setIsTriggering(true);
    try {
      const newRun = await api.triggerAiRepair(targetItemId, selectedMode, {
        uid: currentUser?.uid || 'user-admin',
        displayName: currentUser?.displayName || 'Administrador',
      });

      const updatedRuns = await api.getAiRepairRuns();
      setRuns(updatedRuns);
      setSelectedRun(newRun);
    } catch (err) {
      alert('Error al lanzar ejecución de IA.');
    } finally {
      setIsTriggering(false);
    }
  };

  const STAGES_PIPELINE: { stage: AiRepairStage; label: string }[] = [
    { stage: 'queued', label: '1. En Cola' },
    { stage: 'inspecting_repository', label: '2. Inspección Repo' },
    { stage: 'diagnosing_root_cause', label: '3. Diagnóstico' },
    { stage: 'generating_patch', label: '4. Parche AST' },
    { stage: 'running_test_suite', label: '5. Pruebas' },
    { stage: 'creating_pull_request', label: '6. Pull Request' },
    { stage: 'completed', label: '7. Finalizado' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 bg-purple-500/30 rounded-xl text-purple-300">
              <Cpu className="w-5 h-5 animate-pulse" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
              Arquitectura de Corrección Automatizada
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Centro de Agentes de IA & Reparación de Software
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            Orquesta agentes de Codex SDK y Claude Agent SDK para analizar el error, clonar el repositorio GitHub autorizado, sintetizar el parche y ejecutar la suite de pruebas sin riesgo.
          </p>

          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <span className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10 flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-purple-300" />
              Sandbox de Ejecución Aislada
            </span>
            <span className="bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/10 flex items-center gap-1.5 font-medium">
              <GitPullRequest className="w-3.5 h-3.5 text-purple-300" />
              GitHub PR Gate Obligatorio
            </span>
          </div>
        </div>
      </div>

      {/* 3 Modes Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => setSelectedMode('manual')}
          className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
            selectedMode === 'manual'
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div>
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Modo 1</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Manual Supervisado</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              El agente elabora el diagnóstico y genera el parche diff. El propietario debe autorizar explícitamente cada commit antes de aplicar.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-3 block">
            Riesgo cero • Control absoluto
          </span>
        </div>

        <div
          onClick={() => setSelectedMode('delegated')}
          className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
            selectedMode === 'delegated'
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div>
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Modo 2 (Recomendado)</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Delegado con PR</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              El agente clona la rama, aplica la corrección, ejecuta los tests unitarios y abre un Pull Request en GitHub para revisión del equipo.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 mt-3 block">
            Automatizado • Revisión por PR
          </span>
        </div>

        <div
          onClick={() => setSelectedMode('autonomous_authorized')}
          className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
            selectedMode === 'autonomous_authorized'
              ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/30'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
        >
          <div>
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Modo 3</span>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1">Autónomo Autorizado</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Para fallas críticas de alto impacto con suite de pruebas al 100%. Mezcla a rama principal y dispara el despliegue automático.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-3 block">
            Requiere token privilegiado
          </span>
        </div>
      </div>

      {/* Trigger Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-500" />
          <span>Disparar Nueva Reparación con IA</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Incidencia Objetivo *
            </label>
            <select
              value={targetItemId}
              onChange={(e) => setTargetItemId(e.target.value)}
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            >
              {incidents.map((it) => (
                <option key={it.id} value={it.id}>
                  [{it.id}] {it.title} ({it.moduleAffected})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Motor del Agente
            </label>
            <select
              value={selectedEngine}
              onChange={(e) => setSelectedEngine(e.target.value as any)}
              className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none"
            >
              <option value="claude-agent-sdk">Claude Agent SDK (Recomendado)</option>
              <option value="codex-sdk">Codex SDK (GitHub / OpenAI)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">
            Modo activo: <strong className="text-purple-600 dark:text-purple-400 uppercase">{selectedMode}</strong>
          </span>

          <button
            onClick={handleLaunchAiRepair}
            disabled={isTriggering}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 shadow-md shadow-purple-600/30 transition"
          >
            {isTriggering ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Encolando agente...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Ejecutar Reparación con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Run Monitor & Live Terminal */}
      {selectedRun && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
                  {selectedRun.id}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                  {selectedRun.agentEngine}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                Monitoreo en Tiempo Real: {selectedRun.branchName}
              </h2>
            </div>

            <div className="text-xs text-slate-400">
              Iniciado por: {selectedRun.triggeredBy.displayName} ({formatDate(selectedRun.createdAt)})
            </div>
          </div>

          {/* Pipeline Stages Stepper */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center justify-between min-w-[600px] gap-2">
              {STAGES_PIPELINE.map((st, idx) => {
                const isCurrent = selectedRun.stage === st.stage;
                return (
                  <div key={st.stage} className="flex-1 flex flex-col items-center text-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
                        isCurrent
                          ? 'bg-purple-600 text-white ring-4 ring-purple-500/20 animate-pulse'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className="text-[11px] font-semibold mt-1 text-slate-700 dark:text-slate-300">
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal Logs Viewer */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 shadow-inner space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between text-slate-500 text-[11px] border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                <span>Console Output — Agent Execution Sandboxed</span>
              </span>
              <span>stdout / stderr</span>
            </div>

            {selectedRun.logs.map((log) => (
              <div key={log.id} className="leading-relaxed">
                <span className="text-slate-500">[{log.timestamp.slice(11, 19)}]</span>{' '}
                <span
                  className={
                    log.severity === 'warning'
                      ? 'text-amber-400 font-semibold'
                      : log.severity === 'error'
                      ? 'text-rose-400 font-bold'
                      : log.severity === 'success'
                      ? 'text-emerald-400 font-bold'
                      : 'text-purple-300'
                  }
                >
                  [{log.stage}]
                </span>{' '}
                <span>{log.message}</span>
              </div>
            ))}
          </div>

          {/* Files modified & PR info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Archivos Afectados por el Parche:
              </span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-500 dark:text-slate-400 font-mono">
                {selectedRun.filesModified.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Rama de Trabajo Aislada:
                </span>
                <span className="font-mono text-purple-600 dark:text-purple-400">
                  {selectedRun.branchName}
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400">
                Límite de reintentos configurado: {selectedRun.maxRetries}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
