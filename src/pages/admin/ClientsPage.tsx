import React, { useEffect, useState, useCallback } from 'react';
import {
  Building,
  Plus,
  Mail,
  Phone,
  ShieldCheck,
  FolderKanban,
  Search,
  AlertTriangle,
  RefreshCw,
  Edit3,
  Archive,
  CheckCircle2,
  PauseCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { ClientCompany } from '@/models/company';
import { Project } from '@/models/project';
import { Badge } from '@/components/common/Badge';
import { formatDate } from '@/lib/utils';

export const ClientsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const devCompanyId = currentUser?.developerCompanyId || 'dev-pachax-core';

  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientCompany | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [allowedDomainsText, setAllowedDomainsText] = useState('');
  const [maxDailyReports, setMaxDailyReports] = useState<number>(1);
  const [billingTier, setBillingTier] = useState<'starter' | 'business' | 'enterprise'>('business');
  const [criticalSlaHours, setCriticalSlaHours] = useState<string>('');
  const [generalSlaHours, setGeneralSlaHours] = useState<string>('');
  const [contractReference, setContractReference] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cData, pData] = await Promise.all([
        api.getClients(devCompanyId),
        api.getProjects(undefined, devCompanyId),
      ]);
      setClients(cData);
      setProjects(pData);
    } catch (err: any) {
      setError(err?.message || 'Error al cargar las empresas clientes desde Firestore.');
    } finally {
      setLoading(false);
    }
  }, [devCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingClient(null);
    setName('');
    setTaxId('');
    setContactEmail('');
    setContactPhone('');
    setAddress('');
    setAllowedDomainsText('');
    setMaxDailyReports(1);
    setBillingTier('business');
    setCriticalSlaHours('');
    setGeneralSlaHours('');
    setContractReference('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (client: ClientCompany) => {
    setEditingClient(client);
    setName(client.name);
    setTaxId(client.taxId || '');
    setContactEmail(client.contactEmail);
    setContactPhone(client.contactPhone || '');
    setAddress(client.address || '');
    setAllowedDomainsText((client.allowedDomains || []).join(', '));
    setMaxDailyReports(client.maxDailyGeneralReports || 1);
    setBillingTier(client.billingTier);
    setCriticalSlaHours(
      client.slaConfig?.criticalResponseHours ? String(client.slaConfig.criticalResponseHours) : ''
    );
    setGeneralSlaHours(
      client.slaConfig?.generalResponseHours ? String(client.slaConfig.generalResponseHours) : ''
    );
    setContractReference(client.slaConfig?.contractReference || '');
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const parsedDomains = allowedDomainsText
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      const slaConfig =
        criticalSlaHours || generalSlaHours || contractReference
          ? {
              criticalResponseHours: criticalSlaHours ? Number(criticalSlaHours) : undefined,
              generalResponseHours: generalSlaHours ? Number(generalSlaHours) : undefined,
              contractReference: contractReference.trim() || undefined,
            }
          : undefined;

      if (editingClient) {
        await api.updateClient(
          editingClient.id,
          {
            name: name.trim(),
            taxId: taxId.trim() || undefined,
            contactEmail: contactEmail.trim().toLowerCase(),
            contactPhone: contactPhone.trim() || undefined,
            address: address.trim() || undefined,
            billingTier,
            allowedDomains:
              parsedDomains.length > 0
                ? parsedDomains
                : [contactEmail.trim().toLowerCase().split('@')[1] || ''],
            maxDailyGeneralReports: maxDailyReports,
            slaConfig,
          },
          currentUser.uid,
          devCompanyId
        );
        setSuccessMsg(`Empresa "${name.trim()}" actualizada en Firestore.`);
      } else {
        await api.createClient({
          name: name.trim(),
          taxId: taxId.trim() || undefined,
          contactEmail: contactEmail.trim().toLowerCase(),
          contactPhone: contactPhone.trim() || undefined,
          address: address.trim() || undefined,
          billingTier,
          allowedDomains: parsedDomains,
          maxDailyGeneralReports: maxDailyReports,
          developerCompanyId: devCompanyId,
          slaConfig,
          performedByUid: currentUser.uid,
        });
        setSuccessMsg(`Empresa "${name.trim()}" registrada exitosamente en Firestore.`);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setFormError(err?.message || 'Error al guardar la empresa cliente en Firestore.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeStatus = async (
    client: ClientCompany,
    newStatus: 'active' | 'paused' | 'suspended' | 'archived'
  ) => {
    if (!currentUser) return;
    try {
      setError(null);
      await api.updateClient(client.id, { status: newStatus }, currentUser.uid, devCompanyId);
      setSuccessMsg(`Estado de "${client.name}" actualizado a ${newStatus.toUpperCase()}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'No se pudo cambiar el estado de la empresa cliente.');
    }
  };

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.contactEmail.toLowerCase().includes(search.toLowerCase()) ||
      (c.taxId && c.taxId.includes(search))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-brand-500" />
            <span>Empresas Clientes Registradas</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Administración real en Firestore de organizaciones clientes, contratos y límites de soporte.
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
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow-lg shadow-brand-500/20 transition flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Empresa Cliente</span>
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

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre comercial, NIT o correo..."
          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Empty State vs Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Consultando colección clientCompanies en Firestore...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto">
            <Building className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {clients.length === 0
              ? 'Todavía no hay empresas clientes registradas.'
              : 'No se encontraron empresas con ese criterio de búsqueda.'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {clients.length === 0
              ? 'Registra tu primera empresa para comenzar a vincular proyectos, configurar políticas SLA e invitar usuarios.'
              : 'Intenta con otro término de búsqueda.'}
          </p>
          {clients.length === 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow transition inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primera Empresa Cliente</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((client) => {
            const clientProjects = projects.filter((p) => p.clientCompanyId === client.id);
            return (
              <div
                key={client.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">{client.id}</span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {client.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        NIT: {client.taxId || 'Pendiente de registro'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          client.status === 'active'
                            ? 'success'
                            : client.status === 'suspended' || client.status === 'archived'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {client.status.toUpperCase()}
                      </Badge>
                      <Badge
                        variant={
                          client.billingTier === 'enterprise'
                            ? 'purple'
                            : client.billingTier === 'business'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {client.billingTier.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{client.contactEmail}</span>
                    </div>
                    {client.contactPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{client.contactPhone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        Cuota general: <strong>{client.maxDailyGeneralReports} lote/día</strong>
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      SLA:{' '}
                      {client.slaConfig?.criticalResponseHours
                        ? `Crítico < ${client.slaConfig.criticalResponseHours}h / General < ${
                            client.slaConfig.generalResponseHours || 24
                          }h`
                        : 'Según contrato vigente'}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <FolderKanban className="w-4 h-4 text-brand-500" />
                      <span>
                        <strong>{clientProjects.length}</strong> proyectos
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Alta: {formatDate(client.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(client)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1 transition"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                    {client.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => handleChangeStatus(client, 'suspended')}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 flex items-center gap-1 transition"
                      >
                        <PauseCircle className="w-3 h-3" />
                        <span>Suspender</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleChangeStatus(client, 'active')}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 flex items-center gap-1 transition"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Activar</span>
                      </button>
                    )}
                    {client.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => handleChangeStatus(client, 'archived')}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 flex items-center gap-1 transition"
                      >
                        <Archive className="w-3 h-3" />
                        <span>Archivar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Create / Edit Client */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 my-8">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingClient ? 'Editar Empresa Cliente' : 'Registrar Nueva Empresa Cliente'}
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveClient} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Razón Social / Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Corporación Industrial S.A."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    NIT / Identificación Tributaria (Opcional)
                  </label>
                  <input
                    type="text"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="Sin confirmar / Opcional"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Teléfono de Contacto (Opcional)
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+591 ..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Correo de Administración del Cliente *
                </label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="sistemas@empresa.com"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plan de Servicio / SLA
                  </label>
                  <select
                    value={billingTier}
                    onChange={(e) => setBillingTier(e.target.value as any)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  >
                    <option value="starter">Starter</option>
                    <option value="business">Business</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cuota Diaria Lotes Generales
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxDailyReports}
                    onChange={(e) => setMaxDailyReports(Number(e.target.value) || 1)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Dominios de Correo Autorizados (separados por coma)
                </label>
                <input
                  type="text"
                  value={allowedDomainsText}
                  onChange={(e) => setAllowedDomainsText(e.target.value)}
                  placeholder="empresa.com, filial.bo"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Acuerdo de Nivel de Servicio (SLA Opcional Según Contrato)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                      SLA Crítico (Horas)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={criticalSlaHours}
                      onChange={(e) => setCriticalSlaHours(e.target.value)}
                      placeholder="Ej. 2"
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                      SLA General (Horas)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={generalSlaHours}
                      onChange={(e) => setGeneralSlaHours(e.target.value)}
                      placeholder="Ej. 24"
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 dark:text-slate-400 mb-1">
                      Ref. Contrato
                    </label>
                    <input
                      type="text"
                      value={contractReference}
                      onChange={(e) => setContractReference(e.target.value)}
                      placeholder="Opcional"
                      className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-50"
                >
                  {submitting
                    ? 'Guardando en Firestore...'
                    : editingClient
                    ? 'Guardar Cambios'
                    : 'Registrar en Firestore'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
