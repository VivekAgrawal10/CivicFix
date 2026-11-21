import L from 'leaflet';

export const createHazardMarker = (severity, category) => {
  let bgColor = '#EF4444'; // Critical
  let glowColor = 'rgba(239, 68, 68, 0.4)';
  let label = '!';

  if (severity === 'HIGH') {
    bgColor = '#F97316';
    glowColor = 'rgba(249, 115, 22, 0.4)';
  } else if (severity === 'MEDIUM' || severity === 'CAUTION') {
    bgColor = '#EAB308';
    glowColor = 'rgba(234, 179, 8, 0.4)';
    label = '⚠';
  } else if (severity === 'RESOLVED_PENDING' || severity === 'LOW') {
    bgColor = '#10B981';
    glowColor = 'rgba(16, 185, 129, 0.4)';
    label = '✓';
  }

  const html = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: ${glowColor}; animation: ping-slow 2s infinite;"></div>
      <div style="position: relative; width: 28px; height: 28px; border-radius: 50%; background: #0B101D; border: 2px solid ${bgColor}; box-shadow: 0 0 10px ${glowColor}; display: flex; align-items: center; justify-content: center; color: ${bgColor}; font-weight: bold; font-size: 13px;">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hazard-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18]
  });
};

export const createClusterMarker = (incidentCount) => {
  const html = `
    <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background: rgba(139, 92, 246, 0.35); animation: ping-slow 2.4s infinite;"></div>
      <div style="position: relative; width: 32px; height: 32px; border-radius: 50%; background: #131127; border: 2px solid #8B5CF6; box-shadow: 0 0 15px rgba(139, 92, 246, 0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #DDD6FE; font-weight: 700; font-size: 11px;">
        <span>${incidentCount}</span>
        <span style="font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px;">REPS</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-cluster-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

export const createTruckMarker = (truckId) => {
  const html = `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="position: relative; width: 30px; height: 30px; border-radius: 8px; background: #082F49; border: 2px solid #00F2FE; box-shadow: 0 0 12px rgba(0, 242, 254, 0.5); display: flex; align-items: center; justify-content: center; color: #00F2FE; font-size: 14px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-truck-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};
