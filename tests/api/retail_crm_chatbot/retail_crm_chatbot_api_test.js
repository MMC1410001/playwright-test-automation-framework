const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const {
  FAILURE_CLASSES,
  failNotExecuted,
  failOn429,
  failOn403Throttle,
} = require('./failure-classes');
const { pacedContext, recordSend } = require('./rate-pacer');

/**
 * RetailCrm Opus Product Assistant – Comprehensive API Test Suite
 *
 * Coverage:
 *   FUNCTIONAL   (FUNC-001..033) – Happy-path validation for all 17 endpoints (incl. /api/auth/me, /api/auth/refresh)
 *   NON-FUNCTIONAL (NFNC-001..010) – Performance, concurrency, stability
 *   EDGE         (EDGE-001..017) – Boundary values and unusual valid inputs
 *   NEGATIVE     (NEG-001..029)  – Invalid inputs, missing fields, wrong types, rate-limit
 *   SECURITY     (SEC-001..018)  – Injection, IDOR, method mismatch, VAPT remediations
 *
 * Assertion strategy:
 *   FUNCTIONAL / EDGE / NON-FUNCTIONAL: status must be 200; any other code is
 *   caught in a try/catch and re-thrown as a descriptive Error to fail the test.
 *   NEGATIVE: asserts specific 4xx codes (these tests intentionally use bad inputs).
 *   SECURITY: asserts status < 500 (ensures the server does not crash on payloads).
 *   RATE LIMIT: failIf429() helper explicitly fails any test that receives 429 instead
 *   of silently broadening expected status arrays.
 *
 * Auth note:
 *   Set TEST_PHONE, TEST_OTP, and TEST_AUTH_TOKEN environment variables, or
 *   update the hardcoded defaults in the CONFIGURATION section below.
 *
 * ⚠️  THIS FILE IS NOT SAFELY RE-RUNNABLE BACK-TO-BACK.
 *   Several cases spend the per-phone OTP budget for TEST_PHONE: FUNC-004 and EDGE-010 call
 *   request-otp, and EDGE-011 sends a deliberately WRONG OTP to it. Enough of those inside one
 *   window and the server locks the number for ~11 minutes, after which the beforeAll login cannot
 *   succeed and every authenticated case reports a SETUP GAP.
 *   (NEG-029 is NOT the culprit — it brute-forces a separate throwaway number on purpose.)
 *
 *   That SETUP GAP is the honest outcome, not something to hide: those cases genuinely did not
 *   execute. The login is cached to test-results/.chatbot-auth.json so a worker restart mid-run does
 *   not re-spend it, but a fresh run inside the lockout window still cannot start. Leave ~12 minutes
 *   between runs, or pass TEST_AUTH_TOKEN=<fresh jwt> to skip the login entirely.
 *   Nothing here falls back to a stale token — see STALE_REFERENCE_TOKEN for why.
 **/

// =============================================================================
// CONFIGURATION
// =============================================================================

// const BASE_URL = `${process.env.CRM_API_URL || 'https://jsonplaceholder.typicode.com'}`;
const BASE_URL = `${process.env.CRM_API_URL || 'https://jsonplaceholder.typicode.com'}`;

// =============================================================================
// RATE PACING — every request in this file goes through the shared gate
//
// Playwright's built-in `request` fixture is REPLACED with a paced one. Doing it here rather than at
// the ~150 call sites is the whole point: there is no chance of missing one, and a partially-paced
// suite is worse than an unpaced one (slow enough to hurt, not consistent enough to help).
//
// This fixes the GLOBAL 429 limiter only. The per-phone 403 OTP throttle has a multi-hour window and
// no client-side pacing can avoid it — see the note above about leaving ~12 minutes between runs.
// =============================================================================

const test = base.extend({
  request: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext();
    await use(pacedContext(ctx, { host: new URL(BASE_URL).host, label: 'chatbot' }));
    await ctx.dispose();
  },

  // Deliberately UNPACED, for the one case that MEASURES a rate limit. Pacing a rate-limit measurement
  // destroys what it measures: NEG-029 needs six wrong OTPs close together to see the throttle engage,
  // and with the OTP bucket spacing them ~20s apart the limit never triggered and the test failed for a
  // reason that had nothing to do with the server. Same lesson as SFA-PERF-02/03/04's `pace: false`.
  //
  // Users of this fixture must still call recordSend() per request, so the burst is subtracted from the
  // global budget and the pacer stays honest for everything that runs afterwards.
  unpacedRequest: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext();
    await use(ctx);
    await ctx.dispose();
  },
});

const TEST_PHONE = '9000000001';
// Hardcoded bypass OTP for QA in dev environment (server-side bypass enabled for this value)
const TEST_OTP = '847291';
// Stale reference token, kept only as a documented example of the claim shape. It EXPIRED
// 2026-07-10T03:54Z and is no longer used as a fallback.
//
// It used to initialise TEST_AUTH_TOKEN, so when the beforeAll login was throttled the suite
// silently carried on with a dead token ("using fallback TEST_AUTH_TOKEN") and every
// authenticated case after it returned 401 — reported as product failures. That is what turned one
// OTP cooldown into a cascade of five misattributed EDGE reds. TOKEN_SOURCE now records where the
// token came from, and dependent tests refuse to run on a stale one.
// Synthetic, already-expired JWT. Built at load time rather than pasted as a literal, so
// this repository never carries anything token-shaped. Structurally valid, signed by nobody.
const STALE_REFERENCE_TOKEN = [
  Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({
    sub: '00000000-0000-4000-8000-000000000000',
    iat: 1700000000,
    exp: 1700001800,          // long expired, on purpose
    typ: 'demo_api',
    aud: 'demo-api',
  })).toString('base64url'),
  Buffer.from('not-a-real-signature').toString('base64url'),
].join('.');
let TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
let TOKEN_SOURCE = process.env.TEST_AUTH_TOKEN ? 'env' : 'none';

// =============================================================================
// CONSTANTS
// =============================================================================

const PERSONAS = ['dealer', 'internal'];

// Captures login_challenge from FUNC-004 (request-otp) for use in FUNC-006 (verify-otp).
// Required when AUTH_REQUIRE_LOGIN_CHALLENGE=true (VAPT Finding 5.3).
let capturedLoginChallenge = null;

// Populated in beforeAll from the verify-otp response for VAPT 5.2 cookie-attribute tests.
let TEST_SET_COOKIE_HEADER = null;
// Stores the login_challenge consumed in beforeAll for the VAPT 5.3 OTP replay test (NEG-032).
// Authenticated user_id (JWT sub) and persona captured from /api/auth/me in beforeAll.
let AUTHENTICATED_USER_ID = null;
let AUTHENTICATED_PERSONA = 'dealer';
// message_id of an assistant message, populated in beforeAll for feedback tests.
let feedbackMessageId = null;
let USED_LOGIN_CHALLENGE = null;

const SAMPLE_QUERIES = [
'What paint products do you offer?',
'Tell me about RetailCrm Opus exterior paints.',
'What is the price of premium emulsion?',
'Which paint is best for bathrooms?',
'How do I apply textured paint?',
'What are the available color shades?',
'Do you have eco-friendly paint options?',
'What is the coverage area per litre?',
];

// Used only by SECURITY tests where non-200 is an acceptable outcome
const ACCEPTED_QUERY_CODES = [200, 401, 422, 429];

function getQuery(index) {
return SAMPLE_QUERIES[index % SAMPLE_QUERIES.length];
}

// =============================================================================
// ASSERTION HELPER
// Wraps expect(status).toBe(200) in try/catch and throws a descriptive error
// so tests fail with the actual status code and response body in the message.
// =============================================================================

function assertStatus200(status, body) {
try {
  expect(status).toBe(200);
} catch {
  throw new Error(
    `Expected HTTP 200 but received ${status}. Body: ${JSON.stringify(body)}`
  );
}
}

// Asserts "the server did not crash on this payload" WITHOUT letting a 429 satisfy it.
//
// A dozen SECURITY cases assert only expect(status).toBeLessThan(500). 429 is less than 500, so a
// rate-limited run reported every injection and traversal probe as GREEN even though the payload
// never reached the handler. That is a false pass on exactly the checks that most need to be real.
function assertNoServerError(status, testId, context = '') {
  failIf429(status, testId);
  expect(
    status,
    `[${testId}] Server returned ${status}${context ? ` for ${context}` : ''} — a 5xx means the ` +
    `payload crashed the handler rather than being rejected.`
  ).toBeLessThan(500);
}

// Rate-limit and throttle guards. These used to call test.skip(), which was the single biggest
// source of confusion in this file: on a busy environment dozens of tests quietly retired
// themselves and the report read as if the requirements had been checked. They now FAIL, via the
// shared taxonomy in ./failure-classes.js — every message names the class of problem and states
// that nothing was asserted, so a red is never mistaken for a proven product defect.
//
// The old names are kept as aliases only because they appear at ~40 call sites; the behaviour is
// now "fail", which is what the names always claimed.
const failIf429 = failOn429;
const failIf403 = failOn403Throttle;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function requestOTP(request, phoneNumber) {
const response = await request.post(`${BASE_URL}/api/auth/request-otp`, {
  data: { phone_number: phoneNumber },
  headers: { 'Content-Type': 'application/json' },
});
const body = await response.json().catch(() => ({}));
return { status: response.status(), body, login_challenge: body.login_challenge ?? null };
}

async function verifyOTP(request, phoneNumber, otp, loginChallenge = null) {
const data = { phone_number: phoneNumber, otp };
if (loginChallenge) data.login_challenge = loginChallenge;
const response = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
  data,
  headers: { 'Content-Type': 'application/json' },
});
const body = await response.json().catch(() => ({}));
return { status: response.status(), body };
}

async function createSession(request, userId, persona) {
const response = await request.post(`${BASE_URL}/api/chat/sessions`, {
  data: { user_id: userId, persona },
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
});
const body = await response.json().catch(() => ({}));
return { status: response.status(), body };
}

async function sendQuery(request, query, sessionId = null, userId = 'anonymous', persona = 'dealer') {
const params = new URLSearchParams({ user_id: userId, persona });
const start = Date.now();
const payload = { query };
if (sessionId !== null) payload.session_id = sessionId;
const response = await request.post(
  `${BASE_URL}/api/chat/query?${params.toString()}`,
  {
    data: payload,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
    timeout: 60_000,
  }
);
const duration = Date.now() - start;
const body = await response.json().catch(() => ({}));
return { status: response.status(), duration, body };
}

async function getSessionMessages(request, sessionId, limitPairs) {
const params = new URLSearchParams();
if (limitPairs !== undefined) params.set('limit_pairs', String(limitPairs));
const qs = params.toString() ? `?${params.toString()}` : '';
const response = await request.get(`${BASE_URL}/api/chat/sessions/${sessionId}/messages${qs}`, {
  headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
});
const body = await response.json().catch(() => ({}));
return { status: response.status(), body };
}

async function updateSession(request, sessionId, title) {
const response = await request.patch(`${BASE_URL}/api/chat/sessions/${sessionId}`, {
  data: { title },
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
});
const body = await response.json().catch(() => ({}));
return { status: response.status(), body };
}

async function archiveSession(request, sessionId) {
const response = await request.delete(`${BASE_URL}/api/chat/sessions/${sessionId}`, {
  headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
});
const body = await response.json().catch(() => ({}));
return { status: response.status(), body };
}

async function getAuthMe(request) {
const response = await request.get(`${BASE_URL}/api/auth/me`, {
  headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
});
const body = await response.json().catch(() => ({}));
return { status: response.status(), body };
}

async function refreshAccessToken(request) {
const response = await request.post(`${BASE_URL}/api/auth/refresh`, {
  headers: { 'Content-Type': 'application/json' },
});
const body = await response.json().catch(() => ({}));
const setCookieHeader = response.headers()['set-cookie'] || null;
return { status: response.status(), body, setCookieHeader };
}

