# Playwright Test Automation Framework

An end-to-end QA suite in Playwright: **1,678 tests across 56 spec files**, covering REST API
contract and security testing, browser E2E, accessibility, performance and SEO — with two Page
Object implementations, CI workflows, and a set of AI agent skills for authoring and reviewing
tests.

Every target points at a **public demo site**, so it runs on clone.

```bash
npm install
npx playwright install chromium
npx playwright test tests/smoke.spec.js
```

```
✓ login page renders its form controls (882ms)
✓ rejects an unknown user with an error (1.1s)
✓ accepts the documented demo credentials (1.2s)

3 passed (2.5s)
```

## Layout

```
tests/api/
  retail_crm_chatbot/   88-case suite traced to a spec, tagged AUTH/FUNC/NEG/SEC/PERF/INT
  retail_crm_Dealer/    contract tests + redis-backed state helpers
  retail_crm_TSM/       bulk ingest across CSV, JSON and NDJSON
  TICKETING/            OpenAPI-driven functional, edge-case and negative suites
  outbound_call/        telephony API flows
tests/e2e/
  Saas/                 the deepest suite — homepage, admin, forms, calculator,
                        SEO, security, performance, cross-page consistency, a11y
  AdvisorAI/            content and chatbot journeys
  RetailCrm/  Pharma/  PharmaPortal/  PharmaVoice/  Voice/  WEALTH_APP/
.claude/skills/         agent skills: create-scenarios, generate-tests,
                        review-tests, test-strategy, playwright-best-practices
.github/workflows/      playwright.yml, test-suite.yml
```

## Infrastructure worth pointing at

Most of a suite this size is assertions. These are the parts that took real work:

**`rate-pacer.js`** — written after discovering the API had a *third*, undocumented per-endpoint
rate limiter that only appeared under sustained load. The module paces requests to stay under it;
the comment records the measurement that proved it existed (raw 429s dropped from 4 to 0 at
50 requests per 60s). Without it the security suite failed intermittently and looked flaky.

**`sfa-token.js`** — mints RS256 JWTs on demand, including deliberately malformed variants:
expired, wrong signing key, tampered payload. Auth tests need *invalid* tokens as much as valid
ones, and hand-pasting them means they silently rot.

**`failure-classes.js`** — a taxonomy separating "the system under test is broken" from "the test
environment is broken". A suite that reports both as a red build teaches people to ignore it.

**`redis-state.js`** — seeds and tears down cache state so tests that depend on prior writes are
independent and can run in parallel.

**A test that could not fail.** The VAPT suite once initialised its auth token from a hardcoded
literal. Because `beforeAll` short-circuited when the token was non-empty, the login never ran and
three JWT-shape assertions inspected that dead literal on every execution — passing for months. The
fix tracks `TOKEN_SOURCE` so those cases *refuse to run* on stale input. The comment explaining it
is still in `retail_crm_chatbot_VAPT_test.js`, because the failure mode is worth remembering.

## Two Page Object implementations

`tests/e2e/Saas/utils/page-objects/` and `tests/e2e/Voice/pages/` take different approaches —
one component-oriented, one page-oriented — with helpers split by concern (a11y, performance,
security, SEO). Useful as a side-by-side comparison of the trade-offs.

## AI-assisted authoring

`.claude/skills/` holds skills used while writing this suite: `create-scenarios` derives cases
from requirements, `generate-tests` scaffolds specs, `review-tests` critiques them against
`playwright-best-practices`, and `test-strategy` decides what is worth automating at all.

The judgement stays human. The skills encode conventions so generated tests match the existing
suite instead of inventing a fourth style.

## Configuration

No URL is hardcoded. Each suite reads its target from the environment with a public fallback:

```javascript
const BASE = process.env.SAAS_URL || 'https://www.saucedemo.com';
```

```bash
cp .env.example .env
npx playwright test                          # everything
npx playwright test --grep @smoke            # smoke only
npx playwright test tests/api                # API only
HEADED=1 npx playwright test                 # watch it run
BASE_URL=https://staging.internal npx playwright test
```

Public defaults: [saucedemo](https://www.saucedemo.com),
[the-internet](https://the-internet.herokuapp.com), [reqres](https://reqres.in),
[httpbin](https://httpbin.org), [jsonplaceholder](https://jsonplaceholder.typicode.com),
[quickpizza](https://quickpizza.grafana.com).

Because these suites were written against different applications, not every assertion will pass
against a generic demo site — selectors and copy differ. `tests/smoke.spec.js` is the one
guaranteed green on clone; the rest are structural references you retarget with an env var.

## CI

`playwright.yml` runs the suite on push; `test-suite.yml` splits API and E2E into separate jobs.
Config is CI-shaped by default — headless, `trace: 'on-first-retry'`,
`video: 'retain-on-failure'`, HTML report written but never auto-opened.

## Tech stack

Playwright 1.57 · JavaScript · Zod · jsonwebtoken · dotenv · GitHub Actions · Python helpers
for token minting
