import { HYDERABAD_HOSPITALS, HYDERABAD_AMBULANCES } from './hyderabadEmergencyData.js';

export const CITIES = [
  { name: 'Hyderabad', coords: [78.4867, 17.3850], region: 'South', state: 'Telangana' },
  { name: 'New Delhi', coords: [77.2090, 28.6139], region: 'North', state: 'Delhi' },
  { name: 'Mumbai', coords: [72.8777, 19.0760], region: 'West', state: 'Maharashtra' },
  { name: 'Bengaluru', coords: [77.5946, 12.9716], region: 'South', state: 'Karnataka' },
  { name: 'Chennai', coords: [80.2707, 13.0827], region: 'South', state: 'Tamil Nadu' },
  { name: 'Kolkata', coords: [88.3639, 22.5726], region: 'East', state: 'West Bengal' },
  { name: 'Pune', coords: [73.8567, 18.5204], region: 'West', state: 'Maharashtra' },
  { name: 'Ahmedabad', coords: [72.5714, 23.0225], region: 'West', state: 'Gujarat' },
  { name: 'Lucknow', coords: [80.9462, 26.8467], region: 'North', state: 'Uttar Pradesh' },
  { name: 'Jaipur', coords: [75.7873, 26.9124], region: 'North', state: 'Rajasthan' },
  { name: 'Chandigarh', coords: [76.7794, 30.7333], region: 'North', state: 'Chandigarh' },
  { name: 'Bhopal', coords: [77.4126, 23.2599], region: 'Central', state: 'Madhya Pradesh' }
];

const HOSPITAL_NAMES = [
  'AIIMS', 'Apollo Hospital', 'Fortis Hospital', 'Max Super Speciality', 'Medanta',
  'Narayana Health', 'Manipal Hospital', 'Ruby Hall Clinic', 'KGMU', 'SGPGI',
  'Tata Memorial', 'Lilavati Hospital', 'Breach Candy', 'Hinduja Hospital'
];

const randomCoord = (base, spread = 0.05) => base + (Math.random() * spread * 2 - spread);
const randomCity = () => CITIES[Math.floor(Math.random() * CITIES.length)];
const randomDate = (start, end) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

