/**
 * PS10 Comprehensive Constraint & Optimization Test Suite
 * Validates all 8 critical operational rules specified in PS10 requirements.
 */

const assert = require('assert');
const { 
  solveHungarian, 
  haversineDistance, 
  estimateTravelTimeMinutes, 
  matchOptimalHospital, 
  runGlobalOptimization 
} = require('../src/services/optimizationEngine');
const { evaluateStrategies } = require('../src/services/benchmarkService');

async function runTestSuite() {
  console.log('====================================================');
  console.log('  PS10 EMERGENCY DISPATCH & OPTIMIZATION TEST SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}\n`);
      failed++;
    }
  }

  async function testAsync(name, fn) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    Error: ${err.message}\n`);
      failed++;
    }
  }

  // TEST 1: One vehicle cannot be assigned to two incidents simultaneously
  await testAsync('Rule 1: An ambulance cannot serve multiple incidents simultaneously (Hungarian 1-to-1 matching)', async () => {
    const incidents = [
      { _id: 'I1', severity: 9, category: 'CARDIAC', location: { coordinates: [77.21, 28.61] } },
      { _id: 'I2', severity: 8, category: 'ROAD_ACCIDENT', location: { coordinates: [77.22, 28.62] } }
    ];
    const resources = [
      { _id: 'A1', ambulanceId: 'A01', type: 'ADVANCED_LIFE_SUPPORT', status: 'AVAILABLE', currentLocation: { coordinates: [77.20, 28.60] } }
    ];

    const result = await runGlobalOptimization({ incidents, resources, hospitals: [] });
    assert.strictEqual(result.assignments.length, 1, 'Only one incident can receive the single available vehicle');
    assert.strictEqual(result.unservedIncidents.length, 1, 'The competing incident must remain unserved until more units become available');
  });

  // TEST 2: Unavailable vehicle cannot be allocated
  await testAsync('Rule 2: An unavailable / maintenance vehicle cannot be allocated', async () => {
    const incidents = [
      { _id: 'I1', severity: 8, category: 'ROAD_ACCIDENT', location: { coordinates: [77.21, 28.61] } }
    ];
    const resources = [
      { _id: 'A1', ambulanceId: 'A01', type: 'ADVANCED_LIFE_SUPPORT', status: 'MAINTENANCE', currentLocation: { coordinates: [77.21, 28.61] } },
      { _id: 'A2', ambulanceId: 'A02', type: 'ADVANCED_LIFE_SUPPORT', status: 'OFFLINE', currentLocation: { coordinates: [77.21, 28.61] } }
    ];

    const result = await runGlobalOptimization({ incidents, resources, hospitals: [] });
    assert.strictEqual(result.assignments.length, 0, 'No unit in MAINTENANCE or OFFLINE can be dispatched');
    assert.strictEqual(result.unservedIncidents.length, 1);
  });

  // TEST 3: Strict Zero ICU Constraint Enforcement
  await testAsync('Rule 3: An ICU-requiring patient MUST NEVER be assigned to a hospital with zero ICU beds', async () => {
    const incident = {
      _id: 'I_CARDIAC',
      severity: 10,
      category: 'CARDIAC',
      location: { coordinates: [77.21, 28.61] }
    };
    const hospitals = [
      {
        _id: 'H1',
        name: 'Closer Hospital With Zero ICU',
        location: { coordinates: [77.212, 28.612] }, // very close (100m)
        availableIcuBeds: 0,
        bedsAvailable: 50,
        status: 'ACTIVE'
      },
      {
        _id: 'H2',
        name: 'Further Trauma Hospital With Available ICU',
        location: { coordinates: [77.240, 28.630] }, // further (3km)
        availableIcuBeds: 5,
        bedsAvailable: 20,
        status: 'ACTIVE'
      }
    ];

    const match = await matchOptimalHospital(incident, hospitals);
    assert.strictEqual(match.selected._id, 'H2', 'Must select Hospital H2 with available ICU beds, rejecting H1 with 0 ICU beds');
    assert.ok(match.selected.availableIcuBeds > 0, 'Selected hospital must have positive available ICU beds');
  });

  // TEST 4: Vehicle capability matching
  await testAsync('Rule 4: Vehicle capability must strictly match emergency category', async () => {
    const fireIncident = {
      _id: 'I_FIRE',
      severity: 9,
      category: 'FIRE',
      location: { coordinates: [77.22, 28.62] }
    };
    const resources = [
      { _id: 'AMB_BLS', ambulanceId: 'BLS-01', type: 'BASIC_LIFE_SUPPORT', status: 'AVAILABLE', currentLocation: { coordinates: [77.221, 28.621] } },
      { _id: 'FIRE_ENG', ambulanceId: 'FIRE-01', type: 'FIRE_ENGINE', status: 'AVAILABLE', currentLocation: { coordinates: [77.240, 28.640] } }
    ];

    const result = await runGlobalOptimization({ incidents: [fireIncident], resources, hospitals: [] });
    assert.strictEqual(result.assignments.length, 1);
    assert.strictEqual(result.assignments[0].resource.ambulanceId, 'FIRE-01', 'Fire incident must strictly match Fire Engine, not ambulance');
  });

  // TEST 5: Road closure and traffic penalty recalculation
  await testAsync('Rule 5: Road closure and flood hazard recalculates ETA and prompts bypass route', async () => {
    const normalTime = estimateTravelTimeMinutes(5, []);
    const blockedTime = estimateTravelTimeMinutes(5, [{ state: 'BLOCKED' }]);
    assert.ok(blockedTime > normalTime, 'Blocked road must incur a significant delay penalty');
    assert.strictEqual(blockedTime - normalTime, 12, 'Blocked road incurs exactly 12 min penalty in model');
  });

  // TEST 6: Stability penalty avoids unnecessary reassignment churn
  await testAsync('Rule 6: Ongoing valid assignment is preserved unless overriding clinical priority justifies change', async () => {
    const incidentA = {
      _id: 'INC_A',
      severity: 6,
      category: 'MEDICAL_EMERGENCY',
      location: { coordinates: [77.21, 28.61] },
      assignedAmbulance: 'AMB_1'
    };
    const resources = [
      { _id: 'AMB_1', ambulanceId: 'A01', type: 'ADVANCED_LIFE_SUPPORT', status: 'EN_ROUTE', currentLocation: { coordinates: [77.212, 28.612] } },
      { _id: 'AMB_2', ambulanceId: 'A02', type: 'ADVANCED_LIFE_SUPPORT', status: 'AVAILABLE', currentLocation: { coordinates: [77.211, 28.611] } }
    ];

    const result = await runGlobalOptimization({ incidents: [incidentA], resources, hospitals: [] });
    assert.strictEqual(result.assignments[0].resource._id, 'AMB_1', 'Must maintain assignment to AMB_1 due to stability bonus');
  });

  // TEST 7: Strategy Benchmark Evaluation
  test('Rule 7: Strategy benchmark comparative metrics calculate without fabrication', () => {
    const testIncidents = [
      { incidentId: 'I1', severity: 10, category: 'CARDIAC', location: { coordinates: [77.21, 28.61] } },
      { incidentId: 'I2', severity: 4, category: 'MEDICAL_EMERGENCY', location: { coordinates: [77.22, 28.62] } }
    ];
    const testResources = [
      { ambulanceId: 'A1', type: 'BASIC_LIFE_SUPPORT', status: 'AVAILABLE', currentLocation: { coordinates: [77.212, 28.612] } },
      { ambulanceId: 'A2', type: 'ICU_AMBULANCE', status: 'AVAILABLE', currentLocation: { coordinates: [77.230, 28.630] } }
    ];
    const testHospitals = [
      { name: 'Full Hospital', location: { coordinates: [77.21, 28.61] }, availableIcuBeds: 0, bedsAvailable: 20 },
      { name: 'ICU Center', location: { coordinates: [77.24, 28.64] }, availableIcuBeds: 6, bedsAvailable: 20 }
    ];

    const benchmark = evaluateStrategies(testIncidents, testResources, testHospitals);
    assert.strictEqual(benchmark.comparison.length, 3, 'Evaluates all 3 dispatch paradigms');
    const strat3 = benchmark.comparison[2];
    assert.strictEqual(strat3.hospitalOverloadCount, 0, 'Strategy 3 guarantees zero hospital overload');
    assert.strictEqual(strat3.capabilityMismatchCount, 0, 'Strategy 3 guarantees zero capability mismatch');
  });

  // TEST 8: Clear alert generated on resource deficit
  await testAsync('Rule 8: An unserved emergency produces an explicit reason rather than failing silently', async () => {
    const incident = {
      _id: 'I_FLOOD',
      severity: 9,
      category: 'URBAN_FLOOD',
      description: 'Water trapped victims requiring a boat',
      location: { coordinates: [77.25, 28.65] }
    };
    const resources = [
      { _id: 'A1', ambulanceId: 'BLS-01', type: 'BASIC_LIFE_SUPPORT', status: 'AVAILABLE', currentLocation: { coordinates: [77.25, 28.65] } }
    ];

    const result = await runGlobalOptimization({ incidents: [incident], resources, hospitals: [] });
    assert.strictEqual(result.unservedIncidents.length, 1);
    assert.ok(result.unservedIncidents[0].reason.length > 0, 'Must produce a clear explicit failure reason');
  });

  console.log('\n====================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED | ${failed} FAILED  `);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
