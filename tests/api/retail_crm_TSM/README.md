# Retail CRM TSM Touch Ingest API — Test Suite

Playwright API test suite for the **TSM Touch Ingest API**, a secure Cloud Run ingestion service that accepts partner-submitted TSM touch data and lands it in Google Cloud Storage.

---

## Business Understanding

### What this API is for

Retail CRM's **Territory Sales Managers (TSMs)** work in the field, visiting and contacting dealers. Every interaction — a **visit**, a **call**, an **email**, an **SMS** — is recorded as a *"touch"*. An upstream partner system (`aethereus`) collects these touches and needs to hand them to Retail CRM's billing-validation pipeline, because TSM activity feeds downstream billing and performance reporting.

This API is the **door those records come in through**. In plain terms, it is a secure, authenticated mailbox drop:

1. **Knock first** — the partner exchanges its `client_id` / `client_secret` for a short-lived JWT (2-hour validity).
2. **Drop the file** — it posts a batch of touch records in whatever format it already has: JSON, CSV, NDJSON, or plain text; either as a multipart `file` or as a raw request body.
3. **Get a receipt** — the API writes the payload to a date-partitioned folder in Google Cloud Storage and returns an `ingest_id` plus the exact `bucket` / `object` / `gcs_uri` it was stored at.

### What it deliberately does NOT do

This is a **thin ingestion layer with no business validation**. It does not check whether the dealer code exists, whether `touch_date` is sensible, or whether `touch_type` is a recognised value. It stores the payload essentially as received and confirms where it landed. All business validation happens **downstream**, in separate Cloud Functions that read these GCS objects.

This single design decision explains most of the test suite's shape — e.g. why SEC-001/002/003 assert only *"no 5xx"* for SQL-injection, NoSQL-injection and XSS payloads rather than expecting rejection, and why EDGE-005 expects a headers-only CSV to return **200**. Garbage in is not this service's problem; **losing** or **duplicating** data is.

### What matters to the business — and what QA is really protecting

| The suite verifies | The suite intentionally does not verify |
|---|---|
| Only authorised partners can submit (JWT; legacy `X-API-Key` now rejected) | Whether the submitted data is business-correct |
| Every accepted payload lands in GCS at the correct date-partitioned path | Whether a `dealer_code` actually exists |
| A network retry does not create a duplicate record (`Idempotency-Key`) | Downstream billing calculations or reports |
| Malformed or hostile input is handled without a 5xx | Dealer/TSM master-data integrity |
| The service stays available and responsive under concurrent uploads | |

The two failure modes that would genuinely cost Retail CRM money, and therefore carry the most test weight:

- **Silent data loss** — a `200` is returned but nothing reaches the bucket, or one upload overwrites another's object. Covered by FUNC-030..038 (receipt fields and path format), FUNC-042 and NFNC-005 (distinct paths under concurrency).
- **Duplicate ingestion** — a partner retry after a timeout gets counted twice and inflates billing. Covered by FUNC-040/041, EDGE-006/008.

Everything else — health checks, rate limiting, response-header assertions — is supporting evidence that the service is behaving as a reliable pipe.

### Key business rules encoded in the tests

| Rule | Why it matters commercially | Tests |
|---|---|---|
| Same `Idempotency-Key` ⇒ same GCS object (overwrite, never duplicate) | Retries after a timeout must not double-count TSM activity in billing | FUNC-040, EDGE-006 |
| No key, or a different key ⇒ a new unique object | Genuinely separate submissions must never collide and silently overwrite each other | FUNC-041, FUNC-042, NFNC-005 |
| Tokens expire after 2 hours; credentials support an optional grace period | Limits the blast radius of a leaked partner credential while avoiding a hard cut-off that breaks a live integration | FUNC-008/009, EXPIRY-001..004 |
| Ingest never returns 5xx for bad input | A partner crash-looping on retries would flood the pipeline; failures must be clean 4xx | NEG-009/010, SEC-001..003 |
| Objects are stored under `YYYY/MM/DD/` | Downstream validation jobs and billing reconciliation run per-day and locate files by date | FUNC-035 |

---

## API Under Test