export const generatePanIndiaData = () => {
  // 1. Seeded Hyderabad Hospitals (First and prioritized)
  const hospitals = HYDERABAD_HOSPITALS.map((h, idx) => ({
    ...h,
    _id: h.hospitalId || `HOSP-HYD-${String(idx + 1).padStart(3, '0')}`,
    availableBeds: h.bedsAvailable,
    emergencyCapacity: h.emergencyBeds || 50,
    specializations: h.specialties || ['EMERGENCY', 'TRAUMA']
  }));

  // Add other national hospitals
  for (let i = 1; i <= 60; i++) {
    const city = randomCity();
    if (city.name === 'Hyderabad') continue; // keep Hyderabad purely realistic
    const hName = HOSPITAL_NAMES[Math.floor(Math.random() * HOSPITAL_NAMES.length)];
    const bedsTotal = Math.floor(Math.random() * 400) + 150;
    const bedsAvailable = Math.floor(Math.random() * 45) + 5;
    const icuBeds = Math.floor(Math.random() * 50) + 15;
    const availableIcuBeds = Math.random() > 0.2 ? Math.floor(Math.random() * 10) + 1 : 0;
    const cardiacFacility = Math.random() > 0.4;
    const traumaCenter = Math.random() > 0.3;

    hospitals.push({
      _id: `HOS-IND-${String(i).padStart(3, '0')}`,
      hospitalId: `HOS-IND-${String(i).padStart(3, '0')}`,
      name: `${hName} ${city.name}`,
      city: city.name,
      state: city.state || city.region,
      district: city.name,
      area: city.name + ' Central',
      location: { type: 'Point', coordinates: [randomCoord(city.coords[0]), randomCoord(city.coords[1])] },
      address: `Road No ${i}, Civil Lines, ${city.name}`,
      contactPhone: `+91 98490 ${Math.floor(10000 + Math.random() * 90000)}`,
      emergencyDepartment: true,
      cardiacFacility,
      traumaCenter,
      traumaLevel: traumaCenter ? (Math.floor(Math.random() * 3) + 1) : 3,
      bedsTotal,
      bedsAvailable,
      availableBeds: bedsAvailable,
      icuBeds,
      availableIcuBeds,
      emergencyBeds: Math.floor(Math.random() * 30) + 15,
      availableEmergencyBeds: Math.floor(Math.random() * 12) + 2,
      emergencyCapacity: Math.floor(Math.random() * 30) + 15,
      ventilators: Math.floor(Math.random() * 20) + 5,
      availableVentilators: Math.floor(Math.random() * 5) + 1,
      occupancy: Math.floor(Math.random() * 30) + 65,
      specialties: ['General Medicine', 'General Surgery', ...(cardiacFacility ? ['Cardiology'] : []), ...(traumaCenter ? ['Emergency Trauma'] : [])],
      specializations: ['General Medicine', 'General Surgery'],
      type: Math.random() > 0.5 ? 'PRIVATE' : 'GOVERNMENT',
      status: 'ACTIVE'
    });
  }

  // 2. Seeded Hyderabad Ambulances (First and prioritized)
  const ambulances = HYDERABAD_AMBULANCES.map((a, idx) => ({
    ...a,
    _id: a.ambulanceId || `AMB-HYD-${String(idx + 1).padStart(3, '0')}`,
    location: a.currentLocation, // compatibility
    capability: a.type === 'ADVANCED_LIFE_SUPPORT' ? 'ALS' : (a.type === 'ICU_AMBULANCE' ? 'ICU' : (a.type === 'FIRE_ENGINE' ? 'FIRE' : (a.type === 'RESCUE_BOAT' ? 'BOAT' : 'BLS'))),
    lastUpdated: new Date().toISOString(),
    currentIncident: null
  }));

  // Add other national ambulances
  const ambStatuses = ['AVAILABLE', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING', 'AVAILABLE', 'AVAILABLE'];
  const ambTypes = ['BASIC_LIFE_SUPPORT', 'ADVANCED_LIFE_SUPPORT', 'ICU_AMBULANCE'];
  for (let i = 1; i <= 40; i++) {
    const city = randomCity();
    if (city.name === 'Hyderabad') continue;
    const status = ambStatuses[Math.floor(Math.random() * ambStatuses.length)];
    const type = ambTypes[Math.floor(Math.random() * ambTypes.length)];
    const coords = [randomCoord(city.coords[0]), randomCoord(city.coords[1])];

    ambulances.push({
      _id: `AMB-${city.name.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
      ambulanceId: `AMB-${city.name.substring(0, 3).toUpperCase()}-${String(i).padStart(3, '0')}`,
      registrationNumber: `${(city.state || 'DL').substring(0, 2).toUpperCase()}-0${Math.floor(Math.random() * 9 + 1)}-EQ-${Math.floor(1000 + Math.random() * 9000)}`,
      city: city.name,
      state: city.state || city.region,
      area: city.name + ' Downtown',
      type,
      resourceCategory: 'AMBULANCE',
      status,
      capability: type === 'ADVANCED_LIFE_SUPPORT' ? 'ALS' : (type === 'ICU_AMBULANCE' ? 'ICU' : 'BLS'),
      driverName: `Driver ${city.name.substring(0, 3)} ${i}`,
      driverPhone: `+91 98480 ${Math.floor(10000 + Math.random() * 90000)}`,
      currentLocation: { type: 'Point', coordinates: coords },
      location: { type: 'Point', coordinates: coords },
      equipment: ['Stretcher', 'Oxygen Cylinder', 'First Aid Kit'],
      fuelLevel: Math.floor(Math.random() * 40) + 60,
      speed: status === 'EN_ROUTE' || status === 'TRANSPORTING' ? Math.floor(Math.random() * 40) + 30 : 0,
      heading: Math.floor(Math.random() * 360),
      lastUpdated: new Date().toISOString(),
      currentIncident: null
    });
  }

  // 3. Historical Incidents
  const historicalIncidents = [];
  const cats = ['ROAD_ACCIDENT', 'MEDICAL_EMERGENCY', 'FIRE', 'TRAUMA', 'CARDIAC', 'FLOODING'];
  for (let i = 1; i <= 200; i++) {
    const city = randomCity();
    const cat = cats[Math.floor(Math.random() * cats.length)];
    const year = 2023 + Math.floor(Math.random() * 3);
    historicalIncidents.push({
      _id: `HIST-${year}-${String(i).padStart(4, '0')}`,
      year,
      date: randomDate(new Date(year, 0, 1), new Date(year, 11, 31)).toISOString(),
      state: city.state || city.region,
      city: city.name,
      category: cat,
      severity: Math.floor(Math.random() * 10) + 1,
      affectedPeople: Math.floor(Math.random() * 5) + 1,
      fatalities: Math.random() > 0.9 ? 1 : 0,
      injuries: Math.floor(Math.random() * 4),
      responseTime: Math.floor(Math.random() * 15) + 5,
      resolutionTime: Math.floor(Math.random() * 100) + 20
    });
  }

  // 4. Current Incidents
  const incidents = [
    {
      _id: 'INC-HYD-101',
      incidentId: 'INC-HYD-101',
      title: 'Acute STEMI - Critical Cardiac Arrest at HITEC City Cyber Towers',
      description: '52-year-old male collapsed in office complex. Unconscious, gasping respiration, bystander CPR initiated. Needs immediate cardiac ambulance with defibrillator and hospital with cath lab/ICU.',
      city: 'Hyderabad',
      state: 'Telangana',
      area: 'HITEC City',
      location: { type: 'Point', coordinates: [78.3772, 17.4504] },
      address: 'Near Cyber Towers, HITEC City, Hyderabad, Telangana 500081',
      status: 'ACTIVE',
      category: 'CARDIAC',
      severity: 9,
      severityLevel: 'CRITICAL',
      affectedPeople: 1,
      casualties: 1,
      requiredCapabilities: ['CARDIAC', 'ALS', 'ICU'],
      createdAt: new Date().toISOString()
    },
    {
      _id: 'INC-HYD-102',
      incidentId: 'INC-HYD-102',
      title: 'Multi-Vehicle Collision on Gachibowli Outer Ring Road',
      description: 'Two cars and an auto-rickshaw collided at speed near ORR junction. 3 passengers trapped with severe head and orthopedic trauma. Severe bleeding reported.',
      city: 'Hyderabad',
      state: 'Telangana',
      area: 'Gachibowli',
      location: { type: 'Point', coordinates: [78.3621, 17.4380] },
      address: 'ORR Junction Exit 19, Gachibowli, Hyderabad, Telangana 500032',
      status: 'ACTIVE',
      category: 'ROAD_ACCIDENT',
      severity: 8,
      severityLevel: 'HIGH',
      affectedPeople: 3,
      casualties: 3,
      requiredCapabilities: ['ALS', 'TRAUMA'],
      createdAt: new Date().toISOString()
    },
    {
      _id: 'INC-HYD-103',
      incidentId: 'INC-HYD-103',
      title: 'Severe Respiratory Failure with Hypoxemia in Kukatpally',
      description: '68-year-old female COPD patient with SpO2 below 72%. Cyanotic, severe dyspnea, non-responsive to bronchodilators.',
      city: 'Hyderabad',
      state: 'Telangana',
      area: 'Kukatpally',
      location: { type: 'Point', coordinates: [78.4110, 17.4912] },
      address: 'Phase 3, KPHB Colony, Kukatpally, Hyderabad, Telangana 500072',
      status: 'ACTIVE',
      category: 'RESPIRATORY',
      severity: 7,
      severityLevel: 'HIGH',
      affectedPeople: 1,
      casualties: 1,
      requiredCapabilities: ['ALS', 'ICU'],
      createdAt: new Date().toISOString()
    }
  ];

  // 5. Alerts & Road Conditions
  const alerts = [
    {
      _id: 'ALT-HYD-001',
      title: 'Telangana High Heat & Urban Traffic Advisory',
      severity: 'MEDIUM',
      city: 'Hyderabad',
      message: 'High heat index and heavy vehicular movement across HITEC City and Secunderabad corridors. EMS units on high alert.',
      issuedAt: new Date().toISOString()
    },
    {
      _id: 'ALT-HYD-002',
      title: 'Monitored Critical Care Corridor Active',
      severity: 'HIGH',
      city: 'Hyderabad',
      message: 'Green corridor protocol enabled for Organ & Critical Trauma Transit connecting Gachibowli AIG, Jubilee Hills Apollo, and NIMS Punjagutta.',
      issuedAt: new Date().toISOString()
    }
  ];

  const roadConditions = [
    {
      _id: 'RD-HYD-001',
      city: 'Hyderabad',
      area: 'Gachibowli',
      roadName: 'Old Mumbai Highway (Gachibowli - Tolichowki)',
      condition: 'CONGESTED',
      delayMinutes: 14,
      location: { type: 'Point', coordinates: [78.3750, 17.4250] },
      description: 'Heavy rush hour crawl near Bio-diversity junction.',
      status: 'ACTIVE'
    },
    {
      _id: 'RD-HYD-002',
      city: 'Hyderabad',
      area: 'Madhapur',
      roadName: 'Durgam Cheruvu Cable Bridge Approach',
      condition: 'MODERATE_TRAFFIC',
      delayMinutes: 6,
      location: { type: 'Point', coordinates: [78.3900, 17.4320] },
      description: 'Slow-moving traffic toward Inorbit Mall.',
      status: 'ACTIVE'
    }
  ];

  const dispatches = [];
  const routes = [];

  return {
    incidents,
    ambulances,
    hospitals,
    historicalIncidents,
    alerts,
    roadConditions,
    dispatches,
    routes
  };
};


