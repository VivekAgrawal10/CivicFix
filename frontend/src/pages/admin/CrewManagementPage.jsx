import React from 'react';
import { 
  Users, 
  Truck, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  AlertTriangle 
} from 'lucide-react';

const CREW_ROSTER = [
  {
    id: 'CREW-04',
    name: 'Rapid Response Unit 04',
    contractor: 'Apex Highway Infrastructure Ltd',
    supervisor: 'Er. Rajesh Varma',
    phone: '+91 98721-44321',
    truckId: 'PB-11-AX-9941',
    capacity: 6,
    status: 'ACTIVE_ON_SITE',
    assignedMission: 'CL-091 (Sector 14 Corridor)',
    currentTask: 'Compacting cold asphalt on 3.4m hospital crater'
  },
  {
    id: 'CREW-02',
    name: 'District Rural Mobile Gang 02',
    contractor: 'Punjab Rural Works Department',
    supervisor: 'Er. Gurpreet Singh',
    phone: '+91 98144-88219',
    truckId: 'PB-11-RM-3312',
    capacity: 4,
    status: 'EN_ROUTE',
    assignedMission: 'CL-104 (Kishanpur Rural Way)',
    currentTask: 'Traveling to village culvert with gravel sub-base'
  },
  {
    id: 'CREW-01',
    name: 'Municipal Asphalt Gang 01',
    contractor: 'Patiala Municipal Corporation',
    supervisor: 'Er. Sandeep Joshi',
    phone: '+91 98765-12345',
    truckId: 'PB-11-MC-1011',
    capacity: 8,
    status: 'AVAILABLE_STANDBY',
    assignedMission: 'None (Standby)',
    currentTask: 'Ready for emergency arterial deployment'
  },
  {
    id: 'CREW-03',
    name: 'Storm Drainage Diagnostic Team',
    contractor: 'Urban Hydraulic & Drainage Corp',
    supervisor: 'Er. Neeraj Bansal',
    phone: '+91 98222-34981',
    truckId: 'PB-11-DR-4040',
    capacity: 5,
    status: 'INVESTIGATING',
    assignedMission: 'Road B Chronic Investigation',
    currentTask: 'Culvert #12 gradient sonar acoustic telemetry'
  }
];

export function CrewManagementPage() {
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="civic-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-brand-border">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-brand-blue-light font-semibold mb-1">
              <Users className="w-3.5 h-3.5 text-brand-blue-light" />
              <span>FIELD CREW & CONTRACTOR ROSTER</span>
            </div>
            <h1 className="text-2xl font-bold text-white">
              Maintenance Crew Management
            </h1>
            <p className="text-xs text-white opacity-80 mt-1">
              Field workforce readiness, vehicle tracking, and active repair mission assignments.
            </p>
          </div>

          <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-brand-surface-elevated border border-brand-border text-white">
            Registered Teams: <strong className="text-white">{CREW_ROSTER.length} Units</strong>
          </div>
        </div>
      </div>

      {/* Crew Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CREW_ROSTER.map((crew) => (
          <div key={crew.id} className="civic-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-brand-surface-elevated text-white border border-brand-border">
                  {crew.id}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">{crew.name}</h3>
                <p className="text-xs text-white opacity-70">{crew.contractor}</p>
              </div>

              <span className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${
                crew.status === 'AVAILABLE_STANDBY' 
                  ? 'bg-emerald-950 text-white border border-emerald-800' 
                  : 'bg-brand-surface-elevated text-white border border-brand-border'
              }`}>
                {crew.status}
              </span>
            </div>

            <div className="civic-card-elevated p-3 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-white opacity-70">Field Supervisor:</span>
                <strong className="text-white">{crew.supervisor}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white opacity-70">Phone Contact:</span>
                <strong className="text-white">{crew.phone}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white opacity-70">Assigned Vehicle:</span>
                <strong className="text-white">{crew.truckId}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-white opacity-70">Technicians:</span>
                <strong className="text-white">{crew.capacity} Personnel</strong>
              </div>
            </div>

            <div className="p-2.5 rounded bg-brand-surface-elevated border border-brand-border text-xs">
              <span className="text-white opacity-60 text-[10px] font-mono uppercase block">Current Active Task:</span>
              <p className="text-white font-medium mt-0.5">{crew.currentTask}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
