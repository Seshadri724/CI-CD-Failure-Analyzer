/**
 * CI/CD Failure Analyzer - DORA & Telemetry Calculator
 * Aggregates failure classifications to compute DORA metrics & engineering ROI.
 */

const fs = require('fs');
const path = require('path');

const metricsPath = path.join(__dirname, '..', 'data', 'metrics.json');

if (!fs.existsSync(metricsPath)) {
  console.error(`❌ Metrics file not found at: ${metricsPath}`);
  process.exit(1);
}

const records = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));

const totalIncidents = records.length;
const categoryCounts = {};
let totalFlaky = 0;
let totalRetried = 0;
let totalMinutesSaved = 0;

for (const r of records) {
  categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
  if (r.isFlaky) totalFlaky++;
  if (r.retried) totalRetried++;
  totalMinutesSaved += (r.timeSavedMinutes || 0);
}

const hoursSaved = (totalMinutesSaved / 60).toFixed(1);
const flakinessRatio = ((totalFlaky / totalIncidents) * 100).toFixed(1);
const estimatedDollarSavings = (hoursSaved * 85).toLocaleString(); // based on $85/hr avg eng cost

console.log('====================================================');
console.log('📊 CI/CD Failure Analyzer - DORA Telemetry Report');
console.log('====================================================\n');

console.log(`Total CI Failures Analyzed:   ${totalIncidents}`);
console.log(`Auto-Retried Runs:            ${totalRetried} (${((totalRetried / totalIncidents) * 100).toFixed(1)}% of all failures)`);
console.log(`Developer Hours Saved:        ${hoursSaved} hrs (~$${estimatedDollarSavings} in saved engineering capacity)`);
console.log(`Pipeline Flakiness Ratio:     ${flakinessRatio}%\n`);

console.log('🏷️ Breakdown by Failure Taxonomy:');
for (const [cat, count] of Object.entries(categoryCounts)) {
  const pct = ((count / totalIncidents) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(count * 2));
  console.log(`  - ${cat.padEnd(24)}: ${String(count).padStart(2)} (${pct.padStart(5)}%)  ${bar}`);
}

console.log('\n📈 Impact on DORA Metrics:');
console.log(`  1. Change Failure Rate (CFR):`);
console.log(`     - Unadjusted CFR counts flaky test timeouts as failed deployments.`);
console.log(`     - Adjusted CFR excludes ${totalFlaky} false-alarm flaky runs, giving true code stability.`);
console.log(`  2. Mean Time to Recovery (MTTR) / Lead Time:`);
console.log(`     - Automatically retrying within seconds reduces PR cycle latency by ~${totalMinutesSaved} minutes across team.`);

console.log('\n====================================================');

