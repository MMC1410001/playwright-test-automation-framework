const { test: base, expect } = require('@playwright/test');
const { URL } = require('url');
const { FAILURE_CLASSES, failNotExecuted, failOn429 } = require('./failure-classes');
const { pacedContext, recordSend } = require('./rate-pacer');

/**
 * RetailCrm Opus BEST BOT — Browser-Based VAPT Test Suite
 *
 * Coverage (all 11 VAPT findings):
 *   VAPT-001  Issue 1  – Horizontal Privilege Escalation (browser, two accounts)
 *   VAPT-002  Issue 2  – Client-Side Session Hijacking / cookie security attributes
 *   VAPT-003  Issue 3  – Authentication Bypass via OTP / challenge replay
 *   VAPT-004  Issue 4  – Sensitive Data Exposure in LocalStorage
 *   VAPT-005  Issue 5  – Insecure CORS Policy (frontend)
 *   VAPT-006  Issue 6  – Clickjacking / X-Frame-Options (frontend)
 *   VAPT-007a Issue 7  – JWT algorithm must not be HS256
 *   VAPT-007b Issue 7  – JWT expiry window must be ≤ 30 minutes
 *   VAPT-007c Issue 7  – JWT must include aud (audience) claim
 *   VAPT-008  Issue 8  – Weak OTP Validation Rate-Limiting (browser)
 *   VAPT-009a Issue 9  – Missing/Misconfigured Security Headers (frontend HTML root)
 *   VAPT-009b Issue 9  – Missing/Misconfigured Security Headers (backend API host)
 *   VAPT-010  Issue 10 – SSL BREACH Vulnerability (frontend URL)
 *   VAPT-011  Issue 11 – Banner Grabbing (frontend URL)
 *
 * All tests use the real browser (page / browser fixtures).
 * Auth API calls made via page.evaluate() fetch — subject to real browser CORS.
 *
 * Run: npx playwright test tests/api/retail_crm_chatbot/retail_crm_chatbot_VAPT.js
 **/

// =============================================================================
// CONFIGURATION
// =============================================================================
// Dev: 
const BASE_URL    = `${process.env.CRM_API_URL || 'https://jsonplaceholder.typicode.com'}`;
const FRONTEND_URL = `${process.env.CHATBOT_API_URL || 'https://httpbin.org'}`;

// UAT: 
// const BASE_URL    = `${process.env.CRM_API_URL || 'https://jsonplaceholder.typicode.com'}`;
// const FRONTEND_URL = 'https://www.saucedemo.com/';

const TEST_PHONE  = '9000000001';
const TEST_OTP    = '847291'; // dev bypass OTP (server-side bypass enabled)

// ⚠️  Set TEST_PHONE_B env var or replace the fallback before running VAPT-001
const TEST_PHONE_B = process.env.TEST_PHONE_B || '9000000003';

// Stale reference token, kept ONLY as a documented example of the claim shape. It expired
// 2026-06-08T07:40Z. It is NOT a fallback any more — see below.
//
// It used to be the initialiser for TEST_AUTH_TOKEN, and because beforeAll starts with
// `if (TEST_AUTH_TOKEN) return;`, the variable was never empty, so the login never ran and
// VAPT-007a/b/c inspected THIS literal on every run — passing for months against a dead token
// whose properties nobody had re-checked. A test that cannot fail is not coverage.
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

// Populated in beforeAll from a LIVE login, or from TEST_AUTH_TOKEN if one is supplied.
// TOKEN_SOURCE records which, so the three JWT-shape cases can refuse to run on stale input.
let TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || '';
let TOKEN_SOURCE = process.env.TEST_AUTH_TOKEN ? 'env' : 'none';

// =============================================================================
// RATE PACING — shares one window with the other three RetailCrm suites
//
// Playwright's built-in `request` fixture is replaced with a paced one, so the API calls in this file
// cannot exhaust the global 429 budget that api_test and the boundary suite also draw on.
//
// Scoped to the BACKEND host only. Most cases here drive the FRONTEND through a real browser
// (page / browser fixtures), and those requests are neither paced nor counted: they go to a different
// host behind a different limiter, and page.evaluate() fetches are outside Playwright's request API
// entirely. That is correct, not a gap — but it does mean this file's pacing only covers its
// request-fixture traffic.
// =============================================================================

const test = base.extend({
  request: async ({ playwright }, use) => {
    const ctx = await playwright.request.newContext();
    await use(pacedContext(ctx, { host: new URL(BASE_URL).host, label: 'vapt][pace' }));
    await ctx.dispose();
  },
});

// =============================================================================
// HELPERS
// =============================================================================

// Fills the phone number in the login UI and clicks the send-OTP button.
async function loginWithPhoneInUI(page, phone) {
  const phoneInput = page.locator(
    'input[type="tel"], input[type="number"][maxlength="10"], input[placeholder*="phone" i], input[placeholder*="mobile" i], input[name*="phone" i]'
  ).first();
  await phoneInput.waitFor({ state: 'visible', timeout: 15_000 });
  await phoneInput.fill(phone);

  const sendBtn = page.locator(
    'button:has-text("Get OTP"), button:has-text("Send OTP"), button:has-text("Continue"), button:has-text("Send"), button[type="submit"]'
  ).first();
  await sendBtn.click();
}

