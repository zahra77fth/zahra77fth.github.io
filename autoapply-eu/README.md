# AutoApply EU

A self-hosted, single-user system that discovers frontend jobs in **Germany and the Netherlands**, matches them against a **verified** candidate profile, generates truthful tailored documents, applies through supported ATS forms with verified evidence, and routes everything it cannot finish to a **manual action queue** with direct links and ready-to-download documents.

> Safety defaults: the system starts in **discovery-only** mode. Real submissions require all of: an approved profile, the dashboard setting *Automatic submission*, the server flag `AUTHORIZE_REAL_SUBMISSIONS=true`, and no emergency stop. In `NODE_ENV=test` only `localhost` forms can ever be submitted.

## Architecture

```
Next.js dashboard (App Router, Tailwind, shadcn/ui)  ──►  PostgreSQL (Prisma)
        │ server actions                                    ▲
        ▼                                                   │
     Redis / BullMQ  ──►  worker (tsx worker/index.ts) ─────┘
                           ├─ aa-pipeline  : DISCOVER → NORMALIZE → DEDUPLICATE → MATCH → (enqueue) → REPORT
                           ├─ aa-documents : GENERATE tailored CV (PDF/DOCX) + cover letter (PDF/DOCX/TXT)
                           └─ aa-apply     : APPLY (Playwright) → VERIFY → state transition + evidence
```

| Area | Location |
| --- | --- |
| Candidate profile (Desktop CV locate, PDF/DOCX parse, fact verification) | `src/core/cv`, `src/core/profile` |
| Discovery adapters (Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Personio, Workday, Arbeitnow, Bundesagentur, JSON-LD career sites) | `src/core/discovery` |
| Matching and eligibility (Eligible / Needs clarification / Excluded / Expired / Duplicate) | `src/core/matching` |
| State machine with audited transitions, locking, idempotency | `src/core/state.ts` |
| Documents | `src/core/documents` |
| Playwright apply engine and ATS adapters | `src/core/apply` |
| Queue, scheduler, runner, crash recovery | `src/core/queue.ts`, `src/core/runner.ts`, `worker/` |
| Notifications and daily report | `src/core/notify` |
| Dashboard | `src/app`, `src/components` |

### Application states

`QUEUED → DOCUMENTS_READY → APPLYING → SUBMITTED_VERIFIED | SUBMISSION_UNCERTAIN | NEEDS_ACTION | RETRY_PENDING | FAILED`, plus the terminal states `EXPIRED`, `SKIPPED`, `DUPLICATE`, `APPLIED_MANUALLY` and `NOT_INTERESTED`. Every change writes a `StateTransition` row (from, to, reason, actor, timestamp).

- `SUBMITTED_VERIFIED` is only set when the page after submission shows a confirmation message, a confirmation URL or a reference number. Clicking submit alone is never treated as success.
- If the submit button was clicked but no confirmation was detected, the state is `SUBMISSION_UNCERTAIN`. It is **never retried automatically**, to avoid duplicate applications. You resolve it from the manual queue.
- A submit-click marker is persisted *before* the click. A worker that crashes mid-submission is recovered to `SUBMISSION_UNCERTAIN`, never to a retry.
- The same position cross-posted on another board (same company and title fingerprint) is marked `DUPLICATE` once one copy is submitted.

### Manual fallback

These cases go to the manual queue (`NEEDS_ACTION`) with a reason, the direct application link, and the generated documents:

- CAPTCHA or human-verification pages
- Login, MFA or account requirements
- Unsupported ATS
- Unknown required questions
- Upload failures
- Final retry failures

The queue offers these actions: *Open website*, *Download resume*, *Download cover letter*, *Retry*, *Mark applied manually*, *Not interested*. Unknown questions are saved under **Settings → Screening answers**. Once you answer them there, retries can fill those fields.

## Truthfulness rules

- The approved profile is the only source of facts. Approving is an explicit action, and editing the profile clears the approval.
- Each CV extraction is checked against the CV text, and unsupported facts are dropped. Work authorization, visa status and salary are never inferred. They stay `unknown` until you enter them.
- Tailoring only **reorders and selects** existing facts. LLM output (optional) is rejected if it mentions any technology, number or percentage that is not in the profile, and the deterministic template is used instead.
- Every cover letter is generated per job from the job's own requirements that the profile actually covers.

## Requirements

- Node.js 20+ (tested with Node 22)
- PostgreSQL 14+ and Redis 6+ (or Docker)
- Playwright Chromium (`npx playwright install chromium`)

## Local setup

```bash
cd autoapply-eu
npm install
npx playwright install chromium
npm run setup          # writes .env with generated ENCRYPTION_KEY/SESSION_SECRET, runs migrations, scans the Desktop
npm run build
npm run start          # dashboard on http://localhost:3000
npm run worker         # in a second terminal: queues, scheduler, browser automation
```

For development, use `npm run dev` instead of build+start.

