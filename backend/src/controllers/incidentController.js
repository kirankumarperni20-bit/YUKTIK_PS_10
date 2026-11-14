const Incident = require('../models/Incident');
const crypto = require('crypto');
const axios = require('axios');
const reallocationEngine = require('../services/reallocationEngine');

// @desc    Create new incident with AI classification and resource prediction
// @route   POST /api/incidents
// @access  Public / Private
const createIncident = async (req, res, next) => {
  try {
    const { 
      category, 
      description, 
      latitude, 
      longitude, 
      address, 
      affectedPeople, 
      isMedicalEmergency, 
      callerPhone, 
      city 
    } = req.body;
    
    // Process media files if uploaded
    const mediaPaths = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        mediaPaths.push(`/uploads/${req.body.type === 'evidence' ? 'evidence' : 'incidents'}/${file.filename}`);
      });
    }

    const trackingToken = crypto.randomBytes(8).toString('hex');
    const incidentId = 'INC-' + Math.floor(100000 + Math.random() * 900000);
    const numCasualties = affectedPeople ? parseInt(affectedPeople) : 1;

    // Intelligent city and state resolution from address/coordinates
    let incidentCity = city;
    let incidentState = req.body.state || 'Telangana';

    if (!incidentCity && address) {
      const lower = address.toLowerCase();
      if (lower.includes('hyderabad') || lower.includes('secunderabad') || lower.includes('cyberabad') || lower.includes('telangana')) {
        incidentCity = 'Hyderabad';
        incidentState = 'Telangana';
      } else if (lower.includes('bengaluru') || lower.includes('bangalore')) {
        incidentCity = 'Bengaluru';
        incidentState = 'Karnataka';
      } else if (lower.includes('delhi')) {
        incidentCity = 'New Delhi';
        incidentState = 'Delhi';
      } else if (lower.includes('mumbai')) {
        incidentCity = 'Mumbai';
        incidentState = 'Maharashtra';
      } else if (lower.includes('chennai')) {
        incidentCity = 'Chennai';
        incidentState = 'Tamil Nadu';
      } else if (lower.includes('kolkata')) {
        incidentCity = 'Kolkata';
        incidentState = 'West Bengal';
      } else {
        const tokens = address.split(',').map(s => s.trim()).filter(s => s && s.toLowerCase() !== 'india' && !/^\d{5,6}$/.test(s));
        incidentCity = tokens.length > 0 ? tokens[tokens.length - 1] : 'Hyderabad';
      }
    }
    if (!incidentCity || incidentCity.toLowerCase() === 'india') {
      incidentCity = 'Hyderabad';
    }

    const incident = await Incident.create({
      incidentId,
      trackingToken,
      reportedBy: req.user ? req.user._id : undefined,
      category: category || 'ROAD_ACCIDENT',
      description,
      city: incidentCity,
      state: incidentState,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      address,
      media: mediaPaths,
      callerPhone,
      affectedPeople: numCasualties,
      isMedicalEmergency: isMedicalEmergency === 'true' || isMedicalEmergency === true,
      status: 'PENDING'
    });

    // Invoke AI microservice for classification and resource requirement estimation
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const aiRes = await axios.post(`${aiServiceUrl}/api/ai/analyze`, {
        incidentId: incident._id.toString(),
        description: incident.description,
        category: incident.category,
        affectedPeople: numCasualties
      }, { timeout: 3000 });
      
      if (aiRes.data && aiRes.data.success) {
        const result = aiRes.data.data;
        const AIAnalysis = require('../models/AIAnalysis');
        await AIAnalysis.create({
          incident: incident._id,
          severityScore: result.recommendedSeverity || 5,
          confidence: result.confidenceScore || 0.85,
          recommendedAmbulanceType: result.requiredResources?.ambulanceType || 'ADVANCED_LIFE_SUPPORT',
          medicalAssessment: result.reasoning || 'Analysis complete',
          isGemini: result.isGemini !== false
        });
        
        incident.severity = result.recommendedSeverity || 5;
        incident.severityLevel = result.severityLevel || (incident.severity >= 8 ? 'CRITICAL' : 'HIGH');
        incident.aiConfidence = result.confidenceScore || 0.88;
        incident.source = result.isGemini ? 'GEMINI_AI' : 'SCIKIT_ML_MODEL';
        if (result.requiredResources) {
          incident.requiredResources = result.requiredResources;
        }
        await incident.save();
      }
    } catch (aiError) {
      console.warn("AI Service analysis fallback:", aiError.message);
      // Local rule-based fallback
      incident.severity = incident.category === 'CARDIAC' ? 10 : (incident.category === 'FIRE' ? 9 : 7);
      incident.severityLevel = incident.severity >= 9 ? 'CRITICAL' : 'HIGH';
      incident.source = 'FALLBACK_DISPATCH_RULES';
      await incident.save();
    }

    // Automatically dispatch optimal ambulance and hospital immediately
    const { autoDispatchIncident } = require('../services/optimizationEngine');
    await autoDispatchIncident(incident._id, req.io);

    const populatedIncident = await Incident.findById(incident._id)
      .populate('assignedAmbulance')
      .populate('assignedHospital');

    if (req.io) {
      reallocationEngine.setIo(req.io);
      req.io.emit('incident:created', populatedIncident || incident);
    }

    res.status(201).json({ 
      success: true, 
      data: populatedIncident || incident,
      trackingUrl: `/track/${incident.trackingToken}`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active incidents (Dispatcher view)
// @route   GET /api/incidents
// @access  Public / Private
const getIncidents = async (req, res, next) => {
  try {
    const incidents = await Incident.find({
      status: { $nin: ['RESOLVED', 'CANCELLED'] }
    })
      .populate('reportedBy', 'name phone')
      .populate('assignedAmbulance')
      .populate('assignedHospital')
      .sort('-createdAt');
    
    res.json({ success: true, count: incidents.length, data: incidents });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single incident
// @route   GET /api/incidents/:id
// @access  Private
const getIncidentById = async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reportedBy', 'name phone')
      .populate('assignedAmbulance')
      .populate('assignedHospital');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found' });
    }

    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

// @desc    Citizen Emergency Live Tracking
// @route   GET /api/incidents/track/:token
// @access  Public
const trackIncident = async (req, res, next) => {
  try {
    let incident = await Incident.findOne({ trackingToken: req.params.token })
      .populate('assignedAmbulance', 'ambulanceId type status speed heading currentLocation driverName driverPhone')
      .populate('assignedHospital', 'name address location availableIcuBeds');

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Invalid tracking reference' });
    }

    // Auto-dispatch optimal ambulance & hospital if pending or unassigned
    if (!incident.assignedAmbulance || !incident.assignedHospital || incident.status === 'PENDING') {
      const { autoDispatchIncident } = require('../services/optimizationEngine');
      await autoDispatchIncident(incident._id, req.io);
      incident = await Incident.findById(incident._id)
        .populate('assignedAmbulance', 'ambulanceId type status speed heading currentLocation driverName driverPhone')
        .populate('assignedHospital', 'name address location availableIcuBeds');
    }

    res.json({
      success: true,
      data: {
        incidentId: incident.incidentId,
        category: incident.category,
        status: incident.status,
        address: incident.address,
        location: incident.location,
        reportedAt: incident.reportedAt,
        assignedAmbulance: incident.assignedAmbulance,
        assignedHospital: incident.assignedHospital,
        explanation: incident.allocationExplanation
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger auto-dispatch for an incident
// @route   POST /api/incidents/:id/auto-dispatch
// @access  Public
const triggerAutoDispatch = async (req, res, next) => {
  try {
    const { autoDispatchIncident } = require('../services/optimizationEngine');
    const updated = await autoDispatchIncident(req.params.id, req.io);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// @desc    Update incident status
// @route   PATCH /api/incidents/:id/status
// @access  Private (Dispatcher, Admin, Driver)
const updateIncidentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      {
        status,
        resolvedAt: status === 'RESOLVED' ? Date.now() : undefined
      },
      { new: true }
    );

    if (req.io) {
      req.io.emit('incident:statusUpdated', incident);
    }

    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

const getHistoricalIncidents = async (req, res, next) => {
  try {
    const historical = await Incident.find({ status: 'RESOLVED' }).limit(100);
    res.json({ success: true, data: historical });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createIncident,
  getIncidents,
  getIncidentById,
  trackIncident,
  triggerAutoDispatch,
  updateIncidentStatus,
  getHistoricalIncidents
};
