import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CivicDataProvider, useCivicData } from './context/CivicDataContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';

// Simplified Citizen Pages
import { HomePage } from './pages/HomePage';
import { ReportIssuePage } from './pages/ReportIssuePage';
import { LiveMapPage } from './pages/LiveMapPage';
import { MyReportsPage } from './pages/MyReportsPage';
import { RewardsPage } from './pages/RewardsPage';
import { SafeRoutesPage } from './pages/SafeRoutesPage';
import { ChatbotPage } from './pages/ChatbotPage';
import { LoginPage } from './pages/LoginPage';

// Simplified Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminRepairsPage } from './pages/admin/AdminRepairsPage';
import { AdminClustersPage } from './pages/admin/AdminClustersPage';
import { AdminContractorsPage } from './pages/admin/AdminContractorsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminActivityPage } from './pages/admin/AdminActivityPage';
import { ContractorJobsPage } from './pages/ContractorJobsPage';

// Admin pages require an admin account (the API enforces this too)
function RequireAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return isAdmin ? children : <Navigate to="/" replace />;
}

// Contractors (and admins, for support) can open the jobs page
function RequireContractor({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === 'contractor' || user.role === 'admin' ? children : <Navigate to="/" replace />;
}

function DataSourceBadge() {
  const { dataSource } = useCivicData();
  return <span>{dataSource === 'live' ? 'Live data from the CivicFix API' : 'Not connected: sign in (with the backend running) to see live reports'}</span>;
}

function ToastHUD() {
  const { toastMessage } = useCivicData();
  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[3000] civic-card-elevated p-3.5 rounded-xl border border-brand-accent text-xs font-mono text-brand-text shadow-xl max-w-md flex items-center gap-2.5">
      <span className="w-2 h-2 rounded-full bg-brand-accent animate-ping shrink-0"></span>
      <span>{toastMessage}</span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <CivicDataProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-brand-canvas text-brand-text flex flex-col font-sans transition-colors">
            <Navbar />
            <ToastHUD />

            <main className="flex-1">
              <Routes>
                {/* Citizen Portal (incl. Rewards) */}
                <Route path="/" element={<HomePage />} />
                <Route path="/report" element={<ReportIssuePage />} />
                <Route path="/map" element={<LiveMapPage />} />
                <Route path="/my-reports" element={<MyReportsPage />} />
                <Route path="/rewards" element={<RewardsPage />} />
                <Route path="/routes" element={<SafeRoutesPage />} />
                <Route path="/chatbot" element={<ChatbotPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* Compatibility redirects for /citizen/... */}
                <Route path="/citizen" element={<Navigate to="/" replace />} />
                <Route path="/citizen/report" element={<Navigate to="/report" replace />} />
                <Route path="/citizen/map" element={<Navigate to="/map" replace />} />
                <Route path="/citizen/my-reports" element={<Navigate to="/my-reports" replace />} />
                <Route path="/citizen/navigation" element={<Navigate to="/routes" replace />} />
                <Route path="/citizen/ai" element={<Navigate to="/chatbot" replace />} />
                <Route path="/citizen/repair-tracking" element={<Navigate to="/my-reports" replace />} />
                <Route path="/citizen/about" element={<Navigate to="/" replace />} />

                {/* Admin Portal */}
                <Route path="/admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
                <Route path="/admin/reports" element={<RequireAdmin><AdminReportsPage /></RequireAdmin>} />
                <Route path="/admin/repairs" element={<RequireAdmin><AdminRepairsPage /></RequireAdmin>} />
                <Route path="/admin/clusters" element={<RequireAdmin><AdminClustersPage /></RequireAdmin>} />
                <Route path="/admin/contractors" element={<RequireAdmin><AdminContractorsPage /></RequireAdmin>} />
                <Route path="/admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
                <Route path="/admin/activity" element={<RequireAdmin><AdminActivityPage /></RequireAdmin>} />

                {/* Contractor portal */}
                <Route path="/jobs" element={<RequireContractor><ContractorJobsPage /></RequireContractor>} />

                {/* Compatibility redirects for /admin/... */}
                <Route path="/admin/overview" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/complaints" element={<Navigate to="/admin/reports" replace />} />
                <Route path="/admin/work-orders" element={<Navigate to="/admin/repairs" replace />} />
                <Route path="/admin/crews" element={<Navigate to="/admin/repairs" replace />} />
                <Route path="/admin/analytics" element={<Navigate to="/admin" replace />} />
                <Route path="/admin/verification" element={<Navigate to="/admin/repairs" replace />} />

                {/* Catch-all redirect */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Clean, Minimal Footer with Contact Section */}
            <Footer status={<DataSourceBadge />} />
          </div>
        </BrowserRouter>
      </CivicDataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
