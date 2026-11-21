> **Integration note:** this app now talks to the Express API (`backend/`); see the root README and `docs/INTEGRATION.md`. Some descriptions below (e.g. "simulated computer vision") predate the integration.

# 🛡️ CIVICFIX — AI-Powered Civic Intelligence Platform

> **Built by CYBERNAUTS for SATHACK @ THAPAR UNIVERSITY**  
> *"REPORT SMARTER. MOVE SAFER. REPAIR FASTER."*

CivicFix is a next-generation civic intelligence platform that transforms traditional public complaint systems. Instead of letting reports disappear into an administrative backlog, CivicFix connects citizen reports directly to **real-time commuter safety (hazard-aware rerouting)** and **smart municipal operations (AI clustering and unified dispatch missions)**.

---

## 🎨 New Design System & Brand Palette

### Strict Brand Palette:
- **LIGHT THEME**:
  - Primary blue: `#5797DB`
  - Light canvas background: `#EBEBEB`
  - Secondary dark grey: `#474647`
- **DARK THEME**:
  - Primary blue: `#153C65`
  - Secondary grey: `#999999`
  - Main background: `#343234`
- **Typography**:
  - **ALL TEXT IS WHITE (`#FFFFFF`) IN BOTH LIGHT AND DARK THEMES.**
  - In light mode, content surfaces, cards and headers utilize contrasting dark grey (`#474647`) and blue surfaces so text is always high-contrast and readable.
- **Theme Toggle**:
  - Main navigation header includes a persistent Sun / Moon theme switcher with `localStorage` memory and system preference support.

---

## 🗺️ Multi-Page Architecture

CivicFix is structured into distinct, dedicated page experiences powered by **React Router**:

### 🏠 Landing Page (`/`)
- Focused, clutter-free homepage.
- Value proposition & short project description.
- Direct entry CTAs to **Citizen Portal** and **City Operations**.
- Summary impact metrics and 6-stage connected workflow.

---

### 🚗 Citizen Experience (`/citizen/...`)
1. **Overview** (`/citizen`): Concise welcome, 4 key summary metrics, compact hazard preview, recent complaints, and quick actions.
2. **Live Hazard Map** (`/citizen/map`): Full-page GIS map with Leaflet, category & severity filters, search, and selected hazard telemetry.
3. **Report an Issue** (`/citizen/report`): Photo upload with simulated computer vision bounding box measurement, crater diameter evaluation (&gt;3m severe threshold), rural village 1-user authenticity validation, and hospital proximity rules.
4. **My Reports** (`/citizen/my-reports`): Community complaints tracker with filter by status (Dispatched, Clustered, Verifying, Resolved) and detailed audit modals.
5. **Safe Navigation** (`/citizen/navigation`): Hazard-aware route planner comparing Direct Hazardous Path (craters, delays, 89/100 risk) against AI Safe Alternate Bypass (saves 16 mins, 8/100 risk) with one-click Google Maps export.
6. **AI Intelligence** (`/citizen/ai`): Deep dive into AI models: CV-YOLO crater meter, spatial DBSCAN clustering, perceptual similarity hashing, and weighted priority scoring.
7. **Repair Tracking** (`/citizen/repair-tracking`): Municipal work orders with assigned crews, allocated materials, and an interactive **Before/After dual image comparison slider** with citizen quorum voting (15 sign-offs to reopen).
8. **About CivicFix** (`/citizen/about`): Product purpose, 6-stage workflow, and Hackathon Cybernauts team background.

---

### ⚡ City Operations & Admin Portal (`/admin/...`)
1. **Operations Overview** (`/admin`): High-level operational metrics, category distributions, and real-time dispatch feed.
2. **Complaint Management** (`/admin/complaints`): Searchable audit table with lifecycle status controls (Dispatched, Repairing, Verifying, Resolved).
3. **Hazard Clusters** (`/admin/clusters`): Spatial clustering engine showing how scattered nearby complaints merge into consolidated repair missions (-64% duplicated crew deployments).
4. **Repair Work Orders** (`/admin/work-orders`): Dispatch sheet manager, vehicle registration tracking, materials calculator, and lifecycle stage advancement.
5. **Crew Management** (`/admin/crews`): Maintenance contractor roster (Rapid Response Unit 04, Rural Mobile Gang 02, etc.), technician counts, and active assignments.
6. **Infrastructure Analytics** (`/admin/analytics`): Corridor Road Health Scores (0-100), chronic failure detection, monsoon rainstorm simulator (42mm/hr), and AI subsurface drainage engineering recommendations.
7. **Citizen Verification** (`/admin/verification`): Final municipal sign-off audit reconciling contractor proof photos with community quorum votes before marking roads safe.

---

## 🛠️ Technology Stack

- **Framework**: React 18, React Router v6, Vite 5
- **Styling**: Tailwind CSS with custom CSS variables theme engine
- **Mapping**: Leaflet & React-Leaflet with CartoDB Dark Matter GIS tiles
- **Icons**: Lucide React
- **Typography**: Inter & JetBrains Mono

---

## 💻 Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Run development server (port 3000)
npm run dev

# 3. Build production bundle
npm run build
