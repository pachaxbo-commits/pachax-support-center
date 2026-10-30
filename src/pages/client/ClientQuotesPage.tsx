import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Calendar,
  AlertCircle,
  Download
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Quote } from '@/models/quote';
import { QuoteStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export const ClientQuotesPage: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal actions
  const [approvingQuote, setApprovingQuote] = useState<Quote | null>(null);
  const [rejectingQuote, setRejectingQuote] = useState<Quote | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const canApprove = role === 'client_admin' || role === 'superadmin';

  useEffect(() => {
    async function loadQuotes() {
      try {
        const q = await api.getQuotes(currentUser?.clientCompanyId);
        setQuotes(q);
      } finally {
        setLoading(false);
      }
    }
    loadQuotes();
  }, [currentUser]);

  const handleApprove = async () => {
    if (!approvingQuote) return;
    try {
      await api.approveQuote(approvingQuote.id, {
        uid: currentUser?.uid || 'user-unknown',
        displayName: currentUser?.displayName || 'Administrador',
        email: currentUser?.email || '',
      });
      setActionSuccessMessage(`Cotización "${approvingQuote.title}" aprobada satisfactoriamente. El equipo comenzará el desarrollo.`);
      setApprovingQuote(null);
      // Reload
      const updated = await api.getQuotes(currentUser?.clientCompanyId);
      setQuotes(updated);
    } catch (e) {
      alert('Error al aprobar cotización.');
    }
  };

  const handleReject = async () => {
    if (!rejectingQuote || !rejectionReason.trim()) {
      alert('Por favor especifica el motivo del rechazo.');
      return;
    }
    try {
      await api.rejectQuote(rejectingQuote.id, rejectionReason, {
        uid: currentUser?.uid || 'user-unknown',
        displayName: currentUser?.displayName || 'Administrador',
      });
      setActionSuccessMessage(`Cotización "${rejectingQuote.title}" rechazada.`);
      setRejectingQuote(null);
      setRejectionReason('');
      const updated = await api.getQuotes(currentUser?.clientCompanyId);
      setQuotes(updated);
    } catch (e) {
      alert('Error al rechazar cotización.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Cotizaciones y Aprobaciones
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Revisa el desglose técnico, estimación de horas y aprueba presupuestos para inicio de desarrollo.
        </p>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between">
          <span>{actionSuccessMessage}</span>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 dark:text-emerald-400 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm">
          No tienes cotizaciones registradas actualmente.
        </div>
      ) : (
        <div className="space-y-6">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">ID: {quote.id}</span>
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {quote.title}
                  </h2>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 block">Total Estimado</span>
                  <span className="text-xl sm:text-2xl font-black text-brand-600 dark:text-brand-400">
                    {formatCurrency(quote.subtotal, quote.currency)}
                  </span>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {quote.description}
              </p>

              {/* Line items table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2.5 px-4">Concepto / Tarea Técnica</th>
                      <th className="py-2.5 px-4 text-center">Horas</th>
                      <th className="py-2.5 px-4 text-right">Tarifa</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {quote.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 px-4 font-medium">{item.description}</td>
                        <td className="py-2.5 px-4 text-center font-mono">{item.hours}h</td>
                        <td className="py-2.5 px-4 text-right font-mono">{formatCurrency(item.hourlyRate, quote.currency)}</td>
                        <td className="py-2.5 px-4 text-right font-bold font-mono">{formatCurrency(item.total, quote.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Delivery and Validity metadata */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Entrega estimada: {quote.estimatedDeliveryDays} días hábiles
                  </span>
                  <span>•</span>
                  <span>Válida hasta: {formatDate(quote.validUntil)}</span>
                </div>

                {quote.status === 'sent' && canApprove && (
                  <div className="flex items-center gap-2 mt-3 sm:mt-0">
                    <button
                      onClick={() => setRejectingQuote(quote)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition"
                    >
                      Rechazar
                    </button>
                    <button
                      onClick={() => setApprovingQuote(quote)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Aprobar Cotización</span>
                    </button>
                  </div>
                )}

                {quote.status === 'approved' && (
                  <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    <span>Aprobada por {quote.approvedBy?.displayName} el {formatDate(quote.approvedAt)}</span>
                  </div>
                )}

                {quote.status === 'rejected' && (
                  <div className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    <span>Rechazada: {quote.rejectionReason}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Confirmation Modal */}
      {approvingQuote && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Confirmar Aprobación de Presupuesto
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Al confirmar, autorizas formalmente la orden de trabajo para <strong>"{approvingQuote.title}"</strong> por un importe de <strong>{formatCurrency(approvingQuote.subtotal, approvingQuote.currency)}</strong>. El equipo técnico agendará el sprint de desarrollo.
            </p>

            <div className="flex justify-end gap-2 pt-3">
              <button
                onClick={() => setApprovingQuote(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow"
              >
                Confirmar y Autorizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingQuote && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Rechazar Cotización
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Indica la razón del rechazo para que el equipo comercial evalúe un ajuste de alcance o presupuesto.
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej. El presupuesto excede el límite del trimestre o deseamos prescindir del reporte secundario..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectingQuote(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow"
              >
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
