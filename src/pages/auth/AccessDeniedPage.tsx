import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/models/auth';

export const AccessDeniedPage: React.FC = () => {
  const { role } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-lg">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <h1 className="text-2xl font-black text-slate-900 dark:text-white">
        403 — Acceso Denegado
      </h1>

      <p className="max-w-md text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
        Tu rol actual ({role ? ROLE_LABELS[role] : 'Sin Rol'}) no cuenta con los privilegios técnicos o comerciales requeridos para visualizar esta sección.
      </p>

      <div className="pt-4 flex items-center gap-3">
        <Link
          to="/client/dashboard"
          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow transition flex items-center gap-1.5"
        >
          <Home className="w-4 h-4" />
          <span>Volver al Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
