/**
 * PS10 Critical End-to-End Test Scenario Service
 * Deterministic orchestrator for the exact Problem Statement 10 scenario.
 */

const Incident = require('../models/Incident');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const RoadCondition = require('../models/RoadCondition');
const AllocationLog = require('../models/AllocationLog');
const reallocationEngine = require('./reallocationEngine');
const { runGlobalOptimization } = require('./optimizationEngine');

class ScenarioSimulationService {
  constructor() {
    this.currentStep = 0; // 0: uninitialized, 1: 10:30 init, 2: 10:31, 3: 10:32, 4: 10:33, 5: 10:34
    this.scenarioData = null;
    this.logs = [];
  }

  /**
   * Reset and Initialize Phase 0 / 10:30 AM State
   */
  async initializeScenario(io = null) {
    if (io) reallocationEngine.setIo(io);

    // 1. Create PS10 Dedicated Hospitals
    const hospA = {
      name: 'City Trauma Center (Apex Hospital)',
      city: 'PS10 Sector',
      location: { type: 'Point', coordinates: [77.215, 28.618] },
      address: 'Plot 10, Medical Enclave',
      emergencyDepartment: true,
      traumaCenter: true,
      cardiacFacility: true,
      icuAvailable: true,
      icuBeds: 20,
      availableIcuBeds: 4, // Initial available ICU beds
      bedsAvailable: 35,
      status: 'ACTIVE'
    };

    const hospB = {
      name: 'Metro Specialty Hospital',
      city: 'PS10 Sector',
      location: { type: 'Point', coordinates: [77.240, 28.630] },
      address: 'Ring Road Junction',
      emergencyDepartment: true,
      traumaCenter: true,
      cardiacFacility: true,
      icuAvailable: true,
      icuBeds: 15,
      availableIcuBeds: 6,
      bedsAvailable: 22,
      status: 'ACTIVE'
    };

    const hospC = {
      name: 'Community General Hospital',
      city: 'PS10 Sector',
      location: { type: 'Point', coordinates: [77.260, 28.605] },
      address: 'South Avenue',
      emergencyDepartment: true,
      traumaCenter: false,
      cardiacFacility: false,
      icuAvailable: false,
      icuBeds: 0,
      availableIcuBeds: 0,
      bedsAvailable: 12,
      status: 'ACTIVE'
    };

    // 2. Create PS10 Dedicated Resources
    const resList = [
      {
        ambulanceId: 'AMB-A01',
        registrationNumber: 'DL-01-EQ-1001',
        type: 'BASIC_LIFE_SUPPORT',
        resourceCategory: 'AMBULANCE',
        status: 'AVAILABLE',
        currentLocation: { type: 'Point', coordinates: [77.205, 28.612] } // Close to Incident A
      },
      {
        ambulanceId: 'AMB-A02',
        registrationNumber: 'DL-01-EQ-1002',
        type: 'ADVANCED_LIFE_SUPPORT',
        resourceCategory: 'AMBULANCE',
        status: 'AVAILABLE',
        currentLocation: { type: 'Point', coordinates: [77.218, 28.625] } // Close to Incident B
      },
      {
        ambulanceId: 'AMB-A03',
        registrationNumber: 'DL-01-EQ-1003',
        type: 'ICU_AMBULANCE',
        resourceCategory: 'AMBULANCE',
        status: 'AVAILABLE',
        currentLocation: { type: 'Point', coordinates: [77.235, 28.610] }
      },
      {
        ambulanceId: 'BOAT-B01',
        registrationNumber: 'DL-RES-BOAT-01',
        type: 'RESCUE_BOAT',
        resourceCategory: 'RESCUE_BOAT',
        status: 'AVAILABLE',
        currentLocation: { type: 'Point', coordinates: [77.250, 28.635] } // Close to Incident C
      },
      {
        ambulanceId: 'TEAM-R01',
        registrationNumber: 'DL-RES-TEAM-01',
        type: 'RESCUE_TEAM',
        resourceCategory: 'RESCUE_TEAM',
        status: 'AVAILABLE',
        currentLocation: { type: 'Point', coordinates: [77.245, 28.630] }
      },
      {
        ambulanceId: 'FIRE-F01',
        registrationNumber: 'DL-FIRE-01',
        type: 'FIRE_ENGINE',
        resourceCategory: 'FIRE_ENGINE',
        status: 'AVAILABLE',
        currentLocation: { type: 'Point', coordinates: [77.220, 28.640] }
      }
    ];

    // 3. Create Three Initial Incidents (10:30 AM)
    const incA = {
      incidentId: 'INC-PS10-A',
      category: 'ROAD_ACCIDENT',
      description: 'Major multi-vehicle collision involving 5 injured people. Road blockage reported.',
      severity: 8,
      severityLevel: 'HIGH',
      affectedPeople: 5,
      isMedicalEmergency: true,
      city: 'PS10 Sector',
      location: { type: 'Point', coordinates: [77.210, 28.615] },
      address: 'Central Flyover Outer Ring Road',
      status: 'PENDING',
      reportedAt: new Date(Date.now() - 30 * 60 * 1000)
    };

    const incB = {
      incidentId: 'INC-PS10-B',
      category: 'CARDIAC',
      description: 'Critical cardiac emergency. 62yo patient in ventricular arrhythmia, requires immediate ALS/ICU transport.',
      severity: 10,
      severityLevel: 'CRITICAL',
      affectedPeople: 1,
      isMedicalEmergency: true,
      city: 'PS10 Sector',
      location: { type: 'Point', coordinates: [77.222, 28.622] },
      address: 'Sector 4 Residential Block',
      status: 'PENDING',
      reportedAt: new Date(Date.now() - 30 * 60 * 1000)
    };

    const incC = {
      incidentId: 'INC-PS10-C',
      category: 'URBAN_FLOOD',
      description: 'Flash urban flooding in low-lying residential colony. 8 residents trapped in rising water.',
      severity: 9,
      severityLevel: 'CRITICAL',
      affectedPeople: 8,
      isMedicalEmergency: false,
      city: 'PS10 Sector',
      location: { type: 'Point', coordinates: [77.255, 28.638] },
      address: 'Yamuna Floodplain Lowlands',
      status: 'PENDING',
      reportedAt: new Date(Date.now() - 30 * 60 * 1000)
    };

    // Clean up previous PS10 data
    await Hospital.deleteMany({ city: 'PS10 Sector' });
    await Ambulance.deleteMany({ registrationNumber: { $regex: '^DL-(01-EQ|RES|FIRE)' } });
    await Incident.deleteMany({ incidentId: { $regex: '^INC-PS10-' } });
    await RoadCondition.deleteMany({ location: 'PS10 Sector Highway' });

    // Insert database records
    const createdHospitals = await Hospital.insertMany([hospA, hospB, hospC]);
    const createdResources = await Ambulance.insertMany(resList);
    const createdIncidents = await Incident.insertMany([incA, incB, incC]);

    // Initial Global Optimization
    const optResult = await runGlobalOptimization({
      incidents: createdIncidents,
      resources: createdResources,
      hospitals: createdHospitals
    });

    // Apply assignments
    for (const alloc of optResult.assignments) {
      await Incident.findByIdAndUpdate(alloc.incident._id, {
        assignedAmbulance: alloc.resource._id,
        assignedHospital: alloc.hospital?._id,
        recommendedHospital: alloc.hospital?._id,
        status: 'ASSIGNED',
        dispatchTime: Date.now(),
        allocationExplanation: alloc.explanation
      });

      await Ambulance.findByIdAndUpdate(alloc.resource._id, {
        status: 'EN_ROUTE',
        currentIncident: alloc.incident._id
      });
    }

    this.currentStep = 1;
    this.scenarioData = {
      hospitals: createdHospitals,
      resources: createdResources,
      incidents: createdIncidents,
      step: 1,
      simulatedTime: '10:30 AM',
      initialOptimization: optResult
    };

    if (io) {
      io.emit('scenario:update', {
        step: 1,
        simulatedTime: '10:30 AM',
        title: 'Initial State (10:30 AM): 3 Simultaneous Incidents',
        description: 'Road Accident (5 victims), Cardiac Emergency, and Urban Flooding initialized. Resources allocated via Global Dynamic Optimization.',
        data: this.scenarioData
      });
    }

    return this.scenarioData;
  }