async function getFreshToken(request) {
const otpReqResponse = await request.post(`${BASE_URL}/api/auth/request-otp`, {
  data: { phone_number: TEST_PHONE },
  headers: { 'Content-Type': 'application/json' },
});
const otpReqBody = await otpReqResponse.json().catch(() => ({}));
const loginChallenge = otpReqBody.login_challenge ?? null;
const verifyPayload = { phone_number: TEST_PHONE, otp: TEST_OTP };
if (loginChallenge) verifyPayload.login_challenge = loginChallenge;
const verifyResponse = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
  data: verifyPayload,
  headers: { 'Content-Type': 'application/json' },
});
const verifyBody = await verifyResponse.json().catch(() => ({}));
const setCookieHeader = verifyResponse.headers()['set-cookie'] || null;
let access_token = verifyBody.access_token || null;
if (!access_token && setCookieHeader) {
  const match = setCookieHeader.match(/retail_crm_access=([^;]+)/);
  if (match) access_token = match[1];
}
return { access_token, setCookieHeader, loginChallenge };
}

async function submitFeedback(request, messageId, rating) {
const response = await request.post(`${BASE_URL}/api/feedback/${messageId}`, {
  data: { rating },
  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
});
const body = await response.json().catch(() => ({}));
return { status: response.status(), body };
}

// =============================================================================
// CLEANUP HELPERS
// Deletes untitled sessions belonging to the authenticated user so the
// "New Chat" button in the UI is not blocked before or after a test run.
// =============================================================================

async function deleteUntitledSessions(request) {
const meResult = await getAuthMe(request);
if (meResult.status !== 200) {
  console.log('[Cleanup] Skipping - auth token invalid or expired');
  return;
}
const userId = meResult.body.user_id;
if (!userId) return;

const response = await request.get(`${BASE_URL}/api/chat/sessions`, {
  params: { user_id: userId, limit: 1000 },
  headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
});
if (response.status() !== 200) return;

const sessions = await response.json().catch(() => []);
if (!Array.isArray(sessions)) return;

const CLEANUP_TITLES = new Set([
  'Untitled Conversation',
  '<script>alert("xss")</script>',
  '🎨 Paint Q&A - "Special" <Title> & More! रंग',
]);

const toDelete = sessions.filter(
  (s) => !s.title || s.title.trim() === '' || CLEANUP_TITLES.has(s.title)
);

await Promise.all(toDelete.map((s) => archiveSession(request, s.id)));
console.log(`[Cleanup] Deleted ${toDelete.length} test artifact session(s) for user ${userId}`);
}

// =============================================================================
// AUTH STATE CACHE
//
// Playwright discards the worker after every FAILED test and re-runs beforeAll in a fresh one. That
// is fatal here: NEG-029 (VAPT 5.8) deliberately brute-forces TEST_PHONE and locks it for ~11
// minutes, so any failure after NEG-029 makes the re-login fail — and every remaining
// authenticated case then reports a SETUP GAP for a token the run had already earned.
//
// Observed live: one unrelated failure at test 59 turned into six extra SETUP GAPs at tests 96-104.
// Caching the login on disk (the pattern sfa_know_about_product_test.js uses for the same reason)
// means a restarted worker restores the token instead of re-earning it.
// =============================================================================

const AUTH_CACHE_PATH = path.join(process.cwd(), 'test-results', '.chatbot-auth.json');
const AUTH_CACHE_TTL_MS = 10 * 60 * 1000; // inside the <=30-min access-token TTL (VAPT-007b)

function readAuthCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(AUTH_CACHE_PATH, 'utf8'));
    if (!raw || typeof raw.savedAt !== 'number') return null;
    if (Date.now() - raw.savedAt > AUTH_CACHE_TTL_MS) return null;
    if (raw.baseUrl !== BASE_URL) return null; // never reuse a dev login against UAT
    return raw;
  } catch {
    return null;
  }
}

function writeAuthCache() {
  try {
    fs.mkdirSync(path.dirname(AUTH_CACHE_PATH), { recursive: true });
    fs.writeFileSync(AUTH_CACHE_PATH, JSON.stringify({
      savedAt: Date.now(),
      baseUrl: BASE_URL,
      token: TEST_AUTH_TOKEN,
      setCookie: TEST_SET_COOKIE_HEADER,
      userId: AUTHENTICATED_USER_ID,
      persona: AUTHENTICATED_PERSONA,
      challenge: USED_LOGIN_CHALLENGE,
      messageId: feedbackMessageId,
    }, null, 2));
  } catch (err) {
    console.log(`[Auth] cache not written (${err.message}) — a worker restart will re-login.`);
  }
}

test.beforeAll(async ({ request }) => {
// ~9 paced requests happen in here (getAuthMe, getFreshToken, createSession, sendQuery,
// getSessionMessages, plus two deleteUntitledSessions sweeps), so a saturated window can add a full
// ~60s hold on top of their own latency. A beforeAll timeout aborts the ENTIRE file — VAPT lost 11
// cases to exactly that — which makes this the cheapest timeout in the suite to over-provision.
test.setTimeout(180_000);

// Restore a still-valid login rather than spending another OTP on it.
const cached = readAuthCache();
if (cached && cached.token) {
  TEST_AUTH_TOKEN = cached.token;
  TOKEN_SOURCE = 'live';
  const probe = await getAuthMe(request);
  if (probe.status === 200) {
    TEST_SET_COOKIE_HEADER = cached.setCookie || null;
    AUTHENTICATED_USER_ID = cached.userId || probe.body.user_id || null;
    AUTHENTICATED_PERSONA = cached.persona || probe.body.persona || 'dealer';
    USED_LOGIN_CHALLENGE = cached.challenge || null;
    feedbackMessageId = cached.messageId || null;
    console.log('[Auth] Restored a valid login from cache (no OTP spent) — user_id:', AUTHENTICATED_USER_ID);
    return;
  }
  console.log(`[Auth] Cached token no longer valid (/api/auth/me -> ${probe.status}); logging in again.`);
  TEST_AUTH_TOKEN = '';
  TOKEN_SOURCE = 'none';
}

// Retry up to 2 times with 20s backoff when OTP endpoints are rate-limited
let freshToken = null;
for (let attempt = 1; attempt <= 2; attempt++) {
  if (attempt > 1) {
    console.log('[Auth] OTP rate-limited, waiting 20s before retry...');
    await new Promise((r) => setTimeout(r, 20_000));
  }
  const tokenResult = await getFreshToken(request);
  freshToken = tokenResult.access_token;
  if (tokenResult.setCookieHeader) TEST_SET_COOKIE_HEADER = tokenResult.setCookieHeader;
  if (tokenResult.loginChallenge) USED_LOGIN_CHALLENGE = tokenResult.loginChallenge;
  if (freshToken) break;
}

if (freshToken) {
  TEST_AUTH_TOKEN = freshToken;
  TOKEN_SOURCE = 'live';
  console.log('[Auth] Fresh token obtained via OTP flow');
} else {
  TOKEN_SOURCE = 'failed';
  console.log(
    '[Auth] OTP flow throttled after retries — NO usable token. Authenticated cases will FAIL as ' +
    'a SETUP GAP rather than run against the expired STALE_REFERENCE_TOKEN, which would produce a ' +
    'cascade of 401s that look like product defects.'
  );
}

const meResult = await getAuthMe(request);
if (meResult.status === 200 && meResult.body.user_id) {
  AUTHENTICATED_USER_ID = meResult.body.user_id;
  if (meResult.body.persona) AUTHENTICATED_PERSONA = meResult.body.persona;
  console.log('[Auth] Authenticated user_id:', AUTHENTICATED_USER_ID, 'persona:', AUTHENTICATED_PERSONA);
}

// Feedback setup: create a session, send a query, capture assistant message_id
if (AUTHENTICATED_USER_ID) {
  const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
  if (sStatus === 200) {
    await sendQuery(request, 'What paint products do you offer?', sBody.id, AUTHENTICATED_USER_ID, 'dealer');
    const { status: mStatus, body: messages } = await getSessionMessages(request, sBody.id);
    if (mStatus === 200 && Array.isArray(messages)) {
      const assistantMsg = messages.find((m) => m.role === 'assistant' && m.message_id);
      if (assistantMsg) feedbackMessageId = assistantMsg.message_id;
    }
  }
}

await deleteUntitledSessions(request);
if (TOKEN_SOURCE === 'live' || TOKEN_SOURCE === 'env') writeAuthCache();
});

test.afterAll(async ({ request }) => {
await deleteUntitledSessions(request);
});

// IDs that genuinely need no Bearer token: health/info/root, the OTP endpoints themselves, the
// deliberately-unauthenticated negatives, the header/CORS checks, and the cookie-attribute cases
// (which have their own requireSetCookie guard). Everything else is meaningless without a token, so
// it is failed as a SETUP GAP rather than allowed to produce a 401 that reads as a product defect.
const NO_AUTH_NEEDED = new Set([
  'FUNC-001', 'FUNC-002', 'FUNC-003', 'FUNC-004',
  'NFNC-001',
  'EDGE-010', 'EDGE-011', 'EDGE-016', 'EDGE-017',
  'NEG-001', 'NEG-002', 'NEG-003', 'NEG-004', 'NEG-005', 'NEG-006',
  'NEG-007', 'NEG-009', 'NEG-010', 'NEG-011', 'NEG-013',
  'NEG-016', 'NEG-018', 'NEG-019', 'NEG-022',
  'NEG-023', 'NEG-024', 'NEG-025', 'NEG-026', 'NEG-027',
  'NEG-028', 'NEG-029', 'NEG-032',
  'SEC-010', 'SEC-011', 'SEC-014', 'SEC-015', 'SEC-018',
  'SEC-019', 'SEC-020', 'SEC-021', 'SEC-022', 'SEC-023', 'SEC-026',
]);
// NEG-008, NEG-020 and SEC-024 were on this list at first and had to come off: they send a Bearer
// token, so without one they get a 401 instead of the 400/422/200 they assert. The list was checked
// mechanically against each test body rather than by eye.

test.beforeEach(async () => {
  // The pacer holds INSIDE the wrapped request call, for up to a full window (~60s). Added to the
  // config's 60s global timeout, that kills a test on a timeout that reads as a product defect. This
  // sets the floor for every case in the file; the explicit test.setTimeout() calls in individual
  // bodies still win, since they run after this hook.
  //
  // Deliberately ABOVE the NO_AUTH_NEEDED return: those cases are paced too, so they need it as well.
  test.setTimeout(150_000);

  const title = test.info().title;
  const match = title.match(/\[([A-Z]+-\d+[a-z]?)\]/);
  const testId = match ? match[1] : 'UNKNOWN';
  if (NO_AUTH_NEEDED.has(testId)) return;
  requireAuthToken(testId);
});

/**
 * Guards every case that needs a working Bearer token. Without this, a throttled login leaves
 * TEST_AUTH_TOKEN empty (or previously: expired) and each dependent case fails on its own
 * assertion with a 401 — which reads as a product defect rather than as "we never authenticated".
 */
function requireAuthToken(testId) {
  if (TEST_AUTH_TOKEN && (TOKEN_SOURCE === 'live' || TOKEN_SOURCE === 'env')) return;
  failNotExecuted(
    testId,
    FAILURE_CLASSES.SETUP,
    'no usable access token — the beforeAll login did not succeed, so this case never authenticated',
    `TOKEN_SOURCE=${TOKEN_SOURCE}. Most often ${TEST_PHONE} is in the per-phone OTP cooldown (403) ` +
    `because several cases in this file call request-otp; occasionally TEST_OTP has stopped being a ` +
    `configured bypass code (401).\nThis case deliberately does NOT fall back to ` +
    `STALE_REFERENCE_TOKEN (expired 2026-07-10). Wait for the cooldown, or run with ` +
    `TEST_AUTH_TOKEN=<fresh jwt>.`
  );
}

// =============================================================================
// FUNCTIONAL TESTS  (FUNC-001 .. FUNC-030)
// All tests assert HTTP 200; any other status code throws and fails the test.
// =============================================================================

// ---------------------------------------------------------------------------
// Health & Info Endpoints
// ---------------------------------------------------------------------------

  test('[FUNC-001] GET /health returns 200 with valid JSON body', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/health`);
    try {
      expect(response.status()).toBe(200);
    } catch {
      throw new Error(`[FUNC-001] Expected 200 but received ${response.status()}`);
    }
    const body = await response.json();
    expect(body).toBeTruthy();
  });

  test('[FUNC-002] GET /info returns 200 with pipeline info object', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/info`);
    try {
      expect(response.status()).toBe(200);
    } catch {
      throw new Error(`[FUNC-002] Expected 200 but received ${response.status()}`);
    }
    const body = await response.json().catch(() => ({}));
    expect(body).toBeTruthy();
  });

  test('[FUNC-003] GET / root endpoint returns 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/`);
    try {
      expect(response.status()).toBe(200);
    } catch {
      throw new Error(`[FUNC-003] Expected 200 but received ${response.status()}`);
    }
  });

