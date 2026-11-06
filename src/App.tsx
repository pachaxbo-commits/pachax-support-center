import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { AccessDeniedPage } from '@/pages/auth/AccessDeniedPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Client Pages
import { ClientDashboardPage } from '@/pages/client/ClientDashboardPage';
import { ReportGeneralIncidentPage } from '@/pages/client/ReportGeneralIncidentPage';
import { ReportCriticalIncidentPage } from '@/pages/client/ReportCriticalIncidentPage';
import { FeatureRequestPage } from '@/pages/client/FeatureRequestPage';
import { RequestHistoryPage } from '@/pages/client/RequestHistoryPage';
import { ClientQuotesPage } from '@/pages/client/ClientQuotesPage';

// Admin / Dev Pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { ClientsPage } from '@/pages/admin/ClientsPage';
import { ProjectsPage } from '@/pages/admin/ProjectsPage';
import { IncidentsQueuePage } from '@/pages/admin/IncidentsQueuePage';
import { QuotesManagementPage } from '@/pages/admin/QuotesManagementPage';
import { AiRepairCenterPage } from '@/pages/admin/AiRepairCenterPage';
import { UsersManagementPage } from '@/pages/admin/UsersManagementPage';
import { IntegrationsSettingsPage } from '@/pages/admin/IntegrationsSettingsPage';

const HomeRedirect: React.FC = () => {
  const { isDevStaff } = useAuth();
  if (isDevStaff) {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/client/dashboard" replace />;
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Application Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/access-denied" element={<AccessDeniedPage />} />

                {/* Client Portal Routes */}
                <Route path="/client/dashboard" element={<ClientDashboardPage />} />
                <Route path="/client/report-general" element={<ReportGeneralIncidentPage />} />
                <Route path="/client/report-critical" element={<ReportCriticalIncidentPage />} />
                <Route path="/client/request-feature" element={<FeatureRequestPage />} />
                <Route path="/client/feature-request" element={<FeatureRequestPage />} />
                <Route path="/client/history" element={<RequestHistoryPage />} />
                <Route path="/client/quotes" element={<ClientQuotesPage />} />

                {/* Admin & Developer Company Routes (Protected by Role) */}
                <Route
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'superadmin',
                        'dev_owner',
                        'dev_admin',
                        'dev_engineer',
                        'dev_commercial',
                      ]}
                    />
                  }
                >
                  <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                  <Route path="/admin/clients" element={<ClientsPage />} />
                  <Route path="/admin/projects" element={<ProjectsPage />} />
                  <Route path="/admin/incidents" element={<IncidentsQueuePage />} />
                  <Route path="/admin/quotes" element={<QuotesManagementPage />} />
                  <Route path="/admin/ai-repair" element={<AiRepairCenterPage />} />
                  <Route path="/admin/users" element={<UsersManagementPage />} />
                  <Route path="/admin/integrations" element={<IntegrationsSettingsPage />} />
                </Route>

                {/* 404 Not Found */}
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
