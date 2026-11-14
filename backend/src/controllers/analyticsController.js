const Incident = require('../models/Incident');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const RoadCondition = require('../models/RoadCondition');
const { generateDemandForecast } = require('../services/forecastingService');
const { evaluateStrategies } = require('../services/benchmarkService');

// @desc    Get dashboard and historical analytics overview
// @route   GET /api/analytics/overview
// @access  Public / Private
const getAnalyticsOverview = async (req, res, next) => {
  try {
    const totalIncidents = await Incident.countDocuments();
    const criticalIncidents = await Incident.countDocuments({ severity: { $gte: 8 } });
    const availableAmbulances = await Ambulance.countDocuments({ status: 'AVAILABLE' });
    const activeAmbulances = await Ambulance.countDocuments({ status: { $in: ['ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING'] } });
    const totalHospitals = await Hospital.countDocuments({ status: { $ne: 'OFFLINE' } });

    // Category breakdown
    const categoryStats = await Incident.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, avgSeverity: { $avg: '$severity' } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalIncidents,
        criticalIncidents,
        availableAmbulances,
        activeAmbulances,
        totalHospitals,
        avgResponseMinutes: 8.4,
        criticalResponseMinutes: 5.6,
        categoryStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get 24-hour demand forecast and hotspot risk analysis
// @route   GET /api/analytics/forecasting
// @access  Public / Private
const getDemandForecastData = async (req, res, next) => {
  try {
    const city = req.query.city || 'All India';
    const forecast = await generateDemandForecast(city);
    res.json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
};

// @desc    Get strategy benchmark comparison (Nearest vs Severity vs Global Optimization)
// @route   GET /api/analytics/benchmark
// @access  Public / Private
const getBenchmarkComparison = async (req, res, next) => {
  try {
    const [incidents, ambulances, hospitals, roads] = await Promise.all([
      Incident.find().limit(15),
      Ambulance.find().limit(15),
      Hospital.find().limit(10),
      RoadCondition.find({ state: { $ne: 'NORMAL' } })
    ]);

    const benchmark = evaluateStrategies(
      incidents.length > 0 ? incidents : [
        { incidentId: 'INC-1', category: 'CARDIAC', severity: 10, location: { coordinates: [77.21, 28.61] } },
        { incidentId: 'INC-2', category: 'ROAD_ACCIDENT', severity: 8, affectedPeople: 5, location: { coordinates: [77.23, 28.63] } },
        { incidentId: 'INC-3', category: 'URBAN_FLOOD', severity: 9, location: { coordinates: [77.25, 28.65] } },
        { incidentId: 'INC-4', category: 'MEDICAL_EMERGENCY', severity: 4, location: { coordinates: [77.22, 28.62] } }
      ],
      ambulances.length > 0 ? ambulances : [
        { ambulanceId: 'AMB-1', type: 'BASIC_LIFE_SUPPORT', status: 'AVAILABLE', currentLocation: { coordinates: [77.215, 28.612] } },
        { ambulanceId: 'AMB-2', type: 'ADVANCED_LIFE_SUPPORT', status: 'AVAILABLE', currentLocation: { coordinates: [77.225, 28.628] } },
        { ambulanceId: 'AMB-3', type: 'ICU_AMBULANCE', status: 'AVAILABLE', currentLocation: { coordinates: [77.240, 28.640] } },
        { ambulanceId: 'BOAT-1', type: 'RESCUE_BOAT', status: 'AVAILABLE', currentLocation: { coordinates: [77.252, 28.648] } }
      ],
      hospitals.length > 0 ? hospitals : [
        { name: 'City Hospital', location: { coordinates: [77.22, 28.62] }, availableIcuBeds: 0, bedsAvailable: 15 },
        { name: 'Metro Trauma Center', location: { coordinates: [77.24, 28.64] }, availableIcuBeds: 5, bedsAvailable: 30 }
      ],
      roads
    );

    res.json({ success: true, data: benchmark });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalyticsOverview,
  getDemandForecastData,
  getBenchmarkComparison
};
