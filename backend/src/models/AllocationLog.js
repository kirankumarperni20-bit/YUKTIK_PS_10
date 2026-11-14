const mongoose = require('mongoose');

const allocationLogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  triggerEvent: {
    type: String,
    enum: [
      'INITIAL_DISPATCH',
      'NEW_EMERGENCY',
      'AMBULANCE_UNAVAILABLE',
      'AMBULANCE_BREAKDOWN',
      'AMBULANCE_RESTORED',
      'HOSPITAL_ZERO_ICU',
      'HOSPITAL_OVERCAPACITY',
      'HOSPITAL_RESTORED',
      'TRAFFIC_CONGESTION',
      'ROAD_BLOCKED',
      'HEAVY_RAINFALL',
      'SEVERITY_INCREASED',
      'MANUAL_OVERRIDE',
      'GLOBAL_REOPTIMIZATION'
    ],
    required: true
  },
  incidentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
  incidentCode: { type: String },
  previousAllocation: {
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
    resourceName: { type: String },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalName: { type: String }
  },
  newAllocation: {
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
    resourceName: { type: String },
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
    hospitalName: { type: String }
  },
  justification: { type: String, required: true },
  confidenceScore: { type: Number, default: 0.9 },
  strategyUsed: {
    type: String,
    enum: ['GLOBAL_DYNAMIC_OPTIMIZATION', 'HUNGARIAN_ASSIGNMENT', 'GREEDY_NEAREST', 'MANUAL_OVERRIDE'],
    default: 'GLOBAL_DYNAMIC_OPTIMIZATION'
  },
  optimizationMetrics: {
    responseTimeReductionSec: { type: Number, default: 0 },
    priorityScore: { type: Number },
    hospitalMatchingScore: { type: Number },
    conflictsAvoided: { type: Number, default: 0 }
  }
}, { timestamps: true });

allocationLogSchema.index({ timestamp: -1 });
allocationLogSchema.index({ incidentId: 1 });

module.exports = mongoose.model('AllocationLog', allocationLogSchema);

