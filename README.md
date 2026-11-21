# 🛡️ CIVICFIX — AI-Powered Civic Intelligence & Hazard-Aware Navigation

> **Built by CYBERNAUTS for SATHACK @ THAPAR UNIVERSITY**  
> *"REPORT SMARTER. MOVE SAFER. REPAIR FASTER."*

CivicFix is a next-generation civic intelligence platform that transforms traditional public complaint systems. Instead of letting reports disappear into an administrative backlog, CivicFix connects citizen reports directly to **real-time commuter safety (hazard-aware rerouting)** and **smart municipal operations (AI clustering and unified dispatch missions)**.

---

## 🌟 The 6-Stage Civic Architecture

```
[01. REPORT] ──> [02. DETECT] ──> [03. CONNECT] ──> [04. PRIORITISE] ──> [05. DISPATCH] ──> [06. VERIFY]
  Citizen          AI Vision       Smart Geo-          Weighted Risk        Unified Work        Citizen Quorum
  Photo + GPS      Crater > 3m     Clustering Hub      & Hospital Zone      Order & Materials   Before/After
```

1. **REPORT**: Citizens photograph civic issues with GPS geotagging and issue categorization.
2. **DETECT**: AI Vision models classify hazard type, measure crater dimensions (e.g., >3.0m severe threshold), and assess urgency.
3. **CONNECT**: Smart spatial clustering algorithm links related reports into unified missions, eliminating duplicate deployments.
4. **PRIORITISE**: Dynamic scoring prioritizes issues by size, road traffic volume, and proximity to critical infrastructure (Hospitals, Schools, Emergency corridors).
5. **DISPATCH**: Generates comprehensive work orders with assigned crews, material calculations (asphalt tonnage, pumps, grates), and multi-stop optimized truck routes.
6. **VERIFY**: Closed-loop trust where contractors upload repair proof and local citizens inspect interactive Before/After sliders to vote and officially reopen roads.

---

## 🚀 Key Innovations & Features

### 1. Hazard-Aware Commuter Navigation & Rerouting
- **Automatic Rerouting for Severe Hazards**: Potholes with a diameter $\ge 3.0\text{ m}$ or severe waterlogging automatically trigger commuter rerouting around the hazard zone.
- **Critical Infrastructure Weighting**: Road segments within 200m of Hospitals or Schools are automatically elevated to Tier-1 Emergency priority.
- **Route Comparison**: Interactive side-by-side comparison between the Dangerous Direct Route (craters, delays, 89/100 risk) and the CivicFix AI Safe Alternate Route (smooth bypass, saves 16 mins, 8/100 risk).
- **Google Maps Platform Integration**: One-click deep link to open verified routes in external navigation engines.

### 2. Low-Density Rural Locality Protocol
- **The Problem**: In remote villages or low-density sectors, only one citizen might report a dangerous road crater.
- **CivicFix AI Solution**: Locality density awareness dynamically adjusts confirmation thresholds. For rural zones, a single citizen report is verified using EXIF metadata, GPS authenticity, and AI visual integrity checks, promoting it directly to dispatch without requiring duplicate reports.

### 3. Chronic Root Cause Discovery & AI Suggestions
- **Chronic Failure Detection**: If a road repeatedly experiences waterlogging despite surface pothole patching, the AI detects the recurring failure pattern.
- **Engineering Advisory**: Generates specific root-cause diagnostics (e.g., *"Subsurface drainage gradient reversal at Culvert #12 — halt surface asphalt patching; overhaul 140m stormwater conduit"*).
- **Direct Contractor Dispatch**: One-click dispatch of civil engineering advisories to the responsible infrastructure company.

### 4. Road Health Scorecard (0–100) & Weather Integration
- Every road corridor is assigned an automated **Road Health Score** computed from monthly pothole frequency, drainage failure rates, and repair durability (e.g., Sector 14 Link Road: `38/100 - Critical`).
- **Live Monsoon Precipitation Radar**: Simulates rainstorm alerts (42mm/hr precipitation). Roads with historical waterlogging vulnerability are automatically badged as **Logging-Prone Corridors**.

### 5. Smart Clustering Command Center
- Consolidates scattered complaints (Pothole Block A, Road Damage Block B, Waterlogging Block A, Broken Drain Block C) into a single unified mission.
- **Reduces duplicate municipal visits by up to 64%**.
- Generates required materials list (Cold asphalt premix tonnage, traffic barricades, submersible de-watering pumps, cast-iron grates).

### 6. Interactive Before/After Citizen Quorum Verification
- Contractors cannot unilaterally mark an issue resolved.
- Interactive dual-image comparison slider allows citizens within the geofence to verify repair quality.
- Reaching quorum (e.g., 15 citizen sign-offs) officially marks the road **SAFE** and clears navigation hazard warnings.

---

## 🛠️ Technology Stack

- **Frontend**: React.js 18, Tailwind CSS, Leaflet, React-Leaflet
- **Design System**: Linear/Stripe-inspired midnight aesthetic (`#070A10`), electric cyan (`#00F2FE`), amber warnings, and telemetry typography (`Inter`, `JetBrains Mono`)
- **Maps**: CartoDB Dark Matter GIS tiles with custom animated SVG radar markers
- **Build Tool**: Vite 5
- **Icons**: Lucide React

---

## 💻 Local Development Setup

```bash
# 1. Clone repository / navigate to project
cd CivicFix.Frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Build production bundle
npm run build
```

---

## 👥 Hackathon Team: CYBERNAUTS

Developed for **SATHACK / THAPAR UNIVERSITY**.
*"Build Smarter Streets, Together."*
