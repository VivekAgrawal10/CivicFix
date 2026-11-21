// Initial Mock Data and State for CivicFix Platform
// Tailored for SATHACK / THAPAR Hackathon presentation

export const INITIAL_ROADS = [
  {
    id: 'road-b',
    name: 'Sector 14 - Medical College Link Road',
    code: 'SEC14-MCL',
    healthScore: 38,
    status: 'CRITICAL',
    potholesPerMonth: 3.4,
    drainageIssuesPerMonth: 2.1,
    waterloggingProne: true,
    nearHospital: true,
    nearSchool: true,
    busyRoute: true,
    trafficVolume: 'High (32,000 vehicles/day)',
    history: [
      { date: '2026-10-12', type: 'Waterlogging', note: '2.5 ft standing water post 40mm shower' },
      { date: '2026-10-28', type: 'Pothole Patch', note: 'Surface cold asphalt applied by municipal gang' },
      { date: '2026-11-04', type: 'Drainage Overflow', note: 'Storm drain backflow at Culvert #12' },
      { date: '2026-11-18', type: 'Severe Cave-in', note: 'Sub-base washout resulting in 3.4m pothole' }
    ],
    aiSuggestion: {
      title: 'Chronic Sub-surface Drainage Failure Detected',
      severity: 'Critical Intervention Recommended',
      confidence: 96.4,
      analysis: 'This corridor has suffered 4 waterlogging events and 3 pothole washouts in 60 days despite 2 surface patches. Geothermal and acoustic acoustic telemetry indicates a continuous stormwater culvert gradient reversal at Culvert #12.',
      recommendation: 'Halt recurrent surface asphalt patching. Issue urgent municipal work order to re-grade 140m stormwater conduit and install reinforced precast box culvert with silt trap.',
      targetCompany: 'Apex Urban Infrastructure & Drainage Corp.'
    }
  },
  {
    id: 'road-ring',
    name: 'North Ring Bypass Corridor',
    code: 'RNG-BYPASS',
    healthScore: 84,
    status: 'GOOD',
    potholesPerMonth: 0.4,
    drainageIssuesPerMonth: 0.2,
    waterloggingProne: false,
    nearHospital: false,
    nearSchool: false,
    busyRoute: true,
    trafficVolume: 'Very High (54,000 vehicles/day)',
    history: [
      { date: '2026-08-15', type: 'Resurfacing', note: 'Bituminous overlay completed with 5-year warranty' }
    ],
    aiSuggestion: null
  },
  {
    id: 'road-village',
    name: 'Kishanpur Rural Access Way',
    code: 'KSH-RUR-02',
    healthScore: 52,
    status: 'MODERATE',
    potholesPerMonth: 1.2,
    drainageIssuesPerMonth: 0.8,
    waterloggingProne: true,
    isRuralLowDensity: true,
    nearHospital: false,
    nearSchool: true,
    busyRoute: false,
    trafficVolume: 'Low (1,400 vehicles/day)',
    history: [
      { date: '2026-09-02', type: 'Shoulder Erosion', note: 'Unpaved embankment erosion after heavy runoff' }
    ],
    aiSuggestion: {
      title: 'Low-Density Rural Access Route',
      severity: 'Standard Community Maintenance',
      confidence: 91.2,
      analysis: 'Single citizen report validated via AI image authenticity and telemetry. Low-density locality threshold enabled.',
      recommendation: 'Deploy mobile asphalt repair team on scheduled rural rotation with gravel shoulder reinforcement.',
      targetCompany: 'District Rural Works Department'
    }
  },
  {
    id: 'road-thapar',
    name: 'University Boulevard (Thapar Campus East)',
    code: 'THP-BLVD',
    healthScore: 61,
    status: 'CAUTION',
    potholesPerMonth: 1.8,
    drainageIssuesPerMonth: 1.1,
    waterloggingProne: true,
    nearHospital: false,
    nearSchool: true,
    busyRoute: true,
    trafficVolume: 'High (26,000 vehicles/day)',
    history: [
      { date: '2026-10-05', type: 'Pothole', note: '1.2m pothole repaired near Gate 2' },
      { date: '2026-11-10', type: 'Waterlogging', note: 'Localized water stagnation during monsoon burst' }
    ],
    aiSuggestion: {
      title: 'Drain Infiltration from Campus Greenbelt',
      severity: 'Medium Advisory',
      confidence: 88.5,
      analysis: 'Water runoff from elevated athletic grounds exceeds storm curb capacity during sustained rainfall.',
      recommendation: 'Add auxiliary slotted curb inlets along 80m eastern boundary.',
      targetCompany: 'Municipal Road Maintenance 04'
    }
  }
];

