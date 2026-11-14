const Dispatch = require('../models/Dispatch');
const Ambulance = require('../models/Ambulance');
const Incident = require('../models/Incident');
const Hospital = require('../models/Hospital');
const RoadCondition = require('../models/RoadCondition');
const AllocationLog = require('../models/AllocationLog');
const { runGlobalOptimization, matchOptimalHospital } = require('../services/optimizationEngine');
const reallocationEngine = require('../services/reallocationEngine');

// @desc    Recommend optimal resource and hospital for an incident using Global Optimization
// @route   POST /api/dispatch/recommend
// @access  Private (Dispatcher, Admin)
const recommendDispatch = async (req, res, next) => {
  try {
    const { incidentId } = req.body;
    
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const [ambulances, hospitals, roadConditions] = await Promise.all([
      Ambulance.find({ status: 'AVAILABLE' }),
      Hospital.find({ status: { $ne: 'OFFLINE' } }),
      RoadCondition.find({ state: { $ne: 'NORMAL' } })
    ]);
    
    if (ambulances.length === 0) {
      return res.json({ 
        success: true, 
        data: null, 
        message: 'No emergency response units currently available in fleet' 
      });
    }

    // Run global optimization on this incident and candidate resources
    const optResult = await runGlobalOptimization({
      incidents: [incident],
      resources: ambulances,
      hospitals,
      roadConditions
    });

    const match = optResult.assignments[0];

    if (!match) {
      return res.json({
        success: true,
        data: null,
        message: 'No vehicle met the capability hard constraints for this incident'
      });
    }

    res.json({
      success: true,
      data: {
        ambulance: match.resource,
        hospital: match.hospital,
        etaMinutes: match.etaMin,
        distanceKm: match.distanceKm,
        score: match.score,
        explanation: match.explanation,
        factors: {
          distanceKm: match.distanceKm,
          etaMinutes: match.etaMin,
          severity: incident.severity,
          hospitalMatch: match.hospitalMatch
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run Simultaneous Multi-Incident Global Optimization
// @route   POST /api/dispatch/global-optimize
// @access  Private (Dispatcher, Admin)
const globalOptimize = async (req, res, next) => {
  try {
    const [incidents, ambulances, hospitals, roadConditions] = await Promise.all([
      Incident.find({ status: { $nin: ['RESOLVED', 'CANCELLED'] } }),
      Ambulance.find(),
      Hospital.find(),
      RoadCondition.find({ state: { $ne: 'NORMAL' } })
    ]);

    const result = await runGlobalOptimization({
      incidents,
      resources: ambulances,
      hospitals,
      roadConditions
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger Real-Time Dynamic Reallocation Event
// @route   POST /api/dispatch/reallocate
// @access  Private (Dispatcher, Admin)
const triggerReallocation = async (req, res, next) => {
  try {
    const { eventType, ambulanceId, hospitalId, incidentId, roadCondition, weatherFactor, details } = req.body;

    if (req.io) reallocationEngine.setIo(req.io);

    const result = await reallocationEngine.handleEvent({
      eventType: eventType || 'GLOBAL_REOPTIMIZATION',
      ambulanceId,
      hospitalId,
      incidentId,
      roadCondition,
      weatherFactor: weatherFactor || 1.0,
      details: details || 'Manual trigger from command dashboard'
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign resource to incident (with audit log & socket broadcast)
// @route   POST /api/dispatch/assign
// @access  Private (Dispatcher, Admin)
const assignDispatch = async (req, res, next) => {
  try {
    const { incidentId, ambulanceId, hospitalId, notes } = req.body;

    const [incident, ambulance, hospital] = await Promise.all([
      Incident.findById(incidentId),
      Ambulance.findById(ambulanceId),
      hospitalId ? Hospital.findById(hospitalId) : null
    ]);

    if (!incident || !ambulance) {
      return res.status(404).json({ success: false, message: 'Incident or Ambulance not found' });
    }

    const dispatch = await Dispatch.create({
      incident: incidentId,
      ambulance: ambulanceId,
      hospital: hospitalId || undefined,
      dispatcher: req.user ? req.user._id : undefined,
      status: 'ASSIGNED',
      strategy: 'MANUAL_OVERRIDE',
      allocationReason: notes || `Direct manual dispatch approved by dispatcher.`,
      assignedAt: Date.now()
    });

    // Update Incident
    await Incident.findByIdAndUpdate(incidentId, { 
      assignedAmbulance: ambulanceId,
      assignedHospital: hospitalId || undefined,
      recommendedHospital: hospitalId || undefined,
      assignedDispatcher: req.user ? req.user._id : undefined,
      status: 'ASSIGNED',
      dispatchTime: Date.now(),
      allocationExplanation: notes || 'Assigned to ' + ambulance.ambulanceId
    });

    // Update Ambulance
    await Ambulance.findByIdAndUpdate(ambulanceId, {
      status: 'EN_ROUTE',
      currentIncident: incidentId,
      lastUpdated: Date.now()
    });

    // Audit Log
    await AllocationLog.create({
      triggerEvent: 'INITIAL_DISPATCH',
      incidentId: incident._id,
      incidentCode: incident.incidentId || incident._id.toString(),
      newAllocation: {
        resourceId: ambulance._id,
        resourceName: ambulance.ambulanceId,
        hospitalId: hospital?._id,
        hospitalName: hospital?.name
      },
      justification: notes || 'Dispatcher assigned unit ' + ambulance.ambulanceId,
      strategyUsed: 'MANUAL_OVERRIDE'
    });

    // Notify connected clients via Socket.IO
    if (req.io) {
      req.io.emit('dispatch:assigned', {
        dispatch,
        incident,
        ambulance,
        hospital
      });
    }

    res.status(201).json({ success: true, data: dispatch });
  } catch (error) {
    next(error);
  }
};

// @desc    Get allocation audit history
// @route   GET /api/dispatch/history
// @access  Private (Dispatcher, Admin)
const getDispatchHistory = async (req, res, next) => {
  try {
    const logs = await AllocationLog.find()
      .populate('incidentId', 'incidentId category severity location address')
      .sort('-timestamp')
      .limit(100);

    res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active dispatches
// @route   GET /api/dispatch/active
// @access  Private
const getActiveDispatches = async (req, res, next) => {
  try {
    const dispatches = await Dispatch.find({ status: { $nin: ['COMPLETED', 'CANCELLED'] } })
      .populate('incident')
      .populate('ambulance')
      .populate('hospital');

    res.json({ success: true, count: dispatches.length, data: dispatches });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recommendDispatch,
  globalOptimize,
  triggerReallocation,
  assignDispatch,
  getDispatchHistory,
  getActiveDispatches
};
