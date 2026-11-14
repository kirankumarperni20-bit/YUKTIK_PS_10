import React, { useState } from 'react';
import { 
  Truck, Phone, MapPin, Activity, Filter, Clock, Map, Navigation, 
  Search, Plus, CheckCircle, AlertTriangle, Shield, Fuel, Wrench, 
  Radio, X, ArrowRight, UserCheck, ShieldAlert, LifeBuoy, Flame
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MapComponent from '../components/MapComponent';
import useDemoStore from '../demo/demoStore';
import { apiService } from '../services/apiService';

const CITIES = ['All India', 'Hyderabad', 'Telangana', 'New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata'];

const AREAS = [
  'All Areas', 'Gachibowli', 'Madhapur', 'HITEC City', 'Kukatpally', 
  'Secunderabad', 'Begumpet', 'Ameerpet', 'LB Nagar', 'Uppal', 
  'Banjara Hills', 'Jubilee Hills', 'Mehdipatnam', 'Nampally', 'Dilsukhnagar'
];

const AMBULANCE_TYPES = [
  { id: 'ALL', label: 'All Fleet Types' },
  { id: 'ADVANCED_LIFE_SUPPORT', label: 'ALS Ambulance' },
  { id: 'ICU_AMBULANCE', label: 'ICU Ambulance' },
  { id: 'BASIC_LIFE_SUPPORT', label: 'BLS Ambulance' },
  { id: 'FIRE_ENGINE', label: 'Fire Engine Tender' },
  { id: 'RESCUE_BOAT', label: 'Rescue Boat' }
];

const STATUS_CONFIG = {
  AVAILABLE:    { label: 'Available', bg: 'bg-operational/15 text-operational border-operational/30', dot: 'bg-operational' },
  EN_ROUTE:     { label: 'En Route', bg: 'bg-brand-primary/15 text-brand-primary border-brand-primary/30', dot: 'bg-brand-primary' },
  ASSIGNED:     { label: 'Assigned', bg: 'bg-brand-primary/15 text-brand-primary border-brand-primary/30', dot: 'bg-brand-primary' },
  ON_SCENE:     { label: 'At Incident', bg: 'bg-warning/15 text-warning border-warning/30', dot: 'bg-warning' },
  TRANSPORTING: { label: 'Transporting', bg: 'bg-info/15 text-info border-info/30', dot: 'bg-info' },
  RETURNING:    { label: 'Returning', bg: 'bg-text-muted/15 text-text-muted border-border', dot: 'bg-text-muted' },
  MAINTENANCE:  { label: 'Maintenance', bg: 'bg-emergency/15 text-emergency border-emergency/30', dot: 'bg-emergency' },
  OFFLINE:      { label: 'Offline', bg: 'bg-text-muted/15 text-text-muted border-border', dot: 'bg-text-muted' },
};

const AmbulancesList = () => {
  const allAmbulances = useDemoStore(state => state.ambulances);
  const allIncidents = useDemoStore(state => state.incidents);
  const activeIncidents = React.useMemo(() => {
    return (allIncidents || []).filter(i => i && !['RESOLVED', 'CANCELLED'].includes(i.status));
  }, [allIncidents]);
  const activeCityFilter = useDemoStore(state => state.activeCityFilter);
  const setCityFilter = useDemoStore(state => state.setCityFilter);

  const [selectedArea, setSelectedArea] = useState('All Areas');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('SPLIT'); // 'SPLIT', 'GRID', 'MAP'

  // Modals & Active Controls
  const [assignModalAmb, setAssignModalAmb] = useState(null);
  const [selectedIncidentForAssign, setSelectedIncidentForAssign] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [alertNotice, setAlertNotice] = useState('');

  // Add Ambulance Form
  const [newAmbForm, setNewAmbForm] = useState({
    registrationNumber: 'TS-09-EQ-',
    type: 'ADVANCED_LIFE_SUPPORT',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Gachibowli',
    driverName: '',
    driverPhone: '+91 98480 ',
    fuelLevel: 95,
    status: 'AVAILABLE'
  });

  // Filter logic
  const filteredAmbulances = allAmbulances.filter(a => {
    // City filter
    if (activeCityFilter !== 'All India') {
      if (activeCityFilter === 'Telangana') {
        if (a.state !== 'Telangana' && a.city !== 'Hyderabad') return false;
      } else if (a.city !== activeCityFilter) {
        return false;
      }
    }

    // Area filter
    if (selectedArea !== 'All Areas') {
      if (!a.area || !a.area.toLowerCase().includes(selectedArea.toLowerCase())) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

    // Type filter
    if (typeFilter !== 'ALL') {
      if (typeFilter === 'ADVANCED_LIFE_SUPPORT' && a.type !== 'ADVANCED_LIFE_SUPPORT') return false;
      if (typeFilter === 'ICU_AMBULANCE' && a.type !== 'ICU_AMBULANCE') return false;
      if (typeFilter === 'BASIC_LIFE_SUPPORT' && a.type !== 'BASIC_LIFE_SUPPORT') return false;
      if (typeFilter === 'FIRE_ENGINE' && a.type !== 'FIRE_ENGINE') return false;
      if (typeFilter === 'RESCUE_BOAT' && a.type !== 'RESCUE_BOAT') return false;
    }

    // Search query
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      const matchId = a.ambulanceId && a.ambulanceId.toLowerCase().includes(q);
      const matchReg = a.registrationNumber && a.registrationNumber.toLowerCase().includes(q);
      const matchDriver = a.driverName && a.driverName.toLowerCase().includes(q);
      const matchArea = a.area && a.area.toLowerCase().includes(q);
      if (!matchId && !matchReg && !matchDriver && !matchArea) return false;
    }

    return true;
  });

  // Dynamic statistics
  const totalFleet = filteredAmbulances.length;
  const availableCount = filteredAmbulances.filter(a => a.status === 'AVAILABLE').length;
  const enRouteCount = filteredAmbulances.filter(a => a.status === 'EN_ROUTE' || a.status === 'ASSIGNED').length;
  const onSceneCount = filteredAmbulances.filter(a => a.status === 'ON_SCENE' || a.status === 'TRANSPORTING').length;
  const maintenanceCount = filteredAmbulances.filter(a => a.status === 'MAINTENANCE' || a.status === 'OFFLINE').length;

  const handleStatusChange = async (amb, newStatus) => {
    try {
      await apiService.updateAmbulanceStatus(amb._id || amb.ambulanceId, newStatus);
      setAlertNotice(`Status updated: Unit ${amb.ambulanceId} is now ${newStatus}.`);
    } catch (err) {
      alert("Failed to update ambulance status");
    }
  };

  const handleOpenAssign = (amb) => {
    setAssignModalAmb(amb);
    if (activeIncidents.length > 0) {
      setSelectedIncidentForAssign(activeIncidents[0]._id || activeIncidents[0].incidentId);
    }
  };

  const handleConfirmAssignment = async (e) => {
    e.preventDefault();
    if (!assignModalAmb || !selectedIncidentForAssign) return;

    try {
      await apiService.assignAmbulance(assignModalAmb._id || assignModalAmb.ambulanceId, selectedIncidentForAssign, 'EN_ROUTE');
      setAlertNotice(`Unit ${assignModalAmb.ambulanceId} successfully assigned to incident. Status changed to EN_ROUTE.`);
      setAssignModalAmb(null);
    } catch (err) {
      alert("Failed to assign ambulance to incident");
    }
  };

  const handleCreateAmbulance = async (e) => {
    e.preventDefault();
    try {
      await apiService.createAmbulance(newAmbForm);
      setAlertNotice(`New emergency vehicle registered successfully.`);
      setShowAddModal(false);
      setNewAmbForm({
        registrationNumber: 'TS-09-EQ-',
        type: 'ADVANCED_LIFE_SUPPORT',
        city: 'Hyderabad',
        state: 'Telangana',
        area: 'Gachibowli',
        driverName: '',
        driverPhone: '+91 98480 ',
        fuelLevel: 95,
        status: 'AVAILABLE'
      });
    } catch (err) {
      alert("Failed to register ambulance");
    }
  };

  const getTypeIcon = (type) => {
    if (type === 'FIRE_ENGINE') return <Flame size={14} className="text-emergency" />;
    if (type === 'RESCUE_BOAT') return <LifeBuoy size={14} className="text-info" />;
    if (type === 'ICU_AMBULANCE') return <Activity size={14} className="text-brand-primary" />;
    return <Truck size={14} className="text-text-muted" />;
  };

  return (
    <div className="flex flex-col h-full space-y-5 animate-in fade-in duration-500 pb-16">
      {/* Alert Banner */}
      <AnimatePresence>
        {alertNotice && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3.5 bg-brand-primary/10 border border-brand-primary/30 rounded-lg text-text-main text-xs font-medium"
          >
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-brand-primary shrink-0 animate-pulse" />
              <span>{alertNotice}</span>
            </div>
            <button onClick={() => setAlertNotice('')} className="text-text-muted hover:text-text-main">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header & Dynamic Metrics Strip */}
      <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between gap-6 bg-bg-surface/50 p-5 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Truck className="text-brand-primary" size={20} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">Emergency Mobility Command</span>
          </div>
          <h1 className="text-2xl font-black text-text-main tracking-tight mb-3">Ambulance Fleet & Response Units</h1>
          
          {/* Dynamic Calculated Fleet Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Fleet</span>
              <span className="text-base font-extrabold text-text-main">{totalFleet} Units</span>
            </div>
            <div className="flex flex-col border-l border-border pl-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Available Units</span>
              <span className="text-base font-extrabold text-operational">{availableCount} Ready</span>
            </div>
            <div className="flex flex-col border-l border-border pl-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">En Route / Assigned</span>
              <span className="text-base font-extrabold text-brand-primary">{enRouteCount} In Transit</span>
            </div>
            <div className="flex flex-col border-l border-border pl-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">On Scene / Transport</span>
              <span className="text-base font-extrabold text-warning">{onSceneCount} At Hospital</span>
            </div>
            <div className="flex flex-col border-l border-border pl-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Maintenance / Offline</span>
              <span className="text-base font-extrabold text-text-muted">{maintenanceCount} Units</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-stretch sm:self-auto">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex-1 sm:flex-initial justify-center"
          >
            <Plus size={16} />
            Add Ambulance
          </button>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-bg-surface p-3 rounded-lg border border-border">
        {/* Search */}
        <div className="flex items-center gap-2 bg-bg-surface-secondary border border-border rounded-md px-3 py-1.5 flex-1 max-w-md">
          <Search size={15} className="text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Unit ID, registration, driver, area..."
            className="bg-transparent text-xs text-text-main outline-none border-none w-full placeholder:text-text-muted"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-text-muted hover:text-text-main">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* City */}
          <div className="flex items-center gap-1.5 bg-bg-surface-secondary border border-border rounded-md px-2.5 py-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase">Region:</span>
            <select 
              value={activeCityFilter} 
              onChange={e => setCityFilter(e.target.value)} 
              className="bg-transparent text-xs font-semibold text-text-main outline-none cursor-pointer"
            >
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Area */}
          <div className="flex items-center gap-1.5 bg-bg-surface-secondary border border-border rounded-md px-2.5 py-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase">Zone:</span>
            <select 
              value={selectedArea} 
              onChange={e => setSelectedArea(e.target.value)} 
              className="bg-transparent text-xs font-semibold text-text-main outline-none cursor-pointer"
            >
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-bg-surface-secondary border border-border rounded-md px-2.5 py-1.5">
            <span className="text-[10px] font-bold text-text-muted uppercase">Status:</span>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)} 
              className="bg-transparent text-xs font-semibold text-text-main outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="ON_SCENE">At Incident</option>
              <option value="TRANSPORTING">Transporting</option>
              <option value="RETURNING">Returning</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-bg-surface-secondary border border-border rounded-md p-0.5">
            <button
              onClick={() => setViewMode('SPLIT')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded ${viewMode === 'SPLIT' ? 'bg-brand-primary text-white' : 'text-text-muted hover:text-text-main'}`}
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('GRID')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded ${viewMode === 'GRID' ? 'bg-brand-primary text-white' : 'text-text-muted hover:text-text-main'}`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('MAP')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded ${viewMode === 'MAP' ? 'bg-brand-primary text-white' : 'text-text-muted hover:text-text-main'}`}
            >
              Full Map
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle Type Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {AMBULANCE_TYPES.map(pill => (
          <button
            key={pill.id}
            onClick={() => setTypeFilter(pill.id)}
            className={`px-3 py-1.5 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors border ${
              typeFilter === pill.id
                ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                : 'bg-bg-surface text-text-muted border-border hover:bg-bg-surface-secondary hover:text-text-main'
            }`}
          >
            {pill.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-text-muted font-medium pr-2">
          Showing {filteredAmbulances.length} of {allAmbulances.length} vehicles
        </span>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 grid gap-6 min-h-0 ${
        viewMode === 'SPLIT' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'
      }`}>
        
        {/* MAP PANEL (Shown in SPLIT or MAP mode) */}
        {(viewMode === 'SPLIT' || viewMode === 'MAP') && (
          <div className={`${
            viewMode === 'MAP' ? 'col-span-1 h-[650px]' : 'lg:col-span-5 h-[420px] lg:h-[720px]'
          } bg-bg-surface border border-border rounded-xl overflow-hidden shadow-sm relative flex flex-col`}>
            <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur px-3 py-1.5 rounded shadow border border-border/50 pointer-events-none">
              <span className="text-[10px] font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-operational animate-pulse" />
                Live Fleet Positioning ({filteredAmbulances.length} Units Active)
              </span>
            </div>
            <div className="flex-1 w-full h-full relative z-0">
              <MapComponent 
                incidents={activeIncidents} 
                ambulances={filteredAmbulances} 
              />
            </div>
          </div>
        )}

        {/* FLEET CARDS LIST (Shown in SPLIT or GRID mode) */}
        {(viewMode === 'SPLIT' || viewMode === 'GRID') && (
          <div className={`${
            viewMode === 'GRID' ? 'col-span-1' : 'lg:col-span-7'
          } flex flex-col space-y-4 overflow-y-auto max-h-[720px] pr-1`}>
            
            {filteredAmbulances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-bg-surface border border-dashed border-border rounded-xl">
                <Truck size={40} className="text-text-muted mb-3" />
                <h3 className="text-base font-bold text-text-main">No ambulances match filters</h3>
                <p className="text-xs text-text-muted mt-1">Try resetting your status, zone, or vehicle type selections.</p>
                <button 
                  onClick={() => { setCityFilter('All India'); setSelectedArea('All Areas'); setStatusFilter('ALL'); setTypeFilter('ALL'); setSearch(''); }}
                  className="mt-4 px-4 py-2 bg-bg-surface-secondary border border-border text-xs font-bold text-text-main rounded-md hover:bg-border transition-colors"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className={`grid gap-4 ${viewMode === 'GRID' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 xl:grid-cols-2'}`}>
                {filteredAmbulances.map(ambulance => {
                  const statusConf = STATUS_CONFIG[ambulance.status] || STATUS_CONFIG.AVAILABLE;
                  const isAvailable = ambulance.status === 'AVAILABLE';
                  const isEnRoute = ambulance.status === 'EN_ROUTE' || ambulance.status === 'ASSIGNED';
                  const isBusy = !isAvailable;
                  const hasAssignedIncident = ambulance.currentIncident || ambulance.currentAssignment;

                  return (
                    <motion.div
                      key={ambulance._id || ambulance.ambulanceId}
                      layout
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`flex flex-col bg-bg-surface border rounded-xl overflow-hidden shadow-sm transition-all hover:border-brand-primary/40 ${
                        isAvailable ? 'border-border' : (isEnRoute ? 'border-brand-primary/40 bg-brand-primary/[0.01]' : 'border-border')
                      }`}
                    >
                      {/* Top Header Strip */}
                      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border bg-bg-surface-secondary/40 text-[10px] font-bold">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(ambulance.type)}
                          <span className="text-text-main uppercase font-extrabold tracking-wide">{ambulance.ambulanceId}</span>
                          <span className="text-text-muted">•</span>
                          <span className="text-text-muted font-mono">{ambulance.registrationNumber}</span>
                        </div>

                        {/* Status Badge */}
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusConf.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot} ${isEnRoute ? 'animate-pulse' : ''}`} />
                          <span>{statusConf.label}</span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3 text-xs">
                        {/* Vehicle Type & Area */}
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-text-main text-xs">{ambulance.type?.replace(/_/g, ' ')}</span>
                            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">{ambulance.area || ambulance.city}</span>
                          </div>

                          {/* Crew and Telemetry */}
                          <div className="grid grid-cols-2 gap-2 mt-2 bg-bg-surface-secondary/60 p-2 rounded-lg border border-border">
                            <div>
                              <span className="text-[9px] font-bold text-text-muted uppercase block">Paramedic / Crew</span>
                              <div className="flex items-center gap-1 font-semibold text-text-main text-[11px] mt-0.5">
                                <UserCheck size={12} className="text-brand-primary shrink-0" />
                                <span className="truncate">{ambulance.driverName || 'Lead Crew'}</span>
                              </div>
                              {ambulance.driverPhone && (
                                <a href={`tel:${ambulance.driverPhone}`} className="text-[10px] text-text-muted hover:text-brand-primary flex items-center gap-1 mt-0.5">
                                  <Phone size={10} />
                                  <span>{ambulance.driverPhone}</span>
                                </a>
                              )}
                            </div>

                            <div className="border-l border-border pl-2">
                              <span className="text-[9px] font-bold text-text-muted uppercase block">Readiness & Speed</span>
                              <div className="flex items-center justify-between mt-0.5">
                                <span className="flex items-center gap-1 text-[11px] font-bold text-text-main">
                                  <Fuel size={12} className="text-operational" />
                                  {ambulance.fuelLevel || 90}%
                                </span>
                                <span className="text-[10px] font-semibold text-text-muted font-mono">
                                  {ambulance.speed || 0} km/h
                                </span>
                              </div>
                              <span className="text-[9px] text-text-muted block mt-0.5">
                                Heading: {ambulance.heading || 0}°
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Assigned Incident Notice */}
                        {hasAssignedIncident ? (
                          <div className="p-2 bg-brand-primary/10 border border-brand-primary/20 rounded-md flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              <ShieldAlert size={13} className="text-brand-primary shrink-0" />
                              <span className="text-[11px] font-bold text-brand-primary truncate">
                                Tasked: {typeof ambulance.currentIncident === 'object' && ambulance.currentIncident !== null ? (ambulance.currentIncident.title || ambulance.currentIncident.incidentId) : (ambulance.currentAssignment || 'Active Incident')}
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-text-muted uppercase shrink-0 ml-1">ASSIGNED</span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-operational flex items-center gap-1 font-semibold">
                            <CheckCircle size={12} />
                            <span>Standing by in {ambulance.area || ambulance.city} patrol zone</span>
                          </div>
                        )}

                        {/* Equipment tags */}
                        {ambulance.equipment && ambulance.equipment.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ambulance.equipment.slice(0, 3).map((eq, i) => (
                              <span key={i} className="px-1.5 py-0.5 bg-bg-surface-secondary text-[9px] text-text-muted rounded border border-border">
                                {eq}
                              </span>
                            ))}
                            {ambulance.equipment.length > 3 && (
                              <span className="px-1.5 py-0.5 text-[9px] text-text-muted">+{ambulance.equipment.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card Action Controls */}
                      <div className="flex items-center border-t border-border divide-x divide-border bg-bg-surface-secondary/40 text-[11px] font-bold">
                        {isAvailable ? (
                          <>
                            <button
                              onClick={() => handleOpenAssign(ambulance)}
                              className="flex-1 flex items-center justify-center gap-1 py-2 text-brand-primary hover:bg-brand-primary/10 transition-colors"
                            >
                              <ArrowRight size={13} />
                              Assign Incident
                            </button>
                            <button
                              onClick={() => handleStatusChange(ambulance, 'MAINTENANCE')}
                              className="px-3 py-2 text-text-muted hover:text-emergency hover:bg-emergency/10 transition-colors"
                              title="Set Under Maintenance"
                            >
                              <Wrench size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStatusChange(ambulance, 'AVAILABLE')}
                              className="flex-1 flex items-center justify-center gap-1 py-2 text-operational hover:bg-operational/10 transition-colors"
                            >
                              <CheckCircle size={13} />
                              Mark Available
                            </button>
                            <select
                              value={ambulance.status}
                              onChange={e => handleStatusChange(ambulance, e.target.value)}
                              className="bg-transparent px-2 py-2 text-[10px] font-bold text-text-muted outline-none cursor-pointer"
                            >
                              <option value="AVAILABLE">AVAILABLE</option>
                              <option value="EN_ROUTE">EN ROUTE</option>
                              <option value="ON_SCENE">ON SCENE</option>
                              <option value="TRANSPORTING">TRANSPORTING</option>
                              <option value="RETURNING">RETURNING</option>
                              <option value="MAINTENANCE">MAINTENANCE</option>
                              <option value="OFFLINE">OFFLINE</option>
                            </select>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assign Ambulance to Incident Modal */}
      <AnimatePresence>
        {assignModalAmb && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-bg-surface-secondary">
                <div>
                  <h3 className="text-sm font-bold text-text-main">Manual Incident Dispatch</h3>
                  <p className="text-xs text-text-muted">Tasking Unit {assignModalAmb.ambulanceId} ({assignModalAmb.type?.replace(/_/g, ' ')})</p>
                </div>
                <button onClick={() => setAssignModalAmb(null)} className="text-text-muted hover:text-text-main">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConfirmAssignment} className="p-5 space-y-4 text-xs">
                {activeIncidents.length === 0 ? (
                  <div className="p-4 bg-bg-surface-secondary rounded-lg text-center text-text-muted">
                    No active pending incidents require dispatch right now.
                  </div>
                ) : (
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1.5">
                      Select Target Incident
                    </label>
                    <select
                      value={selectedIncidentForAssign}
                      onChange={e => setSelectedIncidentForAssign(e.target.value)}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none cursor-pointer"
                    >
                      {activeIncidents.map(inc => (
                        <option key={inc._id || inc.incidentId} value={inc._id || inc.incidentId}>
                          [{inc.category}] Severity {inc.severity}/10 - {inc.title || inc.description?.substring(0, 45)}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-text-muted mt-1.5">
                      Assigning this unit immediately flags it as unavailable and transmits automated turn-by-turn routing to the vehicle terminal.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setAssignModalAmb(null)}
                    className="px-4 py-2 border border-border rounded-md text-text-muted hover:text-text-main font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={activeIncidents.length === 0}
                    className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-md font-bold transition-all shadow-sm"
                  >
                    Confirm Dispatch
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Ambulance Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-bg-surface-secondary">
                <div>
                  <h3 className="text-sm font-bold text-text-main">Register Emergency Vehicle</h3>
                  <p className="text-xs text-text-muted">Enroll a new response vehicle into the active dispatch fleet</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-main">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateAmbulance} className="p-5 space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Registration Number</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TS-09-EQ-1030"
                      value={newAmbForm.registrationNumber}
                      onChange={e => setNewAmbForm({ ...newAmbForm, registrationNumber: e.target.value })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none focus:border-brand-primary font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Vehicle Type</label>
                    <select
                      value={newAmbForm.type}
                      onChange={e => setNewAmbForm({ ...newAmbForm, type: e.target.value })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none cursor-pointer"
                    >
                      <option value="ADVANCED_LIFE_SUPPORT">Advanced Life Support (ALS)</option>
                      <option value="ICU_AMBULANCE">ICU Ambulance</option>
                      <option value="BASIC_LIFE_SUPPORT">Basic Life Support (BLS)</option>
                      <option value="FIRE_ENGINE">Fire Engine Tender</option>
                      <option value="RESCUE_BOAT">Disaster Rescue Boat</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Operational Zone</label>
                    <select
                      value={newAmbForm.area}
                      onChange={e => setNewAmbForm({ ...newAmbForm, area: e.target.value })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none cursor-pointer"
                    >
                      {AREAS.filter(a => a !== 'All Areas').map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Initial Status</label>
                    <select
                      value={newAmbForm.status}
                      onChange={e => setNewAmbForm({ ...newAmbForm, status: e.target.value })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none cursor-pointer"
                    >
                      <option value="AVAILABLE">AVAILABLE (On Patrol)</option>
                      <option value="MAINTENANCE">UNDER MAINTENANCE</option>
                      <option value="OFFLINE">OFFLINE</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Paramedic / Driver Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Anand Kumar"
                      value={newAmbForm.driverName}
                      onChange={e => setNewAmbForm({ ...newAmbForm, driverName: e.target.value })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Emergency Mobile</label>
                    <input
                      type="text"
                      value={newAmbForm.driverPhone}
                      onChange={e => setNewAmbForm({ ...newAmbForm, driverPhone: e.target.value })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-border rounded-md text-text-muted hover:text-text-main font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-md font-bold transition-all shadow-sm"
                  >
                    Enroll Vehicle
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AmbulancesList;
