# AutoApply EU — API reference

The dashboard is the primary interface. Every route and server action requires a valid owner session (signed, HTTP-only cookie `aa_session`) except `GET /api/health` and the login action. Unauthenticated requests to pages are redirected to `/login`, and unauthenticated API calls return `401`.

## HTTP routes

| Method and path | Description | Response |
| --- | --- | --- |
| `GET /api/health` | Liveness and dependency check (no auth). | `200 {"status":"ok","checks":{"database":"ok","redis":"ok"}}` or `503` with the failing check. |
| `GET /api/files/:applicationId/:kind` | Download a generated document. `kind` is one of `resume-pdf`, `resume-docx`, `cover-pdf`, `cover-docx`, `cover-txt`. | File as an attachment, `cache-control: private, no-store`. `404` if not generated. `403` if the path is outside `STORAGE_DIR`. |
| `GET /api/evidence/:attemptId/:kind` | Submission evidence for an attempt. `kind` is one of `screenshot` (final page), `before-submit` (screenshot taken right before clicking submit), `html` (final page DOM). | PNG, or `text/plain` for HTML so captured third-party pages never execute in the dashboard origin. |
| `GET /api/export` | Full data export: profile, settings, jobs, applications, transitions, attempts, screening answers, events, runs, sources. Secrets are never included. | JSON attachment. |

## Server actions (`src/app/actions.ts`)

These are invoked from dashboard forms. Every action re-checks the session, validates input with zod, and writes an `Event` for the timeline.

| Action | Effect |
| --- | --- |
| `loginAction(form)` | Creates the owner on first use; otherwise verifies the scrypt hash and sets the session cookie. |
| `logoutAction()` | Revokes the session. |
| `runNowAction(mode)` | Enqueues a pipeline run. `"manual"` runs the full pipeline; `"discovery-only"` stops after matching. Runs are deduplicated per minute. |
| `pauseAction(paused)` | Pauses or resumes the scheduled runs and the apply queue. Manual "Run now" still works while paused. |
| `emergencyStopAction(engaged)` | Immediately pauses all queues, and the pipeline refuses to apply until released. |
| `manualAction(id, action)` | `APPLIED_MANUALLY`, `NOT_INTERESTED` or `RETRY` for a manual-queue item. `RETRY` is refused for `SUBMISSION_UNCERTAIN` (check the employer site first, then mark it). |
| `approveClarificationAction(jobId)` | Marks a *Needs clarification* job as eligible after your review. |
| `scanDesktopAction()` | Lists PDF/DOCX CV candidates on the Desktop (path, size, modified date). |
| `importCvAction(path)` | Imports one of the files returned by the scan (other paths are rejected) and extracts a draft profile. |
| `uploadCvAction(form)` | Same, from an uploaded PDF or DOCX (max 10 MB). |
| `saveProfileAction(json)` | Saves profile edits (validated against `ProfileSchema`) and clears the approval. |
| `approveProfileAction()` | Approves the profile (refused without a name and email), then re-evaluates all jobs against it. |
| `updateSettingsAction(patch)` | Validates and stores settings, then re-syncs the scheduler. |
| `saveSecretAction(key, value)` | Stores an LLM, SMTP or Gmail credential, encrypted. Values are never sent back to the browser. |
| `answerQuestionAction(id, answer)` / `addQuestionAction(q, a)` | Manage reusable screening answers. |
| `deleteAllDataAction("DELETE")` | Deletes all jobs, applications, profile and generated files. |

## Worker queues (BullMQ)

| Queue | Job | Notes |
| --- | --- | --- |
| `aa-pipeline` | `run` (`{ trigger: "schedule" \| "manual" \| "discovery-only" }`), `sweep` | Daily scheduler from Settings (cron and timezone). `sweep` every 5 minutes recovers stale locks and re-dispatches due retries. |
| `aa-documents` | `generate` (`{ applicationId }`) | 3 attempts with exponential backoff. After the final failure the application becomes `NEEDS_ACTION`. |
| `aa-apply` | `apply` (`{ applicationId, attempt }`) | Concurrency `WORKER_CONCURRENCY_APPLY`. Per-domain spacing (`applyDomainMinIntervalMs`) via delayed jobs. Up to 3 attempts with 5 minute × 2ⁿ backoff (max 6 h). |

The job ID includes the application and attempt number, so duplicate enqueues are no-ops. The database lock (`acquireApplyLock`) is the source of truth for idempotency.