export const INITIAL_INCIDENTS = [
  {
    id: 'INC-1041',
    category: 'Pothole',
    title: 'Massive Pothole & Sub-base Cave-in',
    description: 'Deep road crater in left and center lane. Vehicles swerving dangerously near St. Jude Hospital crossing.',
    lat: 30.3532,
    lng: 76.3685,
    roadId: 'road-b',
    roadName: 'Sector 14 - Medical College Link Road',
    locality: 'Sector 14 Corridor',
    isRural: false,
    reportedAt: '12 mins ago',
    timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
    reporter: 'Amitabh S. (Citizen App)',
    reporterCount: 3,
    status: 'DISPATCHED', // REPORTED, DETECTED, CLUSTERED, DISPATCHED, REPAIRING, VERIFYING, RESOLVED
    clusterId: 'CL-091',
    aiData: {
      detectedType: 'Severe Road Crater / Pothole',
      confidence: 98.7,
      estimatedDiameterMeters: 3.4, // > 3m triggers severe category
      depthCm: 18,
      severity: 'CRITICAL',
      priorityRank: 1,
      proximityFlags: [
        'Within 140m of St. Jude Multi-specialty Hospital',
        'Within 220m of DAV Public Senior Secondary School',
        'Designated Emergency Cardiac Ambulance Corridor'
      ],
      rerouteTriggered: true,
      visualSimilarityMatched: true
    },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    verificationProofUrl: null
  },
  {
    id: 'INC-1042',
    category: 'Waterlogging',
    title: 'Severe Water Stagnation & Overflow',
    description: 'Water standing 1.5 ft deep across both lanes. Two motorbikes broken down.',
    lat: 30.3546,
    lng: 76.3698,
    roadId: 'road-b',
    roadName: 'Sector 14 - Medical College Link Road',
    locality: 'Sector 14 Corridor',
    isRural: false,
    reportedAt: '25 mins ago',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    reporter: 'Pooja V.',
    reporterCount: 4,
    status: 'DISPATCHED',
    clusterId: 'CL-091',
    aiData: {
      detectedType: 'Deep Waterlogging & Drainage Blockage',
      confidence: 96.2,
      estimatedAreaSqMeters: 45,
      waterDepthCm: 32,
      severity: 'HIGH',
      priorityRank: 2,
      proximityFlags: [
        'Within 180m of St. Jude Hospital',
        'High Traffic Peak Hour Congestion'
      ],
      rerouteTriggered: true,
      visualSimilarityMatched: true
    },
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80',
    verificationProofUrl: null
  },
  {
    id: 'INC-1043',
    category: 'Broken Drain',
    title: 'Shattered Heavy Storm Drain Grate',
    description: 'Cast iron drain lid broken open into road shoulder. Severe hazard for cyclists and pedestrians.',
    lat: 30.3521,
    lng: 76.3672,
    roadId: 'road-b',
    roadName: 'Sector 14 - Medical College Link Road',
    locality: 'Sector 14 Corridor',
    isRural: false,
    reportedAt: '40 mins ago',
    timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
    reporter: 'Ravi Kumar',
    reporterCount: 2,
    status: 'DISPATCHED',
    clusterId: 'CL-091',
    aiData: {
      detectedType: 'Open / Broken Storm Grate',
      confidence: 97.4,
      estimatedDiameterMeters: 1.2,
      severity: 'HIGH',
      priorityRank: 3,
      proximityFlags: ['School Pedestrian Walkway Zone'],
      rerouteTriggered: false,
      visualSimilarityMatched: true
    },
    imageUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?auto=format&fit=crop&w=800&q=80',
    verificationProofUrl: null
  },
  {
    id: 'INC-1088',
    category: 'Pothole',
    title: 'Rural Culvert Approach Pothole',
    description: 'Deep road hole on single-lane village connector road. Tractor axle hit it yesterday.',
    lat: 30.3712,
    lng: 76.3980,
    roadId: 'road-village',
    roadName: 'Kishanpur Rural Access Way',
    locality: 'Kishanpur Village Locality',
    isRural: true, // triggers Single-Report Validation Rule!
    reportedAt: '1 hour ago',
    timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
    reporter: 'Sukhdev Singh (Sole Reporter)',
    reporterCount: 1, // Notice only 1 reporter!
    status: 'CLUSTERED',
    clusterId: 'CL-104',
    aiData: {
      detectedType: 'Unpaved Edge Pothole',
      confidence: 99.1,
      estimatedDiameterMeters: 2.1,
      severity: 'HIGH',
      priorityRank: 4,
      isRuralSingleReportValidated: true, // Special AI rule!
      singleReportValidationReason: 'Low-density population sector. AI photo metadata, EXIF GPS and visual integrity check verified. Promoted to dispatch without requiring duplicate confirmations.',
      proximityFlags: ['Kishanpur Primary School Route'],
      rerouteTriggered: false,
      visualSimilarityMatched: false
    },
    imageUrl: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=800&q=80',
    verificationProofUrl: null
  },
  {
    id: 'INC-1002',
    category: 'Pothole',
    title: 'North Bypass Pothole Remediation',
    description: 'Crater filled with cold asphalt premix and compacted. Citizen quorum passed with 15/15 confirmations.',
    lat: 30.3590,
    lng: 76.3670,
    roadId: 'road-ring',
    roadName: 'North Ring Bypass Corridor',
    locality: 'North Ring Sector',
    isRural: false,
    reportedAt: '1 day ago',
    timestamp: '2026-11-20T10:15:00.000Z',
    reporter: 'Simran K.',
    reporterCount: 5,
    status: 'RESOLVED',
    clusterId: 'CL-082',
    aiData: {
      detectedType: 'Asphalt Pothole',
      confidence: 97.2,
      estimatedDiameterMeters: 1.6,
      severity: 'RESOLVED',
      priorityRank: 5,
      proximityFlags: ['Arterial Bypass'],
      rerouteTriggered: false,
      visualSimilarityMatched: true
    },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    verificationProofUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    citizenConfirmations: {
      upvotes: 15,
      downvotes: 0,
      quorumRequired: 15,
      percentageApproved: 100
    }
  },
  {
    id: 'INC-1015',
    category: 'Road Damage',
    title: 'Repaired Bitumen Patch - Pending Citizen Check',
    description: 'Contractor has finished hot asphalt leveling and compaction. Community sign-off requested.',
    lat: 30.3580,
    lng: 76.3720,
    roadId: 'road-thapar',
    roadName: 'University Boulevard (Thapar Campus East)',
    locality: 'Thapar Campus Zone',
    isRural: false,
    reportedAt: '3 hours ago',
    timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
    reporter: 'Simran K.',
    reporterCount: 5,
    status: 'VERIFYING', // Awaiting citizen confirmation!
    clusterId: 'CL-082',
    aiData: {
      detectedType: 'Asphalt Pothole',
      confidence: 95.8,
      estimatedDiameterMeters: 1.8,
      severity: 'RESOLVED_PENDING',
      priorityRank: 5,
      proximityFlags: ['University Gate 2'],
      rerouteTriggered: false,
      visualSimilarityMatched: true
    },
    imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80',
    verificationProofUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
    citizenConfirmations: {
      upvotes: 14,
      downvotes: 1,
      quorumRequired: 15,
      percentageApproved: 93
    }
  }
];

