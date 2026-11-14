const express = require('express');
const scenarioSimulationService = require('../services/scenarioSimulationService');

const router = express.Router();

router.post('/ps10/init', async (req, res, next) => {
  try {
    const data = await scenarioSimulationService.initializeScenario(req.io);
    res.json({ success: true, message: 'PS10 Scenario Initialized (10:30 AM State)', data });
  } catch (err) {
    next(err);
  }
});

router.post('/ps10/step1-breakdown', async (req, res, next) => {
  try {
    const data = await scenarioSimulationService.triggerStep1_AmbulanceBreakdown(req.io);
    res.json({ success: true, message: 'Step 1 Triggered: Ambulance Breakdown', data });
  } catch (err) {
    next(err);
  }
});

router.post('/ps10/step2-zero-icu', async (req, res, next) => {
  try {
    const data = await scenarioSimulationService.triggerStep2_ZeroICUBeds(req.io);
    res.json({ success: true, message: 'Step 2 Triggered: Hospital Zero ICU Beds', data });
  } catch (err) {
    next(err);
  }
});

router.post('/ps10/step3-traffic-rain', async (req, res, next) => {
  try {
    const data = await scenarioSimulationService.triggerStep3_TrafficAndRainfall(req.io);
    res.json({ success: true, message: 'Step 3 Triggered: Traffic & Heavy Rainfall', data });
  } catch (err) {
    next(err);
  }
});

router.post('/ps10/step4-fourth-emergency', async (req, res, next) => {
  try {
    const data = await scenarioSimulationService.triggerStep4_FourthEmergency(req.io);
    res.json({ success: true, message: 'Step 4 Triggered: Fourth Emergency Reported', data });
  } catch (err) {
    next(err);
  }
});

router.get('/ps10/status', (req, res) => {
  res.json({
    success: true,
    currentStep: scenarioSimulationService.currentStep,
    scenarioData: scenarioSimulationService.scenarioData
  });
});

module.exports = router;

