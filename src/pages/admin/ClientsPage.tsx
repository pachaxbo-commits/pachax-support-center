import React, { useState, useEffect } from 'react';
import { Building, Plus, Mail, Phone, Shield, Search, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { ClientCompany } from '@/models/company';
import { Project } from '@/models/project';
import { formatDate } from '@/lib/utils';

export const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New client form
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [tier, setTier] = useState<'starter' | 'business' | 'enterprise'>('business');

  useEffect(() => {
    async function load() {
      const [c, p] = await Promise.all([api.getClients(), api.getProjects()]);
      setClients(c);
      setProjects(p);
    }
    load();
  }, []);

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    const newClient: ClientCompany = {
      id: `client-${Date.now().toString(36)}`,
      developerCompanyId: 'dev-pachax-core',
      name,
      taxId,
      contactEmail,
      contactPhone,
      billingTier: tier,
      status: 'active',
      allowedDomains: [contactEmail.split('@')[1] || 'empresa.bo'],
      maxDailyGeneralReports: 1,
      createdAt: new Date().toISOString(),
    };
    setClients([...clients, newClient]);
    setIsModalOpen(false);
    setName('');
    setTaxId('');
    setContactEmail('');
    setContactPhone('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Empresas Clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Administración multiempresa, asignación de proyectos y políticas de SLA.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Empresa Cliente</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clients.map((c) => {
          const clientProjs = projects.filter((p) => p.clientCompanyId === c.id);
          return (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono text-slate-400">ID: {c.id}</span>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {c.name}
                  </h2>
                  <span className="text-xs text-slate-500">{c.taxId || 'Sin NIT registrado'}</span>
                </div>

                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                  Plan {c.billingTier}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{c.contactEmail}</span>
                </div>
                {c.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{c.contactPhone}</span>
                  </div>
                )}
              </div>

              {/* Projects count */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {clientProjs.length} aplicación(es) conectada(s)
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Límite diario: 1 reporte general/día
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateClient}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Nueva Empresa Cliente
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Razón Social / Nombre Comercial *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Distribuidora Santa Cruz S.R.L."
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  NIT / Tax ID
                </label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="NIT 1029384756"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Plan de Soporte
                </label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
                >
                  <option value="starter">Starter</option>
                  <option value="business">Business</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correo de Contacto Administrativo *
              </label>
              <input
                type="email"
                required
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="gerencia@empresa.com"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 shadow"
              >
                Guardar Empresa
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