// Demo repair clusters removed: the app starts empty and only shows real data.
export const INITIAL_CLUSTERS = [];

export const NAVIGATION_PRESETS = [
  {
    id: 'route-thapar-hospital',
    title: 'Thapar Campus to City General Hospital',
    origin: 'Thapar University East Gate',
    originCoords: [30.3565, 76.3645],
    destination: 'St. Jude Multi-specialty Hospital',
    destinationCoords: [30.3510, 76.3740],
    defaultRoute: {
      name: 'Direct Route via Sector 14 Link Road',
      distance: '2.4 km',
      normalDuration: '6 mins',
      currentDuration: '24 mins (Severe Delay)',
      riskScore: 89, // Out of 100
      status: 'CRITICAL_HAZARD_BLOCKED',
      hazardsEncountered: [
        {
          id: 'INC-1041',
          name: 'Severe 3.4m Road Crater',
          type: 'Pothole',
          severity: 'CRITICAL',
          impact: 'Lane impassable; severe tire blowout risk'
        },
        {
          id: 'INC-1042',
          name: '1.5 ft Standing Water',
          type: 'Waterlogging',
          severity: 'HIGH',
          impact: 'Submerged road shoulder; engine hydrolock danger'
        }
      ],
      pathCoordinates: [
        [30.3565, 76.3645],
        [30.3550, 76.3660],
        [30.3540, 76.3675], // Hazard zone!
        [30.3532, 76.3685], // INC-1041
        [30.3520, 76.3710],
        [30.3510, 76.3740]
      ]
    },
    aiReroutedRoute: {
      name: 'CivicFix AI Safe Alternate (Via North Ring Expressway Bypass)',
      distance: '3.1 km (+0.7 km)',
      duration: '8 mins (Saves 16 mins!)',
      riskScore: 8, // Very safe!
      status: 'RECOMMENDED_SAFE',
      rerouteReason: 'Automatically diverts traffic around 3.4m critical cave-in and standing waterlogging near Sector 14 Hospital zone.',
      hazardsEncountered: [],
      pathCoordinates: [
        [30.3565, 76.3645],
        [30.3585, 76.3665],
        [30.3600, 76.3700], // Elevated bypass
        [30.3575, 76.3750],
        [30.3540, 76.3765],
        [30.3510, 76.3740]
      ]
    }
  },
  {
    id: 'route-suburb-center',
    title: 'North Suburbs to Municipal Center',
    origin: 'Model Town North',
    originCoords: [30.3650, 76.3600],
    destination: 'District Administrative Complex',
    destinationCoords: [30.3450, 76.3800],
    defaultRoute: {
      name: 'Direct Central Arterial',
      distance: '4.2 km',
      normalDuration: '11 mins',
      currentDuration: '13 mins (Minor Caution)',
      riskScore: 24,
      status: 'ADVISORY_ONLY',
      hazardsEncountered: [
        {
          id: 'INC-1015',
          name: 'Freshly Repaired Patch',
          type: 'Road Damage',
          severity: 'LOW',
          impact: 'Drive with caution at 30 km/h; surface leveling in progress'
        }
      ],
      pathCoordinates: [
        [30.3650, 76.3600],
        [30.3600, 76.3650],
        [30.3550, 76.3700],
        [30.3450, 76.3800]
      ]
    },
    aiReroutedRoute: {
      name: 'No Reroute Needed',
      distance: '4.2 km',
      duration: '11 mins',
      riskScore: 24,
      status: 'SAFE_PASSAGE',
      rerouteReason: 'Hazard severity is LOW/VERIFYING. Reroute threshold (>3.0m severe pothole or deep waterlogging) not breached. Commuter advisory displayed on heads-up display.',
      hazardsEncountered: [],
      pathCoordinates: [
        [30.3650, 76.3600],
        [30.3600, 76.3650],
        [30.3550, 76.3700],
        [30.3450, 76.3800]
      ]
    }
  }
];

export const LIVE_WEATHER_FEED = {
  city: 'Patiala / Punjab',
  temperature: '24°C',
  condition: 'Monsoon Rain Warning Active',
  rainfallMm: 42,
  humidity: '88%',
  loggingRiskIndex: 'HIGH (86%)',
  alertHeadline: 'Active Precipitation Event: 4 Corridors Flagged Logging-Prone',
  proneRoads: ['Sector 14 - Medical College Link Road', 'Kishanpur Rural Access Way']
};
