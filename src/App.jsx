import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { CivicDataProvider, useCivicData } from './context/CivicDataContext';
import { Navbar } from './components/layout/Navbar';
import { CitizenLayout } from './components/layout/CitizenLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { CitizenOverviewPage } from './pages/citizen/CitizenOverviewPage';
import { LiveHazardMapPage } from './pages/citizen/LiveHazardMapPage';
import { ReportIssuePage } from './pages/citizen/ReportIssuePage';
import { MyReportsPage } from './pages/citizen/MyReportsPage';
import { SafeNavigationPage } from './pages/citizen/SafeNavigationPage';
import { AIBrainPage } from './pages/citizen/AIBrainPage';
import { RepairTrackingPage } from './pages/citizen/RepairTrackingPage';
import { AboutPage } from './pages/citizen/AboutPage';

import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { ComplaintManagementPage } from './pages/admin/ComplaintManagementPage';
import { HazardClustersPage } from './pages/admin/HazardClustersPage';
import { WorkOrdersPage } from './pages/admin/WorkOrdersPage';
import { CrewManagementPage } from './pages/admin/CrewManagementPage';
import { InfrastructureAnalyticsPage } from './pages/admin/InfrastructureAnalyticsPage';
import { CitizenVerificationPage } from './pages/admin/CitizenVerificationPage';

function ToastHUD() {
  const { toastMessage } = useCivicData();
  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[3000] civic-card-elevated p-3.5 rounded-xl border border-brand-blue-light text-xs font-mono text-white shadow-xl max-w-md flex items-center gap-2.5">
      <span className="w-2 h-2 rounded-full bg-brand-blue-light animate-ping shrink-0"></span>
      <span className="text-white">{toastMessage}</span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CivicDataProvider>
        <BrowserRouter>
          <div className="min-h-screen bg-brand-canvas text-white flex flex-col font-sans">
            <Navbar />
            <ToastHUD />

            <div className="flex-1">
              <Routes>
                {/* 1. Landing Page */}
                <Route path="/" element={<LandingPage />} />

                {/* 2. Citizen Portal with 8 Dedicated Pages */}
                <Route path="/citizen" element={<CitizenLayout />}>
                  <Route index element={<CitizenOverviewPage />} />
                  <Route path="map" element={<LiveHazardMapPage />} />
                  <Route path="report" element={<ReportIssuePage />} />
                  <Route path="my-reports" element={<MyReportsPage />} />
                  <Route path="navigation" element={<SafeNavigationPage />} />
                  <Route path="ai" element={<AIBrainPage />} />
                  <Route path="repair-tracking" element={<RepairTrackingPage />} />
                  <Route path="about" element={<AboutPage />} />
                </Route>

                {/* 3. Separate City Operations Admin Portal with 7 Dedicated Pages */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminOverviewPage />} />
                  <Route path="complaints" element={<ComplaintManagementPage />} />
                  <Route path="clusters" element={<HazardClustersPage />} />
                  <Route path="work-orders" element={<WorkOrdersPage />} />
                  <Route path="crews" element={<CrewManagementPage />} />
                  <Route path="analytics" element={<InfrastructureAnalyticsPage />} />
                  <Route path="verification" element={<CitizenVerificationPage />} />
                </Route>

                {/* Catch-all route */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </div>
        </BrowserRouter>
      </CivicDataProvider>
    </ThemeProvider>
  );
}