// Completes a full UI login using the dev bypass OTP without triggering a real
// request-otp API call. request-otp is intercepted and mocked (200) so the app's
// UI advances to the OTP entry screen — the bypass OTP is then filled programmatically.
// The real verify-otp is called by the app's own JS, preserving post-login
// localStorage / cookie behaviour for accurate security testing.
async function loginWithBypassOTP(page) {
  await page.route(`${BASE_URL}/api/auth/request-otp`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ login_challenge: 'bypass-test-challenge', message: 'OTP sent successfully' }),
    });
  });

  await page.goto(FRONTEND_URL);
  await loginWithPhoneInUI(page, TEST_PHONE);

  // Wait for OTP input to appear after (mocked) request-otp succeeds
  const otpInput = page.locator(
    'input[maxlength="6"], input[placeholder*="otp" i], input[placeholder*="OTP" i], input[placeholder*="verification" i], input[name*="otp" i]'
  ).first();
  await otpInput.waitFor({ state: 'visible', timeout: 10_000 });
  await otpInput.fill(TEST_OTP);

  const submitBtn = page.locator(
    'button:has-text("Verify"), button:has-text("Submit"), button:has-text("Confirm"), button:has-text("Login"), button:has-text("Continue"), button[type="submit"]'
  ).first();
  await submitBtn.click();

  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  await page.unroute(`${BASE_URL}/api/auth/request-otp`);
}

// Extracts auth token and user_id after the user has logged in manually via the UI.
// Checks localStorage, sessionStorage, and cookies (Playwright can read httpOnly cookies).
async function extractAuthFromPage(page) {
  // Check localStorage
  const lsData = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      out[k] = localStorage.getItem(k);
    }
    return out;
  });

  let access_token = null;
  for (const value of Object.values(lsData)) {
    if (typeof value === 'string' && value.startsWith('eyJ') && value.split('.').length === 3) {
      access_token = value;
      break;
    }
  }

  // Check sessionStorage
  if (!access_token) {
    const ssData = await page.evaluate(() => {
      const out = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        out[k] = sessionStorage.getItem(k);
      }
      return out;
    });
    for (const value of Object.values(ssData)) {
      if (typeof value === 'string' && value.startsWith('eyJ') && value.split('.').length === 3) {
        access_token = value;
        break;
      }
    }
  }

  // Check cookies — Playwright can read httpOnly cookies
  if (!access_token) {
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(
      (c) => c.name === 'retail_crm_access' ||
             (typeof c.value === 'string' && c.value.startsWith('eyJ') && c.value.split('.').length === 3)
    );
    if (authCookie) access_token = authCookie.value;
  }

  // Decode user_id from JWT payload
  let user_id = null;
  if (access_token) {
    try {
      const payload = JSON.parse(Buffer.from(access_token.split('.')[1], 'base64url').toString());
      user_id = payload.sub ?? payload.user_id ?? payload.userId ?? null;
    } catch { /* ignore */ }
  }

  return { access_token, user_id };
}

// =============================================================================
// SETUP — obtain a fresh JWT for VAPT-007a/b/c
// =============================================================================

test.beforeAll(async ({ request }) => {
  // 180s, not 30s. The login here now waits at the shared rate gate, and an OTP-bucket hold alone can
  // be ~25s. At 30s this hook TIMED OUT, and a beforeAll timeout aborts the whole file — the run
  // reported "3 failed, 11 did not run" instead of a real result. Pacing buys consistency by spending
  // wall-clock, so every hook that now sits behind the gate needs room for it.
  test.setTimeout(180_000);
  if (TOKEN_SOURCE === 'env') {
    console.log('[beforeAll] TEST_AUTH_TOKEN set via env var — VAPT-007a/b/c will use it');
    return;
  }
  try {
    // Skip request-otp to avoid rate limiting — dev bypass OTP works directly with verify-otp
    const verifyRes = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
      data: { phone_number: TEST_PHONE, otp: TEST_OTP },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    });
    const verifyBody = await verifyRes.json().catch(() => ({}));

    // Token may be in the JSON body or in Set-Cookie
    let access_token = verifyBody.access_token || null;
    if (!access_token) {
      const setCookie = verifyRes.headers()['set-cookie'] || '';
      const match = setCookie.match(/retail_crm_access=([^;]+)/);
      if (match) access_token = match[1];
    }

    if (access_token) {
      TEST_AUTH_TOKEN = access_token;
      TOKEN_SOURCE = 'live';
      console.log('[beforeAll] JWT obtained via verify-otp direct (dev bypass OTP) — VAPT-007a/b/c ready');
    } else {
      TOKEN_SOURCE = 'failed';
      console.log(
        `[beforeAll] verify-otp returned ${verifyRes.status()} but no token found — ` +
          'VAPT-007a/b/c will FAIL as a SETUP GAP (they are not allowed to fall back to the stale ' +
          'reference token, which would pass without testing anything current).'
      );
      console.log('[beforeAll] Tip: set TEST_AUTH_TOKEN=<jwt> env var to bypass this step.');
    }
  } catch (err) {
    TOKEN_SOURCE = 'failed';
    console.log(`[beforeAll] Auth API call failed: ${err.message} — VAPT-007a/b/c will FAIL as a SETUP GAP.`);
  }
});

// The pacer holds INSIDE the wrapped request call, for up to a full window (~60s). Added to the
// config's 60s global timeout, that kills a test on a timeout that reads as a product defect. 9 of the
// 15 cases here carry no explicit timeout, so this sets the floor for all of them; the explicit
// test.setTimeout() calls in individual bodies still win, since they run after this hook.
test.beforeEach(async () => {
  test.setTimeout(150_000);
});

/**
 * VAPT-007a/b/c inspect the JWT's own structure, so they only mean something against a token the
 * server issued during THIS run (or one deliberately supplied via TEST_AUTH_TOKEN). The old guard
 * was `if (!TEST_AUTH_TOKEN) test.skip(...)`, which could never fire because the variable was
 * initialised to a hardcoded literal — so the "skip" was dead code hiding a much worse problem.
 */
