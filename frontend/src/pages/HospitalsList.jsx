import React, { useState } from 'react';
import {
  Hospital, BedDouble, MapPin, Filter, Search, Activity, Stethoscope,
  Edit3, Check, X, AlertTriangle, HeartPulse, ShieldAlert, Phone,
  Plus, Eye, ArrowUpDown, ShieldCheck, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useDemoStore from '../demo/demoStore';
import { apiService } from '../services/apiService';

const AREAS = [
  'All Areas', 'Gachibowli', 'Madhapur', 'HITEC City', 'Kukatpally',
  'Secunderabad', 'Begumpet', 'Ameerpet', 'LB Nagar', 'Uppal',
  'Banjara Hills', 'Jubilee Hills', 'Mehdipatnam', 'Nampally', 'Dilsukhnagar'
];

const CITIES = ['All India', 'Hyderabad', 'Telangana', 'New Delhi', 'Mumbai', 'Bengaluru', 'Chennai', 'Kolkata'];

const HospitalsList = () => {
  const allHospitals = useDemoStore(state => state.hospitals);
  const activeCityFilter = useDemoStore(state => state.activeCityFilter);
  const setCityFilter = useDemoStore(state => state.setCityFilter);

  const [selectedArea, setSelectedArea] = useState('All Areas');
  const [capabilityFilter, setCapabilityFilter] = useState('ALL'); // ALL, HAS_ICU, ZERO_ICU, CARDIAC, TRAUMA, ACTIVE
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('NAME'); // NAME, ICU_BEDS, GENERAL_BEDS, OCCUPANCY, EMERGENCY_BEDS

  // Modals
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [detailsHospital, setDetailsHospital] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [alertNotice, setAlertNotice] = useState('');

  // Add hospital form
  const [newHospitalForm, setNewHospitalForm] = useState({
    name: '',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Gachibowli',
    address: '',
    contactPhone: '+91 40 ',
    bedsTotal: 300,
    bedsAvailable: 35,
    icuBeds: 40,
    availableIcuBeds: 6,
    emergencyBeds: 30,
    availableEmergencyBeds: 10,
    ventilators: 15,
    availableVentilators: 3,
    cardiacFacility: true,
    traumaCenter: true,
    traumaLevel: 1,
    type: 'PRIVATE',
    status: 'ACTIVE'
  });

  // Filter logic
  const filteredHospitals = allHospitals.filter(h => {
    // City / State filter
    if (activeCityFilter !== 'All India') {
      if (activeCityFilter === 'Telangana') {
        if (h.state !== 'Telangana' && h.city !== 'Hyderabad') return false;
      } else if (h.city !== activeCityFilter) {
        return false;
      }
    }

    // Area filter
    if (selectedArea !== 'All Areas') {
      if (!h.area || !h.area.toLowerCase().includes(selectedArea.toLowerCase())) {
        if (!h.address || !h.address.toLowerCase().includes(selectedArea.toLowerCase())) {
          return false;
        }
      }
    }

    // Capability filter
    const icuCount = h.availableIcuBeds !== undefined ? h.availableIcuBeds : (h.icuBeds || 0);
    if (capabilityFilter === 'HAS_ICU' && icuCount <= 0) return false;
    if (capabilityFilter === 'ZERO_ICU' && icuCount > 0) return false;
    if (capabilityFilter === 'CARDIAC' && !h.cardiacFacility && !h.specialties?.some(s => s.toLowerCase().includes('cardio'))) return false;
    if (capabilityFilter === 'TRAUMA' && !h.traumaCenter) return false;
    if (capabilityFilter === 'ACTIVE' && h.status !== 'ACTIVE') return false;

    // Search query
    if (search && search.trim() !== '') {
      const q = search.toLowerCase();
      const matchName = h.name && h.name.toLowerCase().includes(q);
      const matchArea = h.area && h.area.toLowerCase().includes(q);
      const matchAddr = h.address && h.address.toLowerCase().includes(q);
      const matchSpecialty = h.specialties && h.specialties.some(s => s.toLowerCase().includes(q));
      if (!matchName && !matchArea && !matchAddr && !matchSpecialty) return false;
    }

    return true;
  });

  // Sorting logic
  const sortedHospitals = [...filteredHospitals].sort((a, b) => {
    const aIcu = a.availableIcuBeds !== undefined ? a.availableIcuBeds : (a.icuBeds || 0);
    const bIcu = b.availableIcuBeds !== undefined ? b.availableIcuBeds : (b.icuBeds || 0);
    const aGen = a.bedsAvailable !== undefined ? a.bedsAvailable : (a.availableBeds || 0);
    const bGen = b.bedsAvailable !== undefined ? b.bedsAvailable : (b.availableBeds || 0);
    const aEmg = a.availableEmergencyBeds !== undefined ? a.availableEmergencyBeds : (a.emergencyBeds || 0);
    const bEmg = b.availableEmergencyBeds !== undefined ? b.availableEmergencyBeds : (b.emergencyBeds || 0);

    if (sortBy === 'ICU_BEDS') return bIcu - aIcu;
    if (sortBy === 'GENERAL_BEDS') return bGen - aGen;
    if (sortBy === 'EMERGENCY_BEDS') return bEmg - aEmg;
    if (sortBy === 'OCCUPANCY') return (b.occupancy || 0) - (a.occupancy || 0);
    return a.name.localeCompare(b.name);
  });

  // Top dynamic KPI calculations
  const totalFacilities = filteredHospitals.length;
  const totalAvailableICU = filteredHospitals.reduce((sum, h) => sum + (h.availableIcuBeds !== undefined ? h.availableIcuBeds : (h.icuBeds || 0)), 0);
  const zeroIcuDeficitCount = filteredHospitals.filter(h => (h.availableIcuBeds !== undefined ? h.availableIcuBeds : 0) === 0).length;
  const cardiacCentersCount = filteredHospitals.filter(h => h.cardiacFacility || h.specialties?.some(s => s.toLowerCase().includes('cardio'))).length;
  const totalGeneralBeds = filteredHospitals.reduce((sum, h) => sum + (h.bedsAvailable !== undefined ? h.bedsAvailable : (h.availableBeds || 0)), 0);
  const totalEmergencyBeds = filteredHospitals.reduce((sum, h) => sum + (h.availableEmergencyBeds !== undefined ? h.availableEmergencyBeds : (h.emergencyBeds || 0)), 0);

  const handleOpenEdit = (hospital) => {
    setSelectedHospital(hospital);
    setEditForm({
      availableIcuBeds: hospital.availableIcuBeds !== undefined ? hospital.availableIcuBeds : 4,
      bedsAvailable: hospital.bedsAvailable !== undefined ? hospital.bedsAvailable : (hospital.availableBeds || 25),
      availableEmergencyBeds: hospital.availableEmergencyBeds !== undefined ? hospital.availableEmergencyBeds : 10,
      availableVentilators: hospital.availableVentilators !== undefined ? hospital.availableVentilators : 3,
      occupancy: hospital.occupancy || 75,
      cardiacFacility: Boolean(hospital.cardiacFacility),
      traumaCenter: Boolean(hospital.traumaCenter),
      status: hospital.status || 'ACTIVE'
    });
  };

  const handleSaveCapacity = async (e) => {
    e.preventDefault();
    if (!selectedHospital) return;
    setIsUpdating(true);

    try {
      await apiService.updateHospitalCapacity(selectedHospital._id, editForm);
      if (editForm.availableIcuBeds === 0) {
        setAlertNotice(`ZERO ICU HARD-CONSTRAINT TRIGGERED: ${selectedHospital.name} updated to 0 available ICU beds. Global optimizer and dynamic reallocation engine re-routed incoming high-acuity/cardiac patients.`);
      } else {
        setAlertNotice(`Capacity successfully updated for ${selectedHospital.name}.`);
      }
      setSelectedHospital(null);
    } catch (err) {
      alert("Failed to update hospital capacity");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleStatus = async (hospital) => {
    const nextStatus = hospital.status === 'ACTIVE' ? 'OVERCAPACITY' : (hospital.status === 'OVERCAPACITY' ? 'OFFLINE' : 'ACTIVE');
    try {
      await apiService.updateHospitalStatus(hospital._id, nextStatus);
      setAlertNotice(`Status updated: ${hospital.name} is now ${nextStatus}.`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateHospital = async (e) => {
    e.preventDefault();
    try {
      await apiService.createHospital(newHospitalForm);
      setAlertNotice(`Hospital "${newHospitalForm.name}" registered successfully.`);
      setShowAddModal(false);
      setNewHospitalForm({
        name: '',
        city: 'Hyderabad',
        state: 'Telangana',
        area: 'Gachibowli',
        address: '',
        contactPhone: '+91 40 ',
        bedsTotal: 300,
        bedsAvailable: 35,
        icuBeds: 40,
        availableIcuBeds: 6,
        emergencyBeds: 30,
        availableEmergencyBeds: 10,
        ventilators: 15,
        availableVentilators: 3,
        cardiacFacility: true,
        traumaCenter: true,
        traumaLevel: 1,
        type: 'PRIVATE',
        status: 'ACTIVE'
      });
    } catch (err) {
      alert("Failed to register hospital");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500 pb-16">
      {/* Alert Banner */}
      <AnimatePresence>
        {alertNotice && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between p-3.5 bg-brand-primary/10 border border-brand-primary/30 rounded-lg text-text-main text-xs font-medium"
          >
            <div className="flex items-center gap-2.5">
              <Zap size={16} className="text-brand-primary shrink-0 animate-pulse" />
              <span>{alertNotice}</span>
            </div>
            <button onClick={() => setAlertNotice('')} className="text-text-muted hover:text-text-main">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Dynamic KPI Strip */}
      <div className="flex flex-col xl:flex-row items-start xl:items-end justify-between gap-6 bg-bg-surface/50 p-5 rounded-xl border border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hospital className="text-brand-primary" size={20} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">Emergency Medical Infrastructure</span>
          </div>
          <h1 className="text-2xl font-black text-text-main tracking-tight mb-3">Hospital Network & Clinical Capacity</h1>

          {/* Dynamic Calculated Statistics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Monitored Facilities</span>
              <span className="text-base font-extrabold text-text-main">{totalFacilities} Units</span>
            </div>
            <div className="flex flex-col border-l border-border pl-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Available ICU</span>
              <span className="text-base font-extrabold text-operational">{totalAvailableICU} Beds</span>
            </div>
            <div className="flex flex-col border-l border-border pl-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Zero ICU Deficit</span>
              <span className={`text-base font-extrabold ${zeroIcuDeficitCount > 0 ? 'text-emergency' : 'text-operational'}`}>
                {zeroIcuDeficitCount} Facilities
              </span>
            </div>
            <div className="flex flex-col border-l border-border pl-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Cardiac Centers</span>
              <span className="text-base font-extrabold text-info">{cardiacCentersCount} Centers</span>
            </div>
            <div className="flex flex-col border-l border-border pl-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">General Beds</span>
              <span className="text-base font-extrabold text-text-main">{totalGeneralBeds} Available</span>
            </div>
            <div className="flex flex-col border-l border-border pl-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Emergency Capacity</span>
              <span className="text-base font-extrabold text-warning">{totalEmergencyBeds} Beds</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider shadow-sm transition-all self-stretch sm:self-auto justify-center"
        >
          <Plus size={16} />
          Register Hospital
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-bg-surface p-3.5 rounded-lg border border-border">
        {/* Search */}
        <div className="flex items-center gap-2 bg-bg-surface-secondary border border-border rounded-md px-3 py-1.5 flex-1 max-w-md">
          <Search size={15} className="text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by hospital name, area, specialty..."
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
          {/* City Selector */}
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

          {/* Area Selector */}
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

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-bg-surface-secondary border border-border rounded-md px-2.5 py-1.5">
            <ArrowUpDown size={13} className="text-text-muted" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-text-main outline-none cursor-pointer"
            >
              <option value="NAME">Sort: Hospital Name</option>
              <option value="ICU_BEDS">Sort: Available ICU Beds</option>
              <option value="GENERAL_BEDS">Sort: General Beds</option>
              <option value="EMERGENCY_BEDS">Sort: Emergency Capacity</option>
              <option value="OCCUPANCY">Sort: Occupancy %</option>
            </select>
          </div>
        </div>
      </div>

      {/* Capability Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL', label: 'All Facilities' },
          { id: 'HAS_ICU', label: 'ICU Available (>0)' },
          { id: 'ZERO_ICU', label: 'Zero ICU (=0 Deficit)' },
          { id: 'CARDIAC', label: 'Cardiac Centers' },
          { id: 'TRAUMA', label: 'Trauma Centers' },
          { id: 'ACTIVE', label: 'Operational Only' }
        ].map(pill => (
          <button
            key={pill.id}
            onClick={() => setCapabilityFilter(pill.id)}
            className={`px-3 py-1.5 rounded-full font-bold text-[11px] whitespace-nowrap transition-colors border ${capabilityFilter === pill.id
              ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
              : 'bg-bg-surface text-text-muted border-border hover:bg-bg-surface-secondary hover:text-text-main'
              }`}
          >
            {pill.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-text-muted font-medium pr-2">
          Showing {sortedHospitals.length} of {allHospitals.length} facilities
        </span>
      </div>

      {/* Hospital Cards Grid */}
      {sortedHospitals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-bg-surface border border-dashed border-border rounded-xl">
          <Hospital size={40} className="text-text-muted mb-3" />
          <h3 className="text-base font-bold text-text-main">No facilities match criteria</h3>
          <p className="text-xs text-text-muted mt-1">Try switching to "All India" or clearing your area/capability filters.</p>
          <button
            onClick={() => { setCityFilter('All India'); setSelectedArea('All Areas'); setCapabilityFilter('ALL'); setSearch(''); }}
            className="mt-4 px-4 py-2 bg-bg-surface-secondary border border-border text-xs font-bold text-text-main rounded-md hover:bg-border transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedHospitals.map(hospital => {
            const icu = hospital.availableIcuBeds !== undefined ? hospital.availableIcuBeds : (hospital.icuBeds || 0);
            const totalIcu = hospital.icuBeds || 30;
            const general = hospital.bedsAvailable !== undefined ? hospital.bedsAvailable : (hospital.availableBeds || 20);
            const totalGeneral = hospital.bedsTotal || 200;
            const emergency = hospital.availableEmergencyBeds !== undefined ? hospital.availableEmergencyBeds : (hospital.emergencyBeds || 10);
            const occupancy = hospital.occupancy || Math.round(((totalGeneral - general) / totalGeneral) * 100);

            const isZeroIcu = icu === 0;
            const isOffline = hospital.status === 'OFFLINE';
            const isOvercapacity = hospital.status === 'OVERCAPACITY' || occupancy > 92;

            return (
              <motion.div
                key={hospital._id || hospital.hospitalId}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex flex-col bg-bg-surface border rounded-xl overflow-hidden shadow-sm transition-all hover:border-brand-primary/40 ${isZeroIcu ? 'border-emergency/40 bg-emergency/[0.02]' : 'border-border'
                  }`}
              >
                {/* Top Badge Strip */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-surface-secondary/40 text-[10px] font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-muted uppercase tracking-wider">{hospital.area || hospital.city}</span>
                    <span className="text-text-muted">•</span>
                    <span className="text-text-muted uppercase">{hospital.type || 'HOSPITAL'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      onClick={() => handleToggleStatus(hospital)}
                      title="Click to toggle status"
                      className={`cursor-pointer px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-extrabold ${isOffline
                        ? 'bg-text-muted/20 text-text-muted border border-text-muted/30'
                        : isOvercapacity
                          ? 'bg-warning/20 text-warning border border-warning/30'
                          : 'bg-operational/20 text-operational border border-operational/30'
                        }`}
                    >
                      {hospital.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-text-main line-clamp-1">{hospital.name}</h3>
                      {hospital.hospitalId && (
                        <span className="text-[10px] font-mono text-text-muted shrink-0">{hospital.hospitalId}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-1 line-clamp-1">
                      <MapPin size={12} className="shrink-0 text-brand-primary" />
                      <span>{hospital.address || `${hospital.area}, ${hospital.city}`}</span>
                    </div>

                    {hospital.contactPhone && (
                      <div className="flex items-center gap-1.5 text-[11px] text-text-muted mt-1">
                        <Phone size={12} className="shrink-0 text-text-muted" />
                        <span>{hospital.contactPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* Bed Capacity Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-bg-surface-secondary/60 p-2.5 rounded-lg border border-border">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-text-muted uppercase">Available ICU</span>
                      <span className={`text-sm font-extrabold ${isZeroIcu ? 'text-emergency animate-pulse' : 'text-operational'}`}>
                        {icu} <span className="text-[10px] font-normal text-text-muted">/ {totalIcu}</span>
                      </span>
                    </div>
                    <div className="flex flex-col border-l border-border pl-2">
                      <span className="text-[9px] font-bold text-text-muted uppercase">General Beds</span>
                      <span className="text-sm font-extrabold text-text-main">
                        {general} <span className="text-[10px] font-normal text-text-muted">/ {totalGeneral}</span>
                      </span>
                    </div>
                    <div className="flex flex-col border-l border-border pl-2">
                      <span className="text-[9px] font-bold text-text-muted uppercase">Emergency</span>
                      <span className="text-sm font-extrabold text-warning">
                        {emergency} <span className="text-[10px] font-normal text-text-muted">avail</span>
                      </span>
                    </div>
                  </div>

                  {/* Capabilities Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {hospital.cardiacFacility && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emergency/10 text-emergency border border-emergency/20">
                        <HeartPulse size={11} />
                        Cardiac Center
                      </span>
                    )}
                    {hospital.traumaCenter && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                        <ShieldAlert size={11} />
                        Level {hospital.traumaLevel || 1} Trauma
                      </span>
                    )}
                    {hospital.availableVentilators !== undefined && hospital.availableVentilators > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-info/10 text-info border border-info/20">
                        <Activity size={11} />
                        {hospital.availableVentilators} Ventilators
                      </span>
                    )}
                  </div>

                  {/* Occupancy Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-text-muted mb-1">
                      <span>Facility Occupancy</span>
                      <span className={occupancy > 85 ? 'text-emergency' : 'text-text-main'}>{occupancy}%</span>
                    </div>
                    <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${occupancy > 90 ? 'bg-emergency' : (occupancy > 75 ? 'bg-warning' : 'bg-operational')
                          }`}
                        style={{ width: `${Math.min(occupancy, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex items-center border-t border-border divide-x divide-border bg-bg-surface-secondary/30">
                  <button
                    onClick={() => setDetailsHospital(hospital)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-text-muted hover:text-text-main hover:bg-bg-surface-secondary transition-colors"
                  >
                    <Eye size={13} />
                    View Details
                  </button>
                  <button
                    onClick={() => handleOpenEdit(hospital)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[11px] font-bold text-brand-primary hover:bg-brand-primary/10 transition-colors"
                  >
                    <Edit3 size={13} />
                    Live Edit Capacity
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Edit Capacity Modal */}
      <AnimatePresence>
        {selectedHospital && editForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-bg-surface-secondary">
                <div>
                  <h3 className="text-sm font-bold text-text-main">Live Capacity & Status Control</h3>
                  <p className="text-xs text-text-muted">{selectedHospital.name}</p>
                </div>
                <button onClick={() => setSelectedHospital(null)} className="text-text-muted hover:text-text-main">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCapacity} className="p-5 space-y-4 text-xs">
                {/* Zero ICU Warning Box */}
                {editForm.availableIcuBeds === 0 && (
                  <div className="p-3 bg-emergency/10 border border-emergency/30 rounded-lg flex items-start gap-2.5 text-emergency">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>CRITICAL CONSTRAINT:</strong> Setting Available ICU to 0 immediately flags this facility under the zero-ICU hard constraint. The Hungarian optimizer and dynamic reallocation engine will immediately avoid routing critical cardiac and trauma patients here.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">
                      Available ICU Beds
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selectedHospital.icuBeds || 100}
                      value={editForm.availableIcuBeds}
                      onChange={e => setEditForm({ ...editForm, availableIcuBeds: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-bold outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">
                      General Beds Available
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.bedsAvailable}
                      onChange={e => setEditForm({ ...editForm, bedsAvailable: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-bold outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">
                      Available Emergency Beds
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.availableEmergencyBeds}
                      onChange={e => setEditForm({ ...editForm, availableEmergencyBeds: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-bold outline-none focus:border-brand-primary"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">
                      Available Ventilators
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.availableVentilators}
                      onChange={e => setEditForm({ ...editForm, availableVentilators: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-bold outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">
                      Operational Status
                    </label>
                    <select
                      value={editForm.status}
                      onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-bold outline-none cursor-pointer"
                    >
                      <option value="ACTIVE">ACTIVE (Operational)</option>
                      <option value="OVERCAPACITY">OVERCAPACITY (Limited)</option>
                      <option value="OFFLINE">OFFLINE (Closed)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">
                      Estimated Occupancy (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.occupancy}
                      onChange={e => setEditForm({ ...editForm, occupancy: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-bold outline-none focus:border-brand-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.cardiacFacility}
                      onChange={e => setEditForm({ ...editForm, cardiacFacility: e.target.checked })}
                      className="rounded border-border text-brand-primary"
                    />
                    <span className="font-semibold text-text-main">Cardiac Facility Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.traumaCenter}
                      onChange={e => setEditForm({ ...editForm, traumaCenter: e.target.checked })}
                      className="rounded border-border text-brand-primary"
                    />
                    <span className="font-semibold text-text-main">Trauma Center Active</span>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setSelectedHospital(null)}
                    className="px-4 py-2 border border-border rounded-md text-text-muted hover:text-text-main font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-md font-bold transition-all shadow-sm flex items-center gap-1.5"
                  >
                    {isUpdating ? 'Saving...' : 'Update Facility'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hospital Details Modal */}
      <AnimatePresence>
        {detailsHospital && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-bg-surface border border-border rounded-xl shadow-2xl max-w-xl w-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-border bg-bg-surface-secondary">
                <div>
                  <h3 className="text-base font-extrabold text-text-main">{detailsHospital.name}</h3>
                  <p className="text-xs text-text-muted">{detailsHospital.hospitalId} • {detailsHospital.city}, {detailsHospital.state}</p>
                </div>
                <button onClick={() => setDetailsHospital(null)} className="text-text-muted hover:text-text-main">
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-bg-surface-secondary p-3 rounded-lg border border-border">
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Address</span>
                    <p className="text-text-main mt-0.5">{detailsHospital.address || 'Central Zone'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Emergency Contact</span>
                    <p className="text-brand-primary font-bold mt-0.5">{detailsHospital.contactPhone || '+91 40 2345 6789'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Coordinates</span>
                    <p className="text-text-main font-mono text-[11px] mt-0.5">
                      {detailsHospital.location?.coordinates ? `${detailsHospital.location.coordinates[1].toFixed(4)}° N, ${detailsHospital.location.coordinates[0].toFixed(4)}° E` : 'Live GPS Linked'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-text-muted uppercase">Ownership / Type</span>
                    <p className="text-text-main font-bold mt-0.5">{detailsHospital.type || 'PRIVATE'} HEALTHCARE</p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1.5">Specialties & Clinical Services</span>
                  <div className="flex flex-wrap gap-1.5">
                    {(detailsHospital.specialties || ['General Surgery', 'Emergency Medicine', 'Critical Care']).map((spec, i) => (
                      <span key={i} className="px-2.5 py-1 bg-bg-surface-secondary border border-border rounded text-[11px] font-semibold text-text-main">
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 text-center">
                  <div className="bg-bg-surface-secondary p-2.5 rounded-lg border border-border">
                    <span className="text-[9px] font-bold text-text-muted uppercase block">Total Beds</span>
                    <span className="text-sm font-extrabold text-text-main">{detailsHospital.bedsTotal || 200}</span>
                  </div>
                  <div className="bg-bg-surface-secondary p-2.5 rounded-lg border border-border">
                    <span className="text-[9px] font-bold text-text-muted uppercase block">Available ICU</span>
                    <span className="text-sm font-extrabold text-operational">{detailsHospital.availableIcuBeds !== undefined ? detailsHospital.availableIcuBeds : 5}</span>
                  </div>
                  <div className="bg-bg-surface-secondary p-2.5 rounded-lg border border-border">
                    <span className="text-[9px] font-bold text-text-muted uppercase block">Ventilators</span>
                    <span className="text-sm font-extrabold text-info">{detailsHospital.availableVentilators || 3}</span>
                  </div>
                  <div className="bg-bg-surface-secondary p-2.5 rounded-lg border border-border">
                    <span className="text-[9px] font-bold text-text-muted uppercase block">Trauma Level</span>
                    <span className="text-sm font-extrabold text-warning">Level {detailsHospital.traumaLevel || 1}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button
                    onClick={() => {
                      const h = detailsHospital;
                      setDetailsHospital(null);
                      handleOpenEdit(h);
                    }}
                    className="px-4 py-2 bg-brand-primary text-white rounded-md font-bold text-xs hover:bg-brand-primary-hover"
                  >
                    Edit Capacity
                  </button>
                  <button
                    onClick={() => setDetailsHospital(null)}
                    className="px-4 py-2 border border-border rounded-md text-text-main font-bold text-xs hover:bg-bg-surface-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Hospital Modal */}
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
                  <h3 className="text-sm font-bold text-text-main">Register Emergency Facility</h3>
                  <p className="text-xs text-text-muted">Add a new hospital or trauma center into the dispatch network</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-text-muted hover:text-text-main">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateHospital} className="p-5 space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Hospital Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Care Hospital HITEC City"
                    value={newHospitalForm.name}
                    onChange={e => setNewHospitalForm({ ...newHospitalForm, name: e.target.value })}
                    className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Zone / Area</label>
                    <select
                      value={newHospitalForm.area}
                      onChange={e => setNewHospitalForm({ ...newHospitalForm, area: e.target.value })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none cursor-pointer"
                    >
                      {AREAS.filter(a => a !== 'All Areas').map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={newHospitalForm.contactPhone}
                      onChange={e => setNewHospitalForm({ ...newHospitalForm, contactPhone: e.target.value })}
                      className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-text-muted uppercase text-[10px] mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Full street address..."
                    value={newHospitalForm.address}
                    onChange={e => setNewHospitalForm({ ...newHospitalForm, address: e.target.value })}
                    className="w-full bg-bg-surface-secondary border border-border rounded-md px-3 py-2 text-text-main font-semibold outline-none"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[9px] mb-1">Total Beds</label>
                    <input
                      type="number"
                      value={newHospitalForm.bedsTotal}
                      onChange={e => setNewHospitalForm({ ...newHospitalForm, bedsTotal: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg-surface-secondary border border-border rounded px-2 py-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[9px] mb-1">Avail Gen</label>
                    <input
                      type="number"
                      value={newHospitalForm.bedsAvailable}
                      onChange={e => setNewHospitalForm({ ...newHospitalForm, bedsAvailable: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg-surface-secondary border border-border rounded px-2 py-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[9px] mb-1">Total ICU</label>
                    <input
                      type="number"
                      value={newHospitalForm.icuBeds}
                      onChange={e => setNewHospitalForm({ ...newHospitalForm, icuBeds: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg-surface-secondary border border-border rounded px-2 py-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-text-muted uppercase text-[9px] mb-1">Avail ICU</label>
                    <input
                      type="number"
                      value={newHospitalForm.availableIcuBeds}
                      onChange={e => setNewHospitalForm({ ...newHospitalForm, availableIcuBeds: parseInt(e.target.value) || 0 })}
                      className="w-full bg-bg-surface-secondary border border-border rounded px-2 py-1.5 font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newHospitalForm.cardiacFacility}
                      onChange={e => setNewHospitalForm({ ...newHospitalForm, cardiacFacility: e.target.checked })}
                      className="rounded border-border text-brand-primary"
                    />
                    <span className="font-semibold text-text-main">Cardiac Facility</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newHospitalForm.traumaCenter}
                      onChange={e => setNewHospitalForm({ ...newHospitalForm, traumaCenter: e.target.checked })}
                      className="rounded border-border text-brand-primary"
                    />
                    <span className="font-semibold text-text-main">Trauma Center</span>
                  </label>
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
                    Register Facility
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

export default HospitalsList;
