import React, { useEffect, useState, useCallback } from 'react';
import {
  Layers,
  Filter,
  Cpu,
  Image as ImageIcon,
  X,
  MessageSquare,
  Send,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { IncidentItem, IncidentStatus } from '@/models/incident';
import { FeatureRequestItem, FeatureRequestStatus } from '@/models/featureRequest';
import { ClientCompany } from '@/models/company';
import { UserProfile } from '@/models/auth';
import { Badge } from '@/components/common/Badge';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS: { value: IncidentStatus; label: string }[] = [
  { value: 'received', label: 'Recibido' },
  { value: 'triaged', label: 'Clasificado (Triaged)' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'review', label: 'En Pruebas / QA' },
  { value: 'fixed', label: 'Corregido' },
  { value: 'verified', label: 'Verificado por Cliente' },
  { value: 'closed', label: 'Cerrado' },
];

const FEATURE_STATUS_OPTIONS: { value: FeatureRequestStatus; label: string }[] = [
  { value: 'submitted', label: 'Recibida' },
  { value: 'evaluating', label: 'En Evaluación Técnica' },
  { value: 'quoted', label: 'Cotizada' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'in_development', label: 'En Desarrollo' },
  { value: 'deployed', label: 'Desplegada' },
  { value: 'completed', label: 'Completada' },
];

export const IncidentsQueuePage: React.FC = () => {
  const { currentUser } = useAuth();
  const devCompanyId = currentUser?.developerCompanyId || 'dev-pachax-core';

  const [activeTab, setActiveTab] = useState<'incidents' | 'features'>('incidents');
  const [items, setItems] = useState<IncidentItem[]>([]);
  const [features, setFeatures] = useState<FeatureRequestItem[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserProfile[]>([]);
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<IncidentItem | null>(null);
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [iData, fData, cData, uData] = await Promise.all([
        api.getIncidentItems(undefined, undefined, devCompanyId),
        api.getFeatureRequests(undefined, devCompanyId),
        api.getClients(devCompanyId),
        api.getUsers({ developerCompanyId: devCompanyId }),
      ]);
      setItems(iData);
      setFeatures(fData);
      setClients(cData);
      setStaffUsers(
        uData.filter((u) =>
          ['superadmin', 'dev_owner', 'dev_admin', 'dev_engineer', 'dev_commercial'].includes(u.role)
        )
      );
    } catch (err: any) {
      setError(err?.message || 'Error al cargar la bandeja técnica desde Firestore.');
    } finally {
      setLoading(false);
    }
  }, [devCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (itemId: string, newStatus: IncidentStatus) => {
    try {
      setError(null);
      await api.updateIncidentItemStatus(itemId, newStatus);
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, status: newStatus } : i))
      );
      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
      setSuccessMsg(`Estado de incidencia ${itemId} actualizado en Firestore.`);
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar el estado en Firestore.');
    }
  };

  const handleAssignEngineer = async (itemId: string, staffUid: string) => {
    try {
      setError(null);
      const staff = staffUsers.find((u) => u.uid === staffUid);
      const assigneePayload = staff
        ? { uid: staff.uid, displayName: staff.displayName, email: staff.email }
        : null;

      await api.assignIncidentItem(itemId, assigneePayload);
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId ? { ...i, assignedTo: assigneePayload || undefined } : i
        )
      );
      if (selectedItem?.id === itemId) {
        setSelectedItem((prev) =>
          prev ? { ...prev, assignedTo: assigneePayload || undefined } : null
        );
      }
      setSuccessMsg(
        assigneePayload
          ? `Incidencia asignada a ${assigneePayload.displayName} en Firestore.`
          : 'Asignación removida en Firestore.'
      );
    } catch (err: any) {
      setError(err?.message || 'Error al asignar responsable técnico en Firestore.');
    }
  };

  const handleSendComment = async () => {
    if (!selectedItem || !currentUser || !commentText.trim()) return;
    setSavingComment(true);
    setError(null);
    try {
      const added = await api.addIncidentComment(selectedItem.id, {
        authorUid: currentUser.uid,
        authorName: currentUser.displayName,
        authorEmail: currentUser.email,
        authorRole: currentUser.role,
        message: commentText.trim(),
      });
      const updatedComments = [...(selectedItem.comments || []), added];
      setSelectedItem({ ...selectedItem, comments: updatedComments });
      setItems((prev) =>
        prev.map((i) => (i.id === selectedItem.id ? { ...i, comments: updatedComments } : i))
      );
      setCommentText('');
      setSuccessMsg('Nota técnica guardada en Firestore.');
    } catch (err: any) {
      setError(err?.message || 'Error al guardar el comentario en Firestore.');
    } finally {
      setSavingComment(false);
    }
  };

  const handleFeatureStatusChange = async (reqId: string, newStatus: FeatureRequestStatus) => {
    try {
      setError(null);
      await api.updateFeatureRequestStatus(reqId, newStatus);
      setFeatures((prev) =>
        prev.map((f) => (f.id === reqId ? { ...f, status: newStatus } : f))
      );
      setSuccessMsg(`Estado de solicitud ${reqId} actualizado a ${newStatus.toUpperCase()}.`);
    } catch (err: any) {
      setError(err?.message || 'Error al actualizar estado de solicitud en Firestore.');
    }
  };

  const filteredItems = items.filter((item) => {
    if (clientFilter !== 'all' && item.clientCompanyId !== clientFilter) return false;
    if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false;
    return true;
  });

  const filteredFeatures = features.filter((f) => {
    if (clientFilter !== 'all' && f.clientCompanyId !== clientFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-500" />
            <span>Bandeja Técnica de Incidencias y Solicitudes</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Clasificación, asignación real de ingenieros, evidencias visuales y notas persistentes en Firestore.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recargar</span>
          </button>

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="text-xs bg-transparent text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="all">Todas las Empresas</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {activeTab === 'incidents' && (
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 outline-none"
            >
              <option value="all">Todas las Prioridades</option>
              <option value="urgent">Urgente (Crítico)</option>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </select>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'incidents'
              ? 'bg-brand-600 text-white shadow'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Incidencias Técnicas ({filteredItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('features')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeTab === 'features'
              ? 'bg-brand-600 text-white shadow'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Solicitudes de Cambio ({filteredFeatures.length})</span>
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

      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Consultando registros en Firestore...</p>
        </div>
      ) : activeTab === 'incidents' ? (
        filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
            <Layers className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              No hay incidencias registradas en Firestore
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              La bandeja está limpia. Los reportes críticos y lotes diarios enviados por los clientes aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/40">
                    <th className="py-3.5 px-4">Prioridad / ID</th>
                    <th className="py-3.5 px-4">Cliente & Módulo</th>
                    <th className="py-3.5 px-4">Incidencia</th>
                    <th className="py-3.5 px-4">Evidencia</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredItems.map((item) => {
                    const client = clients.find((c) => c.id === item.clientCompanyId);
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                      >
                        <td className="py-3.5 px-4 whitespace-nowrap">
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
                          <div className="text-[10px] font-mono text-slate-400 mt-1">
                            {item.id}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {client?.name || item.clientCompanyId}
                          </div>
                          <div className="text-slate-500">{item.moduleAffected}</div>
                        </td>

                        <td className="py-3.5 px-4 max-w-md">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {item.title}
                          </div>
                          <div className="text-slate-500 line-clamp-2 mt-0.5">
                            {item.description}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            {formatDate(item.createdAt)}
                            {item.assignedTo && (
                              <span className="ml-2 text-brand-600 dark:text-brand-400 font-semibold">
                                • Asignado a: {item.assignedTo.displayName}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {item.annotatedImageUrl || item.originalImageUrl ? (
                            <button
                              onClick={() => setSelectedItem(item)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 font-medium hover:underline"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              <span>Ver Captura</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">Sin adjunto</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <select
                            value={item.status}
                            onChange={(e) =>
                              handleStatusChange(item.id, e.target.value as IncidentStatus)
                            }
                            className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition"
                          >
                            Gestionar / Notas
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : filteredFeatures.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No hay solicitudes de cambio registradas en Firestore
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cuando un cliente envíe un requerimiento de mejora o nueva funcionalidad, podrás evaluarlo aquí.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3.5 px-4">ID / Alcance</th>
                  <th className="py-3.5 px-4">Cliente & Proyecto</th>
                  <th className="py-3.5 px-4">Requerimiento</th>
                  <th className="py-3.5 px-4">Modalidad Solicitada</th>
                  <th className="py-3.5 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredFeatures.map((feat) => {
                  const client = clients.find((c) => c.id === feat.clientCompanyId);
                  return (
                    <tr
                      key={feat.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                    >
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">{feat.id}</div>
                        <Badge variant="purple">{feat.changeScope.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {client?.name || feat.clientCompanyId}
                        </div>
                        <div className="text-slate-500">{feat.projectName || feat.projectId}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {feat.title}
                        </div>
                        <div className="text-slate-500 line-clamp-2 mt-0.5">
                          {feat.description}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge variant={feat.isConsideredFreeByClient ? 'warning' : 'info'}>
                          {feat.isConsideredFreeByClient
                            ? 'SOLICITA GARANTÍA'
                            : 'REQUIERE COTIZACIÓN'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={feat.status}
                          onChange={(e) =>
                            handleFeatureStatusChange(
                              feat.id,
                              e.target.value as FeatureRequestStatus
                            )
                          }
                          className="text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 outline-none"
                        >
                          {FEATURE_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 my-8">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedItem.priority === 'urgent' ? 'danger' : 'warning'}>
                    {selectedItem.priority.toUpperCase()}
                  </Badge>
                  <span className="text-xs font-mono text-slate-400">{selectedItem.id}</span>
                  <span className="text-xs text-slate-500">• {selectedItem.moduleAffected}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {selectedItem.title}
                </h3>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">
                  Descripción Técnica
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 whitespace-pre-wrap">
                  {selectedItem.description}
                </p>
              </div>

              {(selectedItem.annotatedImageUrl || selectedItem.originalImageUrl) && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">
                    Evidencia Visual Adjunta en Cloud Storage
                  </h4>
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 flex justify-center p-2">
                    <img
                      src={selectedItem.annotatedImageUrl || selectedItem.originalImageUrl}
                      alt="Evidencia anotada"
                      className="max-h-96 object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Assignment & Status Update */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                    Cambiar Estado Operativo (Firestore)
                  </label>
                  <select
                    value={selectedItem.status}
                    onChange={(e) =>
                      handleStatusChange(selectedItem.id, e.target.value as IncidentStatus)
                    }
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white outline-none"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                    Asignar Ingeniero / Responsable Real
                  </label>
                  <select
                    value={selectedItem.assignedTo?.uid || ''}
                    onChange={(e) => handleAssignEngineer(selectedItem.id, e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">-- Sin asignar --</option>
                    {staffUsers.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Persistent Comments / Timeline */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-brand-500" />
                  <span>Historial de Notas Técnicas ({selectedItem.comments?.length || 0})</span>
                </h4>

                {selectedItem.comments && selectedItem.comments.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedItem.comments.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {c.authorName} ({c.authorEmail})
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(c.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                          {c.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escribe una nota técnica o actualización para persistir en Firestore..."
                    className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    type="button"
                    disabled={savingComment || !commentText.trim()}
                    onClick={handleSendComment}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{savingComment ? 'Guardando...' : 'Guardar Nota'}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-500" />
                <span>Reparación Autónoma con IA: Fase 3 (Pendiente de activación)</span>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
