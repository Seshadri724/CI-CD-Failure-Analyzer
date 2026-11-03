/**
 * CI/CD Failure Analyzer - Webhook Simulator
 * Sends a simulated GitHub Actions workflow_run payload to n8n webhook endpoint.
 * 
 * Usage:
 *   node scripts/simulate-webhook.js --type flaky-test
 *   node scripts/simulate-webhook.js --type code-bug --url http://localhost:5678/webhook/github-ci-failure
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return defaultValue;
}

const type = getArg('type', 'flaky-test');
const webhookUrl = getArg('url', 'http://localhost:5678/webhook/github-ci-failure');
const dryRun = args.includes('--dry-run');

const fixtureMap = {
  'flaky-test': 'flaky-test.log',
  'code-bug': 'code-bug.log',
  'dependency-error': 'dependency-error.log',
  'infra-failure': 'infra-failure.log'
};

const logFile = fixtureMap[type] || 'flaky-test.log';
const logPath = path.join(__dirname, '..', 'tests', 'fixtures', 'logs', logFile);

if (!fs.existsSync(logPath)) {
  console.error(`❌ Log fixture not found: ${logPath}`);
  process.exit(1);
}

const rawLogs = fs.readFileSync(logPath, 'utf-8');

const payload = {
  action: 'completed',
  workflow_run: {
    id: 987654321,
    name: 'CI / Test & Build',
    node_id: 'WFR_kwDOABC123',
    head_branch: 'feat/checkout-optimization',
    head_sha: 'a1b2c3d4e5f67890123456789abcdef123456789',
    run_number: 142,
    run_attempt: 1,
    event: 'pull_request',
    status: 'completed',
    conclusion: 'failure',
    workflow_id: 123456,
    html_url: 'https://github.com/acme-corp/payment-service/actions/runs/987654321',
    pull_requests: [
      {
        number: 48,
        head: { ref: 'feat/checkout-optimization', sha: 'a1b2c3d' },
        base: { ref: 'main', sha: '9988776' }
      }
    ],
    head_commit: {
      id: 'a1b2c3d4e5f6',
      message: 'feat: add async webhook processing for charge completion',
      author: { name: 'Alex Developer', email: 'alex@acme.corp' }
    },
    repository: {
      id: 55443322,
      name: 'payment-service',
      full_name: 'acme-corp/payment-service',
      owner: { login: 'acme-corp' }
    }
  },
  simulated_raw_logs: rawLogs
};

console.log('====================================================');
console.log(`🚀 Simulating GitHub Actions Webhook: [${type}]`);
console.log(`Target URL: ${webhookUrl}`);
console.log(`PR: #${payload.workflow_run.pull_requests[0].number} | Commit: ${payload.workflow_run.head_sha.substring(0, 7)}`);
console.log('====================================================\n');

if (dryRun) {
  console.log('🔍 DRY RUN - Webhook payload generated successfully:');
  console.log(JSON.stringify(payload, null, 2).substring(0, 600) + '\n... [truncated]');
  process.exit(0);
}

const payloadData = JSON.stringify(payload);
const parsedUrl = new URL(webhookUrl);
const client = parsedUrl.protocol === 'https:' ? https : http;

const options = {
  hostname: parsedUrl.hostname,
  port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
  path: parsedUrl.pathname + parsedUrl.search,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payloadData),
    'User-Agent': 'GitHub-Hookshot/simulated',
    'X-GitHub-Event': 'workflow_run'
  }
};

const req = client.request(options, (res) => {
  let responseBody = '';
  res.on('data', chunk => responseBody += chunk);
  res.on('end', () => {
    console.log(`HTTP Status: ${res.statusCode} ${res.statusMessage}`);
    console.log(`Response: ${responseBody || '(empty body)'}`);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('✅ Webhook successfully accepted by n8n!');
    } else {
      console.warn(`⚠️ Endpoint returned status code ${res.statusCode}`);
    }
  });
});

req.on('error', (err) => {
  console.warn(`\n⚠️ Note: Could not connect to n8n at ${webhookUrl} (${err.message})`);
  console.log('💡 Tip: Once you start n8n (`docker compose up -d` or `npx n8n`), re-run this command to trigger the live workflow!');
  console.log('💡 Run with `--dry-run` to inspect the generated payload.\n');
});

req.write(payloadData);
req.end();
