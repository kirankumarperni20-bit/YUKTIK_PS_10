const express = require('express');
const { 
  recommendDispatch, 
  globalOptimize, 
  triggerReallocation, 
  assignDispatch, 
  getDispatchHistory, 
  getActiveDispatches 
} = require('../controllers/dispatchController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/recommend', recommendDispatch);
router.post('/global-optimize', globalOptimize);
router.post('/reallocate', triggerReallocation);
router.post('/assign', assignDispatch);
router.get('/history', getDispatchHistory);
router.get('/active', getActiveDispatches);

module.exports = router;
