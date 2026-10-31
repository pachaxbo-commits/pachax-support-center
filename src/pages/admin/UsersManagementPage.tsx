import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Mail,
  Key,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole, ROLE_LABELS, UserProfile } from '@/models/auth';
import { DEMO_USERS } from '@/lib/demoData';

export const UsersManagementPage: React.FC = () => {
  const { currentUser, role } = useAuth();
  const [usersList, setUsersList] = useState<UserProfile[]>(Object.values(DEMO_USERS));
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Invite Form
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('client_user');
  const [invitationSuccess, setInvitationSuccess] = useState<string | null>(null);

  const handleInviteUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const newUser: UserProfile = {
      uid: `usr-${Date.now().toString(36)}`,
      email,
      displayName: displayName || email.split('@')[0],
      role: selectedRole,
      status: 'invited',
      createdAt: new Date().toISOString(),
    };

    setUsersList([...usersList, newUser]);
    setInvitationSuccess(`Invitación enviada por correo a ${email} con rol "${ROLE_LABELS[selectedRole]}". Enlace de un solo uso con caducidad de 48 horas.`);
    setIsInviteOpen(false);
    setEmail('');
    setDisplayName('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Usuarios y Control de Acceso (RBAC)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestión de identidades por invitación. El registro público está deshabilitado por seguridad.
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invitar Usuario Autorizado</span>
        </button>
      </div>

      {invitationSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{invitationSuccess}</span>
          </div>
          <button
            onClick={() => setInvitationSuccess(null)}
            className="text-emerald-700 dark:text-emerald-400 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Bootstrap Superadmin Architecture Notice */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex items-start gap-3">
        <Lock className="w-5 h-5 text-brand-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1 leading-relaxed">
          <span className="font-bold text-sm text-white block">
            Mecanismo de Bootstrap para Primer Superadministrador:
          </span>
          <p className="text-slate-300">
            PACHAX Support Center prohíbe el auto-registro libre. El primer superadministrador se inicializa exclusivamente a través de la Cloud Function autenticada <code>bootstrapSuperadmin</code> o mediante el script CLI administrativo provisto en <code>docs/AUTHENTICATION_SETUP.md</code>. Una vez reclamado el ownership, cualquier nuevo usuario requiere una invitación criptográfica firmada.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Usuario / Nombre</th>
              <th className="py-3 px-4">Correo Electrónico</th>
              <th className="py-3 px-4">Rol Asignado</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
            {usersList.map((u) => (
              <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-[11px]">
                    {u.displayName[0]}
                  </div>
                  <span>{u.displayName}</span>
                </td>
                <td className="py-3 px-4 text-slate-500 font-mono">{u.email}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      u.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {u.status === 'active' ? 'Activo' : 'Invitación pendiente'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium">
                    Editar Permisos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleInviteUser}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Invitar Usuario por Correo
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correo Electrónico *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@empresa.com"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nombre Completo (Opcional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Ing. Carlos Mendoza"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Rol Asignado *
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
              >
                <optgroup label="Desarrolladora (PACHAX)">
                  <option value="superadmin">Superadministrador de PACHAX Support Center</option>
                  <option value="dev_owner">Propietario de empresa desarrolladora</option>
                  <option value="dev_admin">Administrador de empresa desarrolladora</option>
                  <option value="dev_engineer">Desarrollador o técnico</option>
                  <option value="dev_commercial">Responsable comercial</option>
                </optgroup>
                <optgroup label="Empresas Clientes">
                  <option value="client_admin">Administrador de empresa cliente</option>
                  <option value="client_user">Usuario autorizado de empresa cliente</option>
                </optgroup>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow"
              >
                Enviar Invitación
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