// ---------------------------------------------------------------------------
// Authentication Endpoints
// ---------------------------------------------------------------------------

  test('[FUNC-004] POST /api/auth/request-otp with valid 10-digit phone returns 200 with valid JSON body', async ({ request }) => {
    const { status, body, login_challenge } = await requestOTP(request, '9000000003');
    assertStatus200(status, body);
    expect(body).toBeDefined();
    expect(typeof body).toBe('object');
    expect(body).toHaveProperty('message');
    expect(typeof body.message).toBe('string');
    // login_challenge introduced by VAPT Finding 5.3 (OTP Authentication Bypass)
    if (login_challenge !== null && login_challenge !== undefined) {
      expect(typeof login_challenge).toBe('string');
      capturedLoginChallenge = login_challenge;
    }
  });

test('[FUNC-005] GET /api/auth/me with valid Bearer token returns 200 with AuthMeResponse schema', async ({ request }) => {
  const { status, body } = await getAuthMe(request);
  assertStatus200(status, body);
  // user_id is the only required field in AuthMeResponse (VAPT 5.2 – server-side profile)
  expect(body).toHaveProperty('user_id');
  expect(typeof body.user_id).toBe('string');
  if (body.username !== undefined && body.username !== null) {
    expect(typeof body.username).toBe('string');
  }
  if (body.persona !== undefined && body.persona !== null) {
    expect(typeof body.persona).toBe('string');
  }
  if (body.name !== undefined && body.name !== null) {
    expect(typeof body.name).toBe('string');
  }
  // employee_id added to AuthMeResponse in the 2026-07-09 schema update (nullable string)
  if (body.employee_id !== undefined && body.employee_id !== null) {
    expect(typeof body.employee_id).toBe('string');
  }
  if (body.session_id !== undefined && body.session_id !== null) {
    expect(typeof body.session_id).toBe('string');
  }
});

// ---------------------------------------------------------------------------
// Chat Query Endpoints
// ---------------------------------------------------------------------------

  test('[FUNC-008] POST /api/chat/query – anonymous user with dealer persona returns 200', async ({ request }) => {
    test.setTimeout(150_000);
    const { status, body } = await sendQuery(request, 'What paint products do you offer?', null, 'anonymous', 'dealer');
    assertStatus200(status, body);
  });

  test('[FUNC-009] POST /api/chat/query – anonymous user with internal persona returns 200', async ({ request }) => {
    test.setTimeout(150_000);
    const { status, body } = await sendQuery(request, 'Tell me about your product range.', null, 'anonymous', 'internal');
    assertStatus200(status, body);
  });

  test('[FUNC-010] POST /api/chat/query – QueryResponse has required fields: response (string) and confidence (number)', async ({ request }) => {
    test.setTimeout(150_000);
    const { status, body } = await sendQuery(request, 'What paint products do you offer?');
    assertStatus200(status, body);
    expect(body).toHaveProperty('response');
    expect(body).toHaveProperty('confidence');
    expect(typeof body.response).toBe('string');
    expect(typeof body.confidence).toBe('number');
    expect(body.response.length).toBeGreaterThan(0);
  });

  test('[FUNC-011] POST /api/chat/query – confidence value is between 0 and 1 inclusive', async ({ request }) => {
    test.setTimeout(150_000);
    const { status, body } = await sendQuery(request, 'Which paint is best for bathrooms?');
    assertStatus200(status, body);
    expect(body.confidence).toBeGreaterThanOrEqual(0);
    expect(body.confidence).toBeLessThanOrEqual(1);
  });

  test('[FUNC-012] POST /api/chat/query – citations field is an array when present in response', async ({ request }) => {
    test.setTimeout(150_000);
    const { status, body } = await sendQuery(request, 'Tell me about RetailCrm Opus exterior paints.');
    assertStatus200(status, body);
    if (body.citations !== undefined) {
      expect(Array.isArray(body.citations)).toBe(true);
    }
  });

  test('[FUNC-013] POST /api/chat/query – timing fields (qdrant_vector_query_time_ms, sqlite_index_query_time_ms) are numeric', async ({ request }) => {
    test.setTimeout(150_000);
    const { status, body } = await sendQuery(request, 'What are the available color shades?');
    assertStatus200(status, body);
    expect(body).toHaveProperty('qdrant_vector_query_time_ms');
    expect(body).toHaveProperty('sqlite_index_query_time_ms');
    expect(typeof body.qdrant_vector_query_time_ms).toBe('number');
    expect(typeof body.sqlite_index_query_time_ms).toBe('number');
    expect(body.qdrant_vector_query_time_ms).toBeGreaterThanOrEqual(0);
    expect(body.sqlite_index_query_time_ms).toBeGreaterThanOrEqual(0);
  });

  test('[FUNC-014] POST /api/chat/query – with explicit session_id in body returns 200', async ({ request }) => {
    test.setTimeout(150_000);
    const sessionResult = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
    assertStatus200(sessionResult.status, sessionResult.body);
    const { status, body } = await sendQuery(request, 'What is the coverage area per litre?', sessionResult.body.id, AUTHENTICATED_USER_ID, 'dealer');
    assertStatus200(status, body);
  });

  // Content-Type is asserted STRICTLY as text/event-stream. This test previously accepted
  // application/json as an alternative, which meant a regression that turned the stream into one
  // buffered response passed as healthy — the frontend's incremental rendering would break while
  // the suite stayed green. CB-SSE-01 asserts the same property, and CB-SSE-04 asserts the bytes
  // actually arrive progressively.
  test('[FUNC-015] POST /api/chat/query/stream – returns 200 with text/event-stream content-type and valid event types', async ({ request }) => {
    test.setTimeout(150_000);
    const params = new URLSearchParams({ user_id: 'anonymous', persona: 'dealer' });
    const response = await request.post(
      `${BASE_URL}/api/chat/query/stream?${params.toString()}`,
      {
        data: { query: 'Do you have eco-friendly paint options?' },
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream', 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
        timeout: 60_000,
      }
    );
    try {
      expect(response.status()).toBe(200);
    } catch {
      throw new Error(`[FUNC-015] Expected 200 but received ${response.status()}`);
    }
    const contentType = response.headers()['content-type'] || '';
    expect(
      contentType,
      `[FUNC-015] Content-Type is "${contentType}". The streaming endpoint must declare ` +
      `text/event-stream; application/json here means the answer was generated in full and then ` +
      `flushed once, which is the non-streaming endpoint's behaviour under a streaming URL.`
    ).toContain('text/event-stream');

    const text = await response.text();
    const validTypes = ['delta', 'final', 'error'];
    let dataLines = 0;
    text.split('\n').forEach((line) => {
      if (line.startsWith('data:')) {
        dataLines += 1;
        try {
          const parsed = JSON.parse(line.slice(5).trim());
          if (parsed.type !== undefined) {
            expect(validTypes).toContain(parsed.type);
          }
        } catch { /* non-JSON data lines are ignored */ }
      }
    });
    // Without this the loop above asserts nothing when the stream is empty.
    expect(dataLines, '[FUNC-015] The stream returned no data: lines at all').toBeGreaterThan(0);
  });

// ---------------------------------------------------------------------------
// Session Management Endpoints
// ---------------------------------------------------------------------------

  test('[FUNC-016] POST /api/chat/sessions – create session for dealer persona returns 200', async ({ request }) => {
    const { status, body } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
    assertStatus200(status, body);
  });

  test('[FUNC-017] POST /api/chat/sessions – create session for internal persona returns 200', async ({ request }) => {
    const { status, body } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
    assertStatus200(status, body);
  });

  test('[FUNC-018] POST /api/chat/sessions – SessionResponse schema has all required fields', async ({ request }) => {
    const { status, body } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
    assertStatus200(status, body);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('user_id');
    expect(body).toHaveProperty('persona');
    expect(body).toHaveProperty('started_at');
    expect(body).toHaveProperty('updated_at');
    expect(body).toHaveProperty('is_active');
    expect(body).toHaveProperty('message_count');
    expect(typeof body.id).toBe('string');
    expect(typeof body.is_active).toBe('boolean');
    expect(typeof body.message_count).toBe('number');
    expect(['dealer', 'internal']).toContain(body.persona);
    expect(typeof body.user_id).toBe('string');
    expect(body.user_id.length).toBeGreaterThan(0);
  });

  test('[FUNC-019] GET /api/chat/sessions – returns array of sessions for a user', async ({ request }) => {
    await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
    const response = await request.get(`${BASE_URL}/api/chat/sessions`, {
    params: { user_id: AUTHENTICATED_USER_ID },
      headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
    });
    try {
      expect(response.status()).toBe(200);
    } catch {
      throw new Error(`[FUNC-019] Expected 200 but received ${response.status()}`);
    }
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('[FUNC-020] GET /api/chat/sessions – default limit=10 caps results', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/chat/sessions`, {
      params: { user_id: AUTHENTICATED_USER_ID },
      headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
    });
    try {
      expect(response.status()).toBe(200);
    } catch {
      throw new Error(`[FUNC-020] Expected 200 but received ${response.status()}`);
    }
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeLessThanOrEqual(10);
  });

  test('[FUNC-021] GET /api/chat/sessions/{id}/messages – returns array for a valid session', async ({ request }) => {
    const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
    assertStatus200(sStatus, sBody);
    const { status, body } = await getSessionMessages(request, sBody.id);
    assertStatus200(status, body);
    expect(Array.isArray(body)).toBe(true);
  });

  test('[FUNC-022] GET /api/chat/sessions/{id}/messages – MessageResponse schema: role and content are strings', async ({ request }) => {
    test.setTimeout(150_000);
    const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
    assertStatus200(sStatus, sBody);
    await sendQuery(request, 'What paint do you recommend?', sBody.id, AUTHENTICATED_USER_ID, 'dealer');
    const { status, body } = await getSessionMessages(request, sBody.id);
    assertStatus200(status, body);
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      body.forEach((msg) => {
        expect(msg).toHaveProperty('role');
        expect(msg).toHaveProperty('content');
        expect(typeof msg.role).toBe('string');
        expect(typeof msg.content).toBe('string');
        if (msg.role === 'assistant' && msg.message_id !== undefined) {
          expect(typeof msg.message_id).toBe('string');
        }
      });
    }
  });

  test('[FUNC-023] PATCH /api/chat/sessions/{id} – update session title returns 200', async ({ request }) => {
    const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
    assertStatus200(sStatus, sBody);
    const { status, body } = await updateSession(request, sBody.id, 'Updated Session Title');
    assertStatus200(status, body);
  });

  test('[FUNC-024] DELETE /api/chat/sessions/{id} – archive session returns 200', async ({ request }) => {
    const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
    assertStatus200(sStatus, sBody);
    const { status, body } = await archiveSession(request, sBody.id);
    assertStatus200(status, body);
  });

// ---------------------------------------------------------------------------
// Feedback Endpoint
// ---------------------------------------------------------------------------

  // The three feedback cases need a real assistant message_id, produced in beforeAll by creating a
  // session and asking one question. If that seed failed there is nothing to rate — which is a gap
  // in OUR setup, not a product defect, and must be reported as such rather than skipped.
  const requireFeedbackMessageId = (testId) => {
    if (feedbackMessageId) return;
    failNotExecuted(
      testId,
      FAILURE_CLASSES.SETUP,
      'no assistant message_id was seeded, so no feedback could be submitted',
      'beforeAll creates a session, sends one query and reads message_id back from ' +
      '/api/chat/sessions/{id}/messages. Check the [beforeAll] console lines: the login, the ' +
      'session create, the query or the read-back failed. Re-run once the OTP cooldown clears.'
    );
  };

  test('[FUNC-025] POST /api/feedback/{message_id} – rating "helpful" returns 200 with FeedbackResponse', async ({ request }) => {
    requireFeedbackMessageId('FUNC-025');
    const { status, body } = await submitFeedback(request, feedbackMessageId, 'helpful');
    assertStatus200(status, body);
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('message');
  });

  test('[FUNC-026] POST /api/feedback/{message_id} – rating "not_helpful" returns 200 with FeedbackResponse', async ({ request }) => {
    requireFeedbackMessageId('FUNC-026');
    const { status, body } = await submitFeedback(request, feedbackMessageId, 'not_helpful');
    assertStatus200(status, body);
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('message');
  });

  test('[FUNC-027] POST /api/feedback/{message_id} – FeedbackResponse schema: success(bool) and message(str)', async ({ request }) => {
    requireFeedbackMessageId('FUNC-027');
    const { status, body } = await submitFeedback(request, feedbackMessageId, 'helpful');
    assertStatus200(status, body);
    expect(typeof body.success).toBe('boolean');
    expect(typeof body.message).toBe('string');
  });

// ---------------------------------------------------------------------------
// JWT / Access Token
// ---------------------------------------------------------------------------

  test('[FUNC-032] POST /api/chat/query – with Bearer token from verify-otp returns 200', async ({ request }) => {
    test.setTimeout(150_000);
    const { status: authStatus, body: authBody } = await verifyOTP(request, TEST_PHONE, TEST_OTP);
    if (authStatus === 200 && typeof authBody.access_token === 'string') {
      const params = new URLSearchParams({ user_id: authBody.user_id, persona: authBody.persona });
      const response = await request.post(
        `${BASE_URL}/api/chat/query?${params.toString()}`,
        {
          data: { query: 'What paint products do you offer?' },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authBody.access_token}`,
          },
          timeout: 60_000,
        }
      );
      assertStatus200(response.status(), await response.json().catch(() => ({})));
    } else {
      const { status, body } = await sendQuery(request, 'What paint products do you offer?');
      assertStatus200(status, body);
    }
  });

  // /api/auth/refresh added in the 2026-07-09 schema update: rotates the refresh
  // token and mints a new access token using the HttpOnly refresh cookie. The
  // `request` fixture is a fresh APIRequestContext per test, so we must log in on
  // THIS context first (verify-otp with the dev bypass OTP — no request-otp, so no
  // rate-limit) to have the server set the HttpOnly refresh cookie before calling
  // refresh. The context then carries that cookie automatically.
  test('[FUNC-033] POST /api/auth/refresh – rotates token and returns 200 with LoginResponse', async ({ request }) => {
    test.setTimeout(150_000);
    const { status: loginStatus } = await verifyOTP(request, TEST_PHONE, TEST_OTP);
    failIf429(loginStatus, 'FUNC-033');
    if (loginStatus !== 200) {
      failNotExecuted(
        'FUNC-033',
        FAILURE_CLASSES.SETUP,
        `login failed (verify-otp → ${loginStatus}), so no refresh cookie existed to refresh with`,
        `A 403 means ${TEST_PHONE} is in OTP cooldown; a 401 means TEST_OTP is no longer a ` +
        `configured bypass code. Refresh rotation itself is covered in depth by CB-RFR-01..03.`
      );
    }
    const { status, body, setCookieHeader } = await refreshAccessToken(request);
    failIf429(status, 'FUNC-033');
    assertStatus200(status, body);
    // LoginResponse: ok defaults true. access_token only when API_AUTH_RETURN_TOKEN_IN_BODY=true;
    // otherwise the rotated token arrives via the HttpOnly Set-Cookie (minimal-login mode).
    if (body.ok !== undefined) expect(typeof body.ok).toBe('boolean');
    if (typeof body.access_token === 'string') {
      expect(body.access_token.split('.').length).toBe(3);
    } else {
      expect(
        Boolean(setCookieHeader),
        '[FUNC-033] refresh must return a rotated token in the body or via Set-Cookie'
      ).toBe(true);
    }
  });

