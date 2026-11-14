const mongoose = require('mongoose');
const Hospital = require('../models/Hospital');
const Ambulance = require('../models/Ambulance');
const Incident = require('../models/Incident');
const RoadCondition = require('../models/RoadCondition');
const Alert = require('../models/Alert');
const { HYDERABAD_HOSPITALS, HYDERABAD_AMBULANCES } = require('./hyderabadEmergencyData');

const SEED_INCIDENTS = [
  {
    incidentId: 'INC-HYD-101',
    category: 'CARDIAC',
    severity: 9,
    severityClass: 'CRITICAL',
    title: 'Acute STEMI - Critical Cardiac Arrest at HITEC City Cyber Towers',
    description: '52-year-old male collapsed in office complex. Unconscious, gasping respiration, bystander CPR initiated. Needs immediate cardiac ambulance with defibrillator and hospital with cath lab/ICU.',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'HITEC City',
    location: { type: 'Point', coordinates: [78.3772, 17.4504] },
    address: 'Near Cyber Towers, HITEC City, Hyderabad, Telangana 500081',
    status: 'ACTIVE',
    requiredCapabilities: ['CARDIAC', 'ALS', 'ICU'],
    casualties: 1,
    reportedBy: { name: 'Security Office Cyber Towers', phone: '+91 98490 22331' },
    source: 'PHONE_CALL',
    etaMinutes: 6
  },
  {
    incidentId: 'INC-HYD-102',
    category: 'ROAD_ACCIDENT',
    severity: 8,
    severityClass: 'HIGH',
    title: 'Multi-Vehicle Collision on Gachibowli Outer Ring Road',
    description: 'Two cars and an auto-rickshaw collided at speed near ORR junction. 3 passengers trapped with severe head and orthopedic trauma. Severe bleeding reported.',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Gachibowli',
    location: { type: 'Point', coordinates: [78.3621, 17.4380] },
    address: 'ORR Junction Exit 19, Gachibowli, Hyderabad, Telangana 500032',
    status: 'ACTIVE',
    requiredCapabilities: ['ALS', 'TRAUMA'],
    casualties: 3,
    reportedBy: { name: 'Traffic Warden ORR', phone: '+91 94401 55662' },
    source: 'POLICE_RADIO',
    etaMinutes: 8
  },
  {
    incidentId: 'INC-HYD-103',
    category: 'RESPIRATORY',
    severity: 7,
    severityClass: 'HIGH',
    title: 'Severe Respiratory Failure with Hypoxemia in Kukatpally',
    description: '68-year-old female COPD patient with SpO2 below 72%. Cyanotic, severe dyspnea, non-responsive to bronchodilators. Requires ventilator-equipped ambulance and ICU bed.',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Kukatpally',
    location: { type: 'Point', coordinates: [78.4110, 17.4912] },
    address: 'Phase 3, KPHB Colony, Kukatpally, Hyderabad, Telangana 500072',
    status: 'ACTIVE',
    requiredCapabilities: ['ALS', 'ICU'],
    casualties: 1,
    reportedBy: { name: 'Family Member', phone: '+91 98488 44221' },
    source: 'CITIZEN_PORTAL',
    etaMinutes: 11
  },
  {
    incidentId: 'INC-HYD-104',
    category: 'FIRE',
    severity: 8,
    severityClass: 'HIGH',
    title: 'Commercial Building Electrical Fire at Begumpet',
    description: 'Heavy smoke billowing from 2nd floor electronics showroom. 4 persons suffered smoke inhalation, 1 person with 2nd-degree burns. Fire tender and ALS ambulances deployed.',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Begumpet',
    location: { type: 'Point', coordinates: [78.4721, 17.4435] },
    address: 'S.P. Road, Begumpet, Hyderabad, Telangana 500016',
    status: 'ACTIVE',
    requiredCapabilities: ['FIRE_ENGINE', 'ALS', 'BLS'],
    casualties: 4,
    reportedBy: { name: 'Fire Control Room Secunderabad', phone: '+91 40 2344 9999' },
    source: 'EMERGENCY_HOTLINE',
    etaMinutes: 7
  },
  {
    incidentId: 'INC-HYD-105',
    category: 'STROKE',
    severity: 8,
    severityClass: 'HIGH',
    title: 'Suspected Acute Ischemic Stroke at Banjara Hills Road No 10',
    description: '61-year-old male sudden left-sided hemiplegia and expressive aphasia. Symptoms started 35 minutes ago within golden window for thrombolysis. Needs comprehensive stroke center immediately.',
    city: 'Hyderabad',
    state: 'Telangana',
    area: 'Banjara Hills',
    location: { type: 'Point', coordinates: [78.4410, 17.4180] },
    address: 'Road No 10, Banjara Hills, Hyderabad, Telangana 500034',
    status: 'ACTIVE',
    requiredCapabilities: ['ALS', 'NEURO'],
    casualties: 1,
    reportedBy: { name: 'Dr. Srinivas Rao', phone: '+91 98491 88776' },
    source: 'DOCTOR_REFERRAL',
    etaMinutes: 9
  }
];

