# Retail CRM Chatbot VAPT Test Suite

Browser-based Playwright security tests covering all 11 findings from the VAPT audit of the **Retail CRM Opus BEST BOT** application.

**Test file:** `tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT_test.js`

---

## Environment

| Constant | Value |
|---|---|
| Backend API | `https://jsonplaceholder.typicode.com` |
| Frontend URL | `https://httpbin.org` |
| Test phone A (primary) | `9000000001` |
| Test phone B (VAPT-001) | `9000000003` (or set `TEST_PHONE_B` env var) |

Most tests use the real Playwright browser (`page` or `browser` fixture). No manual OTP entry or `page.pause()` is required for any test except VAPT-001.

**Rate-limit strategy:** The `request-otp` endpoint enforces a 60-second cooldown per phone. To avoid rate-limit failures across tests, `request-otp` is never called for real except in VAPT-008 (which deliberately tests the rate limit). Instead:
- `beforeAll` / `VAPT-003` call `verify-otp` directly with the dev bypass OTP — no `request-otp` needed.
- `VAPT-002` / `VAPT-004` use `page.route` to intercept and mock the `request-otp` call (returns `200` instantly, no real network request), then complete the full UI login flow programmatically — the app's own `verify-otp` call is real so post-login localStorage/cookie behaviour is accurately tested.

**VAPT-001** is the only exception — it requires two separate browser sessions with real phone numbers and goes through the full UI login flow with `page.pause()` for manual OTP entry.

---

## Auth / login flow

| Test | How it authenticates |
|---|---|
| `beforeAll` (VAPT-007a/b/c) | `POST verify-otp` directly with bypass OTP — no `request-otp` |
| VAPT-002 | `page.route` mocks `request-otp` → app UI advances → OTP filled programmatically → app's real `verify-otp` call |
| VAPT-003 | `POST verify-otp` directly with wrong OTP `000000` — tests rejection |
| VAPT-004 | `page.route` mocks `request-otp` → app UI advances → OTP filled programmatically → app's real `verify-otp` call |
| VAPT-008 | Real `request-otp` called twice for `TEST_PHONE_B` — tests rate limiting |
| VAPT-001 | Full UI login, `page.pause()`, manual OTP entry × 2 |

**Why mock `request-otp` for VAPT-002/004 instead of skipping it entirely?**
These tests check what the **frontend app's JavaScript** stores in localStorage and cookies during the login flow. Bypassing the UI (calling `verify-otp` directly from the test) means the app's post-login code never runs → localStorage is trivially empty → false positive. Mocking `request-otp` lets the app's own UI flow complete naturally while avoiding the real rate-limited network call.

> **Mock body must include `login_challenge`:** The app validates the `request-otp` response and shows "Failed to send OTP" if `login_challenge` is absent — the OTP screen never appears. The mock returns `{ login_challenge: 'bypass-test-challenge', message: 'OTP sent successfully' }`. The fake challenge value is forwarded by the app in its real `verify-otp` call, but the server's dev bypass OTP logic accepts it regardless.

---

## Manual OTP entries per run

| Step | Phone | Action required |
|---|---|---|
| `beforeAll` | `TEST_PHONE` | **None — dev bypass OTP, direct verify-otp** _(or set `TEST_AUTH_TOKEN` env var)_ |
| VAPT-001 — User A | `TEST_PHONE` | Enter OTP + click Resume |
| VAPT-001 — User B | `TEST_PHONE_B` | Enter OTP + click Resume |
| VAPT-002 | `TEST_PHONE` | **None — request-otp mocked, OTP filled programmatically** |
| VAPT-003 | `TEST_PHONE` | **None — wrong OTP tested via direct API call** |
| VAPT-004 | `TEST_PHONE` | **None — request-otp mocked, OTP filled programmatically** |

> **Note:** The dev bypass OTP (`847291`) is enabled server-side for `TEST_PHONE` only. `TEST_PHONE_B` has no bypass and requires manual OTP entry (VAPT-001 only).

---

## Prerequisites

### Second phone number (VAPT-001)

VAPT-001 tests cross-account privilege escalation and requires two separate user accounts. The second phone is read from the `TEST_PHONE_B` environment variable (defaults to `9000000003` if not set):

```bash
TEST_PHONE_B=9876543210 npx playwright test tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT_test.js
```