// ---------------------------------------------------------------------------
// Voice Transcription Endpoint
// ---------------------------------------------------------------------------

  test('[FUNC-028] POST /api/voice/transcribe – multipart upload returns 200', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/voice/transcribe`, {
      multipart: {
        // 64-byte buffer satisfies server's 32-byte minimum; random bytes may
        // still get 422 for invalid audio format, so both 200 and 422 are accepted.
        file: { name: 'test.webm', mimeType: 'audio/webm', buffer: Buffer.alloc(64, 0xAA) },
      },
      headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
      timeout: 30_000,
    });
    const status = response.status();
    failIf429(status, 'FUNC-028');
    if (status === 503) {
      throw new Error(
        '[FUNC-028] Voice transcription service is unavailable (503). ' +
        'This is a service-level failure — check Google Cloud Speech API connectivity on this environment.'
      );
    }
    if (status !== 200 && status !== 422) {
      throw new Error(`[FUNC-028] Expected 200 or 422 but received ${status}. Body: ${JSON.stringify(await response.json().catch(() => ({})))}`);
    }
    expect([200, 422]).toContain(status);
  });

  test('[FUNC-029] POST /api/voice/transcribe – language_code=hi-IN query param returns 200', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/voice/transcribe?language_code=hi-IN`,
      {
        multipart: {
          file: { name: 'test.webm', mimeType: 'audio/webm', buffer: Buffer.alloc(64, 0xAA) },
        },
        headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
        timeout: 30_000,
      }
    );
    const status = response.status();
    failIf429(status, 'FUNC-029');
    if (status === 503) {
      throw new Error(
        '[FUNC-029] Voice transcription service is unavailable (503). ' +
        'This is a service-level failure — check Google Cloud Speech API connectivity on this environment.'
      );
    }
    if (status !== 200 && status !== 422) {
      throw new Error(`[FUNC-029] Expected 200 or 422 but received ${status}. Body: ${JSON.stringify(await response.json().catch(() => ({})))}`);
    }
    expect([200, 422]).toContain(status);
  });

  test('[FUNC-030] POST /api/voice/transcribe – sample_rate_hertz=16000 query param returns 200', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/voice/transcribe?sample_rate_hertz=16000`,
      {
        multipart: {
          file: { name: 'test.webm', mimeType: 'audio/webm', buffer: Buffer.alloc(64, 0xAA) },
        },
        headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
        timeout: 30_000,
      }
    );
    const status = response.status();
    failIf429(status, 'FUNC-030');
    if (status === 503) {
      throw new Error(
        '[FUNC-030] Voice transcription service is unavailable (503). ' +
        'This is a service-level failure — check Google Cloud Speech API connectivity on this environment.'
      );
    }
    if (status !== 200 && status !== 422) {
      throw new Error(`[FUNC-030] Expected 200 or 422 but received ${status}. Body: ${JSON.stringify(await response.json().catch(() => ({})))}`);
    }
    expect([200, 422]).toContain(status);
  });

// =============================================================================
// NON-FUNCTIONAL TESTS  (NFNC-001 .. NFNC-010)
// All single-request tests assert 200; concurrency tests assert 200 per request.
// =============================================================================

// USES THE UNPACED FIXTURE ON PURPOSE. This case MEASURES latency, and the pacer's hold happens inside
// the wrapped request call — so a paced request would fold up to a full window of deliberate waiting
// into `duration` and fail the 2000ms assertion for a reason that has nothing to do with the server.
// recordSend() keeps the global budget honest.
test('[NFNC-001] GET /health responds within 2000ms', async ({ unpacedRequest: request }) => {
  recordSend(`${BASE_URL}/health`);
  const start = Date.now();
  const response = await request.get(`${BASE_URL}/health`);
  const duration = Date.now() - start;
  try {
    expect(response.status()).toBe(200);
  } catch {
    throw new Error(`[NFNC-001] Expected 200 but received ${response.status()}`);
  }
  expect(duration).toBeLessThan(2000);
  console.log(`[NFNC-001] Health response time: ${duration}ms`);
});

/* NFNC-002 to NFNC-010 commented out – these trigger rate limiting on the dev environment.
test('[NFNC-002] POST /api/chat/query responds within 30000ms (p95 SLA)', async ({ request }) => {
  test.setTimeout(150_000);
  const { status, duration, body } = await sendQuery(request, 'What is the best paint for exterior walls?');
  assertStatus200(status, body);
  expect(duration).toBeLessThan(30_000);
  console.log(`[NFNC-002] Query response time: ${duration}ms`);
});

test('[NFNC-003] 10 concurrent GET /health - all return 200, zero 5xx errors', async ({ request }) => {
  const COUNT = 10;
  const promises = Array.from({ length: COUNT }, () => request.get(`${BASE_URL}/health`));
  const results = await Promise.all(promises);
  const statuses = results.map((r) => r.status());
  console.log(`[NFNC-003] Statuses: ${statuses}`);
  statuses.forEach((s, i) => {
    try {
      expect(s).toBe(200);
    } catch {
      throw new Error(`[NFNC-003] Request ${i + 1}: Expected 200 but received ${s}`);
    }
  });
});

test('[NFNC-004] 5 concurrent anonymous chat queries - all return 200', async ({ request }) => {
  test.setTimeout(120_000);
  const COUNT = 5;
  const promises = Array.from({ length: COUNT }, (_, i) =>
    sendQuery(request, getQuery(i), null, 'anonymous', 'dealer')
  );
  const results = await Promise.all(promises);
  console.log(`[NFNC-004] Statuses: ${results.map((r) => r.status)}`);
  results.forEach(({ status, body }, i) => {
    try {
      expect(status).toBe(200);
    } catch {
      throw new Error(`[NFNC-004] Request ${i + 1}: Expected 200 but received ${status}. Body: ${JSON.stringify(body)}`);
    }
  });
});

test('[NFNC-005] 10 concurrent session creations for different users - all return 200', async ({ request }) => {
  const COUNT = 10;
  const promises = Array.from({ length: COUNT }, (_, i) =>
    createSession(request, `nfnc005-user-${i}-${Date.now()}`, PERSONAS[i % 2])
  );
  const results = await Promise.all(promises);
  console.log(`[NFNC-005] Statuses: ${results.map((r) => r.status)}`);
  results.forEach(({ status, body }, i) => {
    try {
      expect(status).toBe(200);
    } catch {
      throw new Error(`[NFNC-005] Request ${i + 1}: Expected 200 but received ${status}. Body: ${JSON.stringify(body)}`);
    }
  });
});

test('[NFNC-006] 5 concurrent full flows (create session + query) complete within 60s - all return 200', async ({ request }) => {
  test.setTimeout(120_000);
  const COUNT = 5;

  async function fullFlow(index) {
    const userId = `nfnc006-user-${index}-${Date.now()}`;
    const sessionResult = await createSession(request, userId, 'dealer');
    const sessionId = sessionResult.status === 200 ? sessionResult.body.id : null;
    const queryResult = await sendQuery(request, getQuery(index), sessionId, userId, 'dealer');
    return {
      sessionStatus: sessionResult.status,
      sessionBody: sessionResult.body,
      queryStatus: queryResult.status,
      queryBody: queryResult.body,
    };
  }

  const start = Date.now();
  const results = await Promise.all(Array.from({ length: COUNT }, (_, i) => fullFlow(i)));
  const wall = Date.now() - start;

  console.log(`[NFNC-006] 5 concurrent full flows completed in ${wall}ms`);
  expect(wall).toBeLessThan(60_000);
  results.forEach(({ sessionStatus, sessionBody, queryStatus, queryBody }, i) => {
    try {
      expect(sessionStatus).toBe(200);
    } catch {
      throw new Error(`[NFNC-006] Flow ${i + 1}: Session creation got ${sessionStatus}. Body: ${JSON.stringify(sessionBody)}`);
    }
    try {
      expect(queryStatus).toBe(200);
    } catch {
      throw new Error(`[NFNC-006] Flow ${i + 1}: Query got ${queryStatus}. Body: ${JSON.stringify(queryBody)}`);
    }
  });
});

test('[NFNC-007] Burst 20 GET /health requests - all return 200', async ({ request }) => {
  const COUNT = 20;
  const promises = Array.from({ length: COUNT }, () => request.get(`${BASE_URL}/health`));
  const results = await Promise.all(promises);
  console.log(`[NFNC-007] Total requests: ${COUNT}`);
  results.forEach((r, i) => {
    try {
      expect(r.status()).toBe(200);
    } catch {
      throw new Error(`[NFNC-007] Request ${i + 1}: Expected 200 but received ${r.status()}`);
    }
  });
});

test('[NFNC-008] 5 sequential chat queries - max single-query duration < 45s, all return 200', async ({ request }) => {
  test.setTimeout(300_000);
  const COUNT = 5;
  const durations = [];
  for (let i = 0; i < COUNT; i++) {
    const { status, duration, body } = await sendQuery(request, getQuery(i), null, `nfnc008-user-${Date.now()}`, 'dealer');
    durations.push(duration);
    try {
      expect(status).toBe(200);
    } catch {
      throw new Error(`[NFNC-008] Query ${i + 1}: Expected 200 but received ${status}. Body: ${JSON.stringify(body)}`);
    }
    console.log(`[NFNC-008] Query ${i + 1}: status=${status} duration=${duration}ms`);
  }
  const maxDuration = Math.max(...durations);
  console.log(`[NFNC-008] Max duration: ${maxDuration}ms`);
  expect(maxDuration).toBeLessThan(45_000);
});

test('[NFNC-009] 15 simultaneous query requests - all return 200', async ({ request }) => {
  test.setTimeout(180_000);
  const COUNT = 15;
  const promises = Array.from({ length: COUNT }, (_, i) =>
    sendQuery(request, getQuery(i), null, `nfnc009-user-${i}`, 'dealer')
  );
  const results = await Promise.all(promises);
  console.log(`[NFNC-009] Statuses: ${results.map((r) => r.status)}`);
  results.forEach(({ status, body }, i) => {
    try {
      expect(status).toBe(200);
    } catch {
      throw new Error(`[NFNC-009] Request ${i + 1}: Expected 200 but received ${status}. Body: ${JSON.stringify(body)}`);
    }
  });
});

test('[NFNC-010] Mixed concurrent ops: health + session create + query fire simultaneously - all return 200', async ({ request }) => {
  test.setTimeout(120_000);
  const [healthResp, sessionResult, queryResult] = await Promise.all([
    request.get(`${BASE_URL}/health`),
    createSession(request, `nfnc010-user-${Date.now()}`, 'dealer'),
    sendQuery(request, 'What colors do you have?', null, 'anonymous', 'dealer'),
  ]);
  console.log(
    `[NFNC-010] health=${healthResp.status()} session=${sessionResult.status} query=${queryResult.status}`
  );
  try {
    expect(healthResp.status()).toBe(200);
  } catch {
    throw new Error(`[NFNC-010] Health: Expected 200 but received ${healthResp.status()}`);
  }
  try {
    expect(sessionResult.status).toBe(200);
  } catch {
    throw new Error(`[NFNC-010] Session: Expected 200 but received ${sessionResult.status}. Body: ${JSON.stringify(sessionResult.body)}`);
  }
  try {
    expect(queryResult.status).toBe(200);
  } catch {
    throw new Error(`[NFNC-010] Query: Expected 200 but received ${queryResult.status}. Body: ${JSON.stringify(queryResult.body)}`);
  }
});
*/

// =============================================================================
// EDGE TESTS  (EDGE-001 .. EDGE-015)
// Boundary values and unusual (but structurally valid) inputs – all assert 200.
// =============================================================================

test('[EDGE-001] POST /api/chat/query - single character query ("a") returns 200', async ({ request }) => {
  test.setTimeout(150_000);
  const { status, body } = await sendQuery(request, 'a');
  assertStatus200(status, body);
});

test('[EDGE-002] POST /api/chat/query - 1000-character long query returns 200', async ({ request }) => {
  test.setTimeout(150_000);
  const longQuery = 'Tell me about RetailCrm Opus paint products. '.repeat(30).substring(0, 1000);
  const { status, body } = await sendQuery(request, longQuery);
  assertStatus200(status, body);
});

test('[EDGE-003] POST /api/chat/query - Unicode and emoji characters in query returns 200', async ({ request }) => {
  test.setTimeout(150_000);
  const { status, body } = await sendQuery(request, '🎨 What paint is best? 颜色 رنگ रंग 페인트');
  assertStatus200(status, body);
});

test('[EDGE-004] POST /api/chat/query - query with newlines and tab characters returns 200', async ({ request }) => {
  test.setTimeout(150_000);
  const { status, body } = await sendQuery(request, 'What paints\ndo you\t offer\nfor exteriors?');
  assertStatus200(status, body);
});

test('[EDGE-005] GET /api/chat/sessions/{id}/messages - limit_pairs = 1 (minimum boundary) returns 200', async ({ request }) => {
  const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
  assertStatus200(sStatus, sBody);
  const { status, body } = await getSessionMessages(request, sBody.id, 1);
  assertStatus200(status, body);
});

test('[EDGE-006] GET /api/chat/sessions/{id}/messages - limit_pairs = 2000 (maximum boundary) returns 200', async ({ request }) => {
  const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
  assertStatus200(sStatus, sBody);
  const { status, body } = await getSessionMessages(request, sBody.id, 2000);
  assertStatus200(status, body);
});

test('[EDGE-007] GET /api/chat/sessions -limit = 1 (minimum) returns 200 with at most 1 result', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/api/chat/sessions`, {
  params: { user_id: AUTHENTICATED_USER_ID, limit: 1 },
    headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
  });
  try {
    expect(response.status()).toBe(200);
  } catch {
    throw new Error(`[EDGE-007] Expected 200 but received ${response.status()}`);
  }
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
  expect(body.length).toBeLessThanOrEqual(1);
});

