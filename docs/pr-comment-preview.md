# 💬 Pull Request Comment Previews

Below are visual examples of the exact comments posted to developer Pull Requests by the **CI/CD Failure Analyzer**.

---

### Example 1: 🧪 Flaky Test (Auto-Retried)

> ### 🚨 CI Build Failure Analysis
> 
> **Workflow:** `CI / Test & Build` | **Run:** [#142](https://github.com/acme-corp/payment-service/actions/runs/987654321) | **Commit:** `a1b2c3d`  
> **Classification:** **🧪 Flaky Test Detected** (Confidence: `94%`)
> 
> ---
> 
> #### 📋 Root Cause Summary
> Asynchronous callback timed out waiting for event or selector. Intermittent race condition or mock delay.
> 
> #### 💡 Suggested Action
> Check async event triggers, increase jest.setTimeout(), or use resilient polling.
> 
> #### ⚡ **Automated Action:** Auto-retried failed jobs (Attempt 1 of 2).
> 
> <details>
> <summary><b>🔍 View Sanitized Culprit Log Snippet (Click to expand)</b></summary>
> 
> ```text
>  FAIL  tests/e2e/checkout-webhook.spec.ts (15.22s)
>   ● Checkout Webhook Flow › should receive asynchronous charge.succeeded event
> 
>     Timeout - Async callback was not invoked within the 10000 ms timeout specified by jest.setTimeout.
> 
>       38 |   it('should receive asynchronous charge.succeeded event', async () => {
>       39 |     const eventPromise = waitForWebhookEvent('charge.succeeded', { timeout: 10000 });
>     > 40 |     await triggerSimulatedStripeCharge({ orderId: 'ord_9981' });
>          |     ^
>       41 |     const received = await eventPromise;
>       42 |     expect(received.status).toBe('paid');
> ```
> </details>
> 
> *Automated by [n8n CI/CD Failure Analyzer](https://github.com/acme-corp/ci-failure-analyzer)*

---

### Example 2: 🐛 Code Bug (Developer Action Required)

> ### 🚨 CI Build Failure Analysis
> 
> **Workflow:** `CI / Unit Tests` | **Run:** [#143](https://github.com/acme-corp/payment-service/actions/runs/987654322) | **Commit:** `f4e3d2c`  
> **Classification:** **🐛 Code Bug (Test / Lint Failure)** (Confidence: `95%`)
> 
> ---
> 
> #### 📋 Root Cause Summary
> Test assertion failed: received value does not match expected output in business logic.
> 
> #### 💡 Suggested Action
> Check the diff between expected and received values in the failing test suite.
> 
> #### ⚠️ **Automated Action:** Developer attention required (No auto-retry for this failure type).
> 
> <details>
> <summary><b>🔍 View Sanitized Culprit Log Snippet (Click to expand)</b></summary>
> 
> ```text
>  FAIL  src/services/discountCalculator.spec.ts > DiscountCalculator > should apply 20% discount code VIP20 to total
> AssertionError: expected 80 to deeply equal 75
> 
> - Expected:
> 75
> + Received:
> 80
> 
>  ❯ src/services/discountCalculator.spec.ts:48:29
>      47|     const result = calculateDiscount(cartTotal, 'VIP20');
>      48|     expect(result.finalAmount).toEqual(75);
>        |                             ^
> ```
> </details>
> 
> *Automated by [n8n CI/CD Failure Analyzer](https://github.com/acme-corp/ci-failure-analyzer)*

---

### Example 3: 📦 Dependency Error (Missing Package / Registry 404)

> ### 🚨 CI Build Failure Analysis
> 
> **Workflow:** `CI / Dependencies & Build` | **Run:** [#144](https://github.com/acme-corp/payment-service/actions/runs/987654323) | **Commit:** `b5a6c7d`  
> **Classification:** **📦 Dependency Registry Error** (Confidence: `96%`)
> 
> ---
> 
> #### 📋 Root Cause Summary
> Package registry reported package not found (404) or missing lockfile dependency.
> 
> #### 💡 Suggested Action
> Verify package name, check internal npm/artifactory token, or update lockfile.
> 
> #### ⚠️ **Automated Action:** Developer attention required (No auto-retry for this failure type).
> 
> <details>
> <summary><b>🔍 View Sanitized Culprit Log Snippet (Click to expand)</b></summary>
> 
> ```text
> npm ERR! code E404
> npm ERR! 404 Not Found - GET https://registry.npmjs.org/@acme/shared-telemetry/-/shared-telemetry-3.0.2.tgz - Not found
> npm ERR! 404 
> npm ERR! 404  '@acme/shared-telemetry@3.0.2' is not in this registry.
> ```
> </details>
> 
> *Automated by [n8n CI/CD Failure Analyzer](https://github.com/acme-corp/ci-failure-analyzer)*

---

### Example 4: 🏗️ Infrastructure / Runner Glitch (Transient Auto-Retry)

> ### 🚨 CI Build Failure Analysis
> 
> **Workflow:** `CI / Container Image Build` | **Run:** [#145](https://github.com/acme-corp/payment-service/actions/runs/987654324) | **Commit:** `c7d8e9f`  
> **Classification:** **🏗️ Infrastructure / Runner Glitch** (Confidence: `92%`)
> 
> ---
> 
> #### 📋 Root Cause Summary
> Runner ran out of disk space or memory (SIGKILL / OOMKilled exit code 137).
> 
> #### 💡 Suggested Action
> Clean Docker build caches, prune unused images on self-hosted runners, or upgrade runner size.
> 
> #### ⚡ **Automated Action:** Auto-retried failed jobs (Attempt 1 of 2).
> 
> <details>
> <summary><b>🔍 View Sanitized Culprit Log Snippet (Click to expand)</b></summary>
> 
> ```text
> failed to copy files: write /var/lib/docker/overlay2/abc123xyz/diff/app/dist: no space left on device
> ERROR: failed to solve: failed to copy files: write /var/lib/docker/overlay2/abc123xyz/diff/app/dist: no space left on device
> Process completed with exit code 137.
> ```
> </details>
> 
> *Automated by [n8n CI/CD Failure Analyzer](https://github.com/acme-corp/ci-failure-analyzer)*