Both User A and User B go through the full UI login flow with a manual pause for OTP entry. Timeout for VAPT-001 is 5 minutes.

### Auth token for JWT tests (VAPT-007a/b/c)

By default, `beforeAll` calls `POST /api/auth/verify-otp` directly with the dev bypass OTP (`847291`) for `TEST_PHONE` — **no prior `request-otp` call**. The JWT is extracted from the API response automatically — no browser window or manual OTP entry needed.

If you want to supply a token directly instead (e.g. on UAT/prod where the bypass is not available):

```bash
TEST_AUTH_TOKEN=<jwt> npx playwright test tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT_test.js
```

When `TEST_AUTH_TOKEN` is set, `beforeAll` skips the API login entirely.

---

## Running the tests

```bash
# Run all VAPT tests
npx playwright test tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT_test.js

# Run with a custom User B phone number
TEST_PHONE_B=9876543210 npx playwright test tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT_test.js

# Skip beforeAll login by supplying a JWT directly
TEST_AUTH_TOKEN=<jwt> npx playwright test tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT_test.js

# Skip beforeAll login and set User B phone
TEST_PHONE_B=9876543210 TEST_AUTH_TOKEN=<jwt> npx playwright test tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT_test.js

# Run a single test by ID
npx playwright test tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT_test.js --grep "VAPT-001"

# Run a group of tests
npx playwright test tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT_test.js --grep "VAPT-007"

# View HTML report after run
npx playwright show-report
```

> **VAPT-001 requires headed mode** (`--headed`, which is the Playwright default). It uses `page.pause()` for manual OTP entry and needs a visible browser window and the Playwright Inspector. All other tests are fully automated and run fine headless.

---

## Test Coverage

### VAPT-001 — Horizontal Privilege Escalation (Issue 1)

**Fixture:** `browser` (two isolated contexts)

Creates a chat session as User A, then attempts to `DELETE` that session using User B's JWT. The server must return `403 Forbidden`. A `200` response indicates broken object-level authorisation.

- Uses `browser.newContext()` × 2 for fully isolated auth state per user.
- Both users go through the UI login flow: phone number is filled automatically, OTP is sent, test pauses for manual OTP entry.
- Timeout is 5 minutes to accommodate OTP delivery and two manual logins.

---

### VAPT-001b — Session Ownership Binding (Issue 1, API-level)

**Fixture:** `request` — **fully automated, no manual OTP entry**

API-level counterpart to VAPT-001. Per the 2026-07-09 schema update, `POST /api/chat/sessions` binds the body `user_id` to the caller's JWT `sub` and returns `403` when they differ (previously the JWT claim silently overrode the body). The test first authenticates on its own `request` context via `verify-otp` with the dev bypass OTP (no `request-otp` → no rate-limit; the file's hardcoded `TEST_AUTH_TOKEN` is stale, so cookie auth is used instead), then sends a create-session request whose body `user_id` deliberately differs from the caller's identity; asserts `403`. A `200` throws `"VAPT 5.1 NOT FIXED"` — a session created for a non-owner is a horizontal privilege escalation. Self-skips if login fails or on `429`.

---

### VAPT-002 — Client-Side Session Hijacking (Issue 2)

**Fixture:** `page` — **fully automated, no manual OTP entry**

Uses `loginWithBypassOTP()`: intercepts `request-otp` via `page.route` (mocked 200, no real network call), fills the phone in the UI, waits for the OTP input field, fills it with the dev bypass OTP, and submits. The app's own `verify-otp` call runs for real. Then checks that the authentication token is **not** stored in `localStorage`. If a `retail_crm_access` cookie is found, verifies it has:
- `HttpOnly: true`
- `Secure: true`
- `SameSite: Strict` or `Lax`

The full UI login path is exercised so the app's post-login token-handling code runs — a direct API bypass would skip it and produce a false positive.

---

### VAPT-003 — Authentication Bypass via OTP Response Manipulation (Issue 3)

**Fixture:** `request` — **fully automated, no browser or manual OTP entry**

Calls `POST /api/auth/verify-otp` directly with a wrong OTP (`000000`) — no prior `request-otp` call (avoids rate limiting). Asserts the server rejects it with `401` or `422` (not `200`).

