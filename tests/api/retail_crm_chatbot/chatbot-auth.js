const { request: apiRequest } = require('@playwright/test');
const { URL } = require('url');
const { freshSfaToken, getSfaToken } = require('./sfa-token');
const { pacedContext } = require('./rate-pacer');

/**
 * Config + auth bootstrap for retail_crm_chatbot_boundary_test.js.
 *
 * Deliberately additive: retail_crm_chatbot_api_test.js and retail_crm_chatbot_VAPT_test.js keep their own
 * constants and helpers. Rewiring 195 KB of working tests to import from here buys nothing and
 * risks a lot; the duplication is the cheaper trade.
 *
 * Every value falls back to the literal already in use in those files, so the boundary suite runs
 * with no environment setup — and can be pointed at UAT purely through env vars.
 */

const BASE_URL = process.env.RETAIL_CRM_BASE_URL || `${process.env.CRM_API_URL || 'https://jsonplaceholder.typicode.com'}`;

// UAT, used by EXACTLY ONE case (CB-BYP-05) to confirm the dev OTP bypass is not live there.
// Nothing else in this repo touches another environment. Matches the commented-out URL at the top of
// retail_crm_chatbot_VAPT_test.js.
const UAT_BASE_URL = process.env.UAT_BASE_URL || `${process.env.CRM_API_URL || 'https://jsonplaceholder.typicode.com'}`;

// Primary test identity — same phone/bypass-OTP pair the other two suites use.
const TEST_PHONE = process.env.TEST_PHONE || '9000000001';
const TEST_OTP = process.env.TEST_OTP || '847291';

// Second identity, needed for every real IDOR case. retail_crm_chatbot_VAPT_test.js:39 already carries
// this number, but only reaches it through a browser with two manual OTP entries. If the dev bypass
// authenticates it over the API, the IDOR cases below run unattended. TEST_OTP_B defaults to
// TEST_OTP precisely so CB-BYP-01 can observe whether one code unlocks a second account.
const TEST_PHONE_B = process.env.TEST_PHONE_B || '9000000003';
const TEST_OTP_B = process.env.TEST_OTP_B || TEST_OTP;

// A number that must not exist in AUTH_TEST_OTP_CODES. Used only to probe whether the bypass code
// is pinned to a phone. Reserved 555 range, so it can never be a real customer.
const UNPAIRED_PHONE = process.env.TEST_PHONE_UNPAIRED || '5550000123';

const SFA_API_KEY =
  process.env.SFA_KNOW_PRODUCT_API_KEY || 'gPGyNxckfPd982oOi6jeoDIEATXL1GPCG0JTchdnhFI';

// Chat queries reach an LLM; 45 s covers a cold pipeline without letting a hung request eat the
// whole test timeout.
const REQUEST_TIMEOUT_MS = Number(process.env.CB_REQUEST_TIMEOUT_MS || 45_000);

const ACCESS_COOKIE = 'retail_crm_access';
const REFRESH_COOKIE_CANDIDATES = ['retail_crm_refresh', 'refresh_token', 'retail_crm_refresh_token'];

// =============================================================================
// ISOLATED CONTEXTS
//
// The `request` fixture carries one shared cookie jar for the whole test. Several cases here need
// jars that CANNOT see each other — User A must not inherit User B's cookies, and replaying a
// rotated refresh cookie only means anything if the jar does not silently substitute the new one.
// =============================================================================

// Every context is wrapped by the shared rate pacer, so the boundary suite draws on the same global
// 429 budget as api_test and the VAPT suite instead of racing them. Wrapping here rather than at the
// call sites means CTX_A, CTX_B and every per-test context are covered by one change.
//
// Pacing is scoped to the DEV host: CB-BYP-05 deliberately targets UAT, which sits behind a different
// limiter, so its two requests must not spend dev budget.
// Pass { paced: false } only from a case that MEASURES a rate limit. Pacing such a case destroys what
// it measures — CB-BYP-04 needs its wrong-OTP attempts close together to watch the lockout engage.
// An unpaced caller should still call recordSend() per request to keep the global budget honest.
async function newIsolatedContext(extraHeaders = {}, { paced = true } = {}) {
  const ctx = await apiRequest.newContext({
    baseURL: BASE_URL,
    extraHTTPHeaders: extraHeaders,
    ignoreHTTPSErrors: false,
  });
  if (!paced) return ctx;
  return pacedContext(ctx, { host: new URL(BASE_URL).host, label: 'boundary' });
}

/** Reads one cookie value out of a raw Set-Cookie header (which may hold several, comma-joined). */
function cookieValue(setCookieHeader, name) {
  if (!setCookieHeader) return null;
  const match = String(setCookieHeader).match(new RegExp(`${name}=([^;,\\s]+)`));
  return match ? match[1] : null;
}

