import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import useDemoStore from '../demo/demoStore';

// Fix for default Leaflet marker icons in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom markers
const incidentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const ambulanceIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const hospitalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Helper component to auto-center map only when filter changes
const MapUpdater = ({ activeCityFilter, incidents, ambulances, hospitals }) => {
  const map = useMap();
  const [centeredOn, setCenteredOn] = useState(null);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    
    const container = map.getContainer();
    if (container) {
      resizeObserver.observe(container);
      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 500);
    }
    
    return () => {
      if (container) resizeObserver.unobserve(container);
      resizeObserver.disconnect();
    };
  }, [map]);

  useEffect(() => {
    if (activeCityFilter === centeredOn) return;

    let targetCenter = [17.3850, 78.4867]; // Hyderabad default
    let targetZoom = 11;
    let found = true;

    if (activeCityFilter === 'All India') {
      targetCenter = [20.5937, 78.9629];
      targetZoom = 4.8;
    } else if (activeCityFilter && activeCityFilter !== '') {
      found = false;
      const itemWithCity = 
        (hospitals || []).find(h => h.city === activeCityFilter) ||
        (incidents || []).find(i => i.city === activeCityFilter) || 
        (ambulances || []).find(a => a.city === activeCityFilter);
        
      if (itemWithCity) {
        const coords = itemWithCity.location?.coordinates || itemWithCity.currentLocation?.coordinates;
        if (coords) {
          targetCenter = [coords[1], coords[0]];
          targetZoom = 11;
          found = true;
        }
      }
    }

    if (found) {
      map.flyTo(targetCenter, targetZoom, {
        animate: true,
        duration: 1.5
      });
      setCenteredOn(activeCityFilter);
    }
  }, [activeCityFilter, centeredOn, incidents, ambulances, hospitals, map]);

  return null;
};

const MapComponent = ({ incidents = [], ambulances = [], hospitals = [] }) => {
  const activeCityFilter = useDemoStore(state => state.activeCityFilter);
  const routes = useDemoStore(state => state.routes) || [];
  
  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={[17.3850, 78.4867]} 
        zoom={11}
        zoomSnap={0.5}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={120}
        preferCanvas={true}
        style={{ height: '100%', width: '100%', background: '#E5E7EB' }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <MapUpdater activeCityFilter={activeCityFilter} incidents={incidents} ambulances={ambulances} hospitals={hospitals} />
        
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          keepBuffer={4}
        />
        
        {/* Routes */}
        {routes.map(route => {
          if (route.status === 'ACTIVE' && route.geometry?.coordinates) {
            const positions = route.geometry.coordinates.map(c => [c[1], c[0]]);
            return (
              <Polyline 
                key={route._id || Math.random()} 
                positions={positions} 
                pathOptions={{ color: '#00f2fe', weight: 4, opacity: 0.7, dashArray: '5, 10' }} 
              />
            );
          }
          return null;
        })}

        {/* Hospitals */}
        {(hospitals || []).map((hospital) => {
          const coords = hospital.location?.coordinates;
          if (!coords || coords.length < 2) return null;
          return (
            <Marker 
              key={hospital._id || hospital.hospitalId || hospital.name} 
              position={[coords[1], coords[0]]}
              icon={hospitalIcon}
            >
              <Popup className="custom-popup bg-primary-900 border border-primary-700">
                <div className="font-sans text-text-main p-1">
                  <h3 className="font-bold text-[11px] uppercase tracking-wider mb-1">{hospital.name}</h3>
                  <p className="text-[10px] text-text-muted mb-2">Beds Available: <span className="text-operational font-bold">{hospital.availableBeds || hospital.bedsAvailable}</span></p>
                  <p className="text-[9px] uppercase">{hospital.traumaLevel ? `TRAUMA LEVEL ${hospital.traumaLevel}` : (hospital.traumaCenter ? 'TRAUMA LEVEL 1' : 'GENERAL')}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Incidents */}
        {(incidents || []).map((incident) => {
          const coords = incident.location?.coordinates;
          if (!coords || coords.length < 2 || incident.status === 'RESOLVED') return null;
          return (
            <Marker 
              key={incident._id || incident.incidentId} 
              position={[coords[1], coords[0]]}
              icon={incidentIcon}
            >
              <Popup className="custom-popup bg-primary-900 border border-primary-700">
                <div className="font-sans text-text-main p-1">
                  <h3 className="font-bold text-[11px] text-emergency uppercase tracking-wider mb-1">{incident.category?.replace(/_/g, ' ') || 'EMERGENCY'}</h3>
                  <p className="text-[10px] text-text-muted mb-2">{incident.description}</p>
                  <div className="mt-2 flex justify-between text-[9px] uppercase font-bold">
                    <span>Severity: <span className="text-emergency">{incident.severity}/10</span></span>
                    <span className="text-info">{incident.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Ambulances */}
        {(ambulances || []).map((ambulance) => {
          const coords = ambulance.location?.coordinates || ambulance.currentLocation?.coordinates;
          if (!coords || coords.length < 2) return null;
          return (
            <Marker 
              key={ambulance._id || ambulance.ambulanceId} 
              position={[coords[1], coords[0]]}
              icon={ambulanceIcon}
            >
              <Popup className="custom-popup bg-primary-900 border border-primary-700">
                <div className="font-sans text-text-main p-1">
                  <h3 className="font-bold text-[11px] uppercase tracking-wider mb-1">Unit {ambulance.ambulanceId || ambulance.registrationNumber}</h3>
                  <p className="text-[10px] text-text-muted mb-1">Status: <span className="text-info font-bold">{ambulance.status}</span></p>
                  {ambulance.speed > 0 && <p className="text-[9px] text-operational uppercase font-bold">Speed: {ambulance.speed} km/h</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

      </MapContainer>
    </div>
  );
};

export default MapComponent;