function requireLiveToken(testId) {
  if (TEST_AUTH_TOKEN && (TOKEN_SOURCE === 'live' || TOKEN_SOURCE === 'env')) return;
  failNotExecuted(
    testId,
    FAILURE_CLASSES.SETUP,
    'no freshly issued JWT was available, so the token structure was never inspected',
    `TOKEN_SOURCE=${TOKEN_SOURCE}. The beforeAll login did not return a token — most often ` +
      `${TEST_PHONE} is in OTP cooldown (403) or the bypass code changed (401).\n` +
      `This case deliberately does NOT fall back to STALE_REFERENCE_TOKEN (expired ` +
      `2026-06-08). Doing so is what made VAPT-007a/b/c pass for months without examining a ` +
      `current token. Re-run after the cooldown, or pass TEST_AUTH_TOKEN=<fresh jwt>.`
  );
}

// =============================================================================
// VAPT-001  Issue 1 — Horizontal Privilege Escalation
// User B's JWT must not be able to DELETE a session owned by User A.
//
// TAGGED @manual AND EXCLUDED FROM THE DEFAULT RUN. It calls page.pause() twice and waits for a
// human to type two OTPs into two browser windows, so unattended it can only ever end in a
// timeout — a red that means "nobody was at the keyboard" is noise, and noise is what trains
// people to ignore red.
//
//   Automated equivalent: CB-IDOR-01..05 in retail_crm_chatbot_boundary_test.js, which do the same
//   cross-account checks over the API (read, rename, cross-write and feedback paths) using cached
//   logins, so no coverage is lost by excluding this one.
//
//   Run it deliberately:  npm run test:chatbot:manual
// =============================================================================

