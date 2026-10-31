import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { AccessDeniedPage } from './pages/auth/AccessDeniedPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Client Portal Pages
import { ClientDashboardPage } from './pages/client/ClientDashboardPage';
import { ReportGeneralIncidentPage } from './pages/client/ReportGeneralIncidentPage';
import { ReportCriticalIncidentPage } from './pages/client/ReportCriticalIncidentPage';
import { FeatureRequestPage } from './pages/client/FeatureRequestPage';
import { RequestHistoryPage } from './pages/client/RequestHistoryPage';
import { ClientQuotesPage } from './pages/client/ClientQuotesPage';

// Admin Panel Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { IncidentsQueuePage } from './pages/admin/IncidentsQueuePage';
import { AiRepairCenterPage } from './pages/admin/AiRepairCenterPage';
import { QuotesManagementPage } from './pages/admin/QuotesManagementPage';
import { ClientsPage } from './pages/admin/ClientsPage';
import { ProjectsPage } from './pages/admin/ProjectsPage';
import { UsersManagementPage } from './pages/admin/UsersManagementPage';
import { IntegrationsSettingsPage } from './pages/admin/IntegrationsSettingsPage';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* Application Shell */}
            <Route element={<AppLayout />}>
              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/client/dashboard" replace />} />

              {/* Client Portal Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/client/dashboard" element={<ClientDashboardPage />} />
                <Route path="/client/report-general" element={<ReportGeneralIncidentPage />} />
                <Route path="/client/report-critical" element={<ReportCriticalIncidentPage />} />
                <Route path="/client/feature-request" element={<FeatureRequestPage />} />
                <Route path="/client/history" element={<RequestHistoryPage />} />
                <Route path="/client/quotes" element={<ClientQuotesPage />} />
              </Route>

              {/* Admin Panel Routes (Restricted to Developer Staff & Superadmin) */}
              <Route element={<ProtectedRoute requireDevStaff={true} />}>
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/incidents" element={<IncidentsQueuePage />} />
                <Route path="/admin/ai-repair" element={<AiRepairCenterPage />} />
                <Route path="/admin/quotes" element={<QuotesManagementPage />} />
                <Route path="/admin/clients" element={<ClientsPage />} />
                <Route path="/admin/projects" element={<ProjectsPage />} />
                <Route path="/admin/users" element={<UsersManagementPage />} />
                <Route path="/admin/integrations" element={<IntegrationsSettingsPage />} />
              </Route>

              {/* 404 Catch-All */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
