/**
 * CI/CD Failure Analyzer - Standalone Classifier Test Suite
 * Tests the heuristic log extraction and classification engine against all test fixtures.
 */

const fs = require('fs');
const path = require('path');

function sanitizeAndExtract(rawLogs) {
  // Strip ANSI codes and ISO timestamps
  const cleaned = rawLogs
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/gm, '');

  const lines = cleaned.split('\n');

  const errorKeywords = [
    'FAIL ',
    'AssertionError',
    'Timeout - Async callback',
    'Exceeded timeout',
    'npm ERR!',
    'yarn error',
    'Error: Cannot find module',
    'no space left on device',
    'exit code 137',
    'OOMKilled',
    'SIGKILL',
    'failed to solve',
    'Connection refused',
    'ECONNREFUSED',
    'ETIMEDOUT'
  ];

  let culpritStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (errorKeywords.some(kw => lines[i].includes(kw))) {
      culpritStart = Math.max(0, i - 2);
      break;
    }
  }

  if (culpritStart === -1) {
    culpritStart = Math.max(0, lines.length - 25);
  }

  const culpritSnippet = lines.slice(culpritStart, culpritStart + 25).join('\n');
  return { cleaned, culpritSnippet, totalLines: lines.length };
}

function classifyFailure(culpritSnippet, runAttempt = 1) {
  let category = 'CODE_BUG';
  let isFlaky = false;
  let confidence = 85;
  let rootCause = 'Unit or integration test failed with assertion mismatch.';
  let suggestedAction = 'Inspect the failing test assertion and verify expected values.';
  let errorSignature = 'AssertionError';

  if (
    culpritSnippet.includes('Timeout - Async callback') ||
    culpritSnippet.includes('Exceeded timeout') ||
    culpritSnippet.includes('waiting for element to be visible') ||
    culpritSnippet.includes('ETIMEDOUT') ||
    culpritSnippet.includes('Connection refused on localhost') ||
    culpritSnippet.includes('jest.setTimeout')
  ) {
    category = 'FLAKY_TEST';
    isFlaky = true;
    confidence = 94;
    rootCause = 'Asynchronous callback timed out waiting for event or selector. Intermittent race condition or mock delay.';
    suggestedAction = 'Check async event triggers, increase jest.setTimeout(), or use resilient polling.';
    errorSignature = 'AsyncTimeoutError';
  } else if (
    culpritSnippet.includes('npm ERR! 404') ||
    culpritSnippet.includes('not in this registry') ||
    culpritSnippet.includes('pip._vendor') ||
    culpritSnippet.includes('Could not resolve dependencies') ||
    culpritSnippet.includes('checksum mismatch')
  ) {
    category = 'DEPENDENCY_ERROR';
    isFlaky = false;
    confidence = 96;
    rootCause = 'Package registry reported package not found (404) or missing lockfile dependency.';
    suggestedAction = 'Verify package name, check internal npm/artifactory token, or update lockfile.';
    errorSignature = 'Registry404Error';
  } else if (
    culpritSnippet.includes('no space left on device') ||
    culpritSnippet.includes('exit code 137') ||
    culpritSnippet.includes('OOMKilled') ||
    culpritSnippet.includes('failed to solve: failed to copy files') ||
    culpritSnippet.includes('runner lost communication')
  ) {
    category = 'INFRASTRUCTURE_FAILURE';
    isFlaky = true;
    confidence = 92;
    rootCause = 'Runner ran out of disk space or memory (SIGKILL / OOMKilled exit code 137).';
    suggestedAction = 'Clean Docker build caches, prune unused images on self-hosted runners, or upgrade runner size.';
    errorSignature = 'RunnerDiskOrOOM';
  } else if (
    culpritSnippet.includes('AssertionError') ||
    culpritSnippet.includes('FAIL') ||
    culpritSnippet.includes('expected')
  ) {
    category = 'CODE_BUG';
    isFlaky = false;
    confidence = 95;
    rootCause = 'Test assertion failed: received value does not match expected output in business logic.';
    suggestedAction = 'Check the diff between expected and received values in the failing test suite.';
    errorSignature = 'AssertionMismatch';
  }

  const canRetry = isFlaky && (runAttempt < 2);

  return {
    category,
    isFlaky,
    confidence,
    rootCause,
    suggestedAction,
    errorSignature,
    canRetry
  };
}

// Test Runner
const fixturesDir = path.join(__dirname, '..', 'tests', 'fixtures', 'logs');
const testCases = [
  {
    file: 'flaky-test.log',
    expectedCategory: 'FLAKY_TEST',
    expectedCanRetry: true
  },
  {
    file: 'code-bug.log',
    expectedCategory: 'CODE_BUG',
    expectedCanRetry: false
  },
  {
    file: 'dependency-error.log',
    expectedCategory: 'DEPENDENCY_ERROR',
    expectedCanRetry: false
  },
  {
    file: 'infra-failure.log',
    expectedCategory: 'INFRASTRUCTURE_FAILURE',
    expectedCanRetry: true
  }
];

console.log('====================================================');
console.log('🔬 Testing CI/CD Failure Analyzer Classifier Engine');
console.log('====================================================\n');

let passed = 0;

for (const tc of testCases) {
  const filePath = path.join(fixturesDir, tc.file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fixture not found: ${tc.file}`);
    continue;
  }

  const rawLogs = fs.readFileSync(filePath, 'utf-8');
  const { culpritSnippet, totalLines } = sanitizeAndExtract(rawLogs);
  const result = classifyFailure(culpritSnippet, 1);

  const categoryMatch = result.category === tc.expectedCategory;
  const retryMatch = result.canRetry === tc.expectedCanRetry;

  if (categoryMatch && retryMatch) {
    passed++;
    console.log(`✅ [PASS] ${tc.file}`);
    console.log(`   Category:    ${result.category} (Confidence: ${result.confidence}%)`);
    console.log(`   Auto-Retry:  ${result.canRetry ? '⚡ YES (Flaky/Transient)' : '❌ NO (Real Bug / Permanent)'}`);
    console.log(`   Root Cause:  ${result.rootCause}`);
    console.log(`   Signature:   ${result.errorSignature}`);
    console.log(`   Log lines:   ${totalLines} -> Culprit snippet extracted\n`);
  } else {
    console.error(`❌ [FAIL] ${tc.file}`);
    console.error(`   Expected: Category=${tc.expectedCategory}, CanRetry=${tc.expectedCanRetry}`);
    console.error(`   Got:      Category=${result.category}, CanRetry=${result.canRetry}\n`);
  }
}

console.log('====================================================');
console.log(`Results: ${passed}/${testCases.length} tests passed successfully.`);
console.log('====================================================');

if (passed !== testCases.length) {
  process.exit(1);
}
