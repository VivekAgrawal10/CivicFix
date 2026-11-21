import React, { createContext, useContext, useState } from 'react';
import { 
  INITIAL_INCIDENTS, 
  INITIAL_CLUSTERS, 
  INITIAL_ROADS, 
  NAVIGATION_PRESETS,
  LIVE_WEATHER_FEED
} from '../data/mockData';

const CivicDataContext = createContext();

export function CivicDataProvider({ children }) {
  const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
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

  const addIncident = (newIncident) => {
    setIncidents(prev => [newIncident, ...prev]);
    showToast(`Report ${newIncident.id} registered and processed.`);
  };

  const updateIncidentStatus = (id, newStatus) => {
    setIncidents(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, status: newStatus };
      }
      return item;
    }));
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

  const verifyIncident = (id) => {
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
      clusters,
      roads,
      weatherAlertActive,
      setWeatherAlertActive,
      activeScenario,
      triggerScenario,
      addIncident,
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