/** Finds whichever name the server actually uses for the refresh cookie. */
function refreshCookieFrom(setCookieHeader) {
  for (const name of REFRESH_COOKIE_CANDIDATES) {
    const value = cookieValue(setCookieHeader, name);
    if (value) return { name, value };
  }
  return null;
}

// =============================================================================
// AUTH
// =============================================================================

async function requestOtp(ctx, phone) {
  const response = await ctx.post(`${BASE_URL}/api/auth/request-otp`, {
    data: { phone_number: phone },
    headers: { 'Content-Type': 'application/json' },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status(), body, login_challenge: body.login_challenge ?? null };
}

async function verifyOtp(ctx, phone, otp, loginChallenge = null) {
  const data = { phone_number: phone, otp };
  if (loginChallenge) data.login_challenge = loginChallenge;
  const response = await ctx.post(`${BASE_URL}/api/auth/verify-otp`, {
    data,
    headers: { 'Content-Type': 'application/json' },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const body = await response.json().catch(() => ({}));
  return {
    status: response.status(),
    body,
    setCookie: response.headers()['set-cookie'] || null,
  };
}

/**
 * Login via verify-otp.
 *
 * request-otp is DELIBERATELY SKIPPED by default. It is throttled far more aggressively than
 * verify-otp (403 "in cooldown" after very few calls), and the dev bypass OTP is accepted by
 * verify-otp on its own — which is exactly why retail_crm_chatbot_VAPT_test.js's beforeAll skips it too
 * ("Skip request-otp to avoid rate limiting"). Calling it here made the boundary suite throttle
 * itself out of its own bootstrap.
 *
 * Pass `{ withChallenge: true }` when the test actually needs a server-issued login_challenge.
 *
 * Never throws: returns `{ ok: false, reason }` so the caller decides whether a failure is a
 * SETUP GAP (bootstrap could not run) or the assertion itself (CB-BYP-01 wants a failed login).
 */
async function loginViaApi(ctx, phone, otp, { withChallenge = false } = {}) {
  let otpReq = { status: null, login_challenge: null };
  if (withChallenge) {
    otpReq = await requestOtp(ctx, phone);
    if (otpReq.status === 429) {
      return { ok: false, status: 429, reason: `request-otp rate-limited (429) for ${phone}` };
    }
    if (otpReq.status === 403) {
      return { ok: false, status: 403, reason: `request-otp throttled (403) — ${phone} is in cooldown` };
    }
  }

  const verify = await verifyOtp(ctx, phone, otp, otpReq.login_challenge);
  const accessToken =
    verify.body.access_token || cookieValue(verify.setCookie, ACCESS_COOKIE) || null;

  if (verify.status !== 200 || !accessToken) {
    return {
      ok: false,
      status: verify.status,
      reason:
        `verify-otp → ${verify.status} with no access token for ${phone}. ` +
        `body=${JSON.stringify(verify.body).slice(0, 200)}`,
      login_challenge: otpReq.login_challenge,
      requestOtpStatus: otpReq.status,
    };
  }

  return {
    ok: true,
    status: verify.status,
    access_token: accessToken,
    user_id: verify.body.user_id || null,
    persona: verify.body.persona || 'dealer',
    session_id: verify.body.session_id || null,
    setCookie: verify.setCookie,
    refreshCookie: refreshCookieFrom(verify.setCookie),
    login_challenge: otpReq.login_challenge,
    requestOtpStatus: otpReq.status,
  };
}

/**
 * Logs a phone in and seeds it with a session, one query and one assistant message_id — the
 * fixture every IDOR case needs on the victim's side.
 */
async function bootstrapIdentity(ctx, phone, otp, label) {
  const login = await loginViaApi(ctx, phone, otp); // no request-otp — see loginViaApi
  if (!login.ok) return { ...login, label };

  const userId = login.user_id || (await authMe(ctx, login.access_token)).body.user_id || null;
  if (!userId) {
    return { ok: false, label, reason: `${label}: authenticated but no user_id from verify-otp or /api/auth/me` };
  }

  const session = await createSession(ctx, login.access_token, userId, login.persona);
  if (session.status !== 200 || !session.body?.id) {
    return {
      ok: false,
      label,
      access_token: login.access_token,
      user_id: userId,
      reason: `${label}: could not create a session (${session.status})`,
    };
  }

  await chatQuery(ctx, login.access_token, 'What paint products do you offer?', {
    sessionId: session.body.id,
    userId,
    persona: login.persona,
  });

  const messages = await sessionMessages(ctx, login.access_token, session.body.id);
  const assistant = Array.isArray(messages.body)
    ? messages.body.find((m) => m.role === 'assistant' && m.message_id)
    : null;

  return {
    ok: true,
    label,
    access_token: login.access_token,
    user_id: userId,
    persona: login.persona,
    session_id: session.body.id,
    message_id: assistant ? assistant.message_id : null,
    refreshCookie: login.refreshCookie,
    setCookie: login.setCookie,
  };
}

// =============================================================================
// ENDPOINT HELPERS — all take an explicit token so cross-identity calls are obvious at the call site
// =============================================================================

const bearer = (token) => (token ? { Authorization: `Bearer ${token}` } : {});

async function authMe(ctx, token) {
  const response = await ctx.get(`${BASE_URL}/api/auth/me`, {
    headers: bearer(token),
    timeout: REQUEST_TIMEOUT_MS,
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function createSession(ctx, token, userId, persona = 'dealer') {
  const response = await ctx.post(`${BASE_URL}/api/chat/sessions`, {
    data: { user_id: userId, persona },
    headers: { 'Content-Type': 'application/json', ...bearer(token) },
    timeout: REQUEST_TIMEOUT_MS,
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function listSessions(ctx, token, userId, limit = 20) {
  const response = await ctx.get(`${BASE_URL}/api/chat/sessions`, {
    params: { user_id: userId, limit },
    headers: bearer(token),
    timeout: REQUEST_TIMEOUT_MS,
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function sessionMessages(ctx, token, sessionId, limitPairs) {
  const params = {};
  if (limitPairs !== undefined) params.limit_pairs = limitPairs;
  const response = await ctx.get(`${BASE_URL}/api/chat/sessions/${sessionId}/messages`, {
    params,
    headers: bearer(token),
    timeout: REQUEST_TIMEOUT_MS,
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function renameSession(ctx, token, sessionId, title) {
  const response = await ctx.patch(`${BASE_URL}/api/chat/sessions/${sessionId}`, {
    data: { title },
    headers: { 'Content-Type': 'application/json', ...bearer(token) },
    timeout: REQUEST_TIMEOUT_MS,
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function chatQuery(ctx, token, query, { sessionId = null, userId = 'anonymous', persona = 'dealer', headers = {} } = {}) {
  const payload = { query };
  if (sessionId !== null) payload.session_id = sessionId;
  const response = await ctx.post(`${BASE_URL}/api/chat/query`, {
    params: { user_id: userId, persona },
    data: payload,
    headers: { 'Content-Type': 'application/json', ...bearer(token), ...headers },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const text = await response.text().catch(() => '');
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    /* non-JSON body is itself information — keep `text` */
  }
  return { status: response.status(), body, text };
}

async function submitFeedback(ctx, token, messageId, rating) {
  const response = await ctx.post(`${BASE_URL}/api/feedback/${messageId}`, {
    data: { rating },
    headers: { 'Content-Type': 'application/json', ...bearer(token) },
    timeout: REQUEST_TIMEOUT_MS,
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

async function logout(ctx, token) {
  const response = await ctx.post(`${BASE_URL}/api/auth/logout`, {
    headers: bearer(token),
    timeout: REQUEST_TIMEOUT_MS,
  });
  return { status: response.status(), body: await response.json().catch(() => ({})) };
}

/** POST /api/auth/refresh. Pass `cookieHeader` to replay a specific (possibly stale) cookie. */
async function refresh(ctx, cookieHeader = null) {
  const response = await ctx.post(`${BASE_URL}/api/auth/refresh`, {
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const body = await response.json().catch(() => ({}));
  const setCookie = response.headers()['set-cookie'] || null;
  return {
    status: response.status(),
    body,
    setCookie,
    access_token: body.access_token || cookieValue(setCookie, ACCESS_COOKIE) || null,
    refreshCookie: refreshCookieFrom(setCookie),
  };
}

// =============================================================================
// SFA CREDENTIALS — for the one cross-realm direction the SFA suite does not already cover
// =============================================================================

/** Returns `{ apiKey, token }`, or `{ reason }` when no signing key is reachable. */
function sfaCredentials() {
  if (!getSfaToken()) {
    return { reason: 'no SFA signing key available — see sfa-token.js keyUnavailableReason()' };
  }
  return { apiKey: SFA_API_KEY, token: freshSfaToken() };
}

module.exports = {
  BASE_URL,
  UAT_BASE_URL,
  TEST_PHONE,
  TEST_OTP,
  TEST_PHONE_B,
  TEST_OTP_B,
  UNPAIRED_PHONE,
  SFA_API_KEY,
  REQUEST_TIMEOUT_MS,
  ACCESS_COOKIE,
  newIsolatedContext,
  cookieValue,
  refreshCookieFrom,
  requestOtp,
  verifyOtp,
  loginViaApi,
  bootstrapIdentity,
  authMe,
  createSession,
  listSessions,
  sessionMessages,
  renameSession,
  chatQuery,
  submitFeedback,
  logout,
  refresh,
  sfaCredentials,
};