Challenge replay (`login_challenge` reuse) is not tested in this mode since no `login_challenge` is issued without a prior `request-otp`. The core security assertion — **wrong OTP must be rejected** — is verified.

> If the response is `429`, the test self-skips with a message to wait for cooldown.

---

### VAPT-004 — Sensitive Data Exposure in Local Storage (Issue 4)

**Fixture:** `page` — **fully automated, no manual OTP entry**

Uses `loginWithBypassOTP()`: same mocked `request-otp` + programmatic OTP entry approach as VAPT-002. The app's full login flow runs so any profile data the app writes to localStorage during or after login is captured. Takes a snapshot of `localStorage` after login and fails if any value matches a 10-digit phone number pattern (`\b\d{10}\b`) or if any key name contains `phone`, `mobile`, `name`, `user_profile`, or `profile`.

---

### VAPT-005 — Insecure CORS Policy (Issue 5)

**Fixture:** `page` — no login required

Uses `page.route()` to inject `Origin: https://evil.com` on all outgoing requests, then navigates to the frontend. Asserts that `Access-Control-Allow-Origin` does not reflect `https://evil.com` and is not `*`. The critical combination is reflected ACAO + `Access-Control-Allow-Credentials: true`, which enables cross-origin credential theft.

---

### VAPT-006 — Clickjacking (Issue 6)

**Fixture:** `page` — no login required

Checks the frontend page response headers (via `headersArray()`, so duplicates are visible) for the exact remediation the report recommends:
- `X-Frame-Options: DENY` (the weaker `SAMEORIGIN` is no longer accepted)
- `Content-Security-Policy` containing `frame-ancestors 'none'`
- Neither header may be sent more than once (duplicated/conflicting values weaken enforcement)

Both headers are required for defence-in-depth; either alone can be bypassed in older browsers.

---

### VAPT-007a — JWT Algorithm (Issue 7)

**Fixture:** none — uses `TEST_AUTH_TOKEN` obtained in `beforeAll`

Decodes the JWT header and asserts `alg` is `RS256` or `ES256`. `HS256` (symmetric HMAC) is not acceptable — the signing key would need to be shared with any service that validates tokens.

**Status: PASS** ✓ _(confirmed 2026-06-05 — backend migrated to RS256)_

---

### VAPT-007b — JWT Expiry Duration (Issue 7)

**Fixture:** none — uses `TEST_AUTH_TOKEN` obtained in `beforeAll`

Computes `exp − iat` from the JWT payload. Token lifetime must be ≤ 1800 seconds (30 minutes). Long-lived tokens increase the attack window if a token is stolen.

**Status: PASS** ✓ _(confirmed 2026-06-05 — TTL reduced to 1800s / 30 min)_

---

### VAPT-007c — JWT Audience Claim (Issue 7)

**Fixture:** none — uses `TEST_AUTH_TOKEN` obtained in `beforeAll`

Asserts that `payload.aud` is present and truthy. Without an `aud` claim, a token issued for the chatbot service could be accepted by any other service that trusts the same signing key.

---

### VAPT-012 — Refresh Endpoint Requires a Valid Refresh Cookie (Issue 7, token lifecycle)

**Fixture:** `request` — **fully automated, no login**

`POST /api/auth/refresh` (added in the 2026-07-09 schema update) mints a new access token from an HttpOnly refresh cookie. This test calls it from a fresh `request` context with **no** refresh cookie and no auth, and asserts the server does **not** issue a token — expected `401`/`403`. A `200` that returns an `access_token` (in the body or via `Set-Cookie: retail_crm_access=eyJ…`) throws `"VAPT 5.7 NOT ENFORCED"`, since anyone could otherwise mint tokens anonymously. Self-skips on `429`.

---

### VAPT-008 — Weak OTP Rate-Limiting (Issue 8)

**Fixture:** `page` — no login required, runs last

Sends two consecutive `POST /api/auth/request-otp` requests immediately back-to-back from inside the browser using `TEST_PHONE_B`. The first request is expected to succeed (`200`); the second must be blocked with `429` or `403` (rate-limited). If the first request is already blocked, the cooldown from a prior run is still active — this also confirms rate-limiting is in place.

**Runs last** — the `request-otp` call exhausts the OTP send cooldown for `TEST_PHONE_B`, keeping `TEST_PHONE` clean for earlier tests that depend on it.

