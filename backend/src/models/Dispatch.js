const mongoose = require('mongoose');

const dispatchSchema = new mongoose.Schema({
  incident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident', required: true },
  ambulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  dispatcher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priority: { type: String, enum: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'], default: 'MODERATE' },
  eta: { type: Number }, // in minutes
  distance: { type: Number }, // in km
  score: { type: Number },
  factors: { type: Object }, // Store detailed score factors
  allocationReason: { type: String },
  strategy: { 
    type: String, 
    enum: ['GLOBAL_DYNAMIC_OPTIMIZATION', 'HUNGARIAN_ASSIGNMENT', 'GREEDY_NEAREST', 'MANUAL_OVERRIDE'],
    default: 'GLOBAL_DYNAMIC_OPTIMIZATION'
  },
  alternativeOptions: [{ type: Object }],
  reallocatedFrom: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
  reallocationReason: { type: String },
  status: { 
    type: String, 
    enum: ['RECOMMENDED', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'TRANSPORTING', 'COMPLETED', 'REJECTED', 'CANCELLED'],
    default: 'RECOMMENDED'
  },
  assignedAt: { type: Date },
  dispatchTime: { type: Date },
  completedAt: { type: Date }
}, { timestamps: true });

dispatchSchema.index({ incident: 1 });
dispatchSchema.index({ ambulance: 1 });
dispatchSchema.index({ status: 1 });

module.exports = mongoose.model('Dispatch', dispatchSchema);
