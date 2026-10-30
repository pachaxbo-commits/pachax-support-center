import React, { useState, useEffect } from 'react';
import { FileCheck2, Plus, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Quote, QuoteLineItem } from '@/models/quote';
import { ClientCompany } from '@/models/company';
import { Project } from '@/models/project';
import { QuoteStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export const QuotesManagementPage: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New quote form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [hours, setHours] = useState(10);
  const [hourlyRate, setHourlyRate] = useState(35);
  const [deliveryDays, setDeliveryDays] = useState(5);

  useEffect(() => {
    async function load() {
      const [q, c, p] = await Promise.all([
        api.getQuotes(),
        api.getClients(),
        api.getProjects(),
      ]);
      setQuotes(q);
      setClients(c);
      setProjects(p);
      if (c.length > 0) setClientId(c[0].id);
      if (p.length > 0) setProjectId(p[0].id);
    }
    load();
  }, []);

  const handleCreateQuote = (e: React.FormEvent) => {
    e.preventDefault();
    const subtotal = hours * hourlyRate;
    const newQuote: Quote = {
      id: `quote-${Date.now().toString(36)}`,
      clientCompanyId: clientId,
      developerCompanyId: 'dev-pachax-core',
      projectId: projectId,
      title,
      description,
      items: [
        {
          id: 'item-1',
          description: title,
          hours,
          hourlyRate,
          total: subtotal,
        },
      ],
      subtotal,
      currency: 'USD',
      estimatedDeliveryDays: deliveryDays,
      validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setQuotes([newQuote, ...quotes]);
    setIsModalOpen(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Gestión Comercial & Cotizaciones
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Presupuesta implementaciones solicitadas por clientes y monitorea el estado de aprobación.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Cotización</span>
        </button>
      </div>

      <div className="space-y-4">
        {quotes.map((q) => {
          const client = clients.find((c) => c.id === q.clientCompanyId);
          return (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{q.id}</span>
                    <QuoteStatusBadge status={q.status} />
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {client?.name}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {q.title}
                  </h3>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {formatCurrency(q.subtotal, q.currency)}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    {q.estimatedDeliveryDays} días de entrega
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                {q.description}
              </p>

              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2">
                <span>Válida hasta: {formatDate(q.validUntil)}</span>
                {q.status === 'approved' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Aprobada por cliente
                  </span>
                )}
                {q.status === 'rejected' && (
                  <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Rechazada ({q.rejectionReason})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateQuote}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Emisión de Cotización Formal
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cliente Destinatario *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
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
                Título del Desarrollo / Requerimiento *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Integración pasarela QR con Banco Ganadero"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Descripción del Alcance Técnico *
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalla qué incluye la entrega técnica y pruebas..."
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Horas Est.
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tarifa $/h
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Días Entrega
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(Number(e.target.value))}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
                />
              </div>
            </div>

            <div className="p-3 bg-brand-50 dark:bg-brand-950/40 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-brand-900 dark:text-brand-300">Total Cotización:</span>
              <span className="font-black text-sm text-brand-600 dark:text-brand-400">
                {formatCurrency(hours * hourlyRate, 'USD')}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow"
              >
                Emitir Cotización
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
