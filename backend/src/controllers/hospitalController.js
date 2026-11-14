const Hospital = require('../models/Hospital');
const Incident = require('../models/Incident');
const AllocationLog = require('../models/AllocationLog');
const { matchOptimalHospital } = require('../services/optimizationEngine');
const reallocationEngine = require('../services/reallocationEngine');

// @desc    Register a new hospital
// @route   POST /api/hospitals
// @access  Public / Admin
const createHospital = async (req, res, next) => {
  try {
    const hospital = await Hospital.create(req.body);
    if (req.io) req.io.emit('hospital:created', hospital);
    res.status(201).json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all hospitals with filtering, searching, and sorting
// @route   GET /api/hospitals
// @access  Public
const getHospitals = async (req, res, next) => {
  try {
    const { 
      search, 
      city, 
      area, 
      hasIcu, 
      zeroIcu, 
      cardiacOnly, 
      traumaOnly, 
      status, 
      sortBy, 
      order 
    } = req.query;

    const filter = {};

    // Name search
    if (search && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { address: { $regex: search.trim(), $options: 'i' } },
        { area: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    // City and Area filtering (ignore 'All India' or 'all')
    if (city && city.toLowerCase() !== 'all india' && city.toLowerCase() !== 'all') {
      filter.city = { $regex: new RegExp(`^${city}$`, 'i') };
    }
    if (area && area.toLowerCase() !== 'all') {
      filter.area = { $regex: new RegExp(`^${area}$`, 'i') };
    }

    // Status filtering
    if (status && status.toLowerCase() !== 'all') {
      filter.status = status.toUpperCase();
    }

    // ICU conditions
    if (hasIcu === 'true') {
      filter.availableIcuBeds = { $gt: 0 };
    } else if (zeroIcu === 'true') {
      filter.availableIcuBeds = 0;
    }

    // Cardiac & Trauma flags
    if (cardiacOnly === 'true') {
      filter.cardiacFacility = true;
    }
    if (traumaOnly === 'true') {
      filter.traumaCenter = true;
    }

    // Build sort
    let sortOptions = { name: 1 };
    const sortDir = order === 'desc' ? -1 : 1;
    if (sortBy === 'availableIcuBeds') {
      sortOptions = { availableIcuBeds: sortDir, name: 1 };
    } else if (sortBy === 'bedsAvailable' || sortBy === 'availableBeds') {
      sortOptions = { bedsAvailable: sortDir, name: 1 };
    } else if (sortBy === 'occupancy') {
      sortOptions = { occupancy: sortDir, name: 1 };
    } else if (sortBy === 'emergencyBeds') {
      sortOptions = { availableEmergencyBeds: sortDir, name: 1 };
    }

    const hospitals = await Hospital.find(filter).sort(sortOptions);
    res.json({ success: true, count: hospitals.length, data: hospitals });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single hospital by ID
// @route   GET /api/hospitals/:id
// @access  Public
const getHospitalById = async (req, res, next) => {
  try {
    let hospital;
    if (req.params.id.startsWith('HOSP-')) {
      hospital = await Hospital.findOne({ hospitalId: req.params.id });
    } else {
      hospital = await Hospital.findById(req.params.id);
    }

    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }
    res.json({ success: true, data: hospital });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Hospital Details
// @route   PATCH /api/hospitals/:id
// @access  Public / Admin
const updateHospital = async (req, res, next) => {
  try {
    const updated = await Hospital.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    if (req.io) req.io.emit('hospital:updated', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Hospital Status
// @route   PATCH /api/hospitals/:id/status
// @access  Public / Admin
const updateHospitalStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updated = await Hospital.findByIdAndUpdate(
      req.params.id,
      { status: status.toUpperCase() },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    if (req.io) req.io.emit('hospital:statusUpdated', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Match and recommend hospitals with Hard ICU & Specialty Constraints
// @route   POST /api/hospitals/match
// @access  Public / Private
const matchHospitals = async (req, res, next) => {
  try {
    const { incidentId } = req.body;
    
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    const hospitals = await Hospital.find({ status: { $ne: 'OFFLINE' } });
    const matchResult = await matchOptimalHospital(incident, hospitals);

    res.json({ 
      success: true, 
      data: {
        recommended: matchResult.selected,
        etaMinutes: matchResult.etaMin,
        distanceKm: matchResult.distanceKm,
        alternatives: matchResult.alternatives,
        explanation: matchResult.explanation
      } 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Hospital Capacity / Status (Hospital Administrator Role)
// @route   PATCH /api/hospitals/:id/capacity
// @access  Public / Hospital Admin
const updateHospitalCapacity = async (req, res, next) => {
  try {
    const { 
      availableIcuBeds, 
      bedsAvailable, 
      availableEmergencyBeds, 
      availableVentilators,
      status,
      cardiacFacility 
    } = req.body;

    const previousHospital = await Hospital.findById(req.params.id);
    if (!previousHospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    const updateData = {};
    if (availableIcuBeds !== undefined) updateData.availableIcuBeds = parseInt(availableIcuBeds, 10);
    if (bedsAvailable !== undefined) updateData.bedsAvailable = parseInt(bedsAvailable, 10);
    if (availableEmergencyBeds !== undefined) updateData.availableEmergencyBeds = parseInt(availableEmergencyBeds, 10);
    if (availableVentilators !== undefined) updateData.availableVentilators = parseInt(availableVentilators, 10);
    if (status !== undefined) updateData.status = status;
    if (cardiacFacility !== undefined) updateData.cardiacFacility = Boolean(cardiacFacility);

    // Update icuAvailable boolean flag automatically
    if (updateData.availableIcuBeds !== undefined) {
      updateData.icuAvailable = updateData.availableIcuBeds > 0;
    }

    const updated = await Hospital.findByIdAndUpdate(req.params.id, updateData, { new: true });

    // Check if ICU dropped to zero while active patients were designated
    if (previousHospital.availableIcuBeds > 0 && updated.availableIcuBeds === 0) {
      if (req.io) reallocationEngine.setIo(req.io);
      await reallocationEngine.handleEvent({
        eventType: 'HOSPITAL_ZERO_ICU',
        hospitalId: updated._id,
        details: `${updated.name} reported ZERO available ICU beds. Triggered clinical re-evaluation.`
      });
    }

    if (req.io) {
      req.io.emit('hospital:capacityUpdated', updated);
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createHospital,
  getHospitals,
  getHospitalById,
  updateHospital,
  updateHospitalStatus,
  matchHospitals,
  updateHospitalCapacity
};
