import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileCheck2,
  Plus,
  Trash2,
  Send,
  RefreshCw,
  AlertTriangle,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Quote, QuoteLineItem } from '@/models/quote';
import { ClientCompany } from '@/models/company';
import { Project } from '@/models/project';
import { FeatureRequestItem } from '@/models/featureRequest';
import { Badge } from '@/components/common/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export const QuotesManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const devCompanyId = currentUser?.developerCompanyId || 'dev-pachax-core';

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [featureRequestId, setFeatureRequestId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'BOB'>('USD');
  const [deliveryDays, setDeliveryDays] = useState(5);
  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    { id: 'li-1', description: 'Análisis e implementación técnica', hours: 8, hourlyRate: 30, total: 240 },
  ]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [qData, cData, pData, fData] = await Promise.all([
        api.getQuotes(undefined, devCompanyId),
        api.getClients(devCompanyId),
        api.getProjects(undefined, devCompanyId),
        api.getFeatureRequests(undefined, devCompanyId),
      ]);
      setQuotes(qData);
      setClients(cData);
      setProjects(pData);
      setFeatureRequests(fData);

      if (cData.length > 0 && !clientId) {
        setClientId(cData[0].id);
        const firstProj = pData.find((p) => p.clientCompanyId === cData[0].id);
        if (firstProj) setProjectId(firstProj.id);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al consultar cotizaciones en Firestore.');
    } finally {
      setLoading(false);
    }
  }, [devCompanyId, clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const clientProjs = projects.filter((p) => p.clientCompanyId === newClientId);
    setProjectId(clientProjs[0]?.id || '');
    setFeatureRequestId('');
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: `li-${Date.now()}`, description: '', hours: 4, hourlyRate: 30, total: 120 },
    ]);
  };

  const updateLineItem = (id: string, field: keyof QuoteLineItem, val: string | number) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: val };
        if (field === 'hours' || field === 'hourlyRate') {
          updated.total = Number(updated.hours) * Number(updated.hourlyRate);
        }
        return updated;
      })
    );
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((i) => i.id !== id));
  };

  const subtotal = lineItems.reduce((sum, i) => sum + i.total, 0);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError(null);
    setSubmitting(true);

    try {
      await api.createQuote({
        clientCompanyId: clientId,
        developerCompanyId: devCompanyId,
        projectId,
        featureRequestId: featureRequestId || undefined,
        title: title.trim(),
        description: description.trim(),
        items: lineItems,
        currency,
        estimatedDeliveryDays: deliveryDays,
        status: 'sent',
        performedByUid: currentUser.uid,
      });

      setSuccessMsg(`Cotización "${title.trim()}" emitida y persistida en Firestore.`);
      setTitle('');
      setDescription('');
      setFeatureRequestId('');
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Error al guardar la cotización en Firestore.');
    } finally {
      setSubmitting(false);
    }
  };

  const clientProjects = projects.filter((p) => p.clientCompanyId === clientId);
  const clientFeatures = featureRequests.filter((f) => f.clientCompanyId === clientId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-brand-500" />
            <span>Gestor Comercial de Cotizaciones</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Emisión, desglose de horas y seguimiento de aprobación de presupuestos en Firestore.
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
            onClick={() => {
              setFormError(null);
              setShowCreateModal(true);
            }}
            disabled={clients.length === 0 || projects.length === 0}
            title={
              clients.length === 0 || projects.length === 0
                ? 'Primero registra una empresa cliente y un proyecto'
                : 'Emitir nueva cotización'
            }
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cotización Formal</span>
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
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[11px] underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Empty state vs Table */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Consultando colección quotes en Firestore...</p>
        </div>
      ) : quotes.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No existen cotizaciones emitidas todavía
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {clients.length === 0 || projects.length === 0
              ? 'Para emitir cotizaciones comerciales, primero registra una Empresa Cliente y vincula al menos un Proyecto.'
              : 'Emite la primera cotización formal para tus clientes y haz seguimiento de su aprobación en tiempo real.'}
          </p>
          {clients.length === 0 && (
            <div className="pt-2">
              <Link
                to="/admin/clients"
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow transition inline-flex items-center gap-1.5"
              >
                <Building className="w-4 h-4" />
                <span>Registrar Empresa Cliente</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3.5 px-4">ID / Fecha</th>
                  <th className="py-3.5 px-4">Cliente</th>
                  <th className="py-3.5 px-4">Concepto Principal</th>
                  <th className="py-3.5 px-4">Entrega Est.</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {quotes.map((q) => {
                  const client = clients.find((c) => c.id === q.clientCompanyId);
                  return (
                    <tr
                      key={q.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                    >
                      <td className="py-3.5 px-4 font-mono">
                        <div className="font-bold text-slate-900 dark:text-white">{q.id}</div>
                        <div className="text-[11px] text-slate-400">{formatDate(q.createdAt)}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                        {client?.name || q.clientCompanyId}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{q.title}</div>
                        <div className="text-slate-500 line-clamp-1">{q.description}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {q.estimatedDeliveryDays} días hábiles
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(q.subtotal, q.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            q.status === 'approved'
                              ? 'success'
                              : q.status === 'sent'
                              ? 'warning'
                              : q.status === 'rejected'
                              ? 'danger'
                              : 'neutral'
                          }
                        >
                          {q.status === 'approved'
                            ? 'APROBADA'
                            : q.status === 'sent'
                            ? 'ENVIADA'
                            : q.status === 'rejected'
                            ? 'RECHAZADA'
                            : q.status.toUpperCase()}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Create Quote */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Emitir Nueva Cotización Comercial
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateQuote} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Empresa Cliente *
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Proyecto *
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    {clientProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Moneda
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as 'USD' | 'BOB')}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white"
                    >
                      <option value="USD">USD</option>
                      <option value="BOB">BOB</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Días Est.
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={deliveryDays}
                      onChange={(e) => setDeliveryDays(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-2 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {clientFeatures.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Vincular a Solicitud de Cambio (Opcional)
                  </label>
                  <select
                    value={featureRequestId}
                    onChange={(e) => setFeatureRequestId(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="">-- Sin vincular --</option>
                    {clientFeatures.map((f) => (
                      <option key={f.id} value={f.id}>
                        [{f.id}] {f.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título del Presupuesto *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej. Implementación de Nuevo Módulo Operativo"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alcance Técnico y Condiciones *
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe los entregables incluidos..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Ítems de Desarrollo y Horas
                  </span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir Ítem</span>
                  </button>
                </div>

                {lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                    <input
                      type="text"
                      required
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      placeholder="Descripción de la tarea"
                      className="col-span-6 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.hours}
                      onChange={(e) => updateLineItem(item.id, 'hours', Number(e.target.value))}
                      placeholder="Hrs"
                      className="col-span-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center text-slate-900 dark:text-white"
                    />
                    <input
                      type="number"
                      min={1}
                      value={item.hourlyRate}
                      onChange={(e) => updateLineItem(item.id, 'hourlyRate', Number(e.target.value))}
                      placeholder="Tarifa"
                      className="col-span-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-center text-slate-900 dark:text-white"
                    />
                    <div className="col-span-1 text-xs font-bold text-right text-slate-800 dark:text-slate-200">
                      {item.total}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="col-span-1 flex justify-center text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="flex justify-end items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold uppercase text-slate-400">Total a Cotizar:</span>
                  <span className="text-lg font-extrabold text-brand-600 dark:text-brand-400">
                    {formatCurrency(subtotal, currency)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !projectId}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 flex items-center gap-1.5 shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Guardando en Firestore...' : 'Emitir y Enviar al Cliente'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
