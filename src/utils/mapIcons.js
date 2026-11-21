import L from 'leaflet';

export const createHazardMarker = (severity, category) => {
  let bgColor = '#DC2626'; // Critical red
  let label = '!';

  if (severity === 'HIGH') {
    bgColor = '#D97706'; // Amber
  } else if (severity === 'MEDIUM' || severity === 'CAUTION') {
    bgColor = '#CA8A04'; // Caution yellow
    label = '⚠';
  } else if (severity === 'RESOLVED' || severity === 'RESOLVED_PENDING' || severity === 'LOW') {
    bgColor = '#16A34A'; // Green
    label = '✓';
  }

  const html = `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 26px; height: 26px; border-radius: 50%; background: #343234; border: 2px solid ${bgColor}; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-weight: bold; font-size: 13px;">
        ${label}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-hazard-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

export const createClusterMarker = (incidentCount) => {
  const html = `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 30px; height: 30px; border-radius: 50%; background: #153C65; border: 2px solid #5797DB; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #FFFFFF; font-weight: 700; font-size: 11px;">
        <span>${incidentCount}</span>
        <span style="font-size: 7px; text-transform: uppercase;">REPS</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-cluster-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

export const createTruckMarker = (truckId) => {
  const html = `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 28px; height: 28px; border-radius: 6px; background: #153C65; border: 2px solid #5797DB; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17]
  });
};