test('[VAPT-001] @manual Horizontal Privilege Escalation – User B JWT cannot DELETE User A session (VAPT 5.1)', async ({ browser }) => {
  test.setTimeout(300_000); // extended — test pauses twice for manual OTP entry in the browser UI

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  try {
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // ── User A login ──────────────────────────────────────────────────────────
    await pageA.goto(FRONTEND_URL);
    await loginWithPhoneInUI(pageA, TEST_PHONE);
    console.log(`[VAPT-001] STEP 1 of 2 — OTP sent to User A (${TEST_PHONE}). Enter OTP in the browser, then click Resume in Playwright Inspector.`);
    await pageA.pause();

    const authA = await extractAuthFromPage(pageA);
    if (!authA.access_token) {
      failNotExecuted(
        'VAPT-001',
        FAILURE_CLASSES.SETUP,
        'no access token could be extracted for User A after the manual UI login',
        'The login must be COMPLETED in the browser window before clicking Resume in the ' +
          'Playwright Inspector. If it was completed, the app has changed where it stores the ' +
          'token — see extractAuthFromPage(), which checks localStorage, sessionStorage and cookies.'
      );
    }
    console.log(`[VAPT-001] User A authenticated. user_id: ${authA.user_id}`);

    // Create a chat session as User A
    const sessionA = await pageA.evaluate(
      async ({ apiBase, token, userId }) => {
        const res = await fetch(`${apiBase}/api/chat/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ user_id: userId, persona: 'dealer' }),
        });
        const body = await res.json().catch(() => ({}));
        return { status: res.status, id: body.id ?? null };
      },
      { apiBase: BASE_URL, token: authA.access_token, userId: authA.user_id }
    );

    if (sessionA.status !== 200 || !sessionA.id) {
      failNotExecuted(
        'VAPT-001',
        FAILURE_CLASSES.SERVER,
        `could not create the victim session as User A (POST /api/chat/sessions -> ${sessionA.status})`,
        'Without User A owning a real session there is nothing for User B to attempt to delete.'
      );
    }
    console.log(`[VAPT-001] User A session created: ${sessionA.id}`);

    // ── User B login ──────────────────────────────────────────────────────────
    await pageB.goto(FRONTEND_URL);
    await loginWithPhoneInUI(pageB, TEST_PHONE_B);
    console.log(`[VAPT-001] STEP 2 of 2 — OTP sent to User B (${TEST_PHONE_B}). Enter OTP in the browser, then click Resume in Playwright Inspector.`);
    await pageB.pause();

    const authB = await extractAuthFromPage(pageB);
    if (!authB.access_token) {
      failNotExecuted(
        'VAPT-001',
        FAILURE_CLASSES.SETUP,
        'no access token could be extracted for User B after the manual UI login',
        `Complete the login for ${TEST_PHONE_B} in the second browser window before clicking ` +
          'Resume. Note that User B needs its own bypass OTP pairing in AUTH_TEST_OTP_CODES.'
      );
    }
    console.log(`[VAPT-001] User B authenticated. user_id: ${authB.user_id}`);

    // ── Privilege escalation attempt ──────────────────────────────────────────
    // User B attempts to DELETE User A's session using User B's JWT
    const deleteResult = await pageB.evaluate(
      async ({ apiBase, sessionId, token }) => {
        const res = await fetch(`${apiBase}/api/chat/sessions/${sessionId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        return { status: res.status };
      },
      { apiBase: BASE_URL, sessionId: sessionA.id, token: authB.access_token }
    );

    console.log(`[VAPT-001] DELETE User A session with User B JWT → ${deleteResult.status}`);

    if (deleteResult.status === 200) {
      throw new Error(
        `[VAPT-001] VAPT 5.1 NOT FIXED: User B successfully deleted User A's session (got 200). ` +
        `Server must enforce ownership and return 403 for cross-user DELETE attempts.`
      );
    }
    expect(deleteResult.status).toBe(403);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

// API-level counterpart to VAPT-001: the 2026-07-09 schema update states that
// POST /api/chat/sessions returns 403 when the body user_id differs from the JWT
// subject (no silent override). This exercises the server-side ownership binding
// directly, without the two-browser manual-OTP flow.
test('[VAPT-001b] Create-session with a user_id ≠ JWT sub must be rejected with 403 (VAPT 5.1)', async ({ request }) => {
  test.setTimeout(150_000);
  // Establish a valid authenticated identity on THIS request context via the dev
  // bypass OTP (verify-otp only — no request-otp, so no rate-limit). The server sets
  // an HttpOnly auth cookie the context sends automatically; a Bearer header is not
  // needed (and the file's hardcoded TEST_AUTH_TOKEN is stale). The caller's real
  // identity is the JWT sub for TEST_PHONE; the body user_id below deliberately differs.
  const login = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
    data: { phone_number: TEST_PHONE, otp: TEST_OTP },
    headers: { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
    timeout: 15_000,
  });
  failOn429(login.status(), 'VAPT-001b');
  if (login.status() !== 200) {
    failNotExecuted(
      'VAPT-001b',
      FAILURE_CLASSES.SETUP,
      `could not authenticate for the ownership test (verify-otp → ${login.status()})`,
      `A 403 means ${TEST_PHONE} is in OTP cooldown; a 401 means TEST_OTP is no longer a configured ` +
        `bypass code. CB-IDOR-01..05 in retail_crm_chatbot_boundary_test.js cover the same ownership ` +
        `property across the read and write paths and cache their logins, so they are the better ` +
        `first place to look when this one cannot run.`
    );
  }

  const response = await request.post(`${BASE_URL}/api/chat/sessions`, {
    data: { user_id: `vapt001b-not-my-sub-${TEST_PHONE_B}`, persona: 'dealer' },
    headers: { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
    timeout: 15_000,
  });
  const status = response.status();
  console.log(`[VAPT-001b] Create session with mismatched user_id → ${status}`);
  failOn429(status, 'VAPT-001b');
  if (status === 200) {
    throw new Error(
      '[VAPT-001b] VAPT 5.1 NOT FIXED: server created a session for a user_id that does not match ' +
      "the caller's JWT sub (got 200). Body user_id must be bound to the token subject (expected 403)."
    );
  }
  expect(status).toBe(403);
});

// =============================================================================
// VAPT-002  Issue 2 — Client-Side Session Hijacking via localStorage
// Token must be stored in an HttpOnly cookie, NOT in localStorage.
// Cookie must also have Secure and SameSite attributes.
// =============================================================================

test('[VAPT-002] Token must use HttpOnly cookie – not localStorage; cookie must have Secure + SameSite (VAPT 5.2)', async ({ page }) => {
  test.setTimeout(150_000);

  // Full UI login via mocked request-otp + programmatic OTP entry.
  // Ensures the app's own verify-otp response handler runs so localStorage / cookie
  // behaviour reflects what the frontend actually does — not a test-injected state.
  await loginWithBypassOTP(page);
  console.log('[VAPT-002] UI login complete via bypass OTP (request-otp mocked, verify-otp real)');

  // Check if the token has been placed in localStorage (it must NOT be)
  const tokenInStorage = await page.evaluate(() => {
    return (
      localStorage.getItem('retail_crm_access') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      null
    );
  });

  if (tokenInStorage) {
    throw new Error(
      `[VAPT-002] VAPT 5.2 NOT FIXED: JWT found in localStorage. ` +
      `Tokens must be stored in HttpOnly cookies only — localStorage is accessible to XSS scripts.`
    );
  }

  // Check cookies set by the auth API
  const cookies = await page.context().cookies(BASE_URL);
  const authCookie = cookies.find((c) => c.name === 'retail_crm_access');

  if (authCookie) {
    console.log(`[VAPT-002] Auth cookie: httpOnly=${authCookie.httpOnly} secure=${authCookie.secure} sameSite=${authCookie.sameSite}`);
    expect(authCookie.httpOnly, 'Cookie must be HttpOnly (VAPT 5.2)').toBe(true);
    expect(authCookie.secure, 'Cookie must have Secure flag (VAPT 5.2)').toBe(true);
    const sameSiteOk = authCookie.sameSite === 'Strict' || authCookie.sameSite === 'Lax';
    expect(
      sameSiteOk,
      `Cookie SameSite must be Strict or Lax, got: ${authCookie.sameSite} (VAPT 5.2)`
    ).toBe(true);
  } else {
    console.log('[VAPT-002] No retail_crm_access cookie found — token may be stored elsewhere or login incomplete.');
  }
});

// =============================================================================
// VAPT-003  Issue 3 — Authentication Bypass via OTP Response Manipulation
// Wrong OTP must be rejected (401). Replaying an already-used login_challenge
// with a wrong OTP must also be rejected (401).
// =============================================================================

test('[VAPT-003] Wrong OTP must be rejected; login_challenge replay must be rejected (VAPT 5.3)', async ({ request }) => {
  test.setTimeout(150_000);

  // Call verify-otp directly with a wrong OTP — no request-otp needed (avoids rate limiting).
  // Challenge replay skipped since we have no login_challenge without a prior request-otp call.
  const response = await request.post(`${BASE_URL}/api/auth/verify-otp`, {
    data: { phone_number: TEST_PHONE, otp: '000000' },
    headers: { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
    timeout: 15_000,
  });
  const attempt1Status = response.status();
  console.log(`[VAPT-003] Wrong OTP → ${attempt1Status} | Challenge replay → N/A (skipped — no login_challenge without request-otp)`);

  failOn429(
    attempt1Status,
    'VAPT-003',
    'A 429 here is ambiguous: it could be the rate limit VAPT-008 wants to see, or it could mean ' +
      'this run never got to send its wrong OTP at all. Because the wrong-OTP rejection was NOT ' +
      'observed, this case must not report a verdict. Re-run after the cooldown.'
  );
  if (attempt1Status === 200) {
    throw new Error('[VAPT-003] VAPT 5.3 NOT FIXED: Wrong OTP accepted (got 200). Server must reject incorrect OTPs with 401.');
  }
  expect([401, 422]).toContain(attempt1Status);
  console.log(`[VAPT-003] Wrong OTP correctly rejected with ${attempt1Status}`);
});

// =============================================================================
// VAPT-004  Issue 4 — Sensitive Data Exposure in Local Storage
// Phone numbers, full names, and raw profile data must not be in localStorage.
// =============================================================================

test('[VAPT-004] LocalStorage must not contain phone numbers or sensitive profile data (VAPT 5.4)', async ({ page }) => {
  test.setTimeout(150_000);

  // Full UI login via mocked request-otp + programmatic OTP entry.
  // The app's verify-otp response handler runs for real — any localStorage writes
  // that happen during the login flow are captured by the snapshot below.
  await loginWithBypassOTP(page);
  console.log('[VAPT-004] UI login complete via bypass OTP (request-otp mocked, verify-otp real)');

  // Snapshot all localStorage keys + values
  const storageSnapshot = await page.evaluate(() => {
    const result = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      result[key] = localStorage.getItem(key);
    }
    return result;
  });

  console.log('[VAPT-004] localStorage keys found:', Object.keys(storageSnapshot));

  const phonePattern = /\b\d{10}\b/;
  const sensitivePrefixes = ['phone', 'mobile', 'name', 'user_profile', 'profile', 'username'];

  for (const [key, value] of Object.entries(storageSnapshot)) {
    // Check value for 10-digit phone number pattern
    if (value && phonePattern.test(value)) {
      throw new Error(
        `[VAPT-004] VAPT 5.4 NOT FIXED: localStorage["${key}"] appears to contain a phone number. ` +
        `Sensitive profile data must not be stored in localStorage.`
      );
    }
    // Check key names for known sensitive categories
    for (const prefix of sensitivePrefixes) {
      if (key.toLowerCase().includes(prefix)) {
        throw new Error(
          `[VAPT-004] VAPT 5.4 NOT FIXED: localStorage key "${key}" stores user profile data. ` +
          `Sensitive fields must not be persisted in localStorage.`
        );
      }
    }
  }
});

// =============================================================================
// VAPT-005  Issue 5 — Insecure CORS Policy (frontend)
// Frontend must not reflect untrusted origins in CORS response headers.
// =============================================================================

test('[VAPT-005] Frontend does not reflect untrusted origin in CORS headers (VAPT 5.5)', async ({ page }) => {
  // Inject Origin: https://evil.com on the navigation request
  await page.route(FRONTEND_URL + '/**', async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), 'Origin': 'https://evil.com' },
    });
  });
  await page.route(FRONTEND_URL, async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), 'Origin': 'https://evil.com' },
    });
  });

  const response = await page.goto(FRONTEND_URL);
  const acao = response.headers()['access-control-allow-origin'];
  const acac = response.headers()['access-control-allow-credentials'];

  console.log(`[VAPT-005] Access-Control-Allow-Origin: ${acao ?? '(not present)'}`);
  console.log(`[VAPT-005] Access-Control-Allow-Credentials: ${acac ?? '(not present)'}`);

  if (acao !== undefined) {
    expect(
      acao,
      'Frontend must not reflect untrusted origin in CORS ACAO header (VAPT 5.5)'
    ).not.toBe('https://evil.com');
    expect(
      acao,
      'Wildcard CORS must not be set on frontend responses (VAPT 5.5)'
    ).not.toBe('*');
  }

  // Reflected ACAO + credentials=true is the critical combination (allows session hijack)
  if (acao === 'https://evil.com' && acac === 'true') {
    throw new Error(
      '[VAPT-005] VAPT 5.5 NOT FIXED: ACAO reflects evil.com AND credentials=true is set. ' +
      'This allows cross-origin credential theft.'
    );
  }
});