  /**
   * Step 1 (10:31 AM): Nearest ambulance assigned to Incident A breaks down
   */
  async triggerStep1_AmbulanceBreakdown(io = null) {
    if (io) reallocationEngine.setIo(io);

    const incA = await Incident.findOne({ incidentId: 'INC-PS10-A' }).populate('assignedAmbulance');
    const assignedAmb = incA?.assignedAmbulance;

    const eventResult = await reallocationEngine.handleEvent({
      eventType: 'AMBULANCE_BREAKDOWN',
      ambulanceId: assignedAmb ? assignedAmb._id : null,
      incidentId: incA?._id,
      details: `Nearest vehicle ${assignedAmb ? assignedAmb.ambulanceId : 'A01'} reported engine failure en route to Incident A.`
    });

    this.currentStep = 2;
    const updatedIncidents = await Incident.find({ incidentId: { $regex: '^INC-PS10-' } }).populate('assignedAmbulance assignedHospital');
    const updatedResources = await Ambulance.find({ registrationNumber: { $regex: '^DL-(01-EQ|RES|FIRE)' } });

    const stepResult = {
      step: 2,
      simulatedTime: '10:31 AM',
      title: '10:31 AM: Ambulance Breakdown & Dynamic Recalculation',
      description: `Primary unit broke down. Reallocation engine immediately re-evaluated global assignments and dispatched a backup unit without compromising Incident B (Cardiac).`,
      eventResult,
      incidents: updatedIncidents,
      resources: updatedResources
    };

    if (io) io.emit('scenario:update', stepResult);
    return stepResult;
  }