| Property | Value |
|---|---|
| Default environment | Dev |
| Dev Base URL | `https://httpbin.org` |
| Production Base URL | `https://www.saucedemo.com` (v1.1 — released 31/07/2026) |
| Docs | `https://httpbin.org/docs` |
| Framework | FastAPI + Uvicorn |
| Auth | OAuth2 `client_credentials` → short-lived JWT Bearer token (default 2-hour validity) |

The base URL is selected via the `TSM_BASE_URL` env var and **defaults to Dev**, so an accidental run never writes objects to the production GCS bucket. Point at Production explicitly for release verification:

```bash
TSM_BASE_URL=https://www.saucedemo.com \
  npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js
```

> Note: the release-checklist Production link is `http://`, not `https://`. Confirm with dev/DevOps whether Production terminates TLS.

### Endpoints

| Method | Endpoint | Auth Required | Purpose |
|---|---|---|---|
| GET | `/healthz` | No | Liveness check |
| POST | `/v1/auth/token` | No (credentials in body) | Exchange client credentials for Bearer token |
| POST | `/v1/tsm-touch` | Yes (`Authorization: Bearer <token>`) | Ingest partner TSM touch payload |

---

## Test File

```
tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js
```

**79 test cases across 8 categories (4 skipped — pending expiry / grace-period credentials in lower environments).**

> **FUNC-039** confirms that plain-text payloads are stored with a `.json` extension — this is **by design** (JSON-only object storage), not a defect. Only the docs needed to reflect it; see [bugs.txt](bugs.txt) iteration 3 (Documentation).

---

## Test Categories

### FUNCTIONAL (31 tests)
Core happy-path scenarios covering health, authentication, and all documented ingest modes.

| Test ID | Description |
|---|---|
| FUNC-001 | GET /healthz returns HTTP 200 |
| FUNC-002 | GET /healthz returns valid JSON body |
| FUNC-003 | GET /healthz requires no authentication |
| FUNC-004 | GET /healthz Content-Type is application/json |
| FUNC-005 | POST /v1/auth/token with valid credentials returns 200 |
| FUNC-006 | Token response contains a non-empty `access_token` string |
| FUNC-007 | Token `token_type` is `"Bearer"` |
| FUNC-008 | Token `expires_in` is the documented 2-hour default (7200 s) |
| FUNC-009 | `access_token` is a well-formed JWT whose `exp - iat` equals 7200 s |
| FUNC-010 | POST with JSON raw body and valid token returns 200 |
| FUNC-011 | POST with CSV raw body and valid token returns 200 |
| FUNC-012 | POST with NDJSON raw body and valid token returns 200 |
| FUNC-013 | POST with plain text raw body and valid token returns 200 |
| FUNC-020 | POST multipart JSON file upload returns 200 |
| FUNC-021 | POST multipart CSV file upload returns 200 |
| FUNC-022 | POST multipart NDJSON file upload returns 200 |
| FUNC-023 | POST multipart plain text file upload returns 200 |
| FUNC-030 | Response contains `ingest_id` field |
| FUNC-031 | Response `gcs_uri` starts with `gs://` |
| FUNC-032 | Response contains non-empty `bucket` field |
| FUNC-033 | Response contains non-empty `object` field |
| FUNC-034 | Response Content-Type is `application/json` |
| FUNC-035 | GCS object path follows `YYYY/MM/DD/` date partition |
| FUNC-036 | GCS object path file extension matches JSON content type (`.json`) |
| FUNC-037 | GCS object path file extension matches CSV content type (`.csv`) |
| FUNC-038 | GCS object path file extension matches NDJSON content type (`.ndjson`) |
| FUNC-039 | Plain text payload is stored with a `.json` extension (JSON-only, by design) |
| FUNC-040 | Same `Idempotency-Key` maps to the same GCS object on retry |
| FUNC-041 | Different `Idempotency-Keys` produce different GCS objects |
| FUNC-042 | Requests without `Idempotency-Key` produce unique GCS objects |
| FUNC-043 | `ingest_id` is unique for each new request |

### NEGATIVE (16 tests)
Validates rejection of invalid, unauthorized, or malformed requests.