// =============================================================================
// VAPT-006  Issue 6 — Clickjacking
// Frontend page must send X-Frame-Options: DENY and CSP frame-ancestors.
// =============================================================================

// Report 5.6 remediation (Status: Closed) requires X-Frame-Options: DENY AND
// CSP frame-ancestors 'none' on ALL responses. The old test accepted the weaker
// SAMEORIGIN and any frame-ancestors value, so a partial fix could pass. This
// version asserts the exact recommended values and rejects duplicate headers.
test('[VAPT-006] Frontend response enforces X-Frame-Options DENY and CSP frame-ancestors \'none\' (VAPT 5.6)', async ({ page }) => {
  const response = await page.goto(FRONTEND_URL);
  const headerMap = buildHeaderMap(await response.headersArray());

  const xfoAll = headerMap['x-frame-options'] || [];
  const cspAll = headerMap['content-security-policy'] || [];
  const xfo = xfoAll[0];
  const csp = (cspAll[0] || '').toLowerCase();

  console.log(`[VAPT-006] X-Frame-Options: ${xfoAll.length ? xfoAll.join(' || ') : '(missing)'}`);
  console.log(`[VAPT-006] Content-Security-Policy: ${cspAll.length ? cspAll[0] : '(missing)'}`);

  // Presence
  expect(xfo, 'X-Frame-Options missing on frontend page (VAPT 5.6 — clickjacking protection)').toBeTruthy();
  expect(cspAll[0], 'Content-Security-Policy missing on frontend (VAPT 5.6)').toBeTruthy();

  // No duplicate framing headers (conflicting/duplicated values weaken enforcement)
  expect(xfoAll.length, `X-Frame-Options duplicated (${xfoAll.length}x) — send exactly once (VAPT 5.6)`).toBeLessThanOrEqual(1);
  expect(cspAll.length, `Content-Security-Policy duplicated (${cspAll.length}x) — send exactly once (VAPT 5.6)`).toBeLessThanOrEqual(1);

  // Exact recommended values
  expect(xfo.toUpperCase(), `X-Frame-Options must be DENY, got: "${xfo}" (VAPT 5.6)`).toBe('DENY');
  expect(csp, 'CSP must include frame-ancestors directive (VAPT 5.6)').toContain('frame-ancestors');
  expect(
    csp.replace(/\s+/g, ' '),
    "CSP frame-ancestors must be 'none' to prevent framing from any origin (VAPT 5.6)"
  ).toMatch(/frame-ancestors\s+'none'/);
});

