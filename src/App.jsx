import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { CivicHero } from './components/CivicHero';
import { CivicMap } from './components/CivicMap';
import { HazardNavigation } from './components/HazardNavigation';
import { RoadHealthAndWeather } from './components/RoadHealthAndWeather';
import { CommunityVerification } from './components/CommunityVerification';
import { AdminCommandCenter } from './components/AdminCommandCenter';
import { ReportModal } from './components/ReportModal';
import { 
  INITIAL_INCIDENTS, 
  INITIAL_CLUSTERS, 
  NAVIGATION_PRESETS,
  INITIAL_ROADS 
} from './data/mockData';
import { 
  Navigation, 
  Activity, 
  CheckCircle2, 
  Layers, 
  Sparkles, 
  ShieldAlert,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('citizen'); // 'citizen' or 'operations'
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
  const [clusters, setClusters] = useState(INITIAL_CLUSTERS);
  const [selectedIncident, setSelectedIncident] = useState(INITIAL_INCIDENTS[0]);
  const [selectedNavigationRoute, setSelectedNavigationRoute] = useState(NAVIGATION_PRESETS[0]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeScenario, setActiveScenario] = useState('reroute');
  const [weatherAlertActive, setWeatherAlertActive] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Scenario Simulator Handler
  const handleTriggerScenario = (scenario) => {
    setActiveScenario(scenario);

    if (scenario === 'reroute') {
      setCurrentTab('citizen');
      setSelectedNavigationRoute(NAVIGATION_PRESETS[0]);
      setSelectedIncident(INITIAL_INCIDENTS[0]);
      showToast('Scenario 01: Severe 3.4m Pothole near Hospital triggers Dynamic Commuter Reroute!');
    } else if (scenario === 'rural') {
      setIsReportModalOpen(true);
      showToast('Scenario 02: Kishanpur Village Single-Citizen AI Validation Protocol Launched.');
    } else if (scenario === 'chronic') {
      setCurrentTab('citizen');
      setWeatherAlertActive(true);
      showToast('Scenario 03: Monsoon precipitation triggered. Road B (38/100) flagged with AI Drainage Suggestion.');
      const el = document.getElementById('road-health-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (scenario === 'cluster') {
      setCurrentTab('operations');
      showToast('Scenario 04: Switched to City Operations Hub. 4 scattered complaints unified into Work Order #CL-091.');
    }
  };

  const handleAddNewReport = (newIncident) => {
    setIncidents(prev => [newIncident, ...prev]);
    showToast(`New Incident ${newIncident.id} registered and verified via AI Vision!`);
  };

  const handleVerifyFix = (incidentId) => {
    setIncidents(prev => prev.map(inc => {
      if (inc.id === incidentId) {
        return {
          ...inc,
          status: 'RESOLVED',
          aiData: { ...inc.aiData, severity: 'LOW' }
        };
      }
      return inc;
    }));
    showToast(`Incident ${incidentId} officially confirmed & closed by citizen quorum! Road status: SAFE.`);
  };

  const handleNotifyContractor = (suggestion) => {
    showToast(`Root Cause Advisory sent to ${suggestion?.targetCompany}!`);
  };

  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      
      {/* Toast Notification HUD */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[3000] glass-panel-elevated p-4 rounded-xl border border-cyan-400 text-xs font-mono text-cyan-300 shadow-glow-cyan max-w-md animate-fade-in flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0"></span>
          <div className="flex-1">{toastMessage}</div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        activeScenario={activeScenario}
        setActiveScenario={handleTriggerScenario}
        weatherAlertActive={weatherAlertActive}
      />

      {/* Hero Section with Live Scenario Demonstrator */}
      <CivicHero
        onTriggerScenario={handleTriggerScenario}
        activeScenario={activeScenario}
        onOpenReportModal={() => setIsReportModalOpen(true)}
        onNavigateTab={setCurrentTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-10">
        
        {/* VIEW 1: CITIZEN EXPERIENCE */}
        {currentTab === 'citizen' && (
          <div className="space-y-10">
            
            {/* Section 1: Live Interactive Smart City GIS Map */}
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-cyan-400" />
                    <span>Live Civic Hazard & Commuter Impact Map</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Showing real-time incident pins, hospital safety zones, and active reroute corridors.
                  </p>
                </div>
                <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Interactive Map: Click any marker to view AI measurements</span>
                </div>
              </div>

              <CivicMap
                incidents={incidents}
                clusters={clusters}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                navigationRoute={selectedNavigationRoute}
                showReroute={true}
                weatherAlertActive={weatherAlertActive}
              />
            </section>

            {/* Section 2: Hazard-Aware Navigation Engine (Slide 04) */}
            <section id="navigation-section">
              <HazardNavigation
                onSelectRoute={(route) => setSelectedNavigationRoute(route)}
                selectedPresetId={selectedNavigationRoute?.id}
              />
            </section>

            {/* Section 3: Road Health Scorecard & Chronic AI Drainage Diagnostics */}
            <section id="road-health-section">
              <RoadHealthAndWeather
                weatherAlertActive={weatherAlertActive}
                setWeatherAlertActive={setWeatherAlertActive}
                onNotifyContractor={handleNotifyContractor}
              />
            </section>

            {/* Section 4: Closed-Loop Trust & Citizen Verification (Slide 03 Stage 6) */}
            <section id="verification-section">
              <CommunityVerification
                incident={incidents.find(i => i.status === 'VERIFYING') || incidents[0]}
                onVerifyFix={handleVerifyFix}
              />
            </section>

          </div>
        )}

        {/* VIEW 2: CITY OPERATIONS & SMART CLUSTERING COMMAND CENTER (Slide 05) */}
        {currentTab === 'operations' && (
          <div className="space-y-10">
            {/* Live Map for Dispatch Unit */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-400" />
                    <span>Municipal GIS & Crew Deployment Grid</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Tracking assigned contractor trucks, multi-incident clusters, and repair status.
                  </p>
                </div>
              </div>

              <CivicMap
                incidents={incidents}
                clusters={clusters}
                selectedIncident={selectedIncident}
                onSelectIncident={(inc) => setSelectedIncident(inc)}
                navigationRoute={null}
                showReroute={false}
                weatherAlertActive={weatherAlertActive}
              />
            </section>

            {/* Admin Clustering & Dispatch Work Orders */}
            <section>
              <AdminCommandCenter
                clusters={clusters}
                onUpdateClusterStatus={(clusterId) => {
                  showToast(`Work Order ${clusterId} stage advanced. Notifications sent to repair crew.`);
                }}
              />
            </section>
          </div>
        )}

      </main>

      {/* Futuristic CivicFix Footer */}
      <footer className="border-t border-white/10 bg-[#05080E] py-8 text-xs font-mono text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-white font-bold tracking-wider">CIVICFIX</span>
            <span className="text-slate-600">|</span>
            <span>BUILT BY TEAM CYBERNAUTS</span>
            <span className="text-slate-600">|</span>
            <span className="text-cyan-400">SATHACK @ THAPAR UNIVERSITY</span>
          </div>

          <div className="flex items-center gap-6 text-slate-500">
            <span>React.js • Tailwind • Leaflet • OpenCV • scikit-learn</span>
            <span>Closed-Loop Civic Intelligence</span>
          </div>
        </div>
      </footer>

      {/* Interactive Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onSubmitReport={handleAddNewReport}
      />

    </div>
  );
}
