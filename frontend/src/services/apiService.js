import axios from 'axios';
import useDemoStore from '../demo/demoStore';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const BASE_URL = API_URL.replace(/\/api$/, '');
export const isSystemDemoMode = import.meta.env.VITE_FORCE_DEMO === 'true';

class ApiService {
  constructor() {
    this.demoStore = useDemoStore.getState();
    useDemoStore.subscribe((state) => {
      this.demoStore = state;
    });
  }

  async execute(requestFn, demoFn) {
    if (isSystemDemoMode) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return demoFn();
    }

    try {
      const response = await requestFn();
      return response.data.data;
    } catch (error) {
      console.warn("Live API Error, utilizing store fallback:", error.message);
      return demoFn();
    }
  }

  // --- Incidents ---
  async getIncidents(token) {
    return this.execute(
      () => axios.get(`${API_URL}/incidents`, { headers: { Authorization: `Bearer ${token}` } }),
      () => this.demoStore.incidents.filter(i => i.status !== 'RESOLVED' && i.status !== 'CANCELLED')
    );
  }

  async createIncident(data, token) {
    const headers = { Authorization: `Bearer ${token}` };
    if (data instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }
    try {
      const res = await axios.post(`${API_URL}/incidents`, data, { headers });
      const newIncident = res.data.data;
      useDemoStore.setState(state => ({ incidents: [newIncident, ...state.incidents] }));
      return res;
    } catch (error) {
      // Demo store fallback
      let rawData = data;
      if (data instanceof FormData) {
        rawData = {
          category: data.get('category'),
          description: data.get('description'),
          address: data.get('address'),
          location: { type: 'Point', coordinates: [parseFloat(data.get('longitude')), parseFloat(data.get('latitude'))] },
          severity: parseInt(data.get('severity')) || 8,
          affectedPeople: parseInt(data.get('affectedPeople')) || 1
        };
      }
      const created = useDemoStore.getState().createIncident(rawData);
      return { data: { success: true, data: created, trackingUrl: `/track/${created._id}` } };
    }
  }

  async trackIncident(token) {
    return this.execute(
      () => axios.get(`${API_URL}/incidents/track/${token}`),
      () => {
        const inc = this.demoStore.incidents.find(i => i.trackingToken === token || i._id === token || i.incidentId === token);
        let amb = this.demoStore.ambulances.find(a => a._id === inc?.assignedAmbulanceId || a.currentIncident === inc?._id);
        if (!amb) {
          amb = this.demoStore.ambulances.find(a => a.status === 'AVAILABLE') || this.demoStore.ambulances[0];
        }
        const hosp = this.demoStore.hospitals.find(h => (h.availableIcuBeds || 0) > 0) || this.demoStore.hospitals[0];
        return {
          incidentId: inc?.incidentId || inc?._id || 'INC-LIVE',
          category: inc?.category || 'MEDICAL_EMERGENCY',
          status: (inc?.status === 'PENDING' || !inc?.status) ? 'ASSIGNED' : inc.status,
          address: inc?.address || 'Reported Location',
          location: inc?.location,
          reportedAt: inc?.createdAt,
          assignedAmbulance: amb,
          assignedHospital: hosp,
          explanation: inc?.allocationExplanation || `AI Dynamic Routing: Dispatched Unit ${amb?.ambulanceId || 'AMB-HYD-001'} (${amb?.type || 'ALS'}). Designated Facility: ${hosp?.name} (${hosp?.availableIcuBeds || 4} ICU beds available).`
        };
      }
    );
  }

  // --- Ambulances ---
  async getAmbulances(token) {
    return this.execute(
      () => axios.get(`${API_URL}/ambulances`, { headers: { Authorization: `Bearer ${token}` } }),
      () => this.demoStore.ambulances
    );
  }

  async createAmbulance(data, token) {
    try {
      const res = await axios.post(`${API_URL}/ambulances`, data, { headers: { Authorization: `Bearer ${token}` } });
      const newAmb = res.data.data;
      useDemoStore.setState(state => ({ ambulances: [newAmb, ...state.ambulances] }));
      return res.data;
    } catch (err) {
      const newAmb = {
        _id: `AMB-HYD-${Date.now().toString().slice(-4)}`,
        ambulanceId: data.ambulanceId || `AMB-HYD-${Date.now().toString().slice(-4)}`,
        registrationNumber: data.registrationNumber || 'TS-09-EQ-9999',
        city: data.city || 'Hyderabad',
        state: data.state || 'Telangana',
        area: data.area || 'Central Hyderabad',
        type: data.type || 'ADVANCED_LIFE_SUPPORT',
        resourceCategory: data.resourceCategory || 'AMBULANCE',
        status: data.status || 'AVAILABLE',
        currentLocation: data.currentLocation || { type: 'Point', coordinates: [78.4867, 17.3850] },
        location: data.currentLocation || { type: 'Point', coordinates: [78.4867, 17.3850] },
        driverName: data.driverName || 'Lead Paramedic',
        driverPhone: data.driverPhone || '+91 98480 99999',
        equipment: data.equipment || ['Defibrillator', 'Ventilator', 'Monitor'],
        fuelLevel: data.fuelLevel || 100,
        speed: 0,
        heading: 0,
        currentIncident: null
      };
      useDemoStore.setState(state => ({ ambulances: [newAmb, ...state.ambulances] }));
      return { success: true, data: newAmb };
    }
  }

  async updateAmbulanceStatus(id, status, token) {
    try {
      const res = await axios.patch(`${API_URL}/ambulances/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      useDemoStore.getState().updateAmbulanceStatus(id, status);
      return res.data;
    } catch (err) {
      useDemoStore.getState().updateAmbulanceStatus(id, status);
      return { success: true, data: { _id: id, status } };
    }
  }

  async assignAmbulance(id, incidentId, status = 'ASSIGNED', token) {
    try {
      const res = await axios.patch(`${API_URL}/ambulances/${id}/assign`, { incidentId, status }, { headers: { Authorization: `Bearer ${token}` } });
      useDemoStore.getState().assignAmbulance(incidentId, id);
      return res.data;
    } catch (err) {
      useDemoStore.getState().assignAmbulance(incidentId, id);
      return { success: true };
    }
  }

  // --- Hospitals ---
  async getHospitals(token) {
    return this.execute(
      () => axios.get(`${API_URL}/hospitals`, { headers: { Authorization: `Bearer ${token}` } }),
      () => this.demoStore.hospitals
    );
  }

  async createHospital(data, token) {
    try {
      const res = await axios.post(`${API_URL}/hospitals`, data, { headers: { Authorization: `Bearer ${token}` } });
      const newHosp = res.data.data;
      useDemoStore.setState(state => ({ hospitals: [newHosp, ...state.hospitals] }));
      return res.data;
    } catch (err) {
      const newHosp = {
        _id: `HOSP-HYD-${Date.now().toString().slice(-4)}`,
        hospitalId: data.hospitalId || `HOSP-HYD-${Date.now().toString().slice(-4)}`,
        name: data.name,
        city: data.city || 'Hyderabad',
        state: data.state || 'Telangana',
        area: data.area || 'Hyderabad',
        bedsAvailable: data.bedsAvailable || 30,
        availableBeds: data.bedsAvailable || 30,
        bedsTotal: data.bedsTotal || 200,
        icuBeds: data.icuBeds || 40,
        availableIcuBeds: data.availableIcuBeds || 6,
        emergencyBeds: data.emergencyBeds || 30,
        availableEmergencyBeds: data.availableEmergencyBeds || 10,
        cardiacFacility: data.cardiacFacility || false,
        traumaCenter: data.traumaCenter || false,
        occupancy: data.occupancy || 75,
        status: data.status || 'ACTIVE',
        location: data.location || { type: 'Point', coordinates: [78.4867, 17.3850] }
      };
      useDemoStore.setState(state => ({ hospitals: [newHosp, ...state.hospitals] }));
      return { success: true, data: newHosp };
    }
  }

  async updateHospitalCapacity(id, data, token) {
    try {
      const res = await axios.patch(`${API_URL}/hospitals/${id}/capacity`, data, { headers: { Authorization: `Bearer ${token}` } });
      useDemoStore.setState(state => ({
        hospitals: state.hospitals.map(h => (h._id === id || h.hospitalId === id) ? { ...h, ...res.data.data } : h)
      }));
      return res.data;
    } catch (err) {
      useDemoStore.setState(state => ({
        hospitals: state.hospitals.map(h => (h._id === id || h.hospitalId === id) ? { ...h, ...data } : h)
      }));
      return { success: true, data };
    }
  }

  async updateHospitalStatus(id, status, token) {
    try {
      const res = await axios.patch(`${API_URL}/hospitals/${id}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      useDemoStore.setState(state => ({
        hospitals: state.hospitals.map(h => (h._id === id || h.hospitalId === id) ? { ...h, status } : h)
      }));
      return res.data;
    } catch (err) {
      useDemoStore.setState(state => ({
        hospitals: state.hospitals.map(h => (h._id === id || h.hospitalId === id) ? { ...h, status } : h)
      }));
      return { success: true };
    }
  }

  // --- Global Optimization & Reallocation ---
  async runGlobalOptimization(token) {
    return this.execute(
      () => axios.post(`${API_URL}/dispatch/global-optimize`, {}, { headers: { Authorization: `Bearer ${token}` } }),
      () => this.demoStore.runGlobalOptimization()
    );
  }

  async triggerReallocation(payload, token) {
    return this.execute(
      () => axios.post(`${API_URL}/dispatch/reallocate`, payload, { headers: { Authorization: `Bearer ${token}` } }),
      () => this.demoStore.triggerReallocation(payload)
    );
  }

  async getDispatchHistory(token) {
    return this.execute(
      () => axios.get(`${API_URL}/dispatch/history`, { headers: { Authorization: `Bearer ${token}` } }),
      () => this.demoStore.allocationLogs || []
    );
  }

  async getHistoricalIncidents(filters = {}, token) {
    return this.execute(
      () => axios.get(`${API_URL}/historical`, { params: filters, headers: { Authorization: `Bearer ${token}` } }),
      () => {
        let list = this.demoStore.historicalIncidents || [];
        if (filters.year && filters.year !== 'ALL') {
          list = list.filter(i => String(i.year) === String(filters.year));
        }
        if (filters.city && filters.city !== 'ALL') {
          list = list.filter(i => i.city === filters.city);
        }
        if (filters.category && filters.category !== 'ALL') {
          list = list.filter(i => i.category === filters.category);
        }
        if (filters.severity && filters.severity !== 'ALL') {
          list = list.filter(i => String(i.severity) === String(filters.severity));
        }
        return list;
      }
    );
  }

  // --- PS10 Scenario Endpoints ---
  async initPs10Scenario() {
    return this.execute(
      () => axios.post(`${API_URL}/simulation/ps10/init`),
      () => this.demoStore.initPs10Scenario()
    );
  }

  async step1Ps10() {
    return this.execute(
      () => axios.post(`${API_URL}/simulation/ps10/step1-breakdown`),
      () => this.demoStore.step1Ps10()
    );
  }

  async step2Ps10() {
    return this.execute(
      () => axios.post(`${API_URL}/simulation/ps10/step2-zero-icu`),
      () => this.demoStore.step2Ps10()
    );
  }

  async step3Ps10() {
    return this.execute(
      () => axios.post(`${API_URL}/simulation/ps10/step3-traffic-rain`),
      () => this.demoStore.step3Ps10()
    );
  }

  async step4Ps10() {
    return this.execute(
      () => axios.post(`${API_URL}/simulation/ps10/step4-fourth-emergency`),
      () => this.demoStore.step4Ps10()
    );
  }

  // --- Analytics & Forecasting ---
  async getAnalytics(token) {
    return this.execute(
      () => axios.get(`${API_URL}/analytics/overview`, { headers: { Authorization: `Bearer ${token}` } }),
      () => this.demoStore.getAnalytics()
    );
  }

  async getDemandForecast(city = 'All India') {
    return this.execute(
      () => axios.get(`${API_URL}/analytics/forecasting?city=${encodeURIComponent(city)}`),
      () => this.demoStore.getDemandForecast(city)
    );
  }

  async getBenchmarkComparison() {
    return this.execute(
      () => axios.get(`${API_URL}/analytics/benchmark`),
      () => this.demoStore.getBenchmarkComparison()
    );
  }

  async getRoadConditions(token) {
    return this.execute(
      () => axios.get(`${API_URL}/roads`, { headers: { Authorization: `Bearer ${token}` } }),
      () => this.demoStore.roadConditions || []
    );
  }
}

export const apiService = new ApiService();