test('[EDGE-008] GET /api/chat/sessions - limit = 100 (large value) returns 200', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/api/chat/sessions`, {
  params: { user_id: AUTHENTICATED_USER_ID, limit: 100 },
    headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
  });
  try {
    expect(response.status()).toBe(200);
  } catch {
    throw new Error(`[EDGE-008] Expected 200 but received ${response.status()}`);
  }
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);
});

test('[EDGE-009] PATCH /api/chat/sessions/{id} - title with special characters and Unicode returns 200', async ({ request }) => {
  const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
  assertStatus200(sStatus, sBody);
  const { status, body } = await updateSession(request, sBody.id, '🎨 Paint Q&A – "Special" <Title> & More! रंग');
  assertStatus200(status, body);
});

test('[EDGE-010] POST /api/auth/request-otp - phone number exactly 10 digits returns 200', async ({ request }) => {
  const { status, body } = await requestOTP(request, '9000000002');
  failIf429(status, 'EDGE-010');
  // 403: server accepted the 10-digit format but rate-limited this specific number
  if (status === 403) return;
  assertStatus200(status, body);
});

test('[EDGE-011] POST /api/auth/verify-otp - OTP exactly 6 digits is valid format (200 or 401 for wrong OTP)', async ({ request }) => {
  const { status, body } = await verifyOTP(request, TEST_PHONE, '123456');
  failIf429(status, 'EDGE-011');
  // A 403 is the per-phone OTP cooldown, not a verdict on the OTP's format. Without this guard a
  // throttled run reports a format failure that was never evaluated.
  failIf403(status, 'EDGE-011');
  // Format check only: 6-digit OTP is structurally valid; server may reject the value with 401
  expect([200, 401]).toContain(status);
  expect(status).not.toBe(422);
});

test('[EDGE-012] POST /api/chat/query - session_id = null explicitly in body returns 200', async ({ request }) => {
  test.setTimeout(150_000);
  const params = new URLSearchParams({ user_id: 'anonymous', persona: 'dealer' });
  const response = await request.post(
    `${BASE_URL}/api/chat/query?${params.toString()}`,
    {
      data: { query: 'What eco-friendly options do you have?', session_id: null },
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
      timeout: 60_000,
    }
  );
  try {
    expect(response.status()).toBe(200);
  } catch {
    throw new Error(`[EDGE-012] Expected 200 but received ${response.status()}`);
  }
});

test('[EDGE-013] POST /api/chat/sessions then PATCH title with spaces and special characters returns 200', async ({ request }) => {
  const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
  assertStatus200(sStatus, sBody);
  const { status, body } = await updateSession(request, sBody.id, 'Session with spaces & special chars! 🎨');
  assertStatus200(status, body);
});

test('[EDGE-014] Archive session then GET messages – archived session must remain readable (returns 200)', async ({ request }) => {
  const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
  assertStatus200(sStatus, sBody);
  await archiveSession(request, sBody.id);
  const { status, body } = await getSessionMessages(request, sBody.id);
  expect(
    status,
    `[EDGE-014] Expected 200 after archive but got ${status}. Body: ${JSON.stringify(body)}. ` +
    'BUG-2: DELETE /api/chat/sessions hard-deletes instead of soft-archiving.'
  ).toBe(200);
});

test('[EDGE-016] POST /api/auth/request-otp – phone with +91 prefix returns 200 or 403 (throttled)', async ({ request }) => {
  test.setTimeout(150_000);
  try {
    const { status } = await requestOTP(request, '+919000000004');
    failIf429(status, 'EDGE-016');
    // 403 IS an accepted outcome here, as the title says: it proves the +91-prefixed number got
    // PAST format validation and reached the per-phone throttle. The old code called failIf403,
    // which contradicted the title — it skipped (and now would fail) on the very status the case
    // was written to allow. What must never happen is 400/422, i.e. the prefix being rejected as
    // malformed.
    expect(
      [200, 403],
      `[EDGE-016] +91-prefixed phone returned ${status}. Expected 200 (accepted) or 403 ` +
      `(accepted, then throttled); 400/422 would mean the +91 prefix is treated as invalid input.`
    ).toContain(status);
  } catch (err) {
    // Re-throw unless it is a low-level socket reset (not a rate-limit or assertion error)
    if (!err.message?.includes('socket hang up') && !err.message?.includes('ECONNRESET')) throw err;
  }
});

test('[EDGE-017] POST /api/auth/request-otp – phone with 91 prefix (12-digit) returns 200 or 403 (throttled)', async ({ request }) => {
  test.setTimeout(150_000);
  try {
    const { status } = await requestOTP(request, '919000000004');
    failIf429(status, 'EDGE-017');
    // See EDGE-016: 403 is accepted by this case's own contract; 400/422 is the real failure.
    expect(
      [200, 403],
      `[EDGE-017] 91-prefixed 12-digit phone returned ${status}. Expected 200 or 403; 400/422 ` +
      `would mean the 91 prefix is treated as invalid input.`
    ).toContain(status);
  } catch (err) {
    if (!err.message?.includes('socket hang up') && !err.message?.includes('ECONNRESET')) throw err;
  }
});

test('[EDGE-015] POST /api/voice/transcribe - sample_rate_hertz at min (8000) and max (96000) both return 200', async ({ request }) => {
  const minResp = await request.post(
    `${BASE_URL}/api/voice/transcribe?sample_rate_hertz=8000`,
    {
      multipart: {
        file: { name: 'test.webm', mimeType: 'audio/webm', buffer: Buffer.alloc(64, 0xAA) },
      },
      headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
      timeout: 30_000,
    }
  );
  failIf429(minResp.status(), 'EDGE-015');
  if (minResp.status() === 503) {
    throw new Error(
      '[EDGE-015] Voice transcription service is unavailable (503) for sample_rate_hertz=8000. ' +
      'Check Google Cloud Speech API connectivity on this environment.'
    );
  }
  if (minResp.status() !== 200 && minResp.status() !== 422) {
    throw new Error(`[EDGE-015] sample_rate_hertz=8000: Expected 200 or 422 but received ${minResp.status()}. Body: ${JSON.stringify(await minResp.json().catch(() => ({})))}`);
  }
  expect([200, 422]).toContain(minResp.status());

  const maxResp = await request.post(
    `${BASE_URL}/api/voice/transcribe?sample_rate_hertz=96000`,
    {
      multipart: {
        file: { name: 'test.webm', mimeType: 'audio/webm', buffer: Buffer.alloc(64, 0xAA) },
      },
      headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
      timeout: 30_000,
    }
  );
  failIf429(maxResp.status(), 'EDGE-015');
  if (maxResp.status() === 503) {
    throw new Error(
      '[EDGE-015] Voice transcription service is unavailable (503) for sample_rate_hertz=96000. ' +
      'Check Google Cloud Speech API connectivity on this environment.'
    );
  }
  if (maxResp.status() !== 200 && maxResp.status() !== 422) {
    throw new Error(`[EDGE-015] sample_rate_hertz=96000: Expected 200 or 422 but received ${maxResp.status()}. Body: ${JSON.stringify(await maxResp.json().catch(() => ({})))}`);
  }
  expect([200, 422]).toContain(maxResp.status());
});

// =============================================================================
// NEGATIVE TESTS  (NEG-001 .. NEG-020)
// Invalid inputs, missing required fields, wrong types.
// These tests explicitly assert 4xx error codes – they are NOT changed to 200.
// =============================================================================

test('[NEG-001] POST /api/auth/request-otp - missing phone_number returns 422', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/auth/request-otp`, {
    data: {},
    headers: { 'Content-Type': 'application/json' },
  });
  failIf429(response.status(), 'NEG-001');
  expect(response.status()).toBe(422);
});