const SEED_ROAD_CONDITIONS = [
  {
    city: 'Hyderabad',
    area: 'Gachibowli',
    roadName: 'Old Mumbai Highway (Gachibowli - Tolichowki)',
    condition: 'CONGESTED',
    delayMinutes: 14,
    location: { type: 'Point', coordinates: [78.3750, 17.4250] },
    description: 'Heavy rush hour crawl near Bio-diversity junction. Diverting non-emergency traffic.',
    active: true
  },
  {
    city: 'Hyderabad',
    area: 'Madhapur',
    roadName: 'Durgam Cheruvu Cable Bridge Approach',
    condition: 'MODERATE_TRAFFIC',
    delayMinutes: 6,
    location: { type: 'Point', coordinates: [78.3900, 17.4320] },
    description: 'Slow-moving traffic toward Inorbit Mall.',
    active: true
  },
  {
    city: 'Hyderabad',
    area: 'Secunderabad',
    roadName: 'Rashtrapati Road (RP Road)',
    condition: 'ROAD_WORK',
    delayMinutes: 10,
    location: { type: 'Point', coordinates: [78.5020, 17.4390] },
    description: 'Underground cabling work reduces roadway to single lane.',
    active: true
  }
];

const SEED_ALERTS = [
  {
    title: 'Telangana High Heat & Urban Traffic Advisory',
    severity: 'MEDIUM',
    city: 'Hyderabad',
    message: 'High heat index and heavy vehicular movement across HITEC City and Secunderabad corridors. EMS units on high alert for heat-related syncopal episodes.',
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
  },
  {
    title: 'Monitored Critical Care Corridor Active',
    severity: 'HIGH',
    city: 'Hyderabad',
    message: 'Green corridor protocol enabled for Organ & Critical Trauma Transit connecting Gachibowli AIG, Jubilee Hills Apollo, and NIMS Punjagutta.',
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000)
  }
];

async function seedHyderabadDataIfEmpty() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('[AutoSeed] MongoDB is not connected. In-memory demo fallback active.');
      return;
    }
    const hospitalCount = await Hospital.countDocuments();
    if (hospitalCount === 0) {
      console.log(`[AutoSeed] Hospital collection is empty. Seeding ${HYDERABAD_HOSPITALS.length} Hyderabad hospitals...`);
      await Hospital.insertMany(HYDERABAD_HOSPITALS);
      console.log(`[AutoSeed] Successfully seeded ${HYDERABAD_HOSPITALS.length} hospitals.`);
    } else {
      console.log(`[AutoSeed] Database already has ${hospitalCount} hospitals.`);
    }

    const ambulanceCount = await Ambulance.countDocuments();
    if (ambulanceCount === 0) {
      console.log(`[AutoSeed] Ambulance fleet is empty. Seeding ${HYDERABAD_AMBULANCES.length} Hyderabad emergency response vehicles...`);
      await Ambulance.insertMany(HYDERABAD_AMBULANCES);
      console.log(`[AutoSeed] Successfully seeded ${HYDERABAD_AMBULANCES.length} ambulances.`);
    } else {
      console.log(`[AutoSeed] Database already has ${ambulanceCount} ambulances.`);
    }

    const incidentCount = await Incident.countDocuments();
    if (incidentCount === 0) {
      console.log(`[AutoSeed] Incidents empty. Seeding ${SEED_INCIDENTS.length} live Hyderabad incidents...`);
      await Incident.insertMany(SEED_INCIDENTS);
    }

    const roadCount = await RoadCondition.countDocuments();
    if (roadCount === 0) {
      console.log(`[AutoSeed] Seeding ${SEED_ROAD_CONDITIONS.length} Hyderabad road conditions...`);
      await RoadCondition.insertMany(SEED_ROAD_CONDITIONS);
    }

    const alertCount = await Alert.countDocuments();
    if (alertCount === 0) {
      console.log(`[AutoSeed] Seeding ${SEED_ALERTS.length} live emergency alerts...`);
      await Alert.insertMany(SEED_ALERTS);
    }

  } catch (error) {
    console.error('[AutoSeed] Error auto-seeding Hyderabad emergency data:', error.message);
  }
}

module.exports = {
  seedHyderabadDataIfEmpty,
  SEED_INCIDENTS,
  SEED_ROAD_CONDITIONS,
  SEED_ALERTS
};
