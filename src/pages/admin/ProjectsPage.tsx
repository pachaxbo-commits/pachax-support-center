import React, { useState, useEffect } from 'react';
import { FolderKanban, GitBranch, Key, ShieldCheck, ExternalLink, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { Project } from '@/models/project';
import { ClientCompany } from '@/models/company';

export const ProjectsPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientCompany[]>([]);

  useEffect(() => {
    async function load() {
      const [p, c] = await Promise.all([api.getProjects(), api.getClients()]);
      setProjects(p);
      setClients(c);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Proyectos y Aplicaciones
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Vinculación con repositorios GitHub, tokens públicos de SDK y App Check.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((proj) => {
          const client = clients.find((c) => c.id === proj.clientCompanyId);
          return (
            <div
              key={proj.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block">{proj.code}</span>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {proj.name}
                  </h3>
                  <span className="text-xs text-brand-600 dark:text-brand-400 font-medium">
                    {client?.name || 'Cliente'}
                  </span>
                </div>

                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {proj.environment}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                {proj.description || 'Sin descripción.'}
              </p>

              {/* GitHub repo linkage */}
              {proj.repositoryUrl && (
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5 truncate">
                      <GitBranch className="w-3.5 h-3.5 text-brand-500" />
                      <span className="truncate">{proj.repositoryUrl.replace('https://github.com/', '')}</span>
                    </span>
                    <a
                      href={proj.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 dark:text-brand-400 hover:text-brand-500 shrink-0 ml-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* SDK Public Token */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-500" />
                  Public Token Handshake SDK
                </span>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 rounded-lg truncate select-all">
                  {proj.publicKey}
                </div>
              </div>

              {/* App Check & Tech stack */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  App Check Activo
                </span>
                <div className="flex gap-1">
                  {proj.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-mono"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