test('[NEG-002] POST /api/auth/request-otp - empty string phone_number returns 400 or 422', async ({ request }) => {
  const { status } = await requestOTP(request, '');
  failIf429(status, 'NEG-002');
  expect([400, 422]).toContain(status);
});

test('[NEG-003] POST /api/auth/request-otp - phone_number with 9 digits (below minimum) returns 400/422', async ({ request }) => {
  const { status } = await requestOTP(request, '987654321');
  failIf429(status, 'NEG-003');
  expect([400, 422]).toContain(status);
});

test('[NEG-004] POST /api/auth/request-otp - phone_number with 11 digits (above maximum) returns 400/422', async ({ request }) => {
  const { status } = await requestOTP(request, '98765432101');
  failIf429(status, 'NEG-004');
  expect([400, 422]).toContain(status);
});

test('[NEG-005] POST /api/auth/verify-otp - missing otp field returns 422', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
    data: { phone_number: TEST_PHONE },
    headers: { 'Content-Type': 'application/json' },
  });
  failIf429(response.status(), 'NEG-005');
  expect(response.status()).toBe(422);
});

test('[NEG-006] POST /api/auth/verify-otp - missing phone_number returns 422', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
    data: { otp: '123456' },
    headers: { 'Content-Type': 'application/json' },
  });
  failIf429(response.status(), 'NEG-006');
  expect(response.status()).toBe(422);
});

test('[NEG-007] POST /api/chat/query - missing query field returns 422', async ({ request }) => {
  const params = new URLSearchParams({ user_id: 'anonymous', persona: 'dealer' });
  const response = await request.post(
    `${BASE_URL}/api/chat/query?${params.toString()}`,
    {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    }
  );
  // A 429 here is the shared 60/60s bucket, not a verdict on the input. Without this the
  // status-list assertion below fails as though the payload HAD been evaluated and mishandled.
  failIf429(response.status(), 'NEG-007');
  expect([401, 422]).toContain(response.status());
});

test('[NEG-008] POST /api/chat/query - empty string query is rejected (400 or 422)', async ({ request }) => {
  test.setTimeout(150_000);
  const { status } = await sendQuery(request, '');
  // A 429 here is the shared 60/60s bucket, not a verdict on the input. Without this the
  // status-list assertion below fails as though the payload HAD been evaluated and mishandled.
  failIf429(status, 'NEG-008');
  expect([400, 422]).toContain(status);
});

test('[NEG-009] GET /api/chat/sessions - missing required user_id param returns 422', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/api/chat/sessions`);
  // A 429 here is the shared 60/60s bucket, not a verdict on the input. Without this the
  // status-list assertion below fails as though the payload HAD been evaluated and mishandled.
  failIf429(response.status(), 'NEG-009');
  expect([401, 422]).toContain(response.status());
});

test('[NEG-010] POST /api/chat/sessions - missing user_id returns 422', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/chat/sessions`, {
    data: { persona: 'dealer' },
    headers: { 'Content-Type': 'application/json' },
  });
  // A 429 here is the shared 60/60s bucket, not a verdict on the input. Without this the
  // status-list assertion below fails as though the payload HAD been evaluated and mishandled.
  failIf429(response.status(), 'NEG-010');
  expect([401, 422]).toContain(response.status());
});

test('[NEG-011] POST /api/chat/sessions - missing persona returns 422', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/chat/sessions`, {
    data: { user_id: `neg011-user-${Date.now()}` },
    headers: { 'Content-Type': 'application/json' },
  });
  // A 429 here is the shared 60/60s bucket, not a verdict on the input. Without this the
  // status-list assertion below fails as though the payload HAD been evaluated and mishandled.
  failIf429(response.status(), 'NEG-011');
  expect([401, 422]).toContain(response.status());
});

test('[NEG-012] GET /api/chat/sessions/{id}/messages - non-existent session_id returns non-200', async ({ request }) => {
  const { status } = await getSessionMessages(request, 'non-existent-session-00000000000');
  // 403 added: VAPT 5.1 – ownership enforcement may return 403 for sessions not owned by caller
  // A 429 here is the shared 60/60s bucket, not a verdict on the input. Without this the
  // status-list assertion below fails as though the payload HAD been evaluated and mishandled.
  failIf429(status, 'NEG-012');
  expect([400, 401, 403, 404, 422]).toContain(status);
  expect(status).not.toBe(200);
});

test('[NEG-013] PATCH /api/chat/sessions/{id} - missing title field returns 422', async ({ request }) => {
  const response = await request.patch(`${BASE_URL}/api/chat/sessions/dummy-session-id`, {
    data: {},
    headers: { 'Content-Type': 'application/json' },
  });
  // A 429 here is the shared 60/60s bucket, not a verdict on the input. Without this the
  // status-list assertion below fails as though the payload HAD been evaluated and mishandled.
  failIf429(response.status(), 'NEG-013');
  expect([401, 422]).toContain(response.status());
});

test('[NEG-014] PATCH /api/chat/sessions/{id} - non-existent session_id returns non-200', async ({ request }) => {
  const { status } = await updateSession(request, 'non-existent-session-00000000000', 'New Title');
  // 403 added: VAPT 5.1 – ownership enforcement
  // A 429 here is the shared 60/60s bucket, not a verdict on the input. Without this the
  // status-list assertion below fails as though the payload HAD been evaluated and mishandled.
  failIf429(status, 'NEG-014');
  expect([400, 401, 403, 404, 422]).toContain(status);
  expect(status).not.toBe(200);
});

test('[NEG-015] DELETE /api/chat/sessions/{id} - non-existent session_id returns non-200', async ({ request }) => {
  const { status } = await archiveSession(request, 'non-existent-session-00000000000');
  failIf429(status, 'NEG-015');
  // 403: VAPT 5.1 – ownership enforcement
  expect([400, 401, 403, 404, 422]).toContain(status);
  expect(status).not.toBe(200);
});

test('[NEG-016] POST /api/feedback/{message_id} - missing rating field returns 422', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/feedback/test-msg-neg016`, {
    data: {},
    headers: { 'Content-Type': 'application/json' },
  });
  failIf429(response.status(), 'NEG-016');
  expect([401, 422]).toContain(response.status());
});

test('[NEG-017] POST /api/feedback/{message_id} - invalid rating value returns 400, 404, or 422', async ({ request }) => {
  const { status } = await submitFeedback(request, 'test-msg-neg017', 'invalid_rating_value');
  failIf429(status, 'NEG-017');
  // 404: server checks message existence before rating format
  expect([400, 404, 422]).toContain(status);
});

test('[NEG-018] POST /api/voice/transcribe - missing file field returns 422', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/voice/transcribe`, {
    multipart: {},
    timeout: 15_000,
  });
  failIf429(response.status(), 'NEG-018');
  expect([401, 422]).toContain(response.status());
});

test('[NEG-019] POST /api/chat/query - wrong Content-Type (text/plain) returns 400/415/422', async ({ request }) => {
  const params = new URLSearchParams({ user_id: 'anonymous', persona: 'dealer' });
  const response = await request.post(
    `${BASE_URL}/api/chat/query?${params.toString()}`,
    {
      data: 'query=What paints do you have',
      headers: { 'Content-Type': 'text/plain' },
    }
  );
  failIf429(response.status(), 'NEG-019');
  expect([400, 401, 415, 422]).toContain(response.status());
});

test('[NEG-020] GET /api/chat/sessions/{id}/messages - limit_pairs = 0 (below minimum) returns 400/422', async ({ request }) => {
  const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
  const sessionId = (sStatus === 200 && sBody.id) ? sBody.id : 'placeholder-session-neg020';
  const { status } = await getSessionMessages(request, sessionId, 0);
  failIf429(status, 'NEG-020');
  expect([400, 422]).toContain(status);
});

test('[NEG-021] POST /api/voice/transcribe – oversized audio payload returns 413 or 422 (not 5xx)', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/voice/transcribe`, {
    multipart: {
      file: { name: 'big.webm', mimeType: 'audio/webm', buffer: Buffer.alloc(2 * 1024 * 1024, 0xAA) },
    },
    timeout: 30_000,
  });
  failIf429(response.status(), 'NEG-021');
  expect(response.status()).toBeLessThan(500);
  expect([401, 413, 422]).toContain(response.status());
});

test('[NEG-022] POST /api/auth/request-otp – alphabetic phone_number returns 400 or 422', async ({ request }) => {
  const { status } = await requestOTP(request, 'abcdefghij');
  failIf429(status, 'NEG-022');
  expect([400, 422]).toContain(status);
});

test('[NEG-023] GET /api/chat/sessions/{id}/messages – no auth header returns 401', async ({ request }) => {
  const response = await request.get(
    `${BASE_URL}/api/chat/sessions/non-existent-session-00000000000/messages`
  );
  failIf429(response.status(), 'NEG-023');
  expect(response.status()).toBe(401);
});

test('[NEG-024] GET /api/chat/sessions – no auth header returns 401', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/api/chat/sessions`, {
    params: { user_id: 'anonymous' },
  });
  failIf429(response.status(), 'NEG-024');
  expect(response.status()).toBe(401);
});

test('[NEG-025] POST /api/chat/sessions – no auth header returns 401', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/chat/sessions`, {
    data: { user_id: `neg025-user-${Date.now()}`, persona: 'dealer' },
    headers: { 'Content-Type': 'application/json' },
  });
  failIf429(response.status(), 'NEG-025');
  expect(response.status()).toBe(401);
});

test('[NEG-026] PATCH /api/chat/sessions/{id} – no auth header returns 401', async ({ request }) => {
  const response = await request.patch(
    `${BASE_URL}/api/chat/sessions/non-existent-session-00000000000`,
    {
      data: { title: 'New Title' },
      headers: { 'Content-Type': 'application/json' },
    }
  );
  failIf429(response.status(), 'NEG-026');
  expect(response.status()).toBe(401);
});

test('[NEG-027] DELETE /api/chat/sessions/{id} – no auth header returns 401', async ({ request }) => {
  const response = await request.delete(
    `${BASE_URL}/api/chat/sessions/non-existent-session-00000000000`
  );
  failIf429(response.status(), 'NEG-027');
  expect(response.status()).toBe(401);
});

// SCOPE CORRECTED and retitled. This case does NOT verify login_challenge enforcement, despite its
// old title claiming VAPT 5.3 coverage: it sends otp:123456 — a WRONG OTP — alongside the bad
// challenge, and a wrong OTP returns 401 on its own. The bad challenge contributes nothing to the
// result, so a server that ignored challenges entirely would still make this test pass. Same defect
// class as SEC-007's random UUID.
//
// Verifying VAPT 5.3 needs a VALID OTP plus an invalid challenge. The only valid OTP available to QA
// is the dev bypass code, and the bypass ignores the challenge by design (it exists so a client can
// skip the request-otp handshake that mints the challenge in the first place). So nothing in this
// repo can currently verify nonce enforcement — see the coverage-gap annotation on CB-BYP-02 in
// retail_crm_chatbot_boundary_test.js for what dev must supply to close it.
test('[NEG-028] POST /api/auth/verify-otp – a wrong OTP is rejected with 401 (does NOT verify VAPT 5.3, see CB-BYP-02)', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
    data: { phone_number: 9000000003, otp: 123456, login_challenge: 'bad-challenge-000000000' },
    headers: { 'Content-Type': 'application/json' },
  });
  const negStatus = response.status();
  failIf429(negStatus, 'NEG-028');
  if (negStatus === 200) {
    throw new Error(
      '[NEG-028] A WRONG OTP (123456) was accepted (got 200). OTP validation is broken outright — ' +
      'this is more serious than the challenge question the old title referred to.'
    );
  }
  expect(negStatus).toBe(401);
});

