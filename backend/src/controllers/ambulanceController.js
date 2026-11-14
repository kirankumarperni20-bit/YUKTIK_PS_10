const Ambulance = require('../models/Ambulance');
const Incident = require('../models/Incident');

// @desc    Register a new ambulance
// @route   POST /api/ambulances
// @access  Public / Admin
const createAmbulance = async (req, res, next) => {
  try {
    const ambulanceData = { ...req.body };
    if (!ambulanceData.ambulanceId) {
      const count = await Ambulance.countDocuments();
      ambulanceData.ambulanceId = `AMB-HYD-${String(count + 1).padStart(3, '0')}`;
    }
    if (!ambulanceData.currentLocation || !ambulanceData.currentLocation.coordinates) {
      // Default to central Hyderabad if coordinates omitted
      ambulanceData.currentLocation = {
        type: 'Point',
        coordinates: [78.4867, 17.3850]
      };
    }

    const ambulance = await Ambulance.create(ambulanceData);
    if (req.io) req.io.emit('ambulance:created', ambulance);
    res.status(201).json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all ambulances with filtering, searching, and sorting
// @route   GET /api/ambulances
// @access  Public
const getAmbulances = async (req, res, next) => {
  try {
    const { search, city, area, type, status, sortBy, order } = req.query;
    const filter = {};

    // Search query
    if (search && search.trim() !== '') {
      filter.$or = [
        { ambulanceId: { $regex: search.trim(), $options: 'i' } },
        { registrationNumber: { $regex: search.trim(), $options: 'i' } },
        { driverName: { $regex: search.trim(), $options: 'i' } },
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

    // Type filter
    if (type && type.toLowerCase() !== 'all') {
      filter.type = type.toUpperCase();
    }

    // Status filter
    if (status && status.toLowerCase() !== 'all') {
      filter.status = status.toUpperCase();
    }

    // Sorting
    let sortOptions = { ambulanceId: 1 };
    const sortDir = order === 'desc' ? -1 : 1;
    if (sortBy === 'status') {
      sortOptions = { status: sortDir, ambulanceId: 1 };
    } else if (sortBy === 'type') {
      sortOptions = { type: sortDir, ambulanceId: 1 };
    } else if (sortBy === 'fuelLevel') {
      sortOptions = { fuelLevel: sortDir };
    }

    const ambulances = await Ambulance.find(filter)
      .populate('driver', 'name phone')
      .populate('currentIncident', 'incidentId title category severity')
      .sort(sortOptions);

    res.json({ success: true, count: ambulances.length, data: ambulances });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single ambulance by ID or ambulanceId string
// @route   GET /api/ambulances/:id
// @access  Public
const getAmbulanceById = async (req, res, next) => {
  try {
    let ambulance;
    if (req.params.id.startsWith('AMB-')) {
      ambulance = await Ambulance.findOne({ ambulanceId: req.params.id })
        .populate('driver', 'name phone')
        .populate('currentIncident');
    } else {
      ambulance = await Ambulance.findById(req.params.id)
        .populate('driver', 'name phone')
        .populate('currentIncident');
    }

    if (!ambulance) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }
    res.json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ambulance details
// @route   PATCH /api/ambulances/:id
// @access  Public / Admin
const updateAmbulance = async (req, res, next) => {
  try {
    const updated = await Ambulance.findByIdAndUpdate(req.params.id, req.body, { 
      new: true, 
      runValidators: true 
    });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    if (req.io) req.io.emit('ambulance:updated', updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ambulance location (from Driver app or Simulator)
// @route   PATCH /api/ambulances/:id/location
// @access  Public / Driver
const updateLocation = async (req, res, next) => {
  try {
    const { latitude, longitude, speed, heading } = req.body;
    
    const updateData = {
      currentLocation: { 
        type: 'Point', 
        coordinates: [parseFloat(longitude), parseFloat(latitude)] 
      },
      lastUpdated: Date.now()
    };

    if (speed !== undefined) updateData.speed = parseFloat(speed);
    if (heading !== undefined) updateData.heading = parseFloat(heading);

    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!ambulance) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }
    
    if (req.io) req.io.emit('ambulance:location', ambulance);
    res.json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

// @desc    Update ambulance status
// @route   PATCH /api/ambulances/:id/status
// @access  Public / Dispatcher
const updateStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const updateData = { status: status.toUpperCase(), lastUpdated: Date.now() };

    // If marked AVAILABLE, clear any current incident assignment
    if (status.toUpperCase() === 'AVAILABLE') {
      updateData.currentIncident = null;
      updateData.currentAssignment = null;
    }
    
    const ambulance = await Ambulance.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!ambulance) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }
    
    if (req.io) req.io.emit('ambulance:status', ambulance);
    res.json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign or unassign ambulance to an incident
// @route   PATCH /api/ambulances/:id/assign
// @access  Public / Dispatcher
const assignAmbulance = async (req, res, next) => {
  try {
    const { incidentId, status = 'ASSIGNED' } = req.body;

    const ambulance = await Ambulance.findById(req.params.id);
    if (!ambulance) {
      return res.status(404).json({ success: false, message: 'Ambulance not found' });
    }

    if (incidentId) {
      const incident = await Incident.findById(incidentId);
      ambulance.currentIncident = incident ? incident._id : null;
      ambulance.currentAssignment = incident ? (incident.incidentId || incident.title) : 'Assigned Incident';
      ambulance.status = status.toUpperCase();
    } else {
      ambulance.currentIncident = null;
      ambulance.currentAssignment = null;
      ambulance.status = 'AVAILABLE';
    }

    ambulance.lastUpdated = Date.now();
    await ambulance.save();

    if (req.io) req.io.emit('ambulance:assignmentUpdated', ambulance);
    res.json({ success: true, data: ambulance });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAmbulance,
  getAmbulances,
  getAmbulanceById,
  updateAmbulance,
  updateLocation,
  updateStatus,
  assignAmbulance
};
