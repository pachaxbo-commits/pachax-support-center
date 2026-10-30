import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/models/auth';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  requireDevStaff?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  requireDevStaff,
}) => {
  const { currentUser, role, isDevStaff, isSuperAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-8 h-8 rounded-full border-4 border-brand-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requireDevStaff && !isDevStaff && !isSuperAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role) && !isSuperAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
};