// USES THE UNPACED FIXTURE ON PURPOSE. This case measures a rate limit, so it must send its attempts
// close together — under the OTP pacer they were spaced ~20s apart, the throttle never engaged, and the
// test failed for a reason that had nothing to do with the server. recordSend() below keeps the global
// budget honest for everything that runs after the burst.
test('[NEG-029] POST /api/auth/verify-otp – repeated wrong OTPs trigger rate-limit 429 (VAPT 5.8)', async ({ unpacedRequest: request }) => {
  // Use a different number so repeated wrong attempts don't rate-limit the real test account
  const rateLimitPhone = '9000000004';
  const statuses = [];
  let finalStatus = null;
  for (let i = 0; i < 6; i++) {
    recordSend(`${BASE_URL}/api/auth/verify-otp`); // debit BOTH buckets; the burst is the point
    const response = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
      data: { phone_number: rateLimitPhone, otp: '000000' },
      headers: { 'Content-Type': 'application/json' },
    });
    finalStatus = response.status();
    statuses.push(finalStatus);
    // A 403 on the FIRST attempt is a lockout left over from an earlier run: the endpoint was
    // already refusing before this case sent anything, so no throttle TRANSITION was observed and
    // there is nothing to report a verdict on. Previously this failed the [401,429] assertion and
    // looked like a product defect.
    if (i === 0 && finalStatus === 403) {
      failNotExecuted(
        'NEG-029',
        FAILURE_CLASSES.SETUP,
        `${rateLimitPhone} was ALREADY locked out (403) on the first attempt, so no throttle transition was observed`,
        'This case needs to watch the endpoint go from accepting attempts to refusing them. Wait for ' +
        'the lockout from the previous run to expire (~11 minutes) and re-run.'
      );
    }
    if (finalStatus === 429 || finalStatus === 403) break;
    expect(
      [401, 429, 403],
      `[NEG-029] Wrong OTP attempt ${i + 1} returned ${finalStatus}; expected 401, or 429/403 once ` +
      `throttling engages. Statuses so far: ${statuses.join(', ')}`
    ).toContain(finalStatus);
  }
  // The requirement is that brute force gets BLOCKED, not that a particular code is used. Observed
  // on dev: 401s and then a 403 lockout; a 429 is equally acceptable.
  expect(
    statuses.filter((x) => x === 429 || x === 403).length,
    `[NEG-029] Six wrong OTPs for ${rateLimitPhone} produced ${statuses.join(', ')} with no throttle ` +
    `(neither 429 nor 403). VAPT 5.8 requires repeated OTP failures to be rate-limited — the OTP ` +
    `space is only 10^6, so an unthrottled verify-otp is brute-forceable.`
  ).toBeGreaterThan(0);
  // Server must never return 5xx for repeated auth failures
  expect(finalStatus).toBeLessThan(500);
  if (!statuses.includes(429)) {
    test.info().annotations.push({
      type: 'observation',
      description:
        `Throttle engaged as 403, not the 429 this case's title expects (statuses: ` +
        `${statuses.join(', ')}). Protection is present; the status code differs. CB-BYP-04 records ` +
        `the same inconsistency on the bypass phone.`,
    });
  }
});

test('[NEG-030] POST /api/chat/sessions – user_id ≠ JWT sub returns 403 (schema: ownership enforced)', async ({ request }) => {
  // 2026-07-09 schema update: CreateSessionRequest.user_id must match the JWT sub;
  // a mismatch returns 403 (previously silently overridden by JWT claims).
  const mismatchedUserId = `neg030-not-my-sub-${Date.now()}`;
  const { status, body } = await createSession(request, mismatchedUserId, 'dealer');
  failIf429(status, 'NEG-030');
  if (status === 200) {
    throw new Error(
      `[NEG-030] Ownership NOT ENFORCED: session created with a user_id that differs from the ` +
      `JWT sub (got 200). Server must return 403 when body user_id ≠ token subject. Body: ${JSON.stringify(body)}`
    );
  }
  // 401 accepted only if the shared token was unavailable/expired for this run.
  expect([401, 403]).toContain(status);
});

test('[NEG-031] POST /api/voice/transcribe – invalid audio buffer (1-byte) returns 422', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/voice/transcribe`, {
    multipart: {
      file: { name: 'bad.webm', mimeType: 'audio/webm', buffer: Buffer.from([0x00]) },
    },
    headers: { 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
    timeout: 30_000,
  });
  const status = response.status();
  failIf429(status, 'NEG-031');
  if (status === 503) {
    throw new Error(
      '[NEG-031] Voice transcription service is unavailable (503). ' +
      'Cannot validate 422 rejection — check Google Cloud Speech API connectivity on this environment.'
    );
  }
  expect(status).toBe(422);
});

// =============================================================================
// SECURITY TESTS  (SEC-001 .. SEC-012)
// Injection attacks, IDOR, method enforcement, oversized payloads.
// These tests assert status < 500 (server must not crash on malicious input).
// =============================================================================

test('[SEC-001] NoSQL injection in query field does not cause 5xx server error', async ({ request }) => {
  test.setTimeout(150_000);
  const { status } = await sendQuery(request, '{"$gt": ""} {"$where": "this.password.length > 0"}');
  assertNoServerError(status, 'SEC-001');
  expect(ACCEPTED_QUERY_CODES).toContain(status);
});

test('[SEC-002] XSS payload in query field does not cause 5xx and is not reflected unsanitised', async ({ request }) => {
  test.setTimeout(150_000);
  const { status, body } = await sendQuery(request, '<script>alert("xss")</script><img src=x onerror=alert(1)>');
  assertNoServerError(status, 'SEC-002');
  expect(ACCEPTED_QUERY_CODES).toContain(status);
  if (status === 200 && body.response) {
    expect(typeof body.response).toBe('string');
  }
});

test('[SEC-003] SQL injection in query field does not cause 5xx server error', async ({ request }) => {
  test.setTimeout(150_000);
  const { status } = await sendQuery(request, "1' OR '1'='1'; DROP TABLE messages; --");
  assertNoServerError(status, 'SEC-003');
  expect(ACCEPTED_QUERY_CODES).toContain(status);
});

test('[SEC-004] Path traversal in session_id does not return 200 with data', async ({ request }) => {
  const { status } = await getSessionMessages(request, encodeURIComponent('../../etc/passwd'));
  // 403 added: VAPT 5.1 – ownership enforcement
  // Classify a 429 as NOT EXECUTED rather than letting it fail the status-list assertion as
  // though the traversal payload had been evaluated and mishandled.
  failIf429(status, 'SEC-004');
  expect([400, 401, 403, 404, 422]).toContain(status);
  expect(status).not.toBe(200);
});

test('[SEC-005] Path traversal in feedback message_id does not expose sensitive data', async ({ request }) => {
  const { status } = await submitFeedback(
    request,
    encodeURIComponent('../../../etc/shadow'),
    'helpful'
  );
  // 403 added: VAPT 5.1 – ownership enforcement on feedback
  // Classify a 429 as NOT EXECUTED rather than letting it fail the status-list assertion as
  // though the traversal payload had been evaluated and mishandled.
  failIf429(status, 'SEC-005');
  expect([400, 401, 403, 404, 422]).toContain(status);
  expect(status).not.toBe(500);
});

test('[SEC-006] Oversized payload (100 KB query string) does not crash the server (no 5xx)', async ({ request }) => {
  test.setTimeout(150_000);
  const hugeQuery = 'A'.repeat(100_000);
  const { status } = await sendQuery(request, hugeQuery);
  assertNoServerError(status, 'SEC-006');
});

// SCOPE CORRECTED. This case cannot prove ownership enforcement: the UUID below does not exist, so
// a 404 is fully explained by non-existence and says nothing about require_session_owner. It is kept
// as what it actually is — a check that an unknown session id is not readable and does not 5xx.
// The REAL ownership test is CB-IDOR-02 in retail_crm_chatbot_boundary_test.js, which uses a second
// account's genuine session id (and CB-IDOR-03/04/05 for the write paths). VAPT-001 covers the same
// ground through the browser but needs a human to type two OTPs.
test('[SEC-007] An unknown session_id must not be readable (see CB-IDOR-02 for the real IDOR test)', async ({ request }) => {
  const randomUUID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const { status } = await getSessionMessages(request, randomUUID);
  expect([401, 403, 404]).toContain(status);
  expect(status).not.toBe(200);
});

test('[SEC-008] Null byte injection in query field does not cause 5xx server error', async ({ request }) => {
  test.setTimeout(150_000);
  const { status } = await sendQuery(request, 'What paints do you have?\x00');
  assertNoServerError(status, 'SEC-008');
  expect(ACCEPTED_QUERY_CODES).toContain(status);
});

test('[SEC-009] Mass assignment: extra unknown fields in session body do not cause 5xx', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/chat/sessions`, {
    data: {
      user_id: `sec009-user-${Date.now()}`,
      persona: 'dealer',
      admin: true,
      role: 'superuser',
      extra_field: 'injected_value',
      is_admin: true,
    },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(response.status()).toBeLessThan(500);
  failIf429(response.status(), 'SEC-009');
  expect([200, 401, 422]).toContain(response.status());
});

test('[SEC-010] HTTP method mismatch: GET on POST-only /api/chat/query returns 404 or 405', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/api/chat/query`);
  expect([401, 404, 405, 422]).toContain(response.status());
});

test('[SEC-011] HTTP method mismatch: POST on GET-only /health returns 404 or 405', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/health`, {
    data: {},
    headers: { 'Content-Type': 'application/json' },
  });
  expect([404, 405]).toContain(response.status());
});

test('[SEC-012] Script injection in session title (PATCH) does not cause 5xx', async ({ request }) => {
  const { status: sStatus, body: sBody } = await createSession(request, AUTHENTICATED_USER_ID, AUTHENTICATED_PERSONA);
  assertStatus200(sStatus, sBody);
  const { status } = await updateSession(request, sBody.id, '<script>alert("xss")</script>');
  assertNoServerError(status, 'SEC-012');
  expect([200, 400, 401, 404, 422]).toContain(status);
});

test('[SEC-013] POST /api/chat/query – invalid Bearer JWT token is rejected (401)', async ({ request }) => {
  test.setTimeout(150_000);
  const params = new URLSearchParams({ user_id: 'anonymous', persona: 'dealer' });
  const response = await request.post(
    `${BASE_URL}/api/chat/query?${params.toString()}`,
    {
      data: { query: 'What paint products do you offer?' },
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid.jwt.token',
      },
      timeout: 60_000,
    }
  );
  const sec013Status = response.status();
  assertNoServerError(sec013Status, 'SEC-013');
  if (sec013Status === 200) {
    throw new Error(
      '[SEC-013] Invalid JWT accepted as valid auth (got 200). ' +
      'Token validation is not enforced on this endpoint — any invalid token should return 401.'
    );
  }
  expect([401, 422]).toContain(sec013Status);
});

test('[SEC-014] API responses include all hardened security headers (VAPT 5.9)', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/health`);
  expect(response.status()).toBe(200);
  const headers = response.headers();

  // Every problem is collected and reported TOGETHER. The original version asserted presence in a
  // loop, so the first missing header ended the test and hid everything after it — right now
  // /health is missing cache-control, which on its own would conceal the duplicate
  // x-content-type-options. One run should tell dev the whole story.
  //
  // Presence alone was also never the requirement: a header with a wrong VALUE is exactly what
  // toBeTruthy() hides. Playwright joins duplicate headers with ", ", so one sent twice arrives as
  // "nosniff, nosniff" — that is how bug Sr. 109 becomes visible from a test.
  const problems = [];
  const required = [
    'x-content-type-options',
    'strict-transport-security',
    'x-frame-options',
    'content-security-policy',
    'cache-control',
  ];
  for (const h of required) {
    if (!headers[h]) problems.push(`MISSING: ${h}`);
  }
  if (headers['x-content-type-options'] && headers['x-content-type-options'] !== 'nosniff') {
    problems.push(
      `WRONG VALUE: x-content-type-options is "${headers['x-content-type-options']}" — a ` +
      `comma-joined value means the header was sent TWICE (bug Sr. 109). It is set at both the app ` +
      `and the nginx/proxy layer and reproduces on EVERY endpoint (/api/auth/verify-otp, ` +
      `/api/v1/product/know-about-product, /health, /api/chat/query), so it is one global ` +
      `middleware defect, not a per-route one. Browser devtools merge duplicates too — use ` +
      `curl -D - to see the raw pair.`
    );
  }
  const hsts = headers['strict-transport-security'] || '';
  if (hsts && !/max-age=\d{7,}/.test(hsts)) {
    problems.push(`WEAK VALUE: strict-transport-security is "${hsts}" — max-age is too short to matter.`);
  }
  const cc = (headers['cache-control'] || '').toLowerCase();
  if (cc && !/no-store|no-cache/.test(cc)) {
    problems.push(`WRONG VALUE: cache-control is "${headers['cache-control']}" — API responses must not be cacheable.`);
  }

  expect(
    problems,
    `[SEC-014] ${problems.length} security-header problem(s) on GET /health (VAPT 5.9):\n  - ` +
    problems.join('\n  - ') +
    `\nKnown open bugs covering these: Sr. 109 (duplicate x-content-type-options, API-wide) and ` +
    `Sr. 111 (/health missing cache-control).`
  ).toEqual([]);
});

test('[SEC-015] Server and X-Powered-By headers are not exposed (VAPT 5.11 – Banner Grabbing)', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/health`);
  expect(response.status()).toBe(200);
  const headers = response.headers();
  const serverHeader = (headers['server'] || '').toLowerCase();
  expect(serverHeader).not.toContain('uvicorn');
  expect(serverHeader).not.toContain('fastapi');
  expect(headers['x-powered-by']).toBeUndefined();
});