On first visit to `/login`, the username and password you enter become the single owner account. Then follow the **Setup wizard**:

1. Scan the Desktop (or upload) and choose the master CV. If several are found, you pick one.
2. Review the extracted facts. Fill in missing fields, especially work authorization, which is never guessed. Then **approve** the profile.
3. Set preferences: countries, roles, remote preference, minimum salary, exclusions, letter languages.
4. Do a discovery-only run and review the results under *Job discovery*.
5. Optionally configure an LLM key and email notifications.
6. Only when you are ready: enable *Automatic submission* in Settings and start the worker with `AUTHORIZE_REAL_SUBMISSIONS=true`.

### Docker Compose

```bash
cp .env.example .env   # fill ENCRYPTION_KEY and SESSION_SECRET (base64, 32 bytes)
docker compose up -d --build
docker compose exec web npx prisma migrate deploy
```

The host `~/Desktop` is mounted read-only at `/desktop` (`DESKTOP_DIR=/desktop`), and generated files persist in the `storage` volume.

## Configuration

All variables are documented in [`.env.example`](./.env.example). Secrets entered in the dashboard (LLM key, SMTP and Gmail credentials) are stored encrypted with AES-256-GCM using `ENCRYPTION_KEY`. Passwords are hashed with scrypt, and logs redact credentials, tokens and contact details.

| Variable | Purpose |
| --- | --- |
| `AUTHORIZE_REAL_SUBMISSIONS` | Server-side kill switch for real submissions (default `false`). |
| `EMAIL_TRANSPORT=json` | Do not send mail; render it only (used by tests). |
| `DESKTOP_DIR` | Override Desktop detection (OneDrive, XDG and localized names like Bureaublad and Schreibtisch are detected automatically). |
| `STORAGE_DIR` | Documents, screenshots and HTML evidence (files written with mode 0600). |

## Discovery coverage

Coverage is recorded per source on each run (`FULL`, `PARTIAL` or `BLOCKED`, plus counts and errors) and shown under **Settings → Source coverage**. The system never claims full market coverage.

- **Public ATS boards** (Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Personio, Workday): the list of verified boards is in `src/core/discovery/registry.ts`. You can add your own boards in Settings. Optionally, boards discovered through aggregator listings can be learned automatically.
- **Arbeitnow**: public job board API (DE, some NL).
- **Bundesagentur für Arbeit**: uses the public jobsuche API. It is marked `BLOCKED` when it refuses requests (it returned HTTP 403 from the cloud test environment).
- **Career sites**: any company URL you add, read via schema.org `JobPosting` JSON-LD and sitemaps, respecting `robots.txt`.
- **Not scraped**: LinkedIn, Indeed, StepStone, XING, Glassdoor, Welcome to the Jungle and Wellfound. Their terms prohibit automated access, so they are recorded as `BLOCKED` with that reason. Jobs from them can still reach you indirectly when the employer also uses a supported ATS.
- **Teamtailor**: the job API needs a per-company key, so the source is listed as `BLOCKED`. Add a Teamtailor career page under *Career sites* to index it via JSON-LD instead.

All HTTP access goes through `politeFetch`, which provides per-domain rate limits, backoff on 429 and 5xx (honouring `Retry-After`), and a `robots.txt` check for crawled pages. The system never attempts to bypass CAPTCHA, MFA or anti-bot measures.

## Apply support

| ATS | Automated apply |
| --- | --- |
| Greenhouse, Lever, Ashby, Recruitee, Personio | Yes (form adapters plus the generic field mapper) |
| Workday | No: needs an account login, so it goes to the manual queue |
| SmartRecruiters, aggregator listings, unknown sites | Generic adapter attempt; any blocker sends it to the manual queue |

Field mapping covers English, German and Dutch labels. Privacy consent is only ticked if you enable it in Settings. Marketing opt-ins are always left unticked, and diversity questions get the "decline to answer" option when present.

## Tests

```bash
npm run typecheck && npm run lint
npm test                    # unit + integration + browser (needs Postgres DB autoapply_test and Redis)
npm run test:browser        # Playwright against local mock ATS sites only
npm run test:live           # live discovery against permitted public sources (no applications)
```

The browser tests only ever submit to local mock ATS servers (`tests/helpers/mockAts.ts`), which cover these scenarios: simple form, multi-step form, CAPTCHA, login wall, unknown required question, and no confirmation. Test data uses a fictional candidate.

## Known limitations

- Automated applying has only been exercised against mock ATS forms. Real ATS markup changes over time, and the first real runs should be watched with *Automatic submission* off, using the manual queue.
- Confirmation detection is heuristic, so ambiguous outcomes are reported as `SUBMISSION_UNCERTAIN` rather than as success.
- Email confirmations from employers are not read. The report only counts on-page confirmations.
- Bundesagentur access depends on the API remaining publicly usable from your network.

See [`docs/API.md`](./docs/API.md) for HTTP routes and server actions.
