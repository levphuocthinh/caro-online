/**
 * Caro Online - Opaque-box E2E Test Suite Runner
 * Discovers and executes tests across Tier 1 (Features), Tier 2 (Boundaries),
 * Tier 3 (Cross-Feature Combinations), and Tier 4 (Real-World Application Scenarios).
 * 
 * Usage:
 *   node tests/runner.js          # Run all 4 tiers
 *   node tests/runner.js tier1    # Run Tier 1 only
 *   node tests/runner.js tier2    # Run Tier 2 only
 *   node tests/runner.js tier3    # Run Tier 3 only
 *   node tests/runner.js tier4    # Run Tier 4 only
 */

const path = require('path');
const fs = require('fs');
const { registry } = require('./harness');

const TIER_DIRS = [
  { tier: 'Tier 1 - Feature Coverage', dir: path.join(__dirname, 'tier1_features') },
  { tier: 'Tier 2 - Boundary & Corner Cases', dir: path.join(__dirname, 'tier2_boundaries') },
  { tier: 'Tier 3 - Cross-Feature Combinations', dir: path.join(__dirname, 'tier3_combinations') },
  { tier: 'Tier 4 - Real-World Scenarios', dir: path.join(__dirname, 'tier4_scenarios') }
];

async function run() {
  const filterArg = (process.argv[2] || '').toLowerCase().trim();
  const startTime = Date.now();

  console.log('======================================================================');
  console.log('🏁 CARO ONLINE - COMPREHENSIVE E2E TEST RUNNER');
  console.log(`⏱️  Timestamp: ${new Date().toISOString()}`);
  if (filterArg) {
    console.log(`🎯 Active Filter: "${filterArg}"`);
  }
  console.log('======================================================================\n');

  let totalSuites = 0;
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failureList = [];

  for (const { tier, dir } of TIER_DIRS) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.js') && (f.startsWith('test_') || f.endsWith('_test.js')))
      .sort();

    const cleanFilter = filterArg.replace(/[\s_-]/g, '');
    const dirNameClean = path.basename(dir).replace(/[\s_-]/g, '');
    const tierNameClean = tier.toLowerCase().replace(/[\s_-]/g, '');

    const matchingFiles = files.filter(f => {
      if (!filterArg) return true;
      const fileClean = f.toLowerCase().replace(/[\s_-]/g, '');
      return dirNameClean.includes(cleanFilter) ||
             tierNameClean.includes(cleanFilter) ||
             fileClean.includes(cleanFilter);
    });

    if (matchingFiles.length === 0) continue;

    console.log(`\n▶ [${tier.toUpperCase()}] (${matchingFiles.length} suites)`);
    console.log('----------------------------------------------------------------------');

    for (const file of matchingFiles) {
      const filePath = path.join(dir, file);
      const prevSuitesLen = registry.suites.length;

      // Load test file (registers suites/tests into harness registry)
      try {
        require(filePath);
      } catch (loadErr) {
        console.error(`❌ FAILED TO LOAD TEST SUITE: ${file}`);
        console.error(loadErr.stack || loadErr);
        failedTests++;
        failureList.push({ suite: file, test: 'File Load', error: loadErr });
        continue;
      }

      const newSuites = registry.suites.slice(prevSuitesLen);
      totalSuites += newSuites.length;

      for (const suite of newSuites) {
        console.log(`\n  📦 Suite: ${suite.name} (${path.basename(file)})`);

        for (const t of suite.tests) {
          totalTests++;
          const tStart = Date.now();
          try {
            await t.fn();
            const elapsed = Date.now() - tStart;
            passedTests++;
            console.log(`    ✅ PASS: ${t.name} (${elapsed}ms)`);
          } catch (err) {
            const elapsed = Date.now() - tStart;
            failedTests++;
            console.error(`    ❌ FAIL: ${t.name} (${elapsed}ms)`);
            console.error(`       Error: ${err.message}`);
            failureList.push({
              suite: suite.name,
              file: path.basename(file),
              test: t.name,
              error: err
            });
          }
        }
      }
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n======================================================================');
  console.log('📊 TEST EXECUTION SUMMARY');
  console.log('======================================================================');
  console.log(`Total Test Suites : ${totalSuites}`);
  console.log(`Total Test Cases  : ${totalTests}`);
  console.log(`Passed Tests      : ${passedTests}`);
  console.log(`Failed Tests      : ${failedTests}`);
  console.log(`Execution Time    : ${totalTime}s`);
  console.log('======================================================================');

  if (failureList.length > 0) {
    console.log('\n❌ FAILURES BREAKDOWN:');
    failureList.forEach((f, idx) => {
      console.log(`\n${idx + 1}) [${f.file || 'Load'}] ${f.suite} -> ${f.test}`);
      console.log(`   Message: ${f.error.message}`);
      if (f.error.stack) {
        const stackLines = f.error.stack.split('\n').slice(1, 4).join('\n');
        console.log(`   ${stackLines}`);
      }
    });
    console.log('\n💥 RUN FINISHED WITH FAILURES.');
    process.exit(1);
  } else {
    console.log('\n✨ ALL TESTS PASSED SUCCESSFULLY! (Exit Code 0)\n');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
