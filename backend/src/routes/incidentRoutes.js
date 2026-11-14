const express = require('express');
const { 
  createIncident, 
  getIncidents, 
  getIncidentById, 
  trackIncident,
  triggerAutoDispatch,
  updateIncidentStatus, 
  getHistoricalIncidents 
} = require('../controllers/incidentController');
const upload = require('../middleware/upload');

const router = express.Router();

router.route('/')
  .post(upload.array('media', 5), createIncident)
  .get(getIncidents);

router.get('/track/:token', trackIncident);
router.get('/historical', getHistoricalIncidents);
router.post('/:id/auto-dispatch', triggerAutoDispatch);

router.route('/:id')
  .get(getIncidentById);

router.patch('/:id/status', updateIncidentStatus);

module.exports = router;
