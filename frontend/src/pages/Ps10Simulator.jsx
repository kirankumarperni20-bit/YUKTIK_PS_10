import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  ShieldAlert, 
  Clock, 
  Truck, 
  Hospital, 
  CloudRain, 
  Flame, 
  Activity, 
  Layers, 
  Sparkles, 
  FileText 
} from 'lucide-react';
import useDemoStore from '../demo/demoStore';
import { apiService } from '../services/apiService';
import MapComponent from '../components/MapComponent';

const Ps10Simulator = () => {
  const ps10Step = useDemoStore(state => state.ps10Step);
  const ps10Details = useDemoStore(state => state.ps10Details);
  const allIncidents = useDemoStore(state => state.incidents);
  const allAmbulances = useDemoStore(state => state.ambulances);
  const allHospitals = useDemoStore(state => state.hospitals);

  const incidents = React.useMemo(() => {
    return (allIncidents || []).filter(i => i.incidentId?.includes('PS10'));
  }, [allIncidents]);

  const ambulances = React.useMemo(() => {
    return (allAmbulances || []).filter(a => ['AMB-A01', 'AMB-A02', 'AMB-A03', 'BOAT-B01', 'FIRE-F01'].includes(a.ambulanceId));
  }, [allAmbulances]);

  const hospitals = React.useMemo(() => {
    return (allHospitals || []).filter(h => h.city === 'PS10 Sector');
  }, [allHospitals]);

  const allocationLogs = useDemoStore(state => state.allocationLogs);

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline', 'explanations', 'map'

  const handleInit = async () => {
    setLoading(true);
    try {
      await apiService.initPs10Scenario();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (ps10Step === 0) {
      handleInit();
    }
  }, []);

  const handleStep1 = async () => {
    setLoading(true);
    try {
      await apiService.step1Ps10();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    setLoading(true);
    try {
      await apiService.step2Ps10();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async () => {
    setLoading(true);
    try {
      await apiService.step3Ps10();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStep4 = async () => {
    setLoading(true);
    try {
      await apiService.step4Ps10();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-bg-surface via-bg-surface-secondary to-bg-surface border border-border p-6 rounded-xl shadow-md">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary-600/20 text-info border border-info/30 flex items-center gap-1.5">
              <Sparkles size={12} />
              PS10 End-to-End Test Engine
            </span>
            <span className="text-xs text-text-muted font-mono">
              Simulated Clock: <strong className="text-text-main">{ps10Details?.simulatedTime || '10:30 AM'}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-black text-text-main tracking-tight">
            Multi-Incident Dynamic Reallocation Simulator
          </h1>
          <p className="text-xs text-text-secondary max-w-2xl mt-1 leading-relaxed">
            Deterministic evaluation of concurrent multi-acuity incidents, real-time vehicle failure, zero-ICU hospital diversion, weather-driven route recalculation, and simultaneous 4-incident optimization.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleInit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-info text-white rounded-lg text-xs font-bold hover:bg-info/90 shadow transition-all active:scale-95 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            {ps10Step === 0 ? 'Initialize Scenario (10:30 AM)' : 'Reset Scenario'}
          </button>
        </div>
      </div>

      {/* Interactive Step-by-Step Scenario Stepper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Step 1 */}
        <div className={`p-4 rounded-xl border transition-all ${ps10Step >= 2 ? 'bg-bg-surface border-warning/60 shadow-sm' : 'bg-bg-surface/50 border-border opacity-70'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">10:31 AM</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ps10Step >= 2 ? 'bg-warning/20 text-warning' : 'bg-border text-text-muted'}`}>
              {ps10Step >= 2 ? 'Triggered' : 'Pending'}
            </span>
          </div>
          <h3 className="text-xs font-bold text-text-main mb-1 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-warning shrink-0" />
            Ambulance A01 Breakdown
          </h3>
          <p className="text-[11px] text-text-muted mb-3 leading-tight">
            Disable nearest vehicle for Incident A. System recalculates allocation to backup ICU unit.
          </p>
          <button
            onClick={handleStep1}
            disabled={ps10Step < 1 || loading}
            className="w-full py-1.5 px-3 bg-warning/15 hover:bg-warning/25 text-warning border border-warning/40 rounded-md text-[11px] font-bold transition-all disabled:opacity-40"
          >
            Trigger Step 1 (10:31 AM)
          </button>
        </div>

        {/* Step 2 */}
        <div className={`p-4 rounded-xl border transition-all ${ps10Step >= 3 ? 'bg-bg-surface border-emergency/60 shadow-sm' : 'bg-bg-surface/50 border-border opacity-70'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">10:32 AM</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ps10Step >= 3 ? 'bg-emergency/20 text-emergency' : 'bg-border text-text-muted'}`}>
              {ps10Step >= 3 ? 'Triggered' : 'Pending'}
            </span>
          </div>
          <h3 className="text-xs font-bold text-text-main mb-1 flex items-center gap-1.5">
            <Hospital size={14} className="text-emergency shrink-0" />
            Zero ICU Hospital Alert
          </h3>
          <p className="text-[11px] text-text-muted mb-3 leading-tight">
            Apex Hospital reports 0 ICU beds. Strict hard constraint diverts cardiac patient.
          </p>
          <button
            onClick={handleStep2}
            disabled={ps10Step < 2 || loading}
            className="w-full py-1.5 px-3 bg-emergency/15 hover:bg-emergency/25 text-emergency border border-emergency/40 rounded-md text-[11px] font-bold transition-all disabled:opacity-40"
          >
            Trigger Step 2 (10:32 AM)
          </button>
        </div>

        {/* Step 3 */}
        <div className={`p-4 rounded-xl border transition-all ${ps10Step >= 4 ? 'bg-bg-surface border-info/60 shadow-sm' : 'bg-bg-surface/50 border-border opacity-70'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">10:33 AM</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ps10Step >= 4 ? 'bg-info/20 text-info' : 'bg-border text-text-muted'}`}>
              {ps10Step >= 4 ? 'Triggered' : 'Pending'}
            </span>
          </div>
          <h3 className="text-xs font-bold text-text-main mb-1 flex items-center gap-1.5">
            <CloudRain size={14} className="text-info shrink-0" />
            Rainfall & Traffic Block
          </h3>
          <p className="text-[11px] text-text-muted mb-3 leading-tight">
            Heavy rainfall waterlogs flyover (+12 min). Traffic routing activates Ring Detour.
          </p>
          <button
            onClick={handleStep3}
            disabled={ps10Step < 3 || loading}
            className="w-full py-1.5 px-3 bg-info/15 hover:bg-info/25 text-info border border-info/40 rounded-md text-[11px] font-bold transition-all disabled:opacity-40"
          >
            Trigger Step 3 (10:33 AM)
          </button>
        </div>

        {/* Step 4 */}
        <div className={`p-4 rounded-xl border transition-all ${ps10Step >= 5 ? 'bg-bg-surface border-operational/60 shadow-sm' : 'bg-bg-surface/50 border-border opacity-70'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">10:34 AM</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${ps10Step >= 5 ? 'bg-operational/20 text-operational' : 'bg-border text-text-muted'}`}>
              {ps10Step >= 5 ? 'Triggered' : 'Pending'}
            </span>
          </div>
          <h3 className="text-xs font-bold text-text-main mb-1 flex items-center gap-1.5">
            <Flame size={14} className="text-orange-400 shrink-0" />
            4th Emergency (Industrial Fire)
          </h3>
          <p className="text-[11px] text-text-muted mb-3 leading-tight">
            Major warehouse fire reported. Executes simultaneous 4-incident global Hungarian optimization.
          </p>
          <button
            onClick={handleStep4}
            disabled={ps10Step < 4 || loading}
            className="w-full py-1.5 px-3 bg-operational/15 hover:bg-operational/25 text-operational border border-operational/40 rounded-md text-[11px] font-bold transition-all disabled:opacity-40"
          >
            Trigger Step 4 (10:34 AM)
          </button>
        </div>
      </div>

      {/* Real-time State & Live Decision Card */}
      {ps10Details && (
        <div className="bg-bg-surface border border-border p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-info" />
              <h2 className="text-sm font-bold text-text-main uppercase tracking-wider">
                {ps10Details.title}
              </h2>
            </div>
            <span className="text-xs text-text-muted font-mono">{ps10Details.simulatedTime}</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed bg-bg-surface-secondary/70 p-3 rounded-lg border border-border/60">
            {ps10Details.description}
          </p>
        </div>
      )}

      {/* Incidents & Assigned Resources Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Incidents Card */}
        <div className="bg-bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={16} className="text-emergency" />
              Active PS10 Incidents ({incidents.length})
            </h3>
            <span className="text-[11px] text-text-muted">Global Priority Sorted</span>
          </div>

          <div className="space-y-3">
            {incidents.length === 0 ? (
              <p className="text-xs text-text-muted py-8 text-center">Click "Initialize Scenario (10:30 AM)" above to begin.</p>
            ) : (
              incidents.map((inc) => (
                <div key={inc._id || inc.incidentId} className="p-3.5 rounded-lg border border-border bg-bg-surface-secondary/40 hover:border-info/40 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold font-mono text-text-main">{inc.incidentId}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inc.category === 'CARDIAC' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        inc.category === 'URBAN_FLOOD' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        inc.category === 'FIRE' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {inc.category}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-emergency">Severity {inc.severity}/10</span>
                  </div>

                  <p className="text-xs text-text-muted mb-2 line-clamp-2">{inc.description}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 text-[11px]">
                    <span className="text-text-muted">Assigned:</span>
                    <strong className="text-info font-mono">{inc.assignedAmbulanceId || 'Awaiting Allocation'}</strong>
                    <span className="text-border">|</span>
                    <span className="text-text-muted">Casualties:</span>
                    <span className="text-text-main font-semibold">{inc.affectedPeople || 1}</span>
                  </div>

                  {inc.allocationExplanation && (
                    <div className="mt-2 text-[11px] bg-bg-surface/80 p-2 rounded border border-border/60 text-text-secondary italic">
                      💡 {inc.allocationExplanation}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Resources Card */}
        <div className="bg-bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
              <Truck size={16} className="text-info" />
              Emergency Response Fleet ({ambulances.length})
            </h3>
            <span className="text-[11px] text-text-muted">Multi-Agency Resources</span>
          </div>

          <div className="space-y-3">
            {ambulances.length === 0 ? (
              <p className="text-xs text-text-muted py-8 text-center">Click "Initialize Scenario (10:30 AM)" to deploy fleet.</p>
            ) : (
              ambulances.map((amb) => (
                <div key={amb._id || amb.ambulanceId} className="p-3.5 rounded-lg border border-border bg-bg-surface-secondary/40 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold font-mono text-text-main">{amb.ambulanceId}</span>
                      <span className="text-[10px] font-semibold text-text-muted">({amb.type})</span>
                    </div>
                    <span className="text-[11px] text-text-muted">
                      {amb.currentIncident ? `Assigned to: ${amb.currentIncident}` : 'Standing by in Sector'}
                    </span>
                  </div>

                  <div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                      amb.status === 'EN_ROUTE' ? 'bg-info/20 text-info border border-info/30' :
                      amb.status === 'MAINTENANCE' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                      'bg-operational/20 text-operational border border-operational/30'
                    }`}>
                      {amb.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Hospitals Monitored */}
          <div className="mt-6 pt-4 border-t border-border">
            <h4 className="text-xs font-bold text-text-main uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Hospital size={14} className="text-operational" />
              Designated Sector Hospitals
            </h4>
            <div className="space-y-2">
              {hospitals.map((hosp) => (
                <div key={hosp._id || hosp.name} className="flex items-center justify-between text-xs p-2 bg-bg-surface-secondary/60 rounded border border-border/60">
                  <span className="font-semibold text-text-main">{hosp.name}</span>
                  <div className="flex items-center gap-3">
                    <span className={hosp.availableIcuBeds === 0 ? 'text-red-400 font-bold' : 'text-operational font-bold'}>
                      ICU: {hosp.availableIcuBeds} beds
                    </span>
                    <span className="text-text-muted">General: {hosp.bedsAvailable}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Ps10Simulator;

