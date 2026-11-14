const express = require('express');
const { 
  getAnalyticsOverview, 
  getDemandForecastData, 
  getBenchmarkComparison 
} = require('../controllers/analyticsController');

const router = express.Router();

router.get('/overview', getAnalyticsOverview);
router.get('/forecasting', getDemandForecastData);
router.get('/benchmark', getBenchmarkComparison);

module.exports = router;
