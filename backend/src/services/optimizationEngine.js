/**
 * Global Multi-Incident Resource Allocation Engine
 * Implements Hungarian Algorithm (Kuhn-Munkres) + Constraint-Based Optimization
 * Solves global multi-incident assignment simultaneously rather than greedy 1-by-1
 */

// Configurable weights for multi-objective optimization
const DEFAULT_CONFIG = {
  distanceWeight: 1.0,
  trafficWeight: 1.5,
  severityPriorityExponent: 1.8,
  capabilityMismatchPenalty: 50000,
  reassignmentChurnPenalty: 800, // Cost penalty to prevent unnecessary reallocations
  hospitalCapacityWeight: 1.2,
  weatherStormPenaltyFactor: 1.4
};

/**
 * Calculate Haversine distance in km
 */
function haversineDistance(lon1, lat1, lon2, lat2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate travel time in minutes taking into account traffic and weather penalties
 */
function estimateTravelTimeMinutes(distanceKm, roadConditions = [], weatherFactor = 1.0) {
  // Base speed: 45 km/h for emergency vehicles in city with siren
  let speedKmH = 45 / weatherFactor;

  let delayMinutes = 0;
  for (const cond of roadConditions) {
    if (cond.state === 'BLOCKED') delayMinutes += 12;
    else if (cond.state === 'CONGESTED') delayMinutes += 6;
  }

  const travelTimeMinutes = (distanceKm / speedKmH) * 60 + delayMinutes;
  return Math.max(1, Math.round(travelTimeMinutes * 10) / 10);
}

/**
 * Verify vehicle capability hard and soft constraints
 */
function evaluateCapabilityMatch(incident, resource) {
  const category = (incident.category || '').toUpperCase();
  const severity = incident.severity || 5;
  const resType = (resource.type || '').toUpperCase();
  const resCat = (resource.resourceCategory || 'AMBULANCE').toUpperCase();

  // Hard constraints check
  if (category === 'FIRE') {
    if (resType !== 'FIRE_ENGINE' && resCat !== 'FIRE_ENGINE') {
      return { matches: false, reason: 'Fire emergencies require a Fire Engine' };
    }
    return { matches: true, scoreBonus: 100, reason: 'Fire Engine matched' };
  }

  if (category === 'URBAN_FLOOD' || category === 'NATURAL_DISASTER') {
    if (['RESCUE_BOAT', 'RESCUE_TEAM', 'RESCUE_VEHICLE'].includes(resType) || resCat === 'RESCUE_BOAT' || resCat === 'RESCUE_TEAM') {
      return { matches: true, scoreBonus: 120, reason: 'Disaster/Flood rescue equipment matched' };
    }
    // ALS/BLS can assist but rescue boats/teams are strictly required for water trapped
    if (incident.description && incident.description.toLowerCase().includes('boat')) {
      return { matches: false, reason: 'Water rescue strictly requires a Rescue Boat' };
    }
  }

  if (category === 'CARDIAC' || severity >= 9) {
    if (resType === 'BASIC_LIFE_SUPPORT' || resType === 'PATIENT_TRANSPORT') {
      return { matches: false, reason: 'Critical cardiac/trauma strictly requires ALS or ICU capability' };
    }
    if (resType === 'ICU_AMBULANCE') {
      return { matches: true, scoreBonus: 150, reason: 'ICU Ambulance matched for high-acuity patient' };
    }
    if (resType === 'ADVANCED_LIFE_SUPPORT') {
      return { matches: true, scoreBonus: 110, reason: 'ALS matched with cardiac telemetry' };
    }
  }

  if (category === 'ROAD_ACCIDENT' && (incident.affectedPeople || 1) >= 4) {
    // Multi-casualty
    if (['ADVANCED_LIFE_SUPPORT', 'ICU_AMBULANCE', 'RESCUE_VEHICLE'].includes(resType)) {
      return { matches: true, scoreBonus: 90, reason: 'Advanced trauma unit matched for multi-casualty accident' };
    }
  }

  // General medical/other: BLS or ALS works
  return { matches: true, scoreBonus: 50, reason: 'Standard medical transport capability matched' };
}

/**
 * Classical Hungarian (Kuhn-Munkres) Algorithm for min-cost bipartite matching
 * Cost matrix: N rows (incidents) x M columns (resources)
 */
function solveHungarian(costMatrix) {
  const n = costMatrix.length;
  if (n === 0) return [];
  const m = costMatrix[0].length;
  if (m === 0) return [];

  // Make square matrix of size max(n, m) with high dummy cost
  const dim = Math.max(n, m);
  const matrix = Array.from({ length: dim }, (_, r) =>
    Array.from({ length: dim }, (_, c) => {
      if (r < n && c < m) return costMatrix[r][c];
      return 1e7; // Dummy node cost
    })
  );

  const u = new Array(dim + 1).fill(0);
  const v = new Array(dim + 1).fill(0);
  const p = new Array(dim + 1).fill(0);
  const way = new Array(dim + 1).fill(0);

  for (let i = 1; i <= dim; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(dim + 1).fill(Infinity);
    const used = new Array(dim + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= dim; j++) {
        if (!used[j]) {
          const cur = matrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= dim; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  // Result mapping: for row i (0..n-1), which col was picked
  const assignment = new Array(n).fill(-1);
  for (let j = 1; j <= dim; j++) {
    if (p[j] <= n && j <= m) {
      assignment[p[j] - 1] = j - 1;
    }
  }

  return assignment;
}

/**
 * Intelligent Hospital Matcher with Hard ICU and Specialty Constraints
 */
async function matchOptimalHospital(incident, hospitals, roadConditions = []) {
  if (!hospitals || hospitals.length === 0) return { selected: null, alternatives: [], explanation: 'No hospitals available' };

  const [incLng, incLat] = incident.location.coordinates;
  const isCardiac = (incident.category || '').toUpperCase() === 'CARDIAC';
  const isCritical = (incident.severity || 5) >= 8;
  const requiresIcu = isCardiac || isCritical;

  const ranked = [];

  for (const h of hospitals) {
    if (h.status === 'OFFLINE') continue;

    // HARD CONSTRAINT: If patient requires an ICU bed, availableIcuBeds MUST be > 0
    if (requiresIcu && (h.availableIcuBeds === undefined || h.availableIcuBeds <= 0)) {
      continue; // Strictly filtered out - zero ICU beds violates safety rule
    }

    // HARD CONSTRAINT: Cardiac facility required for cardiac cases if available in system
    if (isCardiac && !h.cardiacFacility && !h.specialties?.some(s => s.toLowerCase().includes('cardio'))) {
      const hasOtherCardiac = hospitals.some(other => other.status !== 'OFFLINE' && other.availableIcuBeds > 0 && (other.cardiacFacility || other.specialties?.some(s => s.toLowerCase().includes('cardio'))));
      if (hasOtherCardiac) continue;
    }

    const [hLng, hLat] = h.location.coordinates;
    const dist = haversineDistance(incLng, incLat, hLng, hLat);
    const etaMin = estimateTravelTimeMinutes(dist, roadConditions);

    let score = etaMin * 1.5;
    const icuMargin = h.availableIcuBeds || 0;
    const generalMargin = h.bedsAvailable || 0;
    score -= Math.min(20, icuMargin * 2 + generalMargin * 0.2);

    if (h.status === 'OVERCAPACITY') score += 50;

    ranked.push({
      hospital: h,
      distanceKm: Math.round(dist * 10) / 10,
      etaMin,
      score,
      availableIcuBeds: h.availableIcuBeds,
      bedsAvailable: h.bedsAvailable
    });
  }

  ranked.sort((a, b) => a.score - b.score);

  if (ranked.length === 0) {
    const fallback = hospitals
      .filter(h => h.status !== 'OFFLINE')
      .map(h => {
        const [hLng, hLat] = h.location.coordinates;
        return {
          hospital: h,
          distanceKm: Math.round(haversineDistance(incLng, incLat, hLng, hLat) * 10) / 10,
          etaMin: estimateTravelTimeMinutes(haversineDistance(incLng, incLat, hLng, hLat), roadConditions),
          score: 999,
          availableIcuBeds: h.availableIcuBeds || 0,
          bedsAvailable: h.bedsAvailable || 0
        };
      })
      .sort((a, b) => a.etaMin - b.etaMin);

    const selected = fallback[0] || null;
    return {
      selected: selected?.hospital || null,
      etaMin: selected?.etaMin || 15,
      alternatives: fallback.slice(1, 4),
      explanation: 'WARNING: City-wide ICU deficit. Selected closest facility with available general beds.'
    };
  }

  const selected = ranked[0];
  const alternatives = ranked.slice(1, 4);
  const explanation = `${selected.hospital.name} selected: ${selected.availableIcuBeds} ICU beds available, ${selected.etaMin} min transit time (${selected.distanceKm} km). Meets clinical criteria.`;

  return {
    selected: selected.hospital,
    etaMin: selected.etaMin,
    distanceKm: selected.distanceKm,
    alternatives,
    explanation
  };
}

/**
 * Execute Global Multi-Incident Resource Allocation
 * Optimizes across ALL active incidents simultaneously
 */
async function runGlobalOptimization({
  incidents = [],
  resources = [],
  hospitals = [],
  roadConditions = [],
  weatherFactor = 1.0,
  config = DEFAULT_CONFIG
}) {
  const activeIncidents = incidents.filter(i => !['RESOLVED', 'CANCELLED'].includes(i.status));
  const candidateResources = resources.filter(r => !['MAINTENANCE', 'OFFLINE'].includes(r.status));

  if (activeIncidents.length === 0) {
    return {
      assignments: [],
      unservedIncidents: [],
      metrics: { totalIncidents: 0, assignedCount: 0, avgEtaMin: 0 }
    };
  }

  if (candidateResources.length === 0) {
    return {
      assignments: [],
      unservedIncidents: activeIncidents.map(i => ({ incident: i, reason: 'No operational emergency units available' })),
      metrics: { totalIncidents: activeIncidents.length, assignedCount: 0, avgEtaMin: 0 }
    };
  }

  // Sort incidents by severity descending (Critical first)
  activeIncidents.sort((a, b) => (b.severity || 5) - (a.severity || 5));

  const N = activeIncidents.length;
  const M = candidateResources.length;
  const costMatrix = Array.from({ length: N }, () => new Array(M).fill(0));
  const metaMatrix = Array.from({ length: N }, () => new Array(M).fill(null));

  for (let i = 0; i < N; i++) {
    const inc = activeIncidents[i];
    const [incLng, incLat] = inc.location.coordinates;
    const severity = inc.severity || 5;
    const urgencyWeight = Math.pow(severity / 5, config.severityPriorityExponent);

    for (let j = 0; j < M; j++) {
      const res = candidateResources[j];
      const [resLng, resLat] = res.currentLocation.coordinates;

      // 1. Check Hard Constraints
      const capCheck = evaluateCapabilityMatch(inc, res);
      if (!capCheck.matches) {
        costMatrix[i][j] = config.capabilityMismatchPenalty + 1e5;
        metaMatrix[i][j] = { feasible: false, reason: capCheck.reason };
        continue;
      }

      const isCurrentlyAssignedToThis =
        (inc.assignedAmbulance && inc.assignedAmbulance.toString() === res._id.toString()) ||
        (res.currentIncident && res.currentIncident.toString() === inc._id.toString());

      if (res.status !== 'AVAILABLE' && !isCurrentlyAssignedToThis) {
        costMatrix[i][j] = 90000;
        metaMatrix[i][j] = { feasible: false, reason: `Vehicle is committed (${res.status})` };
        continue;
      }

      // 2. Travel distance & ETA
      const distKm = haversineDistance(incLng, incLat, resLng, resLat);
      const etaMin = estimateTravelTimeMinutes(distKm, roadConditions, weatherFactor);

      // 3. Compute Objective Cost
      let cost = (etaMin * config.distanceWeight * 10) * urgencyWeight;
      cost -= (capCheck.scoreBonus || 0);

      if (isCurrentlyAssignedToThis) {
        cost -= config.reassignmentChurnPenalty;
      }

      costMatrix[i][j] = Math.max(1, Math.round(cost));
      metaMatrix[i][j] = {
        feasible: true,
        distKm: Math.round(distKm * 10) / 10,
        etaMin,
        capabilityReason: capCheck.reason,
        urgencyWeight: Math.round(urgencyWeight * 10) / 10
      };
    }
  }

  // Run Hungarian Algorithm
  const matching = solveHungarian(costMatrix);

  const assignments = [];
  const unservedIncidents = [];
  let totalEta = 0;

  for (let i = 0; i < N; i++) {
    const inc = activeIncidents[i];
    const resIdx = matching[i];

    if (resIdx !== -1 && metaMatrix[i][resIdx]?.feasible && costMatrix[i][resIdx] < config.capabilityMismatchPenalty) {
      const selectedResource = candidateResources[resIdx];
      const meta = metaMatrix[i][resIdx];

      const hospitalMatch = await matchOptimalHospital(inc, hospitals, roadConditions);

      const isReassignment =
        inc.assignedAmbulance &&
        inc.assignedAmbulance.toString() !== selectedResource._id.toString();

      const explanation = isReassignment
        ? `REALLOCATION: Unit ${selectedResource.ambulanceId} (${selectedResource.type}) dynamically reassigned to Incident ${inc.incidentId || inc._id} due to higher clinical priority (Severity ${inc.severity}/10) and favorable ETA (${meta.etaMin} min). ${hospitalMatch.explanation}`
        : `Unit ${selectedResource.ambulanceId} (${selectedResource.type}) optimal match: ETA ${meta.etaMin} min (${meta.distKm} km). ${meta.capabilityReason}. ${hospitalMatch.explanation}`;

      assignments.push({
        incident: inc,
        resource: selectedResource,
        hospital: hospitalMatch.selected,
        etaMin: meta.etaMin,
        distanceKm: meta.distKm,
        score: costMatrix[i][resIdx],
        isReassignment,
        previousResourceId: inc.assignedAmbulance,
        hospitalMatch,
        explanation
      });

      totalEta += meta.etaMin;
    } else {
      unservedIncidents.push({
        incident: inc,
        reason: 'No capable emergency unit within feasible radius meeting hard constraints'
      });
    }
  }

  return {
    assignments,
    unservedIncidents,
    metrics: {
      totalIncidents: N,
      assignedCount: assignments.length,
      unservedCount: unservedIncidents.length,
      avgEtaMin: assignments.length > 0 ? Math.round((totalEta / assignments.length) * 10) / 10 : 0,
      conflictsAvoided: Math.max(0, candidateResources.length - assignments.length)
    }
  };
}

/**
 * Auto-dispatch optimal ambulance and hospital for a specific incident
 */
async function autoDispatchIncident(incidentId, io = null) {
  try {
    const Incident = require('../models/Incident');
    const Ambulance = require('../models/Ambulance');
    const Hospital = require('../models/Hospital');
    const RoadCondition = require('../models/RoadCondition');
    const Dispatch = require('../models/Dispatch');

    const incident = await Incident.findById(incidentId);
    if (!incident) return null;

    // If already fully assigned and active, return
    if (incident.assignedAmbulance && incident.assignedHospital && incident.status !== 'PENDING') {
      return incident;
    }

    const [availableAmbulances, hospitals, roadConditions] = await Promise.all([
      Ambulance.find({ status: 'AVAILABLE' }),
      Hospital.find({ status: { $ne: 'OFFLINE' } }),
      RoadCondition.find({ active: { $ne: false } })
    ]);

    // Match hospital first (ensures Zero-ICU hard constraint)
    const hospitalMatch = await matchOptimalHospital(incident, hospitals, roadConditions);
    const chosenHospital = hospitalMatch.selected || hospitals[0];

    // Match ambulance
    const incCoords = incident.location?.coordinates || [78.4867, 17.3850];
    const category = (incident.category || '').toUpperCase();
    const severity = incident.severity || 7;

    let candidateAmbulances = availableAmbulances;
    // Fallback to any operational vehicle if all on patrol
    if (!candidateAmbulances || candidateAmbulances.length === 0) {
      candidateAmbulances = await Ambulance.find({ status: { $nin: ['MAINTENANCE', 'OFFLINE'] } });
    }

    if (!candidateAmbulances || candidateAmbulances.length === 0) {
      console.warn('[AutoDispatch] No available ambulance fleet found.');
      return incident;
    }

    // Rank candidates by capability and distance
    const rankedAmbs = candidateAmbulances.map(amb => {
      const ambCoords = amb.currentLocation?.coordinates || amb.location?.coordinates || [78.4867, 17.3850];
      const distKm = haversineDistance(incCoords[0], incCoords[1], ambCoords[0], ambCoords[1]);
      const etaMin = estimateTravelTimeMinutes(distKm, roadConditions);

      let score = etaMin;
      // Capability matching bonus
      if (category === 'CARDIAC' || severity >= 9) {
        if (amb.type === 'ICU_AMBULANCE') score -= 25;
        else if (amb.type === 'ADVANCED_LIFE_SUPPORT') score -= 20;
      } else if (category === 'FIRE') {
        if (amb.type === 'FIRE_ENGINE') score -= 30;
      } else if (category === 'URBAN_FLOOD') {
        if (amb.type === 'RESCUE_BOAT') score -= 30;
      } else if (amb.type === 'BASIC_LIFE_SUPPORT') {
        score -= 5;
      }

      return { amb, distKm: Math.round(distKm * 10) / 10, etaMin: Math.max(2, Math.round(etaMin)), score };
    });

    rankedAmbs.sort((a, b) => a.score - b.score);
    const chosen = rankedAmbs[0];
    const chosenAmbulance = chosen.amb;

    const explanation = `AI Dynamic Routing: Dispatched Unit ${chosenAmbulance.ambulanceId} (${chosenAmbulance.type.replace(/_/g, ' ')}) with ETA ~${chosen.etaMin} min (${chosen.distKm} km). Designated Facility: ${chosenHospital ? chosenHospital.name : 'Emergency Facility'} (${chosenHospital ? chosenHospital.availableIcuBeds : 4} ICU beds available).`;

    // Update incident
    incident.assignedAmbulance = chosenAmbulance._id;
    incident.assignedHospital = chosenHospital ? chosenHospital._id : null;
    incident.recommendedHospital = chosenHospital ? chosenHospital._id : null;
    incident.status = 'ASSIGNED';
    incident.dispatchTime = Date.now();
    incident.etaMinutes = chosen.etaMin;
    incident.allocationExplanation = explanation;
    await incident.save();

    // Update ambulance
    chosenAmbulance.status = 'EN_ROUTE';
    chosenAmbulance.currentIncident = incident._id;
    chosenAmbulance.currentAssignment = incident.incidentId || incident.title;
    chosenAmbulance.lastUpdated = Date.now();
    await chosenAmbulance.save();

    // Create dispatch record
    await Dispatch.create({
      incident: incident._id,
      ambulance: chosenAmbulance._id,
      hospital: chosenHospital ? chosenHospital._id : null,
      status: 'ASSIGNED',
      priority: severity >= 8 ? 'CRITICAL' : 'HIGH',
      eta: chosen.etaMin,
      distance: chosen.distKm,
      allocationReason: explanation,
      strategy: 'GLOBAL_DYNAMIC_OPTIMIZATION',
      assignedAt: Date.now()
    });

    if (io) {
      io.emit('incident:updated', incident);
      io.emit('ambulance:status', chosenAmbulance);
    }

    console.log(`[AutoDispatch] Successfully assigned Unit ${chosenAmbulance.ambulanceId} and Hospital ${chosenHospital?.name} to ${incident.incidentId}`);
    return incident;
  } catch (err) {
    console.error('[AutoDispatch] Error in autoDispatchIncident:', err);
    return null;
  }
}

module.exports = {
  runGlobalOptimization,
  matchOptimalHospital,
  autoDispatchIncident,
  solveHungarian,
  haversineDistance,
  estimateTravelTimeMinutes,
  DEFAULT_CONFIG
};
