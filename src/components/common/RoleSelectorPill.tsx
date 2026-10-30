import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UserRole, ROLE_LABELS } from '@/models/auth';
import { ShieldCheck, ChevronDown, Sparkles } from 'lucide-react';

export const RoleSelectorPill: React.FC = () => {
  const { currentUser, role, switchDemoRole, isDemoMode } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const rolesList: UserRole[] = [
    'superadmin',
    'dev_owner',
    'dev_admin',
    'dev_engineer',
    'dev_commercial',
    'client_admin',
    'client_user',
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition shadow-sm"
        title="Cambiar rol activo para pruebas de permisos"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-brand-500" />
        <span className="font-semibold text-brand-600 dark:text-brand-400">Rol:</span>
        <span className="truncate max-w-[130px] sm:max-w-none">
          {role ? ROLE_LABELS[role] : 'Sin Rol'}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 p-2 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800 mb-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Simulador de Roles y Permisos</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Cambia de rol para verificar la visibilidad y restricciones en tiempo real.
              </p>
            </div>

            <div className="space-y-0.5">
              {rolesList.map((r) => {
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    onClick={() => {
                      switchDemoRole(r);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{ROLE_LABELS[r]}</span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {isDemoMode && (
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 px-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                Modo Sandbox / Datos simulados activos
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
