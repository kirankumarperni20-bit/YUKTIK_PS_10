import { Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import LandingPage from './pages/LandingPage';
import CitizenReport from './pages/CitizenReport';
import CitizenTracking from './pages/CitizenTracking';
import DashboardLayout from './layouts/DashboardLayout';
import CommandDashboard from './pages/CommandDashboard';
import DriverDashboard from './pages/DriverDashboard';
import IncidentsList from './pages/IncidentsList';
import AmbulancesList from './pages/AmbulancesList';
import HospitalsList from './pages/HospitalsList';
import DispatchBoard from './pages/DispatchBoard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import ReportsView from './pages/ReportsView';
import RoadConditions from './pages/RoadConditions';
import SettingsView from './pages/SettingsView';
import DriverRoute from './pages/DriverRoute';
import LoginPage from './pages/LoginPage';
import Ps10Simulator from './pages/Ps10Simulator';
import useAuthStore from './stores/authStore';
import useDemoStore from './demo/demoStore';
import { apiService, isSystemDemoMode, API_URL } from './services/apiService';

const SOCKET_URL = API_URL.replace(/\/api$/, '');

const ProtectedRoute = ({ children }) => {
  return children;
};

function App() {
  useEffect(() => {
    if (!isSystemDemoMode) {
      const fetchLiveData = async () => {
        try {
          const [incidents, ambulances, hospitals, dispatches, alerts, roads, historical] = await Promise.all([
            apiService.getIncidents(),
            apiService.getAmbulances(),
            apiService.getHospitals(),
            apiService.execute(() => import('axios').then(a => a.default.get(`${API_URL}/dispatch/active`)), () => []),
            apiService.execute(() => import('axios').then(a => a.default.get(`${API_URL}/alerts`)), () => []),
            apiService.execute(() => import('axios').then(a => a.default.get(`${API_URL}/roads`)), () => []),
            apiService.execute(() => import('axios').then(a => a.default.get(`${API_URL}/historical`)), () => [])
          ]);
          
          const mappedHistorical = (historical || []).map(h => ({
            _id: h._id,
            year: new Date(h.createdAt).getFullYear(),
            date: h.createdAt,
            category: h.category || 'MEDICAL_EMERGENCY',
            severity: h.severity || 5,
            city: h.city || (h.address ? h.address.split(',').pop().trim() : 'Unknown')
          }));

          const currentState = useDemoStore.getState();
          useDemoStore.setState({
            incidents: (incidents && incidents.length > 0) ? incidents : currentState.incidents,
            ambulances: (ambulances && ambulances.length > 0) ? ambulances : currentState.ambulances,
            hospitals: (hospitals && hospitals.length > 0) ? hospitals : currentState.hospitals,
            dispatches: (dispatches && dispatches.length > 0) ? dispatches : currentState.dispatches,
            alerts: (alerts && alerts.length > 0) ? alerts : currentState.alerts,
            roadConditions: (roads && roads.length > 0) ? roads : currentState.roadConditions,
            historicalIncidents: (mappedHistorical && mappedHistorical.length > 0) ? mappedHistorical : currentState.historicalIncidents
          });
        } catch (error) {
          console.error('Failed to fetch live data:', error);
        }
      };

      // Initial fetch
      fetchLiveData();

      // Periodic live data synchronization (polling every 4 seconds)
      const interval = setInterval(fetchLiveData, 4000);

      // Real-time WebSocket connection
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true
      });

      socket.on('incident:created', (newIncident) => {
        if (!newIncident) return;
        useDemoStore.setState((state) => {
          const exists = state.incidents.some(i => i._id === newIncident._id || i.incidentId === newIncident.incidentId);
          if (exists) {
            return {
              incidents: state.incidents.map(i => (i._id === newIncident._id || i.incidentId === newIncident.incidentId) ? { ...i, ...newIncident } : i)
            };
          }
          return { incidents: [newIncident, ...state.incidents] };
        });
      });

      socket.on('incident:status', (updated) => {
        if (!updated) return;
        useDemoStore.setState((state) => ({
          incidents: state.incidents.map(i => (i._id === updated._id || i.incidentId === updated.incidentId) ? { ...i, ...updated } : i)
        }));
      });

      socket.on('incident:updated', (updated) => {
        if (!updated) return;
        useDemoStore.setState((state) => ({
          incidents: state.incidents.map(i => (i._id === updated._id || i.incidentId === updated.incidentId) ? { ...i, ...updated } : i)
        }));
      });

      socket.on('ambulance:status', (updatedAmb) => {
        if (!updatedAmb) return;
        useDemoStore.setState((state) => ({
          ambulances: state.ambulances.map(a => (a._id === updatedAmb._id || a.ambulanceId === updatedAmb.ambulanceId) ? { ...a, ...updatedAmb } : a)
        }));
      });

      socket.on('dispatch:created', (dispatch) => {
        if (!dispatch) return;
        useDemoStore.setState((state) => ({
          dispatches: [dispatch, ...(state.dispatches || [])]
        }));
      });

      return () => {
        clearInterval(interval);
        socket.disconnect();
      };
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-primary-900">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/report" element={<CitizenReport />} />
        <Route path="/track/:token" element={<CitizenTracking />} />

        {/* Dispatcher Dashboard Routes */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout role="DISPATCHER" /></ProtectedRoute>}>
          <Route index element={<CommandDashboard />} />
          <Route path="ps10" element={<Ps10Simulator />} />
          <Route path="incidents" element={<IncidentsList />} />
          <Route path="ambulances" element={<AmbulancesList />} />
          <Route path="hospitals" element={<HospitalsList />} />
          <Route path="dispatch" element={<DispatchBoard />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="reports" element={<ReportsView />} />
          <Route path="roads" element={<RoadConditions />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>

        {/* Driver Dashboard Routes */}
        <Route path="/driver" element={<ProtectedRoute><DashboardLayout role="DRIVER" /></ProtectedRoute>}>
          <Route index element={<DriverDashboard />} />
          <Route path="route" element={<DriverRoute />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
