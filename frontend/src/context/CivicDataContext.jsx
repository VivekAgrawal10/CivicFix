import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, toIncident, CATEGORY_TO_API, STATUS_TO_API } from '../api/client';
import { useAuth } from './AuthContext';
import { 
  INITIAL_CLUSTERS, 
  INITIAL_ROADS, 
  NAVIGATION_PRESETS,
  LIVE_WEATHER_FEED
} from '../data/mockData';

const CivicDataContext = createContext();

export function CivicDataProvider({ children }) {
  const { user, refreshUser } = useAuth();
  // 'live' = reports loaded from the Express API; 'demo' = signed out or the API is unreachable (no reports are shown)
  const [dataSource, setDataSource] = useState('demo');
  const [incidents, setIncidents] = useState([]);   // every report (live map, admin screens)
  const [myReports, setMyReports] = useState([]);   // only the signed-in citizen's reports
  const [lastUpdated, setLastUpdated] = useState(null);
  const [clusters, setClusters] = useState(INITIAL_CLUSTERS);
  const [roads, setRoads] = useState(INITIAL_ROADS);
  const [weatherAlertActive, setWeatherAlertActive] = useState(false);
  const [activeScenario, setActiveScenario] = useState('standard');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const refreshReports = useCallback(async () => {
    try {
      const [all, mine] = await Promise.all([api.listReports(), api.myReports()]);
      setIncidents((all.data || []).map(toIncident));
      setMyReports((mine.data || []).map(toIncident));
      setLastUpdated(new Date());
      setDataSource('live');
    } catch {
      setDataSource('demo');
    }
  }, []);

  // Load live reports once signed in, then poll every 15 s so the map and My Reports stay current
  const userId = user && user._id;
  useEffect(() => {
    if (!userId) { setIncidents([]); setMyReports([]); setLastUpdated(null); setDataSource('demo'); return undefined; }
    refreshReports();
    const t = setInterval(refreshReports, 15000);
    return () => clearInterval(t);
  }, [userId, refreshReports]);

  // Pre-check a photo with the AI service (no report is created)
  const precheckImage = (file) => api.precheckImage(file).then((r) => r.data);

  // Submit a report: upload the photo, then create the report (the server re-runs the AI check).
  // Throws ApiError; code 'NON_CIVIC_IMAGE' means the photo was rejected.
  const submitReport = async ({ category, description, locationName, lat, lng, file, priorityZone }) => {
    const urls = file ? (await api.uploadImages([file])).urls : [];
    const label = category;
    const res = await api.createReport({
      title: `${label} reported at ${locationName.split('-')[0].trim() || locationName}`.slice(0, 200),
      description,
      category: CATEGORY_TO_API[category] || 'other',
      location: { type: 'Point', coordinates: [lng, lat] },
      address: locationName,
      images: urls,
      ...(priorityZone ? { priorityZone } : {}),
    });
    await refreshReports();
    refreshUser(); // pending reward / tier may have changed
    showToast('Report submitted.');
    return res;
  };

  const addIncident = (newIncident) => {
    setIncidents(prev => [newIncident, ...prev]);
    showToast(`Report ${newIncident.id} registered and processed.`);
  };

  // Admin: delete a complaint (server-side when connected, local-only for demo data)
  const deleteIncident = async (id) => {
    try {
      if (!id) throw new Error('Complaint ID is required for deletion.');
      if (dataSource === 'live') {
        await api.deleteReport(id);
        await refreshReports();
      } else {
        setIncidents(prev => prev.filter(item => item.id !== id));
      }
      showToast(`Complaint ${id} was deleted successfully.`);
      return { success: true };
    } catch (err) {
      showToast(`Failed to delete complaint: ${err.message}`);
      return { success: false, error: err.message };
    }
  };

  const updateIncidentStatus = async (id, newStatus) => {
    if (dataSource === 'live') {
      try {
        await api.setReportStatus(id, STATUS_TO_API[newStatus] || 'pending');
        await refreshReports();
        showToast(`Report status updated to ${newStatus}.`);
      } catch (e) {
        showToast(e.message);
      }
      return;
    }
    setIncidents(prev => prev.map(item => (item.id === id ? { ...item, status: newStatus } : item)));
    showToast(`Incident ${id} status updated to ${newStatus}.`);
  };

  const updateClusterStatus = (clusterId, nextStatus) => {
    setClusters(prev => prev.map(c => {
      if (c.id === clusterId) {
        return {
          ...c,
          status: nextStatus,
          assignedTeam: {
            ...c.assignedTeam,
            status: nextStatus === 'REPAIR_IN_PROGRESS' ? 'ON_SITE_ACTIVE' : 'COMPLETED'
          }
        };
      }
      return c;
    }));
    showToast(`Work Order ${clusterId} updated to ${nextStatus}.`);
  };

  const verifyIncident = async (id) => {
    if (dataSource === 'live') {
      try {
        await api.confirmReport(id);
        await refreshReports();
        refreshUser(); // +15 CivicCreds for confirming
        showToast('Thanks for confirming. Your confirmation is recorded.');
      } catch (e) {
        showToast(e.message);
      }
      return;
    }
    setIncidents(prev => prev.map(item => {
      if (item.id === id) {
        const currentUpvotes = (item.citizenConfirmations?.upvotes || 0) + 1;
        const quorumRequired = item.citizenConfirmations?.quorumRequired || 15;
        const isResolved = currentUpvotes >= quorumRequired;
        return {
          ...item,
          status: isResolved ? 'RESOLVED' : 'VERIFYING',
          citizenConfirmations: {
            ...item.citizenConfirmations,
            upvotes: currentUpvotes,
            percentageApproved: Math.min(100, Math.round((currentUpvotes / quorumRequired) * 100))
          }
        };
      }
      return item;
    }));
    showToast(`Citizen confirmation recorded for ${id}.`);
  };

  const triggerScenario = (scenario) => {
    setActiveScenario(scenario);
    if (scenario === 'reroute') {
      showToast('Scenario: Hospital Corridor >3m Crater active with Safe Alternate Reroute.');
    } else if (scenario === 'rural') {
      showToast('Scenario: Low-Density Village Single-Citizen Authenticated Protocol.');
    } else if (scenario === 'chronic') {
      setWeatherAlertActive(true);
      showToast('Scenario: Monsoon rainstorm triggered (42mm/hr). Chronic drainage flagged.');
    } else if (scenario === 'cluster') {
      showToast('Scenario: 4 Scattered complaints unified into Work Order #CL-091.');
    }
  };

  return (
    <CivicDataContext.Provider value={{
      incidents,
      myReports,
      lastUpdated,
      clusters,
      roads,
      weatherAlertActive,
      setWeatherAlertActive,
      activeScenario,
      triggerScenario,
      addIncident,
      dataSource,
      refreshReports,
      precheckImage,
      submitReport,
      deleteIncident,
      updateIncidentStatus,
      updateClusterStatus,
      verifyIncident,
      navigationPresets: NAVIGATION_PRESETS,
      weatherFeed: LIVE_WEATHER_FEED,
      toastMessage,
      showToast
    }}>
      {children}
    </CivicDataContext.Provider>
  );
}

export function useCivicData() {
  const context = useContext(CivicDataContext);
  if (!context) {
    throw new Error('useCivicData must be used within a CivicDataProvider');
  }
  return context;
}
