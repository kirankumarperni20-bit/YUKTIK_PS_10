const express = require('express');
const { 
  createAmbulance, 
  getAmbulances, 
  getAmbulanceById,
  updateAmbulance,
  updateLocation, 
  updateStatus,
  assignAmbulance
} = require('../controllers/ambulanceController');

const router = express.Router();

router.route('/')
  .post(createAmbulance)
  .get(getAmbulances);

router.route('/:id')
  .get(getAmbulanceById)
  .patch(updateAmbulance);

router.patch('/:id/location', updateLocation);
router.patch('/:id/status', updateStatus);
router.patch('/:id/assign', assignAmbulance);

module.exports = router;