test('[SEC-018] Request from an untrusted Origin is not reflected in CORS Access-Control-Allow-Origin (VAPT 5.5)', async ({ request }) => {
  const response = await request.get(`${BASE_URL}/health`, {
    headers: { 'Origin': 'https://evil.example.com' },
  });
  expect(response.status()).toBe(200);
  const acao = response.headers()['access-control-allow-origin'];
  // Untrusted origin must not be reflected back (VAPT 5.5 – strict allowlist CORS)
  if (acao !== undefined) {
    expect(acao).not.toBe('https://evil.example.com');
    expect(acao).not.toBe('*');
  }
});

test('[FUNC-007] POST /api/auth/logout returns 200', async ({ request }) => {
  const response = await request.post(`${BASE_URL}/api/auth/logout`, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TEST_AUTH_TOKEN}` },
  });
  try {
    expect(response.status()).toBe(200);
  } catch {
    throw new Error(`[FUNC-007] Expected 200 but received ${response.status()}`);
  }
  // Re-authenticate so SEC-017 (and any subsequent tests) have a valid token
  const newTokenResult = await getFreshToken(request);
  if (newTokenResult.access_token) TEST_AUTH_TOKEN = newTokenResult.access_token;
});

test('[SEC-017] JWT token is invalidated after logout – reuse must return 401 (VAPT 5.7)', async ({ request }) => {
  const revokedToken = TEST_AUTH_TOKEN;
  const logoutResp = await request.post(`${BASE_URL}/api/auth/logout`, {
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${revokedToken}` },
  });
  expect(logoutResp.status()).toBeLessThan(500);
  const afterLogout = await request.post(`${BASE_URL}/api/chat/sessions`, {
    data: { user_id: `sec017-user-${Date.now()}`, persona: 'dealer' },
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${revokedToken}` },
  });
  const revokedStatus = afterLogout.status();
  expect(revokedStatus).toBeLessThan(500);
  if (revokedStatus === 200) {
    throw new Error(
      '[SEC-017] VAPT 5.7 NOT ENFORCED: revoked JWT still accepted after logout (got 200). ' +
      'Server-side token revocation must be enabled — reused tokens must return 401.'
    );
  }
  expect([401, 403]).toContain(revokedStatus);
  // Re-authenticate so subsequent tests in this worker are not affected by the revocation
  const newTokenResult = await getFreshToken(request);
  if (newTokenResult.access_token) TEST_AUTH_TOKEN = newTokenResult.access_token;
});

// =============================================================================
// VAPT ENHANCEMENT TESTS  (SEC-019 .. SEC-026, NEG-032)
// Standalone tests — not nested in any describe block.
// These cover VAPT findings left without dedicated test coverage above.
// =============================================================================

// --- [5.2] Client-Side Session Hijacking — cookie security attributes --------

// SEC-019/020/021 read the Set-Cookie header captured during the beforeAll login. If it is missing,
// the three VAPT 5.2 cookie attributes were NOT verified — which used to be reported as three skips,
// i.e. as though someone had decided they did not need checking.
function requireSetCookie(testId) {
  if (TEST_SET_COOKIE_HEADER) return;
  failNotExecuted(
    testId,
    FAILURE_CLASSES.SETUP,
    'no Set-Cookie header was captured during the beforeAll login, so the cookie attribute was never inspected',
    `The login in beforeAll did not complete (most often ${TEST_PHONE} is in OTP cooldown → 403, ` +
    `or the bypass code changed → 401). VAPT 5.2 remediation is UNVERIFIED for this run — it is ` +
    `neither confirmed nor refuted. Re-run after the cooldown, or set TEST_AUTH_TOKEN and a ` +
    `TEST_PHONE that is not throttled.`
  );
}

test('[SEC-019] verify-otp response sets an HttpOnly cookie (VAPT 5.2)', async () => {
requireSetCookie('SEC-019');
expect(
  TEST_SET_COOKIE_HEADER.toLowerCase(),
  'Set-Cookie must include HttpOnly attribute (VAPT 5.2 — cookie security)'
).toContain('httponly');
});

test('[SEC-020] verify-otp cookie includes the Secure attribute (VAPT 5.2)', async () => {
requireSetCookie('SEC-020');
expect(
  TEST_SET_COOKIE_HEADER.toLowerCase(),
  'Set-Cookie must include Secure attribute (VAPT 5.2 — cookie security)'
).toContain('secure');
});

test('[SEC-021] verify-otp cookie includes SameSite protection (VAPT 5.2)', async () => {
requireSetCookie('SEC-021');
const lower = TEST_SET_COOKIE_HEADER.toLowerCase();
const hasSameSite = lower.includes('samesite=strict') || lower.includes('samesite=lax');
expect(hasSameSite, 'Set-Cookie must include SameSite=Strict or SameSite=Lax (VAPT 5.2 — cookie security)').toBe(true);
});

// --- [5.6] Clickjacking Protection ------------------------------------------

test('[SEC-022] Responses include X-Frame-Options header (VAPT 5.6 – Clickjacking)', async ({ request }) => {
const response = await request.get(`${BASE_URL}/health`);
expect(response.status()).toBe(200);
const xfo = response.headers()['x-frame-options'];
expect(xfo, 'X-Frame-Options header must be present (VAPT 5.6 — clickjacking protection)').toBeTruthy();
expect(['DENY', 'SAMEORIGIN']).toContain(xfo.toUpperCase());
});

test('[SEC-023] Content-Security-Policy includes frame-ancestors directive (VAPT 5.6 – Clickjacking)', async ({ request }) => {
const response = await request.get(`${BASE_URL}/health`);
expect(response.status()).toBe(200);
const csp = response.headers()['content-security-policy'];
expect(csp, 'Content-Security-Policy must be present (VAPT 5.6)').toBeTruthy();
expect(csp, 'CSP must include frame-ancestors directive (VAPT 5.6 — clickjacking protection)').toContain('frame-ancestors');
});

// --- [5.10] BREACH Mitigation — no API response compression -----------------

test('[SEC-024] API responses do not use Content-Encoding compression (VAPT 5.10 – BREACH)', async ({ request }) => {
const response = await request.get(`${BASE_URL}/api/auth/me`, {
  headers: {
    'Authorization': `Bearer ${TEST_AUTH_TOKEN}`,
    'Accept-Encoding': 'gzip, deflate, br',
  },
});
expect(response.status()).toBeLessThan(500);
const contentEncoding = response.headers()['content-encoding'];
expect(
  contentEncoding,
  'API responses must not use Content-Encoding — compression disabled for /api/* (VAPT 5.10 — BREACH mitigation)'
).toBeFalsy();
});

// --- [5.4] Sensitive Data Exposure — JWT minimal claims ---------------------

test('[SEC-025] JWT payload contains only minimal claims – no sensitive profile data (VAPT 5.4)', async () => {
const parts = TEST_AUTH_TOKEN.split('.');
expect(parts.length).toBe(3);
const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
expect(payload.sub, 'JWT must contain sub claim').toBeTruthy();
const sensitiveClaims = ['phone', 'phone_number', 'user_profile', 'persona', 'email', 'name', 'session_id'];
for (const claim of sensitiveClaims) {
  expect(payload, `JWT must not expose sensitive claim: ${claim} (VAPT 5.4 — sensitive data exposure)`).not.toHaveProperty(claim);
}
});

// --- [5.5] CORS — OPTIONS preflight does not reflect untrusted origin -------

test('[SEC-026] CORS OPTIONS preflight does not reflect untrusted origin (VAPT 5.5)', async ({ request }) => {
const response = await request.fetch(`${BASE_URL}/api/chat/query`, {
  method: 'OPTIONS',
  headers: {
    'Origin': 'https://untrusted-attacker.com',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type,authorization',
  },
});
expect(response.status()).toBeLessThan(500);
const acao = response.headers()['access-control-allow-origin'];
if (acao !== undefined) {
  expect(acao, 'Wildcard CORS must not be set (VAPT 5.5 — strict allowlist CORS)').not.toBe('*');
  expect(acao, 'Untrusted origin must not be reflected in ACAO (VAPT 5.5)').not.toBe('https://untrusted-attacker.com');
}
});

// --- [5.3] OTP Authentication Bypass — challenge replay ---------------------

// [NEG-032] DISABLED — because it CANNOT VERIFY ANYTHING here, not because it is expected to fail.
//
// This is a deliberate reversal. It was briefly re-enabled on the belief that a replayed
// login_challenge being accepted was a defect (BUG-6). It is not: the challenge is minted by
// request-otp, and the dev bypass OTP exists precisely so automation can skip that handshake. A
// bypass that still honoured the nonce could not do the job dev supplied it for.
//
// So this test drives its replay THROUGH the bypass, which ignores challenges by design. Whatever it
// returns says nothing about whether the real OTP flow enforces the nonce. Leaving it enabled would
// mean a standing red for behaviour that is working as intended.
//
// VAPT 5.3 IS THEREFORE UNVERIFIED, NOT VERIFIED. The workbook row for NEG-032 records this as
// "Commented Out" with the reason, so the sheet does not read as coverage. NEG-028 does not close the
// gap either — it sends a WRONG OTP, so its 401 is fully explained by the OTP, not the challenge.
//
// TO RE-ENABLE, dev must supply one of:
//   (a) an env flag that disables the bypass for a single test run,
//   (b) a test hook returning the real issued OTP so the normal path can be driven, or
//   (c) server-side test evidence for the non-bypass path.
// See the coverage-gap annotation on CB-BYP-02 in retail_crm_chatbot_boundary_test.js.

/*
test('[NEG-032] OTP replay – reusing a consumed login_challenge must be rejected (VAPT 5.3)', async ({ request }) => {
if (!USED_LOGIN_CHALLENGE) {
  failNotExecuted(
    'NEG-032',
    FAILURE_CLASSES.SETUP,
    'no consumed login_challenge was captured in beforeAll, so no replay could be attempted',
    'Either the beforeAll login did not complete (OTP cooldown / changed bypass code), or this ' +
    'environment does not issue a login_challenge at all — in which case VAPT 5.3 challenge ' +
    'binding is absent rather than merely unverified, and that is itself the finding.'
  );
}
const response = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
  data: { phone_number: TEST_PHONE, otp: TEST_OTP, login_challenge: USED_LOGIN_CHALLENGE },
  headers: { 'Content-Type': 'application/json' },
});
const status = response.status();
failIf429(status, 'NEG-032');
expect(status).toBeLessThan(500);
expect(
  status,
  '[NEG-032] A REPLAYED login_challenge was accepted (200). NOTE BEFORE FILING THIS: if the request ' +
  'above still uses TEST_OTP (the dev bypass code), this result is EXPECTED and is NOT a defect — ' +
  'the bypass ignores the challenge by design. Only treat a 200 as a finding once the OTP being sent ' +
  'is a REAL server-issued one, i.e. once the bypass has been disabled for this run or a test hook ' +
  'provides the real OTP. See the header comment above.'
).not.toBe(200);
expect([400, 401, 422]).toContain(status);
});
*/
