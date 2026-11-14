import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldAlert, 
  Clock, 
  MapPin, 
  Truck, 
  Hospital, 
  PhoneCall, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Navigation,
  Zap,
  Activity
} from 'lucide-react';
import { apiService, API_URL } from '../services/apiService';
import MapComponent from '../components/MapComponent';

const CitizenTracking = () => {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState('');

  const fetchTracking = async () => {
    try {
      const res = await apiService.trackIncident(token);
      setData(res);
      // If still pending, trigger auto-dispatch once
      if (res && (!res.assignedAmbulance || res.status === 'PENDING') && res.incidentId) {
        try {
          await axios.post(`${API_URL}/incidents/${res.incidentId}/auto-dispatch`);
          const updated = await apiService.trackIncident(token);
          if (updated) setData(updated);
        } catch (e) {
          // ignore background auto-dispatch failure
        }
      }
    } catch (err) {
      setError('Unable to locate emergency tracking record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    const interval = setInterval(fetchTracking, 3000);
    return () => clearInterval(interval);
  }, [token]);

  const handleManualAutoDispatch = async () => {
    setDispatching(true);
    try {
      if (data?.incidentId) {
        await axios.post(`${API_URL}/incidents/${data.incidentId}/auto-dispatch`);
      }
      const updated = await apiService.trackIncident(token);
      setData(updated);
    } catch (err) {
      console.warn("Manual auto-dispatch error:", err);
    } finally {
      setDispatching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900 text-text-main flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-info border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-text-muted uppercase tracking-wider">Locating Emergency Dispatch Feed...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-primary-900 text-text-main flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-emergency mb-4" />
        <h2 className="text-xl font-bold mb-2">Emergency Record Not Found</h2>
        <p className="text-sm text-text-muted max-w-md mb-6">{error || 'Please check your tracking link.'}</p>
        <Link to="/report" className="px-4 py-2 bg-text-main text-white rounded-md text-xs font-bold">
          Submit New Emergency
        </Link>
      </div>
    );
  }

  const { incidentId, category, status, address, assignedAmbulance, assignedHospital, explanation } = data;

  return (
    <div className="min-h-screen bg-primary-900 text-text-main flex flex-col p-6">
      <div className="max-w-3xl mx-auto w-full space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between border-b border-primary-700 pb-4">
          <Link to="/" className="flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-main transition-colors">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <span className="text-xs font-mono text-text-muted">Tracking Ref: {token}</span>
        </div>

        {/* Live Status Header */}
        <div className="bg-primary-800 border border-primary-700 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emergency/20 text-emergency border border-emergency/30">
                  {category}
                </span>
                <span className="text-xs font-mono text-text-muted">ID: {incidentId}</span>
              </div>
              <h1 className="text-xl font-black text-text-main">Live Emergency Response Status</h1>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2 bg-primary-900 px-3.5 py-2 rounded-lg border border-primary-700">
                <span className="w-2.5 h-2.5 rounded-full bg-operational animate-pulse"></span>
                <span className="text-xs font-bold uppercase tracking-wider text-operational">
                  {assignedAmbulance ? 'DISPATCHED' : status}
                </span>
              </div>

              {!assignedAmbulance && (
                <button
                  onClick={handleManualAutoDispatch}
                  disabled={dispatching}
                  className="flex items-center gap-1.5 px-3 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Zap size={14} className="animate-pulse" />
                  <span>{dispatching ? 'Assigning...' : 'Dispatch Unit Now'}</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-text-muted flex items-center gap-1.5 mb-4">
            <MapPin size={14} className="text-info shrink-0" />
            {address}
          </p>

          {/* Stepper */}
          <div className="grid grid-cols-4 gap-2 pt-4 border-t border-primary-700 text-center">
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 size={18} className="text-operational" />
              <span className="text-[10px] font-bold text-text-main uppercase">Reported</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 size={18} className={assignedAmbulance ? 'text-operational' : 'text-text-muted'} />
              <span className="text-[10px] font-bold text-text-main uppercase">Dispatched</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Navigation size={18} className={status === 'ON_SCENE' || status === 'TRANSPORTING' ? 'text-operational' : 'text-text-muted'} />
              <span className="text-[10px] font-bold text-text-main uppercase">On Scene</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Hospital size={18} className={status === 'AT_HOSPITAL' || status === 'RESOLVED' ? 'text-operational' : 'text-text-muted'} />
              <span className="text-[10px] font-bold text-text-main uppercase">Hospital</span>
            </div>
          </div>
        </div>

        {/* Assigned Unit & Hospital Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-primary-800 border border-primary-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Truck size={18} className="text-info" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">Assigned Vehicle</h3>
            </div>
            {assignedAmbulance ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Unit ID:</span>
                  <strong className="font-mono text-text-main">{assignedAmbulance.ambulanceId || assignedAmbulance.registrationNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Capability:</span>
                  <span className="text-info font-semibold">{assignedAmbulance.type?.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Crew / Lead:</span>
                  <span>{assignedAmbulance.driverName || 'Lead Paramedic Response Team'}</span>
                </div>
                {assignedAmbulance.driverPhone && (
                  <div className="flex justify-between pt-2 border-t border-primary-700">
                    <span className="text-text-muted">Contact:</span>
                    <a href={`tel:${assignedAmbulance.driverPhone}`} className="text-operational font-bold flex items-center gap-1 hover:underline">
                      <PhoneCall size={12} /> {assignedAmbulance.driverPhone}
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-text-muted italic mb-3">Global optimization engine is selecting the optimal emergency unit...</p>
                <button
                  onClick={handleManualAutoDispatch}
                  disabled={dispatching}
                  className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  {dispatching ? 'Assigning...' : '⚡ Trigger Immediate Dispatch'}
                </button>
              </div>
            )}
          </div>

          <div className="bg-primary-800 border border-primary-700 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Hospital size={18} className="text-operational" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">Designated Facility</h3>
            </div>
            {assignedHospital ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Facility:</span>
                  <strong className="text-text-main">{assignedHospital.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Address:</span>
                  <span className="text-text-muted truncate max-w-[200px]" title={assignedHospital.address}>{assignedHospital.address || 'Hyderabad'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">ICU Availability:</span>
                  <span className="text-operational font-bold">{assignedHospital.availableIcuBeds !== undefined ? assignedHospital.availableIcuBeds : 4} Beds</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Status:</span>
                  <span className="text-operational font-semibold">Intake & Resuscitation Ready</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-muted italic py-4">Emergency triage is determining the best clinical destination...</p>
            )}
          </div>
        </div>

        {/* Live Dynamic Dispatch Map */}
        {assignedAmbulance && (
          <div className="bg-primary-800 border border-primary-700 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Navigation size={16} className="text-info" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">Live Real-Time Dispatch Map</h3>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-info/10 text-info border border-info/20">
                GPS Live Tracking
              </span>
            </div>
            <div className="h-72 rounded-lg overflow-hidden border border-primary-700 relative z-0">
              <MapComponent
                incidents={data.location?.coordinates ? [{
                  _id: data.incidentId,
                  incidentId: data.incidentId,
                  category: data.category,
                  severity: 7,
                  location: data.location,
                  address: data.address,
                  status: 'ASSIGNED'
                }] : []}
                ambulances={assignedAmbulance ? [assignedAmbulance] : []}
                hospitals={assignedHospital ? [assignedHospital] : []}
              />
            </div>
          </div>
        )}

        {/* AI Explainability Banner */}
        {explanation && (
          <div className="bg-primary-800/60 border border-primary-700 p-4 rounded-xl text-xs text-text-secondary">
            <strong className="text-text-main block mb-1">🤖 AI Dispatch Reasoning:</strong>
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitizenTracking;
