import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  ShieldCheck,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Quote } from '@/models/quote';
import { QuoteStatusBadge } from '@/components/common/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export const ClientQuotesPage: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuoteForPrint, setSelectedQuoteForPrint] = useState<Quote | null>(null);

  // Modal actions
  const [approvingQuote, setApprovingQuote] = useState<Quote | null>(null);
  const [rejectingQuote, setRejectingQuote] = useState<Quote | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const canApprove = role === 'client_admin' || role === 'superadmin' || role === 'dev_owner';

  useEffect(() => {
    async function loadQuotes() {
      const q = await api.getQuotes(currentUser?.clientCompanyId);
      setQuotes(q);
    }
    loadQuotes();
  }, [currentUser]);

  const handleApprove = async () => {
    if (!approvingQuote) return;
    try {
      await api.approveQuote(approvingQuote.id, {
        uid: currentUser?.uid || 'user-unknown',
        displayName: currentUser?.displayName || 'Administrador Autorizado',
        email: currentUser?.email || '',
      });
      setActionSuccessMessage(
        `Presupuesto "${approvingQuote.title}" aprobado satisfactoriamente. Se ha generado la constancia digital de autorización.`
      );
      setApprovingQuote(null);
      const updated = await api.getQuotes(currentUser?.clientCompanyId);
      setQuotes(updated);
    } catch {
      alert('Error al aprobar el presupuesto.');
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
      setActionSuccessMessage(`Presupuesto "${rejectingQuote.title}" registrado como no aprobado.`);
      setRejectingQuote(null);
      setRejectionReason('');
      const updated = await api.getQuotes(currentUser?.clientCompanyId);
      setQuotes(updated);
    } catch {
      alert('Error al rechazar el presupuesto.');
    }
  };

  const handleTriggerPrint = (quote: Quote) => {
    setSelectedQuoteForPrint(quote);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="space-y-6">
      {/* Printable Section Header - Hidden on Screen, Visible on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Presupuestos y Aprobaciones
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Revisa el desglose de tareas técnicas, horas estimadas y autoriza formalmente las órdenes de trabajo.
          </p>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between print:hidden">
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
          No tienes presupuestos pendientes de aprobación en este momento.
        </div>
      ) : (
        <div className="space-y-6">
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0"
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Código: {quote.id.startsWith('COT-') ? quote.id : `COT-${quote.id.toUpperCase()}`}
                    </span>
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {quote.title}
                  </h2>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs text-slate-400 block font-medium">Inversión Estimada</span>
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
                      <th className="py-2.5 px-4">Concepto / Tarea de Implementación</th>
                      <th className="py-2.5 px-4 text-center">Horas</th>
                      <th className="py-2.5 px-4 text-right">Tarifa / Hora</th>
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
                  <tfoot className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-800">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 font-bold text-right text-slate-700 dark:text-slate-300">
                        Total Estimado:
                      </td>
                      <td className="py-2.5 px-4 text-right font-black text-sm text-brand-600 dark:text-brand-400">
                        {formatCurrency(quote.subtotal, quote.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Delivery and Validity metadata */}
              <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Plazo de entrega: {quote.estimatedDeliveryDays} días hábiles
                  </span>
                  <span>•</span>
                  <span>Vigencia: hasta {formatDate(quote.validUntil)}</span>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={() => handleTriggerPrint(quote)}
                    className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition text-xs font-semibold"
                    title="Imprimir o exportar en PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir / PDF</span>
                  </button>

                  {quote.status === 'sent' && canApprove && (
                    <>
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
                        <span>Aprobar Presupuesto</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Approved status stamp */}
              {quote.status === 'approved' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Aprobado digitalmente por <strong>{quote.approvedBy?.displayName}</strong> ({quote.approvedBy?.email}) el {formatDate(quote.approvedAt)}.
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    AUT-VERIFIED
                  </span>
                </div>
              )}

              {/* Rejected status stamp */}
              {quote.status === 'rejected' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    No aprobado por el cliente. Motivo: <em>"{quote.rejectionReason}"</em>
                  </span>
                </div>
              )}

              {/* Fiscal / Legal Disclaimer */}
              <div className="text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-2 leading-relaxed">
                <strong>Nota legal y tributaria:</strong> Este documento corresponde a una propuesta técnica y económica de servicios profesionales de software. No constituye factura fiscal válida para crédito fiscal tributario. La aceptación autoriza el inicio del desarrollo bajo las condiciones acordadas.
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
              Confirmar Autorización de Presupuesto
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Al confirmar, autorizas formalmente el inicio del desarrollo para <strong>"{approvingQuote.title}"</strong> por un importe de <strong>{formatCurrency(approvingQuote.subtotal, approvingQuote.currency)}</strong>. Se registrará la aprobación con tu identidad y fecha actual.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
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
                Autorizar y Continuar
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
              Indicar Motivo de No Aprobación
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Por favor indica la razón para que el equipo técnico y comercial evalúe un ajuste de alcance o presupuesto.
            </p>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej. El costo excede el presupuesto del mes o se requiere priorizar otro módulo..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
