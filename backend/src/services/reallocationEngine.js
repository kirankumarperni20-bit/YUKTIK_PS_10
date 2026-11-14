/**
 * Dynamic Real-Time Reallocation Engine
 * Event-driven engine reacting to resource breakdowns, hospital ICU zeroing,
 * traffic congestion, weather events, and new high-priority incidents.
 */

const Incident = require('../models/Incident');
const Ambulance = require('../models/Ambulance');
const Hospital = require('../models/Hospital');
const Dispatch = require('../models/Dispatch');
const RoadCondition = require('../models/RoadCondition');
const AllocationLog = require('../models/AllocationLog');
const { runGlobalOptimization, matchOptimalHospital } = require('./optimizationEngine');

class ReallocationEngine {
  constructor(io = null) {
    this.io = io;
  }

  setIo(io) {
    this.io = io;
  }

  /**
   * Handle an operational disruption event and re-optimize
   */
  async handleEvent({
    eventType,
    ambulanceId = null,
    hospitalId = null,
    incidentId = null,
    roadCondition = null,
    weatherFactor = 1.0,
    details = ''
  }) {
    console.log(`[ReallocationEngine] Event Triggered: ${eventType} | Details: ${details}`);

    // Step 1: Update central state based on event
    if (eventType === 'AMBULANCE_BREAKDOWN' || eventType === 'AMBULANCE_UNAVAILABLE') {
      if (ambulanceId) {
        await Ambulance.findByIdAndUpdate(ambulanceId, {
          status: 'MAINTENANCE',
          lastUpdated: Date.now()
        });
      }
    } else if (eventType === 'AMBULANCE_RESTORED') {
      if (ambulanceId) {
        await Ambulance.findByIdAndUpdate(ambulanceId, {
          status: 'AVAILABLE',
          lastUpdated: Date.now()
        });
      }
    } else if (eventType === 'HOSPITAL_ZERO_ICU') {
      if (hospitalId) {
        await Hospital.findByIdAndUpdate(hospitalId, {
          availableIcuBeds: 0,
          icuAvailable: false
        });
      }
    } else if (eventType === 'HOSPITAL_RESTORED') {
      if (hospitalId) {
        await Hospital.findByIdAndUpdate(hospitalId, {
          availableIcuBeds: 8,
          icuAvailable: true,
          status: 'ACTIVE'
        });
      }
    } else if (eventType === 'ROAD_BLOCKED' || eventType === 'TRAFFIC_CONGESTION') {
      if (roadCondition) {
        await RoadCondition.create(roadCondition);
      }
    }

    // Step 2: Fetch current operational snapshot
    const [incidents, ambulances, hospitals, roadConditions] = await Promise.all([
      Incident.find({ status: { $nin: ['RESOLVED', 'CANCELLED'] } }),
      Ambulance.find(),
      Hospital.find(),
      RoadCondition.find({ state: { $ne: 'NORMAL' } })
    ]);

    // Snapshot existing assignments to detect changes
    const previousMap = new Map();
    incidents.forEach(inc => {
      previousMap.set(inc._id.toString(), {
        assignedAmbulance: inc.assignedAmbulance ? inc.assignedAmbulance.toString() : null,
        assignedHospital: inc.assignedHospital ? inc.assignedHospital.toString() : null
      });
    });

    // Step 3: Run Global Multi-Incident Optimization
    const optimizationResult = await runGlobalOptimization({
      incidents,
      resources: ambulances,
      hospitals,
      roadConditions,
      weatherFactor
    });

    // Step 4: Validate operational constraints and apply justified changes
    const appliedChanges = [];

    for (const alloc of optimizationResult.assignments) {
      const incId = alloc.incident._id.toString();
      const prev = previousMap.get(incId);
      const newAmbId = alloc.resource._id.toString();
      const newHospId = alloc.hospital ? alloc.hospital._id.toString() : null;

      const ambulanceChanged = prev.assignedAmbulance !== newAmbId;
      const hospitalChanged = prev.assignedHospital !== newHospId;

      if (ambulanceChanged || hospitalChanged) {
        // Update incident record
        const updateFields = {
          assignedAmbulance: alloc.resource._id,
          assignedHospital: alloc.hospital?._id || null,
          recommendedHospital: alloc.hospital?._id || null,
          status: 'ASSIGNED',
          dispatchTime: Date.now(),
          reallocationCount: (alloc.incident.reallocationCount || 0) + 1,
          lastReallocatedAt: Date.now(),
          reallocationReason: `[${eventType}] ${alloc.explanation}`,
          allocationExplanation: alloc.explanation
        };

        await Incident.findByIdAndUpdate(alloc.incident._id, updateFields);

        // Update previous ambulance if freed
        if (ambulanceChanged && prev.assignedAmbulance) {
          await Ambulance.findByIdAndUpdate(prev.assignedAmbulance, {
            status: 'AVAILABLE',
            currentIncident: null,
            lastUpdated: Date.now()
          });
        }

        // Update newly assigned ambulance
        await Ambulance.findByIdAndUpdate(alloc.resource._id, {
          status: 'EN_ROUTE',
          currentIncident: alloc.incident._id,
          lastUpdated: Date.now()
        });

        // Create or update Dispatch record
        await Dispatch.create({
          incident: alloc.incident._id,
          ambulance: alloc.resource._id,
          hospital: alloc.hospital?._id,
          status: 'ASSIGNED',
          priority: (alloc.incident.severity >= 8) ? 'CRITICAL' : 'HIGH',
          eta: alloc.etaMin,
          distance: alloc.distanceKm,
          score: alloc.score,
          allocationReason: alloc.explanation,
          reallocatedFrom: ambulanceChanged && prev.assignedAmbulance ? prev.assignedAmbulance : undefined,
          reallocationReason: eventType,
          strategy: 'GLOBAL_DYNAMIC_OPTIMIZATION',
          assignedAt: Date.now()
        });

        // Audit log in AllocationLog
        const logEntry = await AllocationLog.create({
          triggerEvent: eventType,
          incidentId: alloc.incident._id,
          incidentCode: alloc.incident.incidentId || alloc.incident._id.toString(),
          previousAllocation: {
            resourceId: prev.assignedAmbulance,
            hospitalId: prev.assignedHospital
          },
          newAllocation: {
            resourceId: alloc.resource._id,
            resourceName: alloc.resource.ambulanceId,
            hospitalId: alloc.hospital?._id,
            hospitalName: alloc.hospital?.name
          },
          justification: alloc.explanation,
          strategyUsed: 'GLOBAL_DYNAMIC_OPTIMIZATION',
          optimizationMetrics: {
            responseTimeReductionSec: Math.round(alloc.etaMin * 60),
            priorityScore: alloc.incident.severity || 5
          }
        });

        appliedChanges.push({
          incidentId: alloc.incident._id,
          incidentCode: alloc.incident.incidentId,
          ambulance: alloc.resource,
          hospital: alloc.hospital,
          etaMin: alloc.etaMin,
          explanation: alloc.explanation,
          logId: logEntry._id
        });
      }
    }

    // Step 5: Broadcast real-time updates via Socket.IO
    if (this.io) {
      this.io.emit('reallocation:executed', {
        eventType,
        timestamp: new Date().toISOString(),
        changesCount: appliedChanges.length,
        changes: appliedChanges,
        metrics: optimizationResult.metrics
      });

      this.io.emit('system:alert', {
        type: 'OPTIMIZATION_EVENT',
        title: `Dynamic Reallocation: ${eventType}`,
        message: `System dynamically reconsidered allocations. ${appliedChanges.length} units reallocated.`,
        timestamp: new Date().toISOString()
      });
    }

    return {
      success: true,
      eventType,
      appliedChanges,
      optimizationResult
    };
  }
}

const reallocationEngine = new ReallocationEngine();

module.exports = reallocationEngine;

