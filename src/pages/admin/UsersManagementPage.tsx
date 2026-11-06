import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Building,
  CheckCircle2,
  Ban,
  RefreshCw,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { UserProfile, UserInvitation, UserRole, ROLE_LABELS } from '@/models/auth';
import { ClientCompany } from '@/models/company';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '@/components/common/Badge';
import { formatDate } from '@/lib/utils';

export const UsersManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const devCompanyId = currentUser?.developerCompanyId || 'dev-pachax-core';

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('client_user');
  const [selectedClientId, setSelectedClientId] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [uData, invData, cData] = await Promise.all([
        api.getUsers(),
        api.getInvitations(devCompanyId),
        api.getClients(devCompanyId),
      ]);
      setUsersList(uData);
      setInvitations(invData);
      setClients(cData);
      if (cData.length > 0 && !selectedClientId) {
        setSelectedClientId(cData[0].id);
      }
    } catch (err: any) {
      setError(err?.message || 'Error al cargar usuarios e invitaciones desde Firestore.');
    } finally {
      setLoading(false);
    }
  }, [devCompanyId, selectedClientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !inviteEmail || !inviteName) return;

    setFormError(null);
    setSubmitting(true);

    try {
      const isClientRole = inviteRole === 'client_admin' || inviteRole === 'client_user';
      if (isClientRole && !selectedClientId) {
        throw new Error('Debes registrar y seleccionar una empresa cliente antes de invitar usuarios de cliente.');
      }

      const res = await api.createInvitation({
        email: inviteEmail.trim(),
        displayName: inviteName.trim(),
        role: inviteRole,
        developerCompanyId: devCompanyId,
        clientCompanyId: isClientRole ? selectedClientId : undefined,
        invitedByUid: currentUser.uid,
        invitedByEmail: currentUser.email,
      });

      setSuccessMsg(
        `Invitación registrada en Firestore para ${res.invitation.email} (${ROLE_LABELS[res.invitation.role]}).`
      );
      setInviteEmail('');
      setInviteName('');
      setShowInviteModal(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Error al registrar la invitación en Firestore.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: UserProfile) => {
    if (!currentUser) return;
    if (user.uid === currentUser.uid) {
      setError('Por seguridad no puedes suspender ni desactivar tu propia cuenta activa.');
      return;
    }

    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      setError(null);
      await api.updateUserStatus(user.uid, nextStatus, currentUser.uid, devCompanyId);
      setSuccessMsg(
        `Estado de la cuenta ${user.email} actualizado a ${nextStatus.toUpperCase()} en Firestore.`
      );
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Error al cambiar el estado de la cuenta.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" />
            <span>Usuarios, Roles y Control de Accesos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Administración real en Firestore de cuentas verificadas e invitaciones multiempresa.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3 py-2.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Recargar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setShowInviteModal(true);
            }}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invitar Usuario</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[11px] underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Active Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            Perfiles Registrados en /users ({usersList.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-400 bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3.5 px-4">Usuario</th>
                <th className="py-3.5 px-4">Rol de Sistema</th>
                <th className="py-3.5 px-4">Organización Asignada</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {usersList.map((u) => {
                const clientObj = clients.find((c) => c.id === u.clientCompanyId);
                const isSelf = currentUser?.uid === u.uid;
                return (
                  <tr
                    key={u.uid}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>{u.displayName}</span>
                        {isSelf && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-brand-100 dark:bg-brand-950 text-brand-700 dark:text-brand-300 font-semibold">
                            Tú
                          </span>
                        )}
                      </div>
                      <div className="text-slate-400 flex items-center gap-1 mt-0.5 font-mono text-[11px]">
                        <Mail className="w-3 h-3" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                        <Shield className="w-3.5 h-3.5 text-brand-500" />
                        <span>{ROLE_LABELS[u.role] || u.role}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.clientCompanyId ? (
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-300">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          {clientObj?.name || u.clientCompanyId}
                        </span>
                      ) : (
                        <span className="text-brand-600 dark:text-brand-400 font-semibold">
                          PACHAX ({u.developerCompanyId || 'dev-pachax-core'})
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          u.status === 'active'
                            ? 'success'
                            : u.status === 'invited'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {u.status === 'active'
                          ? 'ACTIVO'
                          : u.status === 'invited'
                          ? 'INVITADO'
                          : 'SUSPENDIDO'}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {!isSelf && (
                        <button
                          onClick={() => toggleUserStatus(u)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition inline-flex items-center gap-1"
                        >
                          {u.status === 'active' ? (
                            <>
                              <Ban className="w-3 h-3 text-rose-500" />
                              <span>Suspender</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span>Reactivar</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations Section */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Invitaciones Emitidas en /userInvitations ({invitations.length})
            </h2>
          </div>
        </div>

        {invitations.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No hay invitaciones pendientes o registradas en este momento.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {invitations.map((inv) => {
              const clientObj = clients.find((c) => c.id === inv.clientCompanyId);
              return (
                <div
                  key={inv.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{inv.email}</span>
                      <Badge variant={inv.status === 'pending' ? 'warning' : 'success'}>
                        {inv.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Rol: {ROLE_LABELS[inv.role] || inv.role} • Organización:{' '}
                      {inv.clientCompanyId
                        ? clientObj?.name || inv.clientCompanyId
                        : `PACHAX (${inv.developerCompanyId})`}
                    </p>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Expira: {formatDate(inv.expiresAt)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Invite */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Emitir Invitación por Correo
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleInviteUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ej. María Fernández"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Correo Corporativo *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="mfernandez@empresa.com"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rol a Otorgar
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                >
                  <option value="client_user">Usuario Autorizado de Cliente</option>
                  <option value="client_admin">Administrador de Empresa Cliente</option>
                  <option value="dev_engineer">Desarrollador / Ingeniero PACHAX</option>
                  <option value="dev_commercial">Responsable Comercial PACHAX</option>
                  <option value="dev_admin">Administrador Desarrolladora PACHAX</option>
                </select>
              </div>

              {(inviteRole === 'client_admin' || inviteRole === 'client_user') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Empresa Cliente Vinculada *
                  </label>
                  {clients.length === 0 ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-[11px] text-amber-700 dark:text-amber-300">
                      No hay empresas clientes registradas. Registra primero una empresa en la sección Empresas Clientes.
                    </div>
                  ) : (
                    <select
                      value={selectedClientId}
                      onChange={(e) => setSelectedClientId(e.target.value)}
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.contactEmail})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    submitting ||
                    ((inviteRole === 'client_admin' || inviteRole === 'client_user') &&
                      clients.length === 0)
                  }
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50"
                >
                  {submitting ? 'Registrando en Firestore...' : 'Registrar Invitación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
