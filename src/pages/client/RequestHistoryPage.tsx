import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  Clock,
  Layers,
  ChevronRight,
  Flame,
  AlertTriangle,
  PlusCircle,
  FileText,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { IncidentReport, IncidentItem } from '@/models/incident';
import { FeatureRequestItem } from '@/models/featureRequest';
import { IncidentStatusBadge, FeatureStatusBadge } from '@/components/common/Badge';
import { formatDate, formatRelativeTime } from '@/lib/utils';

export const RequestHistoryPage: React.FC = () => {
  const { currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'incidents' | 'features'>('incidents');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [incidentReports, setIncidentReports] = useState<IncidentReport[]>([]);
  const [incidentItems, setIncidentItems] = useState<IncidentItem[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected item detail modal
  const [selectedIncidentItem, setSelectedIncidentItem] = useState<IncidentItem | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<FeatureRequestItem | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [reps, items, feats] = await Promise.all([
          api.getIncidentReports({ clientCompanyId: currentUser?.clientCompanyId }),
          api.getIncidentItems(undefined, currentUser?.clientCompanyId),
          api.getFeatureRequests(currentUser?.clientCompanyId),
        ]);
        setIncidentReports(reps);
        setIncidentItems(items);
        setFeatureRequests(feats);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  // Filter incidents
  const filteredIncidentItems = incidentItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.moduleAffected.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter feature requests
  const filteredFeatures = featureRequests.filter((feat) => {
    const matchesSearch =
      feat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feat.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || feat.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Historial y Seguimiento
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Revisa el estado de diagnóstico, solución y verificación de todos tus reportes.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-slate-200 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'incidents'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Incidencias ({incidentItems.length})
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'features'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Solicitudes de Cambio ({featureRequests.length})
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, módulo o palabras clave..."
            className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-slate-900 dark:text-white outline-none"
          >
            <option value="all">Todos los estados</option>
            <option value="received">Recibido</option>
            <option value="in_progress">En Progreso</option>
            <option value="review">En Revisión</option>
            <option value="fixed">Corregido</option>
            <option value="verified">Verificado</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
      </div>

      {/* Main List */}
      {activeTab === 'incidents' ? (
        <div className="space-y-3">
          {filteredIncidentItems.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
              No se encontraron incidencias con los filtros aplicados.
            </div>
          ) : (
            filteredIncidentItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedIncidentItem(item)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl p-4 shadow-sm cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition truncate">
                      {item.title}
                    </span>
                    <IncidentStatusBadge status={item.status} />
                    {item.priority === 'urgent' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        CRÍTICO
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {item.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {item.moduleAffected}
                    </span>
                    <span>•</span>
                    <span>Registrado {formatRelativeTime(item.createdAt)}</span>
                    {item.annotatedImageUrl && (
                      <>
                        <span>•</span>
                        <span className="text-brand-600 dark:text-brand-400 font-medium">
                          Con captura anotada
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center shrink-0">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/60 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition flex items-center gap-1">
                    <span>Ver Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeatures.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
              No se encontraron solicitudes de cambio con los filtros aplicados.
            </div>
          ) : (
            filteredFeatures.map((feat) => (
              <div
                key={feat.id}
                onClick={() => setSelectedFeature(feat)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl p-4 shadow-sm cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition truncate">
                      {feat.title}
                    </span>
                    <FeatureStatusBadge status={feat.status} />
                    {feat.isConsideredFreeByClient && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        GARANTÍA SOLICITADA
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                    {feat.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                    <span>{feat.projectName || 'Proyecto'}</span>
                    <span>•</span>
                    <span>Registrado {formatRelativeTime(feat.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center shrink-0">
                  <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/60 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition flex items-center gap-1">
                    <span>Ver Ficha</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Incident Detail Modal */}
      {selectedIncidentItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-slate-400">ID: {selectedIncidentItem.id}</span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedIncidentItem.title}
                </h2>
              </div>
              <IncidentStatusBadge status={selectedIncidentItem.status} />
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Módulo Afectado:
                </span>
                <span className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                  {selectedIncidentItem.moduleAffected}
                </span>
              </div>

              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Descripción y Pasos de Reproducción:
                </span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedIncidentItem.description}
                </div>
              </div>

              {selectedIncidentItem.annotatedImageUrl && (
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Evidencia con Anotaciones:
                  </span>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-center">
                    <img
                      src={selectedIncidentItem.annotatedImageUrl}
                      alt="Captura con anotaciones"
                      className="max-h-72 rounded-lg object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Resolution / Timeline */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-2">
                  Historial de Estados:
                </span>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Reporte recibido por el sistema ({formatDate(selectedIncidentItem.createdAt)})</span>
                  </div>
                  {selectedIncidentItem.status !== 'received' && (
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Clock className="w-4 h-4" />
                      <span>Clasificado por el equipo de ingeniería ({formatDate(selectedIncidentItem.updatedAt)})</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedIncidentItem(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feature Request Detail Modal */}
      {selectedFeature && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <span className="text-xs font-mono text-slate-400">ID: {selectedFeature.id}</span>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedFeature.title}
                </h2>
              </div>
              <FeatureStatusBadge status={selectedFeature.status} />
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Descripción del Cambio Solicitado:
                </span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedFeature.description}
                </div>
              </div>

              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                  Justificación de Negocio:
                </span>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {selectedFeature.businessJustification}
                </div>
              </div>

              {selectedFeature.isConsideredFreeByClient && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold block mb-1">Solicitud de Exención / Garantía:</span>
                  <p>{selectedFeature.freeRationale || 'No se especificó detalle de garantía.'}</p>
                </div>
              )}

              {selectedFeature.annotatedImageUrl && (
                <div>
                  <span className="font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    Boceto / Anotaciones:
                  </span>
                  <div className="p-2 bg-slate-900 rounded-xl border border-slate-800 flex justify-center">
                    <img
                      src={selectedFeature.annotatedImageUrl}
                      alt="Boceto"
                      className="max-h-72 rounded-lg object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedFeature(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-semibold transition"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