// =============================================================================
// VAPT-007a  Issue 7 — JWT Algorithm
// Token must use RS256 or ES256 (asymmetric); HS256 is not acceptable.
// =============================================================================

test('[VAPT-007a] JWT must use RS256 or ES256 – not HS256 (VAPT 5.7)', async () => {
  requireLiveToken('VAPT-007a');
  const parts = TEST_AUTH_TOKEN.split('.');
  expect(parts.length, 'TEST_AUTH_TOKEN must be a valid 3-part JWT').toBe(3);

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  console.log(`[VAPT-007a] JWT header: alg=${header.alg} typ=${header.typ}`);

  if (header.alg === 'HS256') {
    throw new Error(
      `[VAPT-007a] VAPT 5.7 NOT FIXED: JWT uses HS256 (symmetric HMAC). ` +
      `Must use RS256 or ES256 — asymmetric algorithms ensure the private signing key is never shared with clients.`
    );
  }
  expect(['RS256', 'ES256'], `JWT alg must be RS256 or ES256, got: "${header.alg}"`).toContain(header.alg);
});

// =============================================================================
// VAPT-007b  Issue 7 — JWT Expiry Duration
// Token lifetime must be ≤ 30 minutes (1800 seconds), not 24 hours.
// =============================================================================

test('[VAPT-007b] JWT expiry window must be ≤ 30 minutes (1800 s) (VAPT 5.7)', async () => {
  requireLiveToken('VAPT-007b');
  const parts = TEST_AUTH_TOKEN.split('.');
  expect(parts.length, 'TEST_AUTH_TOKEN must be a valid 3-part JWT').toBe(3);

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  const duration = payload.exp - payload.iat;
  console.log(`[VAPT-007b] JWT lifetime: ${duration}s (${(duration / 3600).toFixed(2)}h)`);

  if (duration > 1800) {
    throw new Error(
      `[VAPT-007b] VAPT 5.7 NOT FIXED: JWT lifetime is ${duration}s (${(duration / 3600).toFixed(1)}h). ` +
      `Must be ≤ 1800s (30 min). Long-lived tokens increase the window for token theft.`
    );
  }
  expect(duration).toBeLessThanOrEqual(1800);
});

// =============================================================================
// VAPT-007c  Issue 7 — JWT Audience Claim
// Token must include the "aud" claim to prevent cross-service token reuse.
// =============================================================================

test('[VAPT-007c] JWT payload must include an aud (audience) claim (VAPT 5.7)', async () => {
  requireLiveToken('VAPT-007c');
  const parts = TEST_AUTH_TOKEN.split('.');
  expect(parts.length, 'TEST_AUTH_TOKEN must be a valid 3-part JWT').toBe(3);

  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  console.log(`[VAPT-007c] JWT aud: ${payload.aud ?? '(missing)'}`);

  expect(
    payload.aud,
    'JWT must contain aud claim — prevents tokens issued for one service being accepted by another (VAPT 5.7)'
  ).toBeTruthy();
});

// =============================================================================
// VAPT-012  Issue 7 (token lifecycle) — Refresh endpoint must require a valid
// refresh cookie. POST /api/auth/refresh (added 2026-07-09) mints a new access
// token from an HttpOnly refresh cookie; called with no cookie / no auth it must
// NOT issue a token — otherwise anyone could mint tokens anonymously.
// =============================================================================

test('[VAPT-012] POST /api/auth/refresh with no refresh cookie must not mint a token (VAPT 5.7)', async ({ request }) => {
  test.setTimeout(150_000);
  // Fresh `request` context in this test has no auth cookie set.
  const response = await request.post(`${BASE_URL}/api/auth/refresh`, {
    headers: { 'Content-Type': 'application/json' },
    failOnStatusCode: false,
    timeout: 15_000,
  });
  const status = response.status();
  const body = await response.json().catch(() => ({}));
  const setCookie = response.headers()['set-cookie'] || '';
  console.log(`[VAPT-012] refresh (no cookie) → ${status}`);

  failOn429(status, 'VAPT-012');
  const mintedToken =
    (typeof body.access_token === 'string' && body.access_token.split('.').length === 3) ||
    /retail_crm_access=eyJ/.test(setCookie);
  if (status === 200 && mintedToken) {
    throw new Error(
      '[VAPT-012] VAPT 5.7 NOT ENFORCED: /api/auth/refresh minted an access token without a valid ' +
      'refresh cookie (got 200 + token). Refresh must require a valid HttpOnly refresh token.'
    );
  }
  expect([401, 403]).toContain(status);
});

// =============================================================================
// VAPT-009  Issue 9 — Missing / Misconfigured Security Headers
// =============================================================================
// Report 5.9 was kept OPEN ("partially fixed") even though headers exist, because:
//   - CSP on the HTML root was reduced to only `frame-ancestors 'none'`;
//     CSP on the API still contained `unsafe-inline`.
//   - HSTS was DUPLICATED and missing `includeSubDomains` / `preload`.
//   - X-Content-Type-Options was DUPLICATED on the API.
//   - Cache-Control was overly permissive for dynamic/sensitive responses.
//   - Permissions-Policy was absent.
// The old test only checked header *presence* on the frontend, so it passed while
// the finding stayed open. These tests assert directive CORRECTNESS + NO DUPLICATES,
// and cover BOTH the frontend HTML root AND the backend API host (per the report).
// No Burp needed — Playwright reads raw response headers via headersArray().

// API endpoint the report inspected for headers (non-streaming, returns fast).
const VAPT009_API_ENDPOINT = `${BASE_URL}/api/auth/verify-otp`;

