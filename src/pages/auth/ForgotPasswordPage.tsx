import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export const ForgotPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      alert('Error al enviar el enlace de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Recuperar Contraseña
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Te enviaremos un enlace seguro para restablecer tu acceso.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Si el correo <strong>{email}</strong> está registrado, recibirás un mensaje con las instrucciones en tu bandeja.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Volver al inicio de sesión</span>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Correo Electrónico Registrado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 shadow transition"
              >
                {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancelar y regresar</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
