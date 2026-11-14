const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema({
  ambulanceId: { type: String, required: true, unique: true },
  registrationNumber: { type: String, required: true },
  city: { type: String },
  state: { type: String },
  type: { 
    type: String, 
    enum: [
      'BASIC_LIFE_SUPPORT', 
      'ADVANCED_LIFE_SUPPORT', 
      'ICU_AMBULANCE', 
      'FIRE_ENGINE', 
      'RESCUE_VEHICLE', 
      'RESCUE_BOAT', 
      'RESCUE_TEAM', 
      'MEDICAL_TEAM', 
      'PATIENT_TRANSPORT', 
      'OTHER'
    ],
    default: 'BASIC_LIFE_SUPPORT'
  },
  resourceCategory: {
    type: String,
    enum: ['AMBULANCE', 'FIRE_ENGINE', 'RESCUE_BOAT', 'RESCUE_TEAM', 'MEDICAL_TEAM'],
    default: 'AMBULANCE'
  },
  capability: { type: String },
  capabilities: [{ type: String }],
  driverName: { type: String },
  driverPhone: { type: String },
  area: { type: String },
  equipment: [{ type: String }],
  fuelLevel: { type: Number, default: 100 },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  speed: { type: Number, default: 0 },
  heading: { type: Number, default: 0 },
  currentLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  status: {
    type: String,
    enum: ['AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING', 'AT_HOSPITAL', 'RETURNING', 'MAINTENANCE', 'OFFLINE'],
    default: 'OFFLINE'
  },
  currentIncident: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
  currentAssignment: { type: String },
  destination: {
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number] }
    },
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' }
  },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

ambulanceSchema.index({ currentLocation: '2dsphere' });
ambulanceSchema.index({ status: 1 });
ambulanceSchema.index({ type: 1 });
ambulanceSchema.index({ resourceCategory: 1 });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
