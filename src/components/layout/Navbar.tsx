import React from 'react';
import { Menu, X, ShieldAlert, Sparkles, Building2, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ThemeToggle } from '@/components/common/ThemeToggle';
import { RoleSelectorPill } from '@/components/common/RoleSelectorPill';
import { Link } from 'react-router-dom';

interface NavbarProps {
  isMobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ isMobileMenuOpen, onToggleMobileMenu }) => {
  const { currentUser, isDemoMode } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleMobileMenu}
              type="button"
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Abrir menú de navegación"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-slate-800 dark:text-slate-100" />}
            </button>

            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20 group-hover:scale-105 transition">
                <svg className="w-5 h-5" viewBox="0 0 100 100" fill="none">
                  <path d="M25 75L50 25L75 75L50 60L25 75Z" fill="white" />
                  <circle cx="50" cy="48" r="8" fill="#bae0fd" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white leading-none">
                  PACHAX <span className="text-brand-600 dark:text-brand-400">Support</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-0.5">
                  Center
                </span>
              </div>
            </Link>

            {isDemoMode && (
              <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="w-3 h-3" />
                DEMO / SANDBOX
              </span>
            )}
          </div>

          {/* Right: Controls & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            <RoleSelectorPill />
            <ThemeToggle />

            {/* User display */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-xs border border-slate-200 dark:border-slate-700">
                {currentUser?.displayName?.[0] || 'U'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {currentUser?.displayName || 'Usuario'}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                  {currentUser?.email}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
