import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DEMO_USERS } from '@/lib/demoData';
import { UserRole, ROLE_LABELS } from '@/models/auth';

export const LoginPage: React.FC = () => {
  const { login, isDemoMode, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/client/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar sesión. Revisa tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoSelect = (roleKey: UserRole) => {
    const demo = DEMO_USERS[roleKey];
    if (demo) {
      setEmail(demo.email);
      setPassword('PachaxDemo2026!');
      switchDemoRole(roleKey);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo */}
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-700 via-brand-600 to-brand-500 flex items-center justify-center text-white shadow-xl shadow-brand-500/20">
            <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
              <path d="M25 75L50 25L75 75L50 60L25 75Z" fill="white" />
              <circle cx="50" cy="48" r="8" fill="#bae0fd" />
            </svg>
          </div>
        </div>

        <h2 className="text-center text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          PACHAX Support Center
        </h2>
        <p className="mt-1 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Ingreso corporativo y administración técnica de soporte
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contraseña
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50 shadow-lg shadow-brand-500/25 transition"
            >
              <span>{loading ? 'Verificando sesión...' : 'Ingresar al Portal'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Registration Notice */}
          <div className="pt-2 text-center text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
            <span>¿No tienes cuenta? </span>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              El acceso es por invitación exclusiva de tu administrador o de PACHAX.
            </span>
          </div>

          {/* Quick Demo Access Bar (Development only) */}
          {!import.meta.env.PROD && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Acceso Rápido Sandbox / Selector de Roles:</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickDemoSelect('client_admin')}
                  className="p-1.5 text-left rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/60 text-slate-700 dark:text-slate-300 font-medium truncate transition"
                >
                  Gerente Cliente (San José)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoSelect('superadmin')}
                  className="p-1.5 text-left rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-950/60 text-slate-700 dark:text-slate-300 font-medium truncate transition"
                >
                  Superadmin PACHAX
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoSelect('dev_engineer')}
                  className="p-1.5 text-left rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/60 text-slate-700 dark:text-slate-300 font-medium truncate transition"
                >
                  Ingeniero de Soporte
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemoSelect('client_user')}
                  className="p-1.5 text-left rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-50 dark:hover:bg-brand-950/60 text-slate-700 dark:text-slate-300 font-medium truncate transition"
                >
                  Operador de Cliente
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
