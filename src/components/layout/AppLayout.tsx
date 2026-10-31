import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { AlertTriangle, Send, RefreshCw, CheckCircle2 } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { firebaseUser, isDemoMode, sendVerificationEmail, reloadUser } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleSendVerification = async () => {
    try {
      setIsSending(true);
      setSendError(null);
      await sendVerificationEmail();
      setSentSuccess(true);
    } catch (err: any) {
      const code = err?.code ? `[${err.code}] ` : '';
      const msg = err?.message || 'Error al enviar correo de verificación';
      setSendError(`${code}${msg}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleRefresh = async () => {
    await reloadUser();
  };

  const showVerificationBanner = !isDemoMode && firebaseUser && !firebaseUser.emailVerified;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        isMobileMenuOpen={isMobileMenuOpen}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {showVerificationBanner && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Atención:</strong> La cuenta <strong>{firebaseUser.email}</strong> tiene el correo pendiente de verificación. Es obligatorio confirmarlo para habilitar permisos administrativos y de soporte.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {sentSuccess ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Correo enviado a su bandeja
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendVerification}
                  disabled={isSending}
                  className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Enviando...' : 'Enviar enlace a mi correo'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleRefresh}
                title="Actualizar estado tras hacer clic en el enlace"
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ya lo verifiqué</span>
              </button>
            </div>
          </div>
          {sendError && (
            <div className="max-w-7xl mx-auto mt-2 p-2 rounded-lg bg-rose-100 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-900 text-rose-900 dark:text-rose-200 font-mono text-[11px] break-all">
              <strong>Error de Firebase:</strong> {sendError}
            </div>
          )}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