---

### VAPT-009 — Missing / Misconfigured Security Headers (Issue 9)

Report 5.9 stayed **Open ("partially fixed")** even though headers were added, because the values were wrong or duplicated and the API host was weaker than the HTML root. The original test only checked *presence* on the frontend, so it passed while the finding was still open. It is now split into two tests that assert *correctness* and *no duplicates* on **both** targets, using `headersArray()` (no Burp required).

**VAPT-009a** — Frontend HTML root. **Fixture:** `page`, no login.
**VAPT-009b** — Backend API host (`POST {BASE_URL}/api/auth/verify-otp`, headers read regardless of status). **Fixture:** `request`, no login.

| Header | Required value |
|---|---|
| `Content-Security-Policy` | Present, contains `default-src`, contains `frame-ancestors`, and must **not** contain `unsafe-inline` / `unsafe-eval` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Strict-Transport-Security` | Must contain `max-age=31536000`, `includeSubDomains`, **and** `preload` |
| `Referrer-Policy` | Present |
| `Permissions-Policy` | Present |
| `Cache-Control` | On API (dynamic) responses must contain `no-store` |
| _Duplicates_ | CSP, HSTS, and X-Content-Type-Options must each be sent exactly once |

**Status: PASS** ✓ _(both 009a and 009b confirmed 2026-06-05 — all headers correctly configured, no duplicates)_

---

### VAPT-010 — SSL BREACH Vulnerability (Issue 10)

**Fixture:** `page` — no login required

Uses `page.route()` to inject `Accept-Encoding: gzip, deflate, br` on all requests, then navigates to the frontend. Asserts that the response does **not** contain `Content-Encoding: gzip`. Serving compressed HTTPS responses that include secrets enables BREACH side-channel attacks.

---

### VAPT-011 — Banner Grabbing (Issue 11)

**Fixture:** `page` — no login required

Checks the frontend response for information-leaking headers:
- `Server` must not contain `nginx` or `next.js`
- `X-Powered-By` must be absent entirely

Exposed technology information assists attackers in targeting known CVEs.

---

## Expected test outcomes

| Test | Status on dev | Notes |
|---|---|---|
| VAPT-001 | Not run (needs 2nd phone) | Depends on server-side IDOR fix |
| VAPT-001b | **PASS** ✓ _(confirmed 2026-07-09)_ | API-level ownership binding: create-session `user_id` ≠ JWT sub → 403 |
| VAPT-002 | **PASS** ✓ _(confirmed 2026-06-05)_ | HttpOnly + Secure + SameSite=Strict cookie; token not in localStorage |
| VAPT-003 | **PASS** ✓ _(confirmed 2026-06-05)_ | Wrong OTP → 401 |
| VAPT-004 | **PASS** ✓ _(confirmed 2026-06-05)_ | localStorage contains only `theme` — no PII |
| VAPT-005 | **PASS** ✓ _(confirmed 2026-06-05)_ | ACAO not reflected |
| VAPT-006 | **PASS** ✓ _(confirmed 2026-06-04)_ | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| VAPT-007a | **PASS** ✓ _(confirmed 2026-06-05)_ | JWT uses RS256 |
| VAPT-007b | **PASS** ✓ _(confirmed 2026-06-05)_ | JWT lifetime 1800s (30 min) |
| VAPT-007c | **PASS** ✓ _(confirmed 2026-06-05)_ | `aud: retail-crm-api` present |
| VAPT-012 | **PASS** ✓ _(confirmed 2026-07-09)_ | `/api/auth/refresh` with no refresh cookie must not mint a token (got 401) |
| VAPT-008 | **PASS** ✓ _(confirmed 2026-06-05)_ | 2nd request-otp blocked with 403 (60s cooldown) |
| VAPT-009a | **PASS** ✓ _(confirmed 2026-06-05)_ | All 7 headers correct, no duplicates, full HSTS |
| VAPT-009b | **PASS** ✓ _(confirmed 2026-06-05)_ | All 7 headers correct, no duplicates, Cache-Control: no-store |
| VAPT-010 | **PASS** ✓ _(confirmed 2026-05-29)_ | gzip compression disabled on frontend |
| VAPT-011 | **FAIL** _(open)_ | `Server: nginx` still present — `server_tokens off` not applied |