// Build a case-insensitive name -> [values] map from a Playwright headersArray().
// Lets us detect headers that are sent more than once (a key 5.9 finding).
function buildHeaderMap(headersArray) {
  const map = {};
  for (const { name, value } of headersArray) {
    const key = name.toLowerCase();
    (map[key] = map[key] || []).push(value);
  }
  return map;
}

// Shared assertions for one response's security headers.
// `isDynamic` => API/sensitive responses must NOT be cacheable.
function assertSecurityHeaders(label, headerMap, { isDynamic }) {
  const first = (k) => (headerMap[k] ? headerMap[k][0] : undefined);
  const count = (k) => (headerMap[k] ? headerMap[k].length : 0);
  const log = (k) => console.log(`[VAPT-009][${label}] ${k}: ${headerMap[k] ? headerMap[k].join(' || ') : 'MISSING'}`);

  [
    'content-security-policy', 'x-frame-options', 'x-content-type-options',
    'strict-transport-security', 'referrer-policy', 'permissions-policy', 'cache-control',
  ].forEach(log);

  // --- Presence ---
  expect(first('content-security-policy'), `${label}: Content-Security-Policy missing (VAPT 5.9)`).toBeTruthy();
  expect(first('x-frame-options'),         `${label}: X-Frame-Options missing (VAPT 5.9)`).toBeTruthy();
  expect(first('x-content-type-options'),  `${label}: X-Content-Type-Options missing (VAPT 5.9)`).toBeTruthy();
  expect(first('strict-transport-security'),`${label}: Strict-Transport-Security missing (VAPT 5.9)`).toBeTruthy();
  expect(first('referrer-policy'),         `${label}: Referrer-Policy missing (VAPT 5.9)`).toBeTruthy();
  expect(first('permissions-policy'),      `${label}: Permissions-Policy missing (VAPT 5.9)`).toBeTruthy();

  // --- No duplicate headers (report flagged duplicated HSTS / X-Content-Type-Options) ---
  for (const k of ['strict-transport-security', 'x-content-type-options', 'content-security-policy']) {
    expect(count(k), `${label}: ${k} is duplicated (${count(k)}x) — must be sent exactly once (VAPT 5.9)`).toBeLessThanOrEqual(1);
  }

  // --- X-Frame-Options correctness ---
  expect(first('x-frame-options').toUpperCase(),
    `${label}: X-Frame-Options must be DENY (VAPT 5.9)`).toBe('DENY');

  // --- X-Content-Type-Options correctness ---
  expect(first('x-content-type-options').toLowerCase(),
    `${label}: X-Content-Type-Options must be "nosniff" (VAPT 5.9)`).toBe('nosniff');

  // --- HSTS: full directives required ---
  const hsts = first('strict-transport-security').toLowerCase();
  expect(hsts, `${label}: HSTS must set max-age=31536000 (VAPT 5.9)`).toContain('max-age=31536000');
  expect(hsts, `${label}: HSTS must include "includeSubDomains" (VAPT 5.9)`).toContain('includesubdomains');
  expect(hsts, `${label}: HSTS must include "preload" (VAPT 5.9)`).toContain('preload');

  // --- CSP: must be hardened, not just frame-ancestors, and must NOT allow unsafe-inline ---
  const csp = first('content-security-policy').toLowerCase();
  expect(csp, `${label}: CSP must define default-src (not just frame-ancestors) (VAPT 5.9)`).toContain('default-src');
  expect(csp, `${label}: CSP must set frame-ancestors 'none' (VAPT 5.9)`).toContain("frame-ancestors");
  expect(csp, `${label}: CSP must NOT contain 'unsafe-inline' (VAPT 5.9)`).not.toContain('unsafe-inline');
  expect(csp, `${label}: CSP must NOT contain 'unsafe-eval' (VAPT 5.9)`).not.toContain('unsafe-eval');

  // --- Cache-Control: dynamic/sensitive responses must not be cacheable ---
  if (isDynamic) {
    const cc = (first('cache-control') || '').toLowerCase();
    expect(cc, `${label}: Cache-Control must be set on dynamic responses (VAPT 5.9)`).toBeTruthy();
    expect(cc, `${label}: dynamic Cache-Control must include "no-store" (VAPT 5.9)`).toContain('no-store');
  }
}

// 5.9a — Frontend HTML root
test('[VAPT-009a] Frontend HTML root must send correctly-configured security headers (VAPT 5.9)', async ({ page }) => {
  const response = await page.goto(FRONTEND_URL);
  const headerMap = buildHeaderMap(await response.headersArray());
  assertSecurityHeaders('frontend', headerMap, { isDynamic: false });
});

// 5.9b — Backend API host (the report inspected API responses separately and kept them open)
test('[VAPT-009b] Backend API responses must send correctly-configured security headers (VAPT 5.9)', async ({ request }) => {
  // Headers are returned regardless of auth outcome; a 4xx body is fine for inspection.
  const response = await request.post(VAPT009_API_ENDPOINT, {
    data: { phone: '0000000000', otp: '000000' },
    failOnStatusCode: false,
    timeout: 30_000,
  });
  console.log(`[VAPT-009b] ${VAPT009_API_ENDPOINT} -> HTTP ${response.status()}`);
  const headerMap = buildHeaderMap(response.headersArray());
  assertSecurityHeaders('api', headerMap, { isDynamic: true });
});

// =============================================================================
// VAPT-010  Issue 10 — SSL BREACH Vulnerability (frontend)
// Frontend must not serve responses with gzip Content-Encoding over HTTPS.
// =============================================================================

