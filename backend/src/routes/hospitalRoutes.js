const express = require('express');
const { 
  createHospital, 
  getHospitals, 
  getHospitalById,
  updateHospital,
  updateHospitalStatus,
  matchHospitals, 
  updateHospitalCapacity 
} = require('../controllers/hospitalController');

const router = express.Router();

router.route('/')
  .post(createHospital)
  .get(getHospitals);

router.post('/match', matchHospitals);

router.route('/:id')
  .get(getHospitalById)
  .patch(updateHospital);

router.patch('/:id/capacity', updateHospitalCapacity);
router.patch('/:id/status', updateHospitalStatus);

module.exports = router;