| Test ID | Description |
|---|---|
| NEG-020 | POST /v1/auth/token with invalid `client_secret` returns 401 or 400 |
| NEG-021 | POST /v1/auth/token with invalid `client_id` returns 401 or 400 |
| NEG-022 | POST /v1/auth/token without `grant_type` returns 400 or 422 (enforced since bug 2 was fixed 21/05/2026) |
| NEG-023 | POST /v1/auth/token with wrong `grant_type` returns 400 or 422 |
| NEG-024 | POST /v1/auth/token with empty request body returns 400 or 415 |
| NEG-025 | POST /v1/auth/token with `Content-Type: application/json` is accepted or rejected gracefully (200/415/422 — server is lenient by design, doc aligned) |
| NEG-001 | Missing `Authorization` header returns 401 or 403 |
| NEG-002 | Invalid Bearer token returns 401 or 403 |
| NEG-003 | Empty Bearer token string returns 401 or 403 |
| NEG-004 | Malformed JWT (`aaa.bbb.ccc`) returns 401 or 403 |
| NEG-005 | GET on `/v1/tsm-touch` returns 404 or 405 |
| NEG-006 | DELETE on `/v1/tsm-touch` returns 404 or 405 |
| NEG-007 | PUT on `/v1/tsm-touch` returns 404 or 405 |
| NEG-008 | Unknown endpoint returns 404 |
| NEG-009 | Empty request body does not cause 5xx |
| NEG-010 | Request with no body or file does not cause 5xx |

### REGRESSION (1 test)
Ensures the new JWT build does not accidentally accept the legacy `X-API-Key` authentication scheme.

| Test ID | Description |
|---|---|
| REG-001 | `X-API-Key` header (old auth) is rejected with 401 or 403 on the new build |

### EDGE CASE (9 tests)
Boundary and unusual-but-valid inputs.

| Test ID | Description |
|---|---|
| EDGE-001 | Minimal single-field JSON payload |
| EDGE-002 | Unicode / multilingual characters in payload |
| EDGE-003 | Large JSON payload (~50 KB) — expects 200 or 413 |
| EDGE-004 | Single data row CSV |
| EDGE-005 | CSV with headers only, no data rows |
| EDGE-006 | Same `Idempotency-Key` with different payloads maps to same object |
| EDGE-007 | Multipart upload with no file field returns 400 or 422 |
| EDGE-008 | `Idempotency-Key` containing special characters |
| EDGE-009 | Single-line NDJSON payload |

### SECURITY (8 tests)
Validates that the API handles malicious inputs safely and does not leak internals.

| Test ID | Description |
|---|---|
| SEC-001 | SQL injection in payload does not cause 5xx |
| SEC-002 | NoSQL injection in payload does not cause 5xx |
| SEC-003 | XSS payload in JSON body does not cause 5xx |
| SEC-004 | Path traversal string as Bearer token is rejected (401/403) |
| SEC-005 | Oversized Bearer token (5000 chars) is rejected cleanly |
| SEC-006 | Error response does not expose server internals (traceback, stack trace) |
| SEC-007 | GCS object path does not contain `..` or `//` |
| SEC-008 | Success response does not expose GCP credentials or service account keys |

### RATE LIMITING (3 tests)
Validates server resilience and throttling behaviour under credential-stuffing-style traffic on `/v1/auth/token`.

| Test ID | Description |
|---|---|
| RATE-001 | Burst of 20 rapid valid-credential requests produces no 5xx (429 acceptable) |
| RATE-002 | Burst of 20 invalid-credential requests (credential-stuffing simulation) returns 4xx — not 5xx |
| RATE-003 | Valid auth request immediately after a credential-stuffing burst returns 200 or 429 — not 5xx |

### TOKEN EXPIRY & CREDENTIAL GRACE PERIOD (4 tests — currently skipped)
Covers the v1.1 feature *"optional credential expiry with configurable grace-period handling for `client_id`/`client_secret` pairs."* Each test is **env-gated** — it skips with an actionable reason until its credentials are provisioned, then activates automatically with **no code change**. See [bugs.txt](bugs.txt) iteration 3, bug 1 (the credentials are the open blocker).

