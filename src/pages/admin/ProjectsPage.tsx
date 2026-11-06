import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  GitBranch,
  Key,
  ShieldCheck,
  Terminal,
  Copy,
  Check,
  Plus,
  RefreshCw,
  AlertTriangle,
  Edit3,
  Archive,
  Building,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Project } from '@/models/project';
import { ClientCompany } from '@/models/company';
import { Badge } from '@/components/common/Badge';

const AVAILABLE_TECH: Project['techStack'][number][] = [
  'react',
  'vite',
  'nextjs',
  'node',
  'firebase',
  'android',
  'flutter',
];

export const ProjectsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const devCompanyId = currentUser?.developerCompanyId || 'dev-pachax-core';

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [clientCompanyId, setClientCompanyId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [repositoryUrl, setRepositoryUrl] = useState('');
  const [activeBranch, setActiveBranch] = useState('main');
  const [environment, setEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [techStack, setTechStack] = useState<Project['techStack']>(['react', 'firebase']);
  const [appCheckEnabled, setAppCheckEnabled] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pData, cData] = await Promise.all([
        api.getProjects(undefined, devCompanyId),
        api.getClients(devCompanyId),
      ]);
      setProjects(pData);
      setClients(cData);
      if (cData.length > 0 && !clientCompanyId) {
        setClientCompanyId(cData[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar los proyectos desde Firestore.');
    } finally {
      setLoading(false);
    }
  }, [devCompanyId, clientCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleTech = (tech: Project['techStack'][number]) => {
    if (techStack.includes(tech)) {
      if (techStack.length > 1) {
        setTechStack(techStack.filter((t) => t !== tech));
      }
    } else {
      setTechStack([...techStack, tech]);
    }
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setClientCompanyId(clients[0]?.id || '');
    setName('');
    setCode('');
    setDescription('');
    setRepositoryUrl('');
    setActiveBranch('main');
    setEnvironment('production');
    setTechStack(['react', 'firebase']);
    setAppCheckEnabled(true);
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setClientCompanyId(project.clientCompanyId);
    setName(project.name);
    setCode(project.code);
    setDescription(project.description || '');
    setRepositoryUrl(project.repositoryUrl || '');
    setActiveBranch(project.activeBranch || 'main');
    setEnvironment(project.environment);
    setTechStack(project.techStack || ['react']);
    setAppCheckEnabled(project.appCheckEnabled);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingProject) {
        await api.updateProject(
          editingProject.id,
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            description: description.trim() || undefined,
            repositoryUrl: repositoryUrl.trim() || undefined,
            activeBranch: activeBranch.trim() || 'main',
            environment,
            techStack,
            appCheckEnabled,
          },
          currentUser.uid,
          devCompanyId
        );
        setSuccessMsg(`Proyecto "${name.trim()}" actualizado en Firestore.`);
      } else {
        await api.createProject({
          clientCompanyId,
          developerCompanyId: devCompanyId,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim() || undefined,
          repositoryUrl: repositoryUrl.trim() || undefined,
          activeBranch: activeBranch.trim() || 'main',
          environment,
          techStack,
          appCheckEnabled,
          performedByUid: currentUser.uid,
        });
        setSuccessMsg(`Proyecto "${name.trim()}" registrado en Firestore.`);
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Error al guardar el proyecto en Firestore.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async (project: Project, newStatus: 'active' | 'maintenance' | 'archived') => {
    if (!currentUser) return;
    try {
      await api.updateProject(project.id, { status: newStatus }, currentUser.uid, devCompanyId);
      setSuccessMsg(`Estado del proyecto "${project.name}" cambiado a ${newStatus.toUpperCase()}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar estado del proyecto.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-brand-500" />
            <span>Proyectos y Aplicaciones Conectadas</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Registro real en Firestore de aplicaciones, repositorios GitHub y claves públicas SDK.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recargar</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={clients.length === 0}
            title={clients.length === 0 ? 'Primero registra una empresa cliente' : 'Registrar nuevo proyecto'}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Proyecto</span>
          </button>
        </div>
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
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[11px] underline">
            Cerrar
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Consultando colección projects en Firestore...</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Todavía no hay proyectos ni aplicaciones conectadas
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {clients.length === 0
              ? 'Primero debes registrar una Empresa Cliente para poder vincularle sus aplicaciones o sistemas.'
              : 'Registra el primer proyecto de tus clientes para habilitar la recepción de incidencias y el SDK de soporte.'}
          </p>
          <div className="pt-2">
            {clients.length === 0 ? (
              <Link
                to="/admin/clients"
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow transition inline-flex items-center gap-1.5"
              >
                <Building className="w-4 h-4" />
                <span>Ir a Registrar Empresa Cliente</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primer Proyecto</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {projects.map((proj) => {
            const client = clients.find((c) => c.id === proj.clientCompanyId);
            return (
              <div
                key={proj.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                          {proj.code}
                        </span>
                        <span className="text-xs text-slate-400">
                          • {client?.name || proj.clientCompanyId}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {proj.name}
                      </h3>
                      {proj.description && (
                        <p className="text-xs text-slate-500 mt-1">{proj.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={proj.environment === 'production' ? 'success' : 'warning'}>
                        {proj.environment.toUpperCase()}
                      </Badge>
                      <Badge
                        variant={
                          proj.status === 'active'
                            ? 'info'
                            : proj.status === 'archived'
                            ? 'danger'
                            : 'neutral'
                        }
                      >
                        {proj.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Tech Stack Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {proj.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Git Repo & Branch */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Terminal className="w-3.5 h-3.5 text-slate-400" />
                        Repositorio GitHub:
                      </span>
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                        {proj.repositoryUrl || 'No configurado'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                        Rama Activa:
                      </span>
                      <span className="font-mono text-brand-600 dark:text-brand-400 font-semibold">
                        {proj.activeBranch || 'main'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Public Key & Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                      <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{proj.publicKey}</span>
                    </div>

                    <button
                      onClick={() => handleCopyKey(proj.publicKey)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 shrink-0 transition"
                    >
                      {copiedKey === proj.publicKey ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar Key</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        App Check: {proj.appCheckEnabled ? 'Habilitado' : 'No requerido'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(proj)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      {proj.status !== 'archived' ? (
                        <button
                          type="button"
                          onClick={() => handleChangeStatus(proj, 'archived')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 flex items-center gap-1 transition"
                        >
                          <Archive className="w-3 h-3" />
                          <span>Archivar</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleChangeStatus(proj, 'active')}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1 transition"
                        >
                          <Check className="w-3 h-3" />
                          <span>Reactivar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Create / Edit Project */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingProject ? 'Editar Proyecto' : 'Registrar Nuevo Proyecto / Aplicación'}
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Empresa Cliente Propietaria *
                </label>
                <select
                  value={clientCompanyId}
                  disabled={Boolean(editingProject)}
                  onChange={(e) => setClientCompanyId(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white disabled:opacity-60"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.contactEmail})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre del Proyecto / Sistema *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Portal Web Corporativo"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Código Identificador *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="Ej. CORP-WEB"
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descripción Técnica (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripción breve de los módulos y alcance..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Repositorio GitHub (Opcional)
                  </label>
                  <input
                    type="text"
                    value={repositoryUrl}
                    onChange={(e) => setRepositoryUrl(e.target.value)}
                    placeholder="pachaxbo-commits/..."
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Rama Activa
                  </label>
                  <input
                    type="text"
                    value={activeBranch}
                    onChange={(e) => setActiveBranch(e.target.value)}
                    placeholder="main"
                    className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Entorno Operativo
                </label>
                <select
                  value={environment}
                  onChange={(e) => setEnvironment(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                >
                  <option value="production">Producción (Production)</option>
                  <option value="staging">Pre-producción (Staging)</option>
                  <option value="development">Desarrollo (Development)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Stack Tecnológico
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_TECH.map((tech) => {
                    const active = techStack.includes(tech);
                    return (
                      <button
                        key={tech}
                        type="button"
                        onClick={() => toggleTech(tech)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase transition ${
                          active
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {tech}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50"
                >
                  {submitting
                    ? 'Guardando en Firestore...'
                    : editingProject
                    ? 'Guardar Cambios'
                    : 'Registrar Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
