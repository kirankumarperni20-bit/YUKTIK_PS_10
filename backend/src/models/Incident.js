const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  incidentId: { type: String, unique: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  category: { 
    type: String, 
    enum: [
      'ROAD_ACCIDENT', 
      'CARDIAC', 
      'MEDICAL_EMERGENCY', 
      'FIRE', 
      'URBAN_FLOOD', 
      'NATURAL_DISASTER',
      'MEDICAL', 
      'TRAUMA', 
      'FALL', 
      'STROKE', 
      'RESPIRATORY', 
      'INDUSTRIAL', 
      'ACCIDENT', 
      'ROAD_BLOCKAGE', 
      'FALLEN_TREE', 
      'BUILDING_COLLAPSE', 
      'TRAFFIC_HAZARD', 
      'OTHER'
    ],
    required: true
  },
  description: { type: String },
  city: { type: String },
  state: { type: String },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  address: { type: String },
  media: [{ type: String }], // Array of file paths
  status: {
    type: String,
    enum: ['PENDING', 'REPORTED', 'AI_PROCESSING', 'VERIFIED', 'REJECTED', 'PRIORITIZED', 'ASSIGNED', 'RESPONDING', 'EN_ROUTE', 'ON_SCENE', 'TRANSPORTING', 'AT_HOSPITAL', 'RESOLVED', 'CANCELLED'],
    default: 'PENDING'
  },
  severity: { type: Number, min: 0, max: 10, default: 5 },
  severityLevel: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM'
  },
  severityScore: { type: Number },
  aiConfidence: { type: Number, default: 0.85 },
  aiClassification: { type: String },
  aiAnalysis: { type: Object },
  source: { type: String, default: 'USER' },
  duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: 'Incident' },
  duplicateProbability: { type: Number },
  affectedPeople: { type: Number, default: 1 },
  isMedicalEmergency: { type: Boolean, default: false },
  
  // Multi-Resource Requirements
  requiredResources: {
    ambulances: { type: Number, default: 1 },
    ambulanceType: { 
      type: String, 
      enum: ['BASIC_LIFE_SUPPORT', 'ADVANCED_LIFE_SUPPORT', 'ICU_AMBULANCE', 'NONE'],
      default: 'BASIC_LIFE_SUPPORT' 
    },
    fireEngines: { type: Number, default: 0 },
    rescueTeams: { type: Number, default: 0 },
    rescueBoats: { type: Number, default: 0 },
    medicalTeams: { type: Number, default: 0 }
  },

  // Resource & Hospital Assignments
  assignedAmbulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' },
  assignedResources: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance' }],
  assignedDispatcher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recommendedHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  assignedHospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  
  // Explainable AI & Reallocation Metrics
  allocationExplanation: { type: String },
  reallocationCount: { type: Number, default: 0 },
  lastReallocatedAt: { type: Date },
  reallocationReason: { type: String },
  trackingToken: { type: String },
  callerPhone: { type: String },

  reportedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  
  // Historical Analytics & CSV Reporting Fields
  aiVerifiedAt: { type: Date },
  dispatchTime: { type: Date },
  arrivedOnSceneTime: { type: Date },
  hospitalArrivalTime: { type: Date },
  outcome: { type: String },
  hospitalName: { type: String },
  ambulanceId: { type: String },
  ambulanceType: { type: String },
  dataSource: { type: String, default: 'USER' }
}, { timestamps: true });

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ category: 1 });
incidentSchema.index({ status: 1 });
incidentSchema.index({ severity: -1 });
incidentSchema.index({ severityLevel: 1 });

module.exports = mongoose.model('Incident', incidentSchema);
