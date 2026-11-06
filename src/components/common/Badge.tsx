import React from 'react';
import { cn } from '@/lib/utils';
import { IncidentStatus } from '@/models/incident';
import { FeatureRequestStatus } from '@/models/featureRequest';
import { QuoteStatus } from '@/models/quote';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const variantStyles = {
    default: 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border tracking-wide transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};

export const IncidentStatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => {
  switch (status) {
    case 'received':
      return <Badge variant="info">Recibido</Badge>;
    case 'triaged':
      return <Badge variant="purple">Clasificado</Badge>;
    case 'in_progress':
      return <Badge variant="warning">En Progreso</Badge>;
    case 'review':
      return <Badge variant="info">En Revisión</Badge>;
    case 'fixed':
      return <Badge variant="success">Corregido</Badge>;
    case 'verified':
      return <Badge variant="success">Verificado</Badge>;
    case 'closed':
      return <Badge variant="neutral">Cerrado</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
};

export const FeatureStatusBadge: React.FC<{ status: FeatureRequestStatus }> = ({ status }) => {
  switch (status) {
    case 'submitted':
      return <Badge variant="info">Enviado</Badge>;
    case 'evaluating':
      return <Badge variant="warning">En Evaluación</Badge>;
    case 'quoted':
      return <Badge variant="purple">Cotizado</Badge>;
    case 'approved':
      return <Badge variant="success">Aprobado</Badge>;
    case 'rejected':
      return <Badge variant="danger">Rechazado</Badge>;
    case 'in_development':
      return <Badge variant="warning">En Desarrollo</Badge>;
    case 'deployed':
      return <Badge variant="success">Desplegado</Badge>;
    case 'completed':
      return <Badge variant="neutral">Concluido</Badge>;
  }
};

export const QuoteStatusBadge: React.FC<{ status: QuoteStatus }> = ({ status }) => {
  switch (status) {
    case 'draft':
      return <Badge variant="neutral">Borrador</Badge>;
    case 'sent':
      return <Badge variant="warning">Pendiente Aprobación</Badge>;
    case 'approved':
      return <Badge variant="success">Aprobada</Badge>;
    case 'rejected':
      return <Badge variant="danger">Rechazada</Badge>;
    case 'expired':
      return <Badge variant="neutral">Expirada</Badge>;
  }
};
