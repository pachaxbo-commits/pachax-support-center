import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertTriangle,
  Flame,
  PlusCircle,
  History,
  FileCheck2,
  Cpu,
  Layers,
  Building,
  Users,
  Settings,
  ChevronRight,
  ShieldCheck,
  FolderKanban,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { isDevStaff, isSuperAdmin, role } = useAuth();

  const clientLinks = [
    {
      to: '/client/dashboard',
      label: 'Portal Cliente',
      icon: LayoutDashboard,
    },
    {
      to: '/client/report-general',
      label: 'Reportar Incidencias',
      icon: AlertTriangle,
      badge: 'Lote diario',
    },
    {
      to: '/client/report-critical',
      label: 'Incidencia Crítica (24/7)',
      icon: Flame,
      alert: true,
    },
    {
      to: '/client/feature-request',
      label: 'Solicitud de Cambios',
      icon: PlusCircle,
    },
    {
      to: '/client/history',
      label: 'Historial y Estados',
      icon: History,
    },
    {
      to: '/client/quotes',
      label: 'Aprobar Cotizaciones',
      icon: FileCheck2,
    },
  ];

  const adminLinks = [
    {
      to: '/admin/dashboard',
      label: 'Dashboard Admin',
      icon: LayoutDashboard,
    },
    {
      to: '/admin/incidents',
      label: 'Bandeja de Incidencias',
      icon: Layers,
    },
    {
      to: '/admin/ai-repair',
      label: 'Reparaciones con IA',
      icon: Cpu,
      highlight: true,
    },
    {
      to: '/admin/quotes',
      label: 'Gestor Cotizaciones',
      icon: FileCheck2,
    },
    {
      to: '/admin/clients',
      label: 'Empresas Clientes',
      icon: Building,
    },
    {
      to: '/admin/projects',
      label: 'Proyectos & Apps',
      icon: FolderKanban,
    },
    {
      to: '/admin/users',
      label: 'Usuarios & Permisos',
      icon: Users,
    },
    {
      to: '/admin/integrations',
      label: 'Integraciones & SDKs',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col pt-16 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-4rem)]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* CLIENT PORTAL SECTION */}
          <div>
            <div className="px-3 mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Portal de Cliente
              </span>
            </div>
            <nav className="space-y-1">
              {clientLinks.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition group',
                      isActive
                        ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )
                  }
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <item.icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition',
                        item.alert
                          ? 'text-rose-500 group-hover:scale-110'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-brand-500'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {item.badge}
                    </span>
                  )}
                  {item.alert && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* ADMIN PANEL SECTION (Visible if dev staff or superadmin) */}
          {(isDevStaff || isSuperAdmin) && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="px-3 mb-2 flex items-center justify-between">
                <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Panel Administrativo
                </span>
              </div>
              <nav className="space-y-1">
                {adminLinks.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center justify-between px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition group',
                        isActive
                          ? 'bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )
                    }
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <item.icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition',
                          item.highlight
                            ? 'text-purple-500 group-hover:scale-110'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-brand-500'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.highlight && (
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Footer info in sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span>Soporte PACHAX</span>
            <span className="font-mono text-[10px] text-emerald-500 font-semibold">v1.0.0</span>
          </div>
          <span className="text-[10px] text-slate-500 truncate">
            support.pachax.bo
          </span>
        </div>
      </aside>
    </>
  );
};
