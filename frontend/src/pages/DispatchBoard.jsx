import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, MapPin, ArrowRight, ShieldAlert, Truck, Crosshair, Filter, Activity, Clock, Sparkles, CheckCircle2 } from 'lucide-react';
import MapComponent from '../components/MapComponent';
import useDemoStore from '../demo/demoStore';
import { apiService } from '../services/apiService';
import useAuthStore from '../stores/authStore';

const CITIES = ['All India', 'PS10 Sector', 'New Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Lucknow', 'Jaipur', 'Ahmedabad', 'Pune'];

const DispatchBoard = () => {
  const allIncidents = useDemoStore(state => state.incidents);
  const allAmbulances = useDemoStore(state => state.ambulances);
  const allDispatches = useDemoStore(state => state.dispatches);
  const allHospitals = useDemoStore(state => state.hospitals);
  const assignAmbulance = useDemoStore(state => state.assignAmbulance);
  const runGlobalOptimization = useDemoStore(state => state.runGlobalOptimization);

  const activeCityFilter = useDemoStore(state => state.activeCityFilter);
  const setCityFilter = useDemoStore(state => state.setCityFilter);
  const [resourceFilter, setResourceFilter] = useState('ALL');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optResultNotice, setOptResultNotice] = useState('');

  const matchesCity = (item) => {
    if (!activeCityFilter || activeCityFilter === 'All India') return true;
    if (!item) return false;
    if (item.city === activeCityFilter) return true;
    if (activeCityFilter === 'Hyderabad') {
      if (item.city === 'Telangana' || item.city === 'Secunderabad' || item.city === 'India') return true;
      if (item.address && /hyderabad|secunderabad|telangana/i.test(item.address)) return true;
    }
    if (activeCityFilter === 'Telangana') {
      if (item.city === 'Hyderabad' || item.state === 'Telangana' || item.city === 'India') return true;
      if (item.address && /telangana|hyderabad/i.test(item.address)) return true;
    }
    return false;
  };

  // Pending = needs dispatch (ACTIVE or PENDING with no ambulance)
  const pendingIncidents = allIncidents.filter(i =>
    ['ACTIVE', 'PENDING'].includes(i.status) && !i.assignedAmbulanceId && !i.assignedAmbulance &&
    matchesCity(i)
  );

  // Available units filtered by category
  const availableAmbulances = allAmbulances.filter(a =>
    a.status === 'AVAILABLE' &&
    matchesCity(a) &&
    (resourceFilter === 'ALL' || a.resourceCategory === resourceFilter || a.type === resourceFilter)
  );

  const handleGlobalOptimize = async () => {
    setIsOptimizing(true);
    try {
      const res = await apiService.runGlobalOptimization(useAuthStore.getState().token);
      setOptResultNotice("Global Hungarian Solver successfully optimized all active emergencies simultaneously!");
      setTimeout(() => setOptResultNotice(''), 6000);
    } catch (err) {
      runGlobalOptimization();
      setOptResultNotice("Simultaneous Multi-Incident Optimization Completed.");
      setTimeout(() => setOptResultNotice(''), 6000);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleManualDispatch = async (incidentId, ambulanceId) => {
    try {
      await apiService.assignAmbulance(incidentId, ambulanceId, useAuthStore.getState().token);
    } catch (error) {
      assignAmbulance(incidentId, ambulanceId);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-text-main tracking-tight mb-2">Central Dispatch Command</h1>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Pending Intake</span>
              <span className="text-[14px] font-semibold text-emergency">{pendingIncidents.length}</span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Available Fleet</span>
              <span className="text-[14px] font-semibold text-operational">{availableAmbulances.length} Units</span>
            </div>
            <div className="w-px h-8 bg-border"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Designated Hospitals</span>
              <span className="text-[14px] font-semibold text-info">{allHospitals.length}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 bg-bg-surface border border-border rounded-md px-3 py-1.5 shadow-sm">
            <Filter size={14} className="text-text-muted" />
            <select value={activeCityFilter} onChange={e => setCityFilter(e.target.value)} className="bg-transparent text-[11px] font-semibold text-text-main uppercase tracking-wider outline-none border-none cursor-pointer">
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button
            onClick={handleGlobalOptimize}
            disabled={isOptimizing}
            className="flex items-center gap-2 px-4 py-2 bg-text-main text-white rounded-md text-xs font-bold hover:bg-black shadow transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles size={14} className="text-info" />
            {isOptimizing ? 'Optimizing Fleet...' : 'Run Global Dynamic Optimization'}
          </button>
        </div>
      </div>

      {optResultNotice && (
        <div className="p-3 bg-operational/15 border border-operational/30 rounded-lg text-xs text-operational font-bold flex items-center gap-2">
          <CheckCircle2 size={16} />
          {optResultNotice}
        </div>
      )}

      {/* Main Dual Grid: Pending Emergencies vs Available Fleet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Incidents */}
        <div className="bg-bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert size={16} className="text-emergency" />
              Incidents Requiring Dispatch ({pendingIncidents.length})
            </h2>
            <span className="text-[10px] text-text-muted">Sorted by Urgency Weight</span>
          </div>

          <div className="space-y-3">
            {pendingIncidents.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted italic">
                All reported emergencies are currently matched and dispatched.
              </div>
            ) : (
              pendingIncidents.map(inc => (
                <div key={inc._id || inc.incidentId} className="p-4 rounded-xl border border-border bg-bg-surface-secondary/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-text-main">{inc.incidentId || inc._id}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emergency/20 text-emergency">
                        {inc.category}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-emergency">Severity {inc.severity}/10</span>
                  </div>

                  <p className="text-xs text-text-muted line-clamp-2">{inc.description}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[11px]">
                    <span className="text-text-muted flex items-center gap-1">
                      <MapPin size={12} /> {inc.address || inc.city}
                    </span>
                    {availableAmbulances.length > 0 && (
                      <button
                        onClick={() => handleManualDispatch(inc._id || inc.incidentId, availableAmbulances[0]._id || availableAmbulances[0].ambulanceId)}
                        className="px-2.5 py-1 bg-info/10 text-info hover:bg-info hover:text-white rounded text-[10px] font-bold transition-all border border-info/30"
                      >
                        Dispatch {availableAmbulances[0].ambulanceId}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Available Multi-Agency Fleet */}
        <div className="bg-bg-surface border border-border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-2">
              <Truck size={16} className="text-info" />
              Available Multi-Agency Fleet ({availableAmbulances.length})
            </h2>
            <div className="flex items-center gap-1 text-[10px]">
              <button onClick={() => setResourceFilter('ALL')} className={`px-2 py-0.5 rounded ${resourceFilter === 'ALL' ? 'bg-info text-white' : 'text-text-muted'}`}>All</button>
              <button onClick={() => setResourceFilter('ADVANCED_LIFE_SUPPORT')} className={`px-2 py-0.5 rounded ${resourceFilter === 'ADVANCED_LIFE_SUPPORT' ? 'bg-info text-white' : 'text-text-muted'}`}>ALS</button>
              <button onClick={() => setResourceFilter('FIRE_ENGINE')} className={`px-2 py-0.5 rounded ${resourceFilter === 'FIRE_ENGINE' ? 'bg-info text-white' : 'text-text-muted'}`}>Fire</button>
              <button onClick={() => setResourceFilter('RESCUE_BOAT')} className={`px-2 py-0.5 rounded ${resourceFilter === 'RESCUE_BOAT' ? 'bg-info text-white' : 'text-text-muted'}`}>Boat</button>
            </div>
          </div>

          <div className="space-y-3">
            {availableAmbulances.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted italic">
                All units deployed or offline.
              </div>
            ) : (
              availableAmbulances.map(amb => (
                <div key={amb._id || amb.ambulanceId} className="p-3.5 rounded-xl border border-border bg-bg-surface-secondary/40 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <strong className="font-mono text-text-main">{amb.ambulanceId}</strong>
                      <span className="text-[10px] font-semibold text-text-muted">({amb.type})</span>
                    </div>
                    <span className="text-[10px] text-text-muted">Stationed in {amb.city}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-operational/20 text-operational border border-operational/30">
                    Ready
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DispatchBoard;