| Test ID | Status | Description | Prerequisite env vars |
|---|---|---|---|
| EXPIRY-001 | `skipped` | Expired token is rejected at ingest with 401 or 403 | `TSM_EXPIRED_TOKEN` (a pre-expired JWT) |
| EXPIRY-002 | `skipped` | Token reused beyond its `expires_in` window is rejected with 401 or 403 | `TSM_SHORT_TTL_CLIENT_ID` / `TSM_SHORT_TTL_CLIENT_SECRET` (key with `expires_in` ≤ 60 s) |
| EXPIRY-003 | `skipped` | Credential expired but **within** its grace period still issues a usable token, and that token ingests successfully | `TSM_GRACE_CLIENT_ID` / `TSM_GRACE_CLIENT_SECRET` |
| EXPIRY-004 | `skipped` | Credential **past** its grace period is rejected at `/v1/auth/token` (400/401) without leaking internals | `TSM_EXPIRED_GRACE_CLIENT_ID` / `TSM_EXPIRED_GRACE_CLIENT_SECRET` |

### NON-FUNCTIONAL (7 tests)
Performance, concurrency, and stability checks.

| Test ID | Description |
|---|---|
| NFNC-001 | GET /healthz responds within 2000 ms |
| NFNC-002 | POST /v1/tsm-touch responds within 10000 ms |
| NFNC-003 | 10 concurrent GET /healthz all return 200 |
| NFNC-004 | 5 concurrent POST ingests all return 200 |
| NFNC-005 | 5 concurrent ingests with unique keys produce 5 distinct GCS paths |
| NFNC-006 | 5 sequential health checks remain stable |
| NFNC-007 | 3 sequential ingests all return 200 within time limit |

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Target environment — defaults to Dev if unset. Set to the Production URL for release verification.
# TSM_BASE_URL=https://www.saucedemo.com

# Required: OAuth2 client credentials for the TSM Ingest API
TSM_CLIENT_ID=your-client-id
TSM_CLIENT_SECRET=your-client-secret

# Optional: expiry / grace-period test credentials.
# Each unlocks its EXPIRY test only when set; otherwise that test skips.
TSM_EXPIRED_TOKEN=                 # pre-expired JWT — enables EXPIRY-001
TSM_SHORT_TTL_CLIENT_ID=           # key with expires_in <= 60s — enables EXPIRY-002
TSM_SHORT_TTL_CLIENT_SECRET=
TSM_GRACE_CLIENT_ID=               # expired but in-grace pair — enables EXPIRY-003
TSM_GRACE_CLIENT_SECRET=
TSM_EXPIRED_GRACE_CLIENT_ID=       # past-grace pair — enables EXPIRY-004
TSM_EXPIRED_GRACE_CLIENT_SECRET=
```

> Credential defaults fall back to `aethereus` / `Chanakya-Evaluation-T0k3n` if `TSM_CLIENT_ID` / `TSM_CLIENT_SECRET` are not set.

---

## Running Tests

```bash
# Run the full TSM test suite
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js

# Run with HTML report
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --reporter=html

# Run a specific category
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --grep "\[FUNC"
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --grep "\[NEG"
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --grep "\[EDGE"
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --grep "\[SEC"
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --grep "\[RATE"
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --grep "\[EXPIRY"
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --grep "\[REG"
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --grep "\[NFNC"

# Run a specific test by ID
npx playwright test tests/api/retail_crm_TSM/tsm_touch_ingest_api.spec.js --grep "FUNC-040"
```

---

## Supported Payload Formats

| Content Type | Stored Extension | Upload Mode |
|---|---|---|
| `application/json` | `.json` | Raw body or multipart |
| `text/csv` | `.csv` | Raw body or multipart |
| `application/x-ndjson` | `.ndjson` | Raw body or multipart |
| `text/plain` | `.json` (normalised to JSON by design — JSON-only storage) | Raw body or multipart |
| `application/octet-stream` | `.json` (default fallback for unknown types) | Raw body |

---

## GCS Object Path Format

Successful ingestions are stored under:

```
gs://<GCS_INGEST_BUCKET>/<GCS_INGEST_PREFIX>/YYYY/MM/DD/<ingest_id>.<ext>
```

Example:
```
gs://retail_crm-ingest-bucket/tsm-touch/raw/2026/05/11/abc123.json
```

---

## Idempotency

Send the `Idempotency-Key` header to ensure retries overwrite the same GCS object instead of creating duplicates:

```
Idempotency-Key: partner-unique-request-id-001
```

Without this header, each request creates a new object.

---

## Reference

- Requirement document: `TSM Touch Ingest API.pdf`
- API specification: `https://httpbin.org/docs`
