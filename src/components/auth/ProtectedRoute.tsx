import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/models/auth';
import { ShieldAlert, LogOut, RefreshCw, AlertTriangle } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const {
    currentUser,
    firebaseUser,
    isLoading,
    role,
    profileStatus,
    authError,
    logout,
    reloadUser,
  } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Verificando sesión y credenciales en Firebase...
          </p>
        </div>
      </div>
    );
  }

  // Case: Authenticated in Firebase Auth, but missing Firestore /users/{uid} profile or suspended or error
  if (firebaseUser && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            {profileStatus === 'suspended' ? (
              <ShieldAlert className="w-7 h-7 text-rose-600" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {profileStatus === 'suspended'
              ? 'Cuenta Suspendida'
              : profileStatus === 'missing_profile'
              ? 'Cuenta Pendiente de Vinculación'
              : 'Error de Verificación de Perfil'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {profileStatus === 'suspended'
              ? `El acceso para ${firebaseUser.email} se encuentra suspendido por administración.`
              : profileStatus === 'missing_profile'
              ? `Has iniciado sesión como ${firebaseUser.email}, pero tu cuenta aún no tiene un perfil operativo ni empresa asignada en PACHAX Support Center. Solicita una invitación o vinculación al administrador.`
              : authError || 'No se pudo verificar tu perfil de usuario en Firestore. Por seguridad no se conceden permisos.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reloadUser()}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reintentar verificación</span>
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
};
