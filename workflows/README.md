# 🛠️ n8n Workflow Architecture: CI/CD Failure Analyzer

This directory contains the importable workflow JSON: [`ci-failure-analyzer.json`](./ci-failure-analyzer.json).

---

## 🧭 Node-by-Node Breakdown

```
[1. GitHub Failure Webhook]
       │
[2. Parse & Validate Event]
       │
[3. Is Failed Run?] ──(False)──> [Stop]
       │ (True)
[4. Prepare GitHub API Request]
       │
[5. Smart Log Extractor]
       │
[6. Classify Failure]
       │
[7. Should Auto-Retry?]
   ├── (True) ──> [8. GitHub API: Trigger Rerun]
   │                      │
   └── (False) ──> [9. Format PR Comment]
                          │
                   [10. Has Pull Request?]
                      ├── (True) ──> [11. Post Comment to PR]
                      │                     │
                      └── (False) ──> [12. Emit DORA Metrics]
```

### 1. `GitHub Failure Webhook` (`n8n-nodes-base.webhook`)
- Listens for GitHub `POST` webhooks at path `github-ci-failure`.
- Configured with `responseMode: "onReceived"` so GitHub receives an immediate `200 OK` without waiting for downstream analysis.

### 2. `Parse & Validate Event` (`n8n-nodes-base.code`)
- Inspects GitHub `workflow_run` event properties.
- Extracts `repoOwner`, `repoName`, `runId`, `runAttempt`, `commitSha`, `prNumber`, and commit message.
- Flags invalid or non-failure events early.

### 3. `Is Failed Run?` (`n8n-nodes-base.if`)
- Filters out non-failed runs (`conclusion !== 'failure'`) to avoid processing successful runs.

### 4. `Prepare GitHub API Request` (`n8n-nodes-base.code`)
- Prepares the dynamic URL and parameters to query GitHub's Actions API:
  `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`

### 5. `Smart Log Extractor` (`n8n-nodes-base.code`)
- Cleans and isolates culprit error logs:
  - Strips ANSI color escape codes (`\u001b[...]`).
  - Strips ISO timestamps.
  - Scans for failure anchor patterns (`FAIL`, `AssertionError`, `Timeout`, `npm ERR!`, `exit code 137`, `OOMKilled`).
  - Slices a concise 35-line "culprit window" centered on the error.

### 6. `Classify Failure` (`n8n-nodes-base.code`)
- Classifies the failure into one of 4 taxonomies:
  - `FLAKY_TEST`
  - `DEPENDENCY_ERROR`
  - `INFRASTRUCTURE_FAILURE`
  - `CODE_BUG`
- Sets `canRetry` to `true` if `isFlaky == true` and `runAttempt < MAX_RETRIES (2)`.
- Calculates estimated developer triage time saved.

### 7. `Should Auto-Retry?` (`n8n-nodes-base.if`)
- Branches execution: only retriable failures proceed to the retry trigger node.

### 8. `GitHub API: Trigger Rerun` (`n8n-nodes-base.httpRequest`)
- Invokes GitHub's rerun API:
  `POST /repos/{owner}/{repo}/actions/runs/{runId}/rerun-failed-jobs`
- Safely retries *only* the failed jobs, conserving CI minutes.

### 9. `Format PR Comment` (`n8n-nodes-base.code`)
- Compiles a developer-friendly GitHub Markdown comment including:
  - Header badge and classification category.
  - 1-2 sentence root cause explanation.
  - Suggested next action.
  - Automated retry status indicator.
  - Collapsible `<details>` section containing the sanitized log snippet.

### 10. `Has Pull Request?` & `11. Post Comment to PR` (`n8n-nodes-base.httpRequest`)
- If the failure originated from a PR branch, posts the comment via:
  `POST /repos/{owner}/{repo}/issues/{prNumber}/comments`

### 12. `Emit DORA Metrics` (`n8n-nodes-base.code`)
- Compiles the incident telemetry event for DORA tracking and analytics persistence.

---

## 📥 How to Import into n8n

1. Open your n8n workspace (e.g. `http://localhost:5678`).
2. Go to **Workflows** in the left sidebar.
3. Click the **+ Add Workflow** button.
4. Click the three dots `...` in the top-right corner and select **Import from File**.
5. Select [`workflows/ci-failure-analyzer.json`](./ci-failure-analyzer.json).
6. Configure the `GITHUB_TOKEN` environment variable or add a GitHub credential in n8n.
7. Toggle the workflow to **Active**.