  /**
   * Step 2 (10:32 AM): Hospital for Incident B reports zero ICU beds
   */
  async triggerStep2_ZeroICUBeds(io = null) {
    if (io) reallocationEngine.setIo(io);

    const incB = await Incident.findOne({ incidentId: 'INC-PS10-B' }).populate('assignedHospital');
    const hosp = incB?.assignedHospital || (await Hospital.findOne({ name: { $regex: 'Apex' } }));

    const eventResult = await reallocationEngine.handleEvent({
      eventType: 'HOSPITAL_ZERO_ICU',
      hospitalId: hosp?._id,
      incidentId: incB?._id,
      details: `${hosp?.name || 'City Trauma Center'} emergency department reached maximum ICU capacity (0 available ICU beds).`
    });

    this.currentStep = 3;
    const updatedIncidents = await Incident.find({ incidentId: { $regex: '^INC-PS10-' } }).populate('assignedAmbulance assignedHospital');
    const updatedHospitals = await Hospital.find({ city: 'PS10 Sector' });

    const stepResult = {
      step: 3,
      simulatedTime: '10:32 AM',
      title: '10:32 AM: Hospital Zero ICU Beds & Intelligent Hospital Diversion',
      description: `Hospital reported 0 available ICU beds. Enforcing Hard Clinical Constraint: Patient diverted to Metro Specialty Hospital (6 ICU beds available). Zero patients sent to full ICU facilities.`,
      eventResult,
      incidents: updatedIncidents,
      hospitals: updatedHospitals
    };

    if (io) io.emit('scenario:update', stepResult);
    return stepResult;
  }

  /**
   * Step 3 (10:33 AM): Heavy rainfall and traffic congestion on shortest route
   */
  async triggerStep3_TrafficAndRainfall(io = null) {
    if (io) reallocationEngine.setIo(io);

    const eventResult = await reallocationEngine.handleEvent({
      eventType: 'HEAVY_RAINFALL',
      weatherFactor: 1.6,
      roadCondition: {
        location: 'PS10 Sector Highway',
        city: 'PS10 Sector',
        state: 'CONGESTED',
        hazardType: 'FLOOD',
        coordinates: [77.215, 28.618],
        severityScore: 8,
        description: 'Heavy rainfall caused waterlogging on Outer Ring Road. Speed reduced to 15 km/h.'
      },
      details: 'Heavy rainfall and road waterlogging detected. Shortest route congested with 12 min penalty.'
    });

    this.currentStep = 4;
    const stepResult = {
      step: 4,
      simulatedTime: '10:33 AM',
      title: '10:33 AM: Rainfall & Severe Road Congestion',
      description: `Traffic-aware routing service detected flood waterlogging on primary route. Recalculated ETA (+12 min penalty) and automatically switched en route vehicles to Alternative Bypass Detour.`,
      eventResult
    };

    if (io) io.emit('scenario:update', stepResult);
    return stepResult;
  }

  /**
   * Step 4 (10:34 AM): 4th emergency reported (Industrial Fire)
   */
  async triggerStep4_FourthEmergency(io = null) {
    if (io) reallocationEngine.setIo(io);

    // Create 4th emergency
    const incD = await Incident.create({
      incidentId: 'INC-PS10-D',
      category: 'FIRE',
      description: 'Major fire breakout in commercial warehouse complex. Hazardous chemical smoke and multiple trapped workers.',
      severity: 10,
      severityLevel: 'CRITICAL',
      affectedPeople: 4,
      isMedicalEmergency: true,
      city: 'PS10 Sector',
      location: { type: 'Point', coordinates: [77.225, 28.642] },
      address: 'North Industrial Sector Warehouses',
      status: 'PENDING',
      reportedAt: new Date()
    });

    const eventResult = await reallocationEngine.handleEvent({
      eventType: 'NEW_EMERGENCY',
      incidentId: incD._id,
      details: 'Critical 4th emergency: Industrial chemical fire requiring Fire Engine and HazMat rescue.'
    });

    this.currentStep = 5;
    const allIncidents = await Incident.find({ incidentId: { $regex: '^INC-PS10-' } }).populate('assignedAmbulance assignedHospital');

    const stepResult = {
      step: 5,
      simulatedTime: '10:34 AM',
      title: '10:34 AM: 4th Critical Emergency (Industrial Fire) Reported',
      description: `Simultaneous 4-incident global optimization executed. Matched specialized Fire Engine FIRE-F01 and secondary trauma units while preserving ongoing life-critical cardiac transit.`,
      eventResult,
      incidents: allIncidents
    };

    if (io) io.emit('scenario:update', stepResult);
    return stepResult;
  }
}

const scenarioSimulationService = new ScenarioSimulationService();

module.exports = scenarioSimulationService;

