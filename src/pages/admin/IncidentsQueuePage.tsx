import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Flame,
  AlertTriangle,
  Cpu,
  UserCheck,
  CheckCircle2,
  Clock,
  Eye,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { api } from '@/lib/api';
import { IncidentItem, IncidentStatus } from '@/models/incident';
import { ClientCompany } from '@/models/company';
import { IncidentStatusBadge } from '@/components/common/Badge';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const IncidentsQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Selected item modal
  const [selectedItem, setSelectedItem] = useState<IncidentItem | null>(null);

  useEffect(() => {
    async function load() {
      const [inc, cl] = await Promise.all([
        api.getIncidentItems(),
        api.getClients(),
      ]);
      setIncidents(inc);
      setClients(cl);
    }
    load();
  }, []);

  const handleStatusChange = async (itemId: string, newStatus: IncidentStatus) => {
    await api.updateIncidentItemStatus(itemId, newStatus);
    const updated = await api.getIncidentItems();
    setIncidents(updated);
    if (selectedItem?.id === itemId) {
      setSelectedItem({ ...selectedItem, status: newStatus });
    }
  };

  const filtered = incidents.filter((item) => {
    const matchesClient = selectedClientFilter === 'all' || item.clientCompanyId === selectedClientFilter;
    const matchesStatus = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.moduleAffected.toLowerCase().includes(search.toLowerCase());
    return matchesClient && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Bandeja General de Incidencias
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Revisión técnica, asignación a ingenieros y disparo de correcciones asistidas con IA.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, módulo o descripción..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-900 dark:text-white outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          <select
            value={selectedClientFilter}
            onChange={(e) => setSelectedClientFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none"
          >
            <option value="all">Todas las empresas</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="received">Recibido</option>
            <option value="triaged">Clasificado</option>
            <option value="in_progress">En Progreso</option>
            <option value="review">En Revisión</option>
            <option value="fixed">Corregido</option>
            <option value="verified">Verificado</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center text-slate-400 text-sm">
            No hay incidencias que coincidan con los filtros.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {item.id}
                  </span>
                  <IncidentStatusBadge status={item.status} />
                  {item.priority === 'urgent' && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      CRÍTICO 24/7
                    </span>
                  )}
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {item.moduleAffected}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Status selector */}
                  <select
                    value={item.status}
                    onChange={(e) => handleStatusChange(item.id, e.target.value as IncidentStatus)}
                    className="text-xs font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="received">Recibido</option>
                    <option value="triaged">Clasificado</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="review">En Revisión</option>
                    <option value="fixed">Corregido</option>
                    <option value="verified">Verificado</option>
                    <option value="closed">Cerrado</option>
                  </select>

                  {/* AI Fix button */}
                  {item.aiFixEligible && (
                    <button
                      onClick={() => navigate(`/admin/ai-repair?itemId=${item.id}`)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 flex items-center gap-1 shadow-sm transition"
                      title="Disparar orquestación de reparación con Codex / Claude Agent"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                      <span>Corregir con IA</span>
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <span>Proyecto: {item.projectId}</span>
                  <span>•</span>
                  <span>Reportado {formatRelativeTime(item.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.annotatedImageUrl && (
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Captura Anotada</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition"
                  >
                    Ficha Completa
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Incident Drawer/Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono text-slate-400">ID: {selectedItem.id}</span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  {selectedItem.title}
                </h2>
              </div>
              <IncidentStatusBadge status={selectedItem.status} />
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="font-semibold text-slate-400 block mb-1">Descripción:</span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl whitespace-pre-wrap">
                  {selectedItem.description}
                </div>
              </div>

              {selectedItem.annotatedImageUrl && (
                <div>
                  <span className="font-semibold text-slate-400 block mb-1">
                    Captura Editada con Anotaciones:
                  </span>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-center">
                    <img
                      src={selectedItem.annotatedImageUrl}
                      alt="Evidencia"
                      className="max-h-80 object-contain rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  navigate(`/admin/ai-repair?itemId=${selectedItem.id}`);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 flex items-center gap-1.5"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Iniciar Reparación IA</span>
              </button>

              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg"
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