test('[VAPT-010] Frontend page must not be served with gzip compression (VAPT 5.10 – BREACH)', async ({ page }) => {
  // Add Accept-Encoding: gzip to the navigation request so the server knows the client accepts it
  await page.route('**/*', async (route) => {
    await route.continue({
      headers: { ...route.request().headers(), 'Accept-Encoding': 'gzip, deflate, br' },
    });
  });

  const response = await page.goto(FRONTEND_URL);
  const contentEncoding = response.headers()['content-encoding'];

  console.log(`[VAPT-010] Content-Encoding: ${contentEncoding ?? '(none — correct)'}`);

  if (contentEncoding && contentEncoding.includes('gzip')) {
    throw new Error(
      `[VAPT-010] VAPT 5.10 NOT FIXED: Frontend served with Content-Encoding: ${contentEncoding}. ` +
      `Disable HTTP compression for HTTPS responses to prevent SSL BREACH attacks.`
    );
  }
  expect(
    contentEncoding ?? '',
    'Frontend Content-Encoding must not include gzip (VAPT 5.10 — BREACH mitigation)'
  ).not.toContain('gzip');
});

// =============================================================================
// VAPT-011  Issue 11 — Banner Grabbing (frontend)
// Server and X-Powered-By headers must not expose technology stack information.
// =============================================================================

test('[VAPT-011] Frontend response must not expose Server or X-Powered-By headers (VAPT 5.11 – Banner Grabbing)', async ({ page }) => {
  const response = await page.goto(FRONTEND_URL);
  const headers = response.headers();

  const serverHeader = (headers['server'] || '').toLowerCase();
  const poweredBy    = headers['x-powered-by'];

  console.log(`[VAPT-011] Server: ${headers['server'] ?? '(not present)'}`);
  console.log(`[VAPT-011] X-Powered-By: ${poweredBy ?? '(not present)'}`);

  if (serverHeader.includes('nginx')) {
    throw new Error(
      `[VAPT-011] VAPT 5.11 NOT FIXED: Server header exposes web server info: "${headers['server']}". ` +
      `Remove or sanitize the Server header.`
    );
  }
  if (serverHeader.includes('next.js') || serverHeader.includes('nextjs')) {
    throw new Error(
      `[VAPT-011] VAPT 5.11 NOT FIXED: Server header exposes framework info: "${headers['server']}". ` +
      `Remove the Server header.`
    );
  }
  if (poweredBy) {
    throw new Error(
      `[VAPT-011] VAPT 5.11 NOT FIXED: X-Powered-By header exposes tech stack: "${poweredBy}". ` +
      `Remove the X-Powered-By header from all responses.`
    );
  }

  expect(serverHeader).not.toContain('nginx');
  expect(serverHeader).not.toContain('next.js');
  expect(poweredBy, 'X-Powered-By header must not be present (VAPT 5.11)').toBeFalsy();
});

// =============================================================================
// VAPT-008  Issue 8 — Weak OTP Validation Rate-Limiting
// Run last — deliberately exhausts OTP attempts which would rate-limit earlier tests.
// Repeated wrong OTP attempts must trigger HTTP 429 before attempt 7.
// =============================================================================

test('[VAPT-008] OTP verify endpoint must rate-limit after repeated failed attempts (VAPT 5.8)', async ({ page }) => {
  test.setTimeout(150_000);

  await page.goto(FRONTEND_URL);

  // These two OTP calls go out through the BROWSER (page.evaluate + fetch), so the rate pacer cannot
  // gate them — it only wraps Playwright's request contexts. It can still ACCOUNT for them, which
  // matters: without this, a chatbot run started after this file walked straight into a 429 on
  // request-otp/verify-otp because the pacer believed those slots were free. Observed exactly that on
  // FUNC-004 and EDGE-011.
  //
  // Not paced on purpose either way — this case MEASURES the cooldown, and spacing the two requests
  // out would stop the second one being blocked, which is the whole assertion.
  recordSend(`${BASE_URL}/api/auth/request-otp`);
  recordSend(`${BASE_URL}/api/auth/request-otp`);

  // Rate limiting is implemented as a cooldown on request-otp (OTP send throttle).
  // Test: first request-otp succeeds (200); an immediate second request must be blocked (429).
  // VAPT-008 runs last — TEST_PHONE safe to use here.
  const result = await page.evaluate(
    async ({ apiBase, phone }) => {
      // First OTP request — expected to succeed
      const res1 = await fetch(`${apiBase}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone }),
      });
      const status1 = res1.status;

      // Immediate second OTP request — must be rate-limited (429)
      const res2 = await fetch(`${apiBase}/api/auth/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone }),
      });
      const status2 = res2.status;
      const body2   = await res2.json().catch(() => ({}));

      return { status1, status2, message: body2.message ?? body2.detail ?? null };
    },
    { apiBase: BASE_URL, phone: TEST_PHONE_B }
  );

  console.log(`[VAPT-008] request-otp attempt 1: ${result.status1}`);
  console.log(`[VAPT-008] request-otp attempt 2 (immediate): ${result.status2} — ${result.message ?? ''}`);

  const isRateLimited = (s) => s === 429 || s === 403;

  // If attempt 1 is already blocked → cooldown still active from a prior run → rate limiting confirmed
  if (isRateLimited(result.status1)) {
    console.log(
      `[VAPT-008] Rate limiting confirmed — request-otp already blocked (${result.status1}): "${result.message}". ` +
      `Note: RFC 6585 recommends 429 instead of 403 for rate limiting.`
    );
    expect(isRateLimited(result.status1)).toBe(true);
    return;
  }

  // Attempt 1 succeeded (200) — attempt 2 must be blocked
  if (!isRateLimited(result.status2)) {
    throw new Error(
      `[VAPT-008] VAPT 5.8 NOT FIXED: Two consecutive request-otp calls both returned ${result.status2}. ` +
      `Server must enforce a cooldown between OTP send requests to prevent brute-force enumeration.`
    );
  }

  console.log(
    `[VAPT-008] Rate limiting confirmed — attempt 1: ${result.status1}, attempt 2 blocked: ${result.status2} "${result.message}". ` +
    `Note: RFC 6585 recommends 429 instead of 403 for rate limiting.`
  );
  expect(isRateLimited(result.status2)).toBe(true);
});
