const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  hospitalId: { type: String, sparse: true },
  name: { type: String, required: true },
  city: { type: String, default: 'Hyderabad' },
  state: { type: String, default: 'Telangana' },
  area: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  address: { type: String },
  contactPhone: { type: String },
  emergencyDepartment: { type: Boolean, default: true },
  traumaCenter: { type: Boolean, default: false },
  traumaLevel: { type: Number, default: 2 },
  traumaCapable: { type: Boolean, default: true },
  cardiacFacility: { type: Boolean, default: false },
  icuAvailable: { type: Boolean, default: true },
  icuBeds: { type: Number, default: 30 },
  availableIcuBeds: { type: Number, default: 5 },
  bedsTotal: { type: Number, default: 200 },
  bedsAvailable: { type: Number, default: 25 },
  emergencyBeds: { type: Number, default: 50 },
  availableEmergencyBeds: { type: Number, default: 10 },
  ventilators: { type: Number, default: 10 },
  availableVentilators: { type: Number, default: 3 },
  occupancy: { type: Number, default: 75 },
  bloodBank: { type: Boolean, default: true },
  specialties: [{ type: String }],
  type: { type: String, default: 'GOVERNMENT' }, // 'GOVERNMENT', 'PRIVATE'
  ownership: { type: String },
  dataSource: { type: String },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'OVERCAPACITY', 'OFFLINE', 'AVAILABLE'], 
    default: 'ACTIVE' 
  }
}, { timestamps: true });

hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ status: 1 });
hospitalSchema.index({ availableIcuBeds: 1 });
hospitalSchema.index({ specialties: 1 });

module.exports = mongoose.model('Hospital', hospitalSchema);
