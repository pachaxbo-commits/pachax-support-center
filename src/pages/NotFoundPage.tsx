import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <span className="text-6xl font-black text-brand-600 dark:text-brand-400">404</span>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white">
        Página No Encontrada
      </h1>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
        La ruta solicitada no existe o ha sido movida dentro de la estructura de soporte.
      </p>
      <Link
        to="/"
        className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow"
      >
        <Home className="w-4 h-4" />
        <span>Ir a Inicio</span>
      </Link>
    </div>
  );
};
