const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const { FAILURE_CLASSES, failNotExecuted, failOn429 } = require('./failure-classes');
const { paceGate, recordSend } = require('./rate-pacer');
const auth = require('./chatbot-auth');

const {
  BASE_URL,
  TEST_PHONE,
  TEST_OTP,
  TEST_PHONE_B,
  TEST_OTP_B,
  UNPAIRED_PHONE,
} = auth;

/**
 * RetailCrm Opus BE — Boundary & Cross-Realm API Suite  (CB-*)
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * retail_crm_chatbot_api_test.js (115 cases) and retail_crm_chatbot_VAPT_test.js (16) cover every endpoint in
 * RetailCrm_BE_Dev.postman_collection.json. Nothing here adds an endpoint. What it adds are the
 * behaviours the Postman collection *implies* and neither existing suite asserts:
 *
 *   - two independent auth realms (chatbot JWT, SFA X-API-KEY + TSM JWT) share one base_url
 *   - user_id is a CLIENT-SUPPLIED query parameter on the read paths
 *   - an AUTH_TEST_OTP_CODES bypass exists, and its blast radius is undocumented
 *   - /api/auth/refresh rotates a cookie — rotation is only real if the old one dies
 *   - /api/chat/query/stream is an SSE endpoint, asserted by exactly one existing test
 *   - the collection posts TWO different ratings to the SAME message_id
 *
 * CONVENTIONS (same as sfa_know_about_product_test.js)
 *   - flat test() calls, no test.describe, --workers=1
 *   - NO test.skip(). A test that could not run is RED and says which of four things went wrong
 *     (see ./failure-classes.js). Every such message states that nothing was asserted.
 *   - a 429 is never absorbed into a widened status array — it fails as NOT EXECUTED
 *
 * ORDERING IS DELIBERATE, because two cases have side effects:
 *   - CB-RFR-02 logs User A out, so the refresh group is dead last and CB-RFR-02 is the final test.
 *   - CB-BYP-04 locks TEST_PHONE out for ~11 minutes, which would blind the whole file on the next
 *     run, so it is tagged @lockout and excluded from the default run entirely.
 * Every login happens once, in beforeAll, and is cached to disk — two OTP requests for the whole
 * file. The refresh cases reuse that same cookie rather than logging in again.
 *
 * TWO RUN MODES
 *   npm run test:chatbot:boundary   27 cases, safe to repeat
 *   npm run test:chatbot:lockout    CB-BYP-04 only; leaves TEST_PHONE locked for ~11 minutes
 *
 * Run: npm run test:chatbot:boundary
 */

// =============================================================================
// IDENTITY BOOTSTRAP + DISK CACHE
//
// Playwright discards the worker after every FAILED test and re-runs beforeAll in a fresh one. On a
// red run that means re-logging-in dozens of times, which trips the per-phone OTP throttle and turns
// real findings into 403s. The SFA suite hit exactly this. So the bootstrap result lives on disk and
// is re-validated against /api/auth/me instead of being re-earned.
// =============================================================================

const CACHE_PATH = path.join(process.cwd(), 'test-results', '.cb-identities.json');
const CACHE_TTL_MS = 10 * 60 * 1000; // well inside the ≤30-min access-token TTL (VAPT-007b)

// A FAILED login must be remembered too, and this is not a nicety.
//
// Without it the failure is self-sustaining: a throttled login fails the first test, Playwright
// discards the worker, beforeAll runs again and issues ANOTHER request-otp, which re-arms the
// cooldown — so a lockout that should expire in one minute is pushed out for the length of the run
// and every remaining case reports a SETUP GAP. Observed live before this was added.
const NEGATIVE_CACHE_PATH = path.join(process.cwd(), 'test-results', '.cb-login-backoff.json');
const BACKOFF_MS = 90 * 1000;

/** @type {{ok:boolean,label:string,reason?:string,access_token?:string,user_id?:string,session_id?:string,message_id?:string,persona?:string}} */
let USER_A = { ok: false, label: 'User A', reason: 'beforeAll did not run' };
let USER_B = { ok: false, label: 'User B', reason: 'beforeAll did not run' };
let CTX_A = null;
let CTX_B = null;

function readCache() {
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    if (!raw || typeof raw.savedAt !== 'number') return null;
    if (Date.now() - raw.savedAt > CACHE_TTL_MS) return null;
    if (raw.baseUrl !== BASE_URL) return null; // never reuse a dev identity against UAT
    return raw;
  } catch {
    return null;
  }
}

/** Returns the remembered failure for `label` if we are still inside its backoff window. */
function readBackoff(label) {
  try {
    const raw = JSON.parse(fs.readFileSync(NEGATIVE_CACHE_PATH, 'utf8'));
    const entry = raw && raw[label];
    if (!entry || typeof entry.at !== 'number') return null;
    if (Date.now() - entry.at > BACKOFF_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeBackoff(label, reason) {
  try {
    let raw = {};
    try {
      raw = JSON.parse(fs.readFileSync(NEGATIVE_CACHE_PATH, 'utf8')) || {};
    } catch {
      /* first failure of the run */
    }
    raw[label] = { at: Date.now(), reason };
    fs.mkdirSync(path.dirname(NEGATIVE_CACHE_PATH), { recursive: true });
    fs.writeFileSync(NEGATIVE_CACHE_PATH, JSON.stringify(raw, null, 2));
  } catch {
    /* best effort — a missing backoff file only costs extra login attempts */
  }
}

function clearBackoff(label) {
  try {
    const raw = JSON.parse(fs.readFileSync(NEGATIVE_CACHE_PATH, 'utf8')) || {};
    delete raw[label];
    fs.writeFileSync(NEGATIVE_CACHE_PATH, JSON.stringify(raw, null, 2));
  } catch {
    /* nothing to clear */
  }
}

function writeCache(a, b) {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(
      CACHE_PATH,
      JSON.stringify({ savedAt: Date.now(), baseUrl: BASE_URL, a, b }, null, 2)
    );
  } catch (err) {
    console.log(`[CB] identity cache not written (${err.message}) — logins will repeat.`);
  }
}

/** A cached identity is only usable if its token still authenticates. */
async function cacheStillValid(ctx, identity) {
  if (!identity || !identity.ok || !identity.access_token) return false;
  const me = await auth.authMe(ctx, identity.access_token);
  return me.status === 200;
}

test.beforeAll(async () => {
  CTX_A = await auth.newIsolatedContext();
  CTX_B = await auth.newIsolatedContext();

  const cached = readCache();
  if (cached) {
    const [aOk, bOk] = await Promise.all([
      cacheStillValid(CTX_A, cached.a),
      cacheStillValid(CTX_B, cached.b),
    ]);
    if (aOk) {
      USER_A = cached.a;
      console.log('[CB] User A restored from identity cache (no OTP spent).');
    }
    if (bOk) {
      USER_B = cached.b;
      console.log('[CB] User B restored from identity cache (no OTP spent).');
    }
  }

  if (!USER_A.ok) {
    const held = readBackoff('User A');
    if (held) {
      USER_A = {
        ok: false,
        label: 'User A',
        reason:
          `${held.reason}\n(not retried — a login failure is held for ${BACKOFF_MS / 1000}s so that ` +
          `worker restarts do not keep re-arming the cooldown and extending it indefinitely)`,
      };
      console.log(`[CB] User A login held back (${Math.round((Date.now() - held.at) / 1000)}s ago): ${held.reason}`);
    } else {
      USER_A = await auth.bootstrapIdentity(CTX_A, TEST_PHONE, TEST_OTP, 'User A');
      if (USER_A.ok) clearBackoff('User A');
      else writeBackoff('User A', USER_A.reason);
      console.log(
        USER_A.ok
          ? `[CB] User A ready — user_id=${USER_A.user_id} session=${USER_A.session_id} message_id=${USER_A.message_id || 'none'}`
          : `[CB] User A bootstrap FAILED — ${USER_A.reason}`
      );
    }
  }

  if (!USER_B.ok) {
    const heldB = readBackoff('User B');
    if (heldB) {
      USER_B = { ok: false, label: 'User B', reason: `${heldB.reason}\n(not retried — login failure held for ${BACKOFF_MS / 1000}s)` };
      console.log(`[CB] User B login held back: ${heldB.reason}`);
      if (USER_A.ok) writeCache(USER_A, USER_B);
      return;
    }
    USER_B = await auth.bootstrapIdentity(CTX_B, TEST_PHONE_B, TEST_OTP_B, 'User B');
    if (USER_B.ok) clearBackoff('User B');
    else writeBackoff('User B', USER_B.reason);
    // This line is itself a finding. If User B authenticated with the SAME bypass code as User A,
    // CB-BYP-01 is about to prove that one code unlocks arbitrary accounts.
    console.log(
      USER_B.ok
        ? `[CB] User B ready — user_id=${USER_B.user_id} session=${USER_B.session_id} message_id=${USER_B.message_id || 'none'}` +
            (TEST_OTP_B === TEST_OTP ? '  (authenticated with the SAME bypass OTP as User A)' : '')
        : `[CB] User B bootstrap FAILED — ${USER_B.reason}`
    );
  }

  if (USER_A.ok || USER_B.ok) writeCache(USER_A, USER_B);
});

test.afterAll(async () => {
  await CTX_A?.dispose();
  await CTX_B?.dispose();
});

// The pacer holds INSIDE the wrapped request call, for up to a full window (~60s). Added to the
// config's 60s global timeout, that kills a test on a timeout that reads as a product defect. 22 of the
// 29 cases here carry no explicit timeout, so this sets the floor for all of them; the explicit
// test.setTimeout() calls in individual bodies still win, since they run after this hook.
test.beforeEach(async () => {
  test.setTimeout(150_000);
});

/** Fails the test as a SETUP GAP — naming the exact fix — when an identity is unavailable. */
function requireIdentity(identity, testId) {
  if (identity.ok) return;
  failNotExecuted(
    testId,
    FAILURE_CLASSES.SETUP,
    `${identity.label} could not be bootstrapped, so this case never reached the server`,
    `Reason: ${identity.reason}\n` +
      `FIX: ${identity.label} needs a phone number paired with a bypass code in the server's ` +
      `AUTH_TEST_OTP_CODES. Set ${identity.label === 'User B' ? 'TEST_PHONE_B / TEST_OTP_B' : 'TEST_PHONE / TEST_OTP'} ` +
      `to a configured pair, or ask dev to add one. Without a second real account no ownership ` +
      `(IDOR) check can be automated at all — the only alternative is retail_crm_chatbot_VAPT_test.js's ` +
      `VAPT-001, which needs a human typing OTPs into two browsers.`
  );
}

function requireBothIdentities(testId) {
  requireIdentity(USER_A, testId);
  requireIdentity(USER_B, testId);
  if (USER_A.user_id && USER_A.user_id === USER_B.user_id) {
    failNotExecuted(
      testId,
      FAILURE_CLASSES.SETUP,
      'User A and User B resolved to the SAME user_id, so nothing cross-account was tested',
      `Both bootstrapped to ${USER_A.user_id}. TEST_PHONE and TEST_PHONE_B must be different ` +
        `accounts, otherwise an "IDOR blocked" result is meaningless.`
    );
  }
}

// =============================================================================
// RAW SSE PROBE
//
// APIRequestContext buffers the whole response, which makes it blind to the two things that matter
// for a stream: when the first byte arrives, and what happens when the client walks away. Node's
// https gives both, plus rawHeaders (Playwright merges duplicates into one comma-joined value).
//
// Because it sidesteps Playwright entirely, the pacedContext wrapper does not reach it — so it must
// pass the shared rate gate itself. Without that, the five SSE cases would spend global budget
// invisibly and push the OTP-dependent tests over the limit.
// =============================================================================

async function sseProbe({ token, payload, params = {}, abortAfterFirstByte = false, maxMs = 45_000 }) {
  await paceGate('boundary', `${BASE_URL}/api/chat/query/stream`);
  return new Promise((resolve) => {
    const url = new URL(`${BASE_URL}/api/chat/query/stream`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const data = JSON.stringify(payload);
    const started = Date.now();
    const out = {
      status: 0,
      headers: {},
      rawHeaders: [],
      text: '',
      firstByteMs: null,
      totalMs: null,
      aborted: false,
      timedOut: false,
      error: null,
    };

    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'Content-Length': Buffer.byteLength(data),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        out.status = res.statusCode;
        out.headers = res.headers;
        out.rawHeaders = res.rawHeaders;
        res.on('data', (chunk) => {
          if (out.firstByteMs === null) out.firstByteMs = Date.now() - started;
          out.text += chunk.toString();
          if (abortAfterFirstByte && !out.aborted) {
            out.aborted = true;
            out.totalMs = Date.now() - started;
            req.destroy();
            resolve(out);
          }
        });
        res.on('end', () => {
          out.totalMs = Date.now() - started;
          resolve(out);
        });
      }
    );

    const killer = setTimeout(() => {
      out.timedOut = true;
      out.totalMs = Date.now() - started;
      req.destroy();
      resolve(out);
    }, maxMs);

    req.on('close', () => clearTimeout(killer));
    req.on('error', (err) => {
      if (out.aborted || out.timedOut) return; // our own destroy(), not a server fault
      out.error = err.message;
      out.totalMs = Date.now() - started;
      resolve(out);
    });
    req.write(data);
    req.end();
  });
}

/** Names of SSE `event:` lines, in arrival order. */
function sseEvents(text) {
  return text
    .split('\n')
    .filter((l) => l.startsWith('event:'))
    .map((l) => l.slice(6).trim());
}

// =============================================================================
// GAP 1 — CROSS-REALM CREDENTIAL CONFUSION
//
// SFA-INT-02 already proves a chatbot JWT cannot open the SFA endpoint, and SFA-INT-03 that the SFA
// key alone cannot open a chatbot route. The untested direction is the one below: a real, valid TSM
// token presented to the chatbot. Both realms are on https://www.saucedemo.com, so if the
// chatbot verifies "is this a well-formed RS256 JWT" rather than "was this signed by MY issuer",
// every TSM in the field silently becomes a chatbot user.
// =============================================================================

test('[CB-XR-01] An SFA TSM token + X-API-KEY must not authenticate a chatbot query', async () => {
  const sfa = auth.sfaCredentials();
  if (sfa.reason) {
    failNotExecuted(
      'CB-XR-01',
      FAILURE_CLASSES.SETUP,
      'no SFA TSM token could be minted, so the cross-realm direction was never exercised',
      `Reason: ${sfa.reason}\nFIX: place the SFA signing key where sfa-token.js can find it ` +
        `(see SFA_KnowAboutProduct_README.md), or set SFA_TEST_JWT.`
    );
  }

  const ctx = await auth.newIsolatedContext();
  try {
    const res = await auth.chatQuery(ctx, sfa.token, 'What paint products do you offer?', {
      headers: { 'X-API-KEY': sfa.apiKey },
    });
    failOn429(res.status, 'CB-XR-01');
    expect(
      res.status,
      `A valid SFA TSM token (plus the SFA X-API-KEY) authenticated POST /api/chat/query ` +
        `(${res.status}). The realms share a host but not an audience: an SFA token carries ` +
        `aud=chatbot-api/iss=sfa-platform and no chatbot user identity, so the chatbot must reject ` +
        `it. Accepting it means every field TSM can drive the consumer chatbot as some user. ` +
        `body=${res.text.slice(0, 300)}`
    ).not.toBe(200);
    expect([401, 403], `Expected an auth rejection, got ${res.status}`).toContain(res.status);
  } finally {
    await ctx.dispose();
  }
});

test('[CB-XR-02] An SFA TSM token alone must not authenticate a chatbot query', async () => {
  const sfa = auth.sfaCredentials();
  if (sfa.reason) {
    failNotExecuted(
      'CB-XR-02',
      FAILURE_CLASSES.SETUP,
      'no SFA TSM token could be minted, so the cross-realm direction was never exercised',
      `Reason: ${sfa.reason}`
    );
  }

  const ctx = await auth.newIsolatedContext();
  try {
    const res = await auth.chatQuery(ctx, sfa.token, 'What paint products do you offer?');
    failOn429(res.status, 'CB-XR-02');
    expect(
      res.status,
      `An SFA TSM token was accepted as a chatbot Bearer with no API key (${res.status}). ` +
        `The chatbot must validate the token's issuer and audience, not merely its signature ` +
        `algorithm. body=${res.text.slice(0, 300)}`
    ).not.toBe(200);
    expect([401, 403], `Expected an auth rejection, got ${res.status}`).toContain(res.status);
  } finally {
    await ctx.dispose();
  }
});

// =============================================================================
// GAPS 2 & 3 — OWNERSHIP (IDOR) ON THE READ AND WRITE PATHS
//
// SEC-007 probes a random UUID, which returns 404 because it does not exist — it proves nothing
// about ownership. VAPT-001 does it properly but needs two manual OTP entries in a browser.
// These five cases are the automated equivalent, using User B's REAL ids.
// =============================================================================

test('[CB-IDOR-01] GET /api/chat/sessions with another user\'s user_id must not return their sessions', async () => {
  requireBothIdentities('CB-IDOR-01');

  const res = await auth.listSessions(CTX_A, USER_A.access_token, USER_B.user_id, 50);
  failOn429(res.status, 'CB-IDOR-01');

  if (res.status === 200) {
    const rows = Array.isArray(res.body) ? res.body : res.body?.sessions || [];
    const leaked = rows.filter((s) => s && s.id === USER_B.session_id);
    expect(
      leaked,
      `HORIZONTAL PRIVILEGE ESCALATION: User A's token listed User B's session ` +
        `(${USER_B.session_id}) simply by passing user_id=${USER_B.user_id} as a query parameter. ` +
        `user_id is client-supplied here — it must be ignored in favour of the JWT sub, or the ` +
        `request must be rejected. Returned ${rows.length} row(s).`
    ).toHaveLength(0);
    // A 200 with an empty list is acceptable (the param was ignored); a 200 containing B's data is not.
    console.log(`[CB-IDOR-01] 200 with ${rows.length} row(s), none belonging to User B — param ignored.`);
  } else {
    expect(
      [401, 403, 404],
      `Expected the foreign user_id to be rejected or ignored, got ${res.status}. ` +
        `body=${JSON.stringify(res.body).slice(0, 200)}`
    ).toContain(res.status);
  }
});

test('[CB-IDOR-02] GET another user\'s session messages must be refused (the real version of SEC-007)', async () => {
  requireBothIdentities('CB-IDOR-02');
  if (!USER_B.session_id) {
    failNotExecuted(
      'CB-IDOR-02',
      FAILURE_CLASSES.SETUP,
      'User B has no session id, so there was no real object to attempt access on',
      'A random/non-existent id would only prove that 404 exists — see SEC-007.'
    );
  }

  const res = await auth.sessionMessages(CTX_A, USER_A.access_token, USER_B.session_id);
  failOn429(res.status, 'CB-IDOR-02');

  expect(
    res.status,
    `HORIZONTAL PRIVILEGE ESCALATION (VAPT 5.1): User A read the message history of User B's ` +
      `session ${USER_B.session_id}. This is a REAL id owned by a DIFFERENT account, so unlike ` +
      `SEC-007 a 404 here cannot be explained by non-existence. ` +
      `body=${JSON.stringify(res.body).slice(0, 300)}`
  ).not.toBe(200);
  expect([401, 403, 404]).toContain(res.status);
});

test('[CB-IDOR-03] PATCH another user\'s session title must be refused', async () => {
  requireBothIdentities('CB-IDOR-03');
  if (!USER_B.session_id) {
    failNotExecuted('CB-IDOR-03', FAILURE_CLASSES.SETUP, 'User B has no session id to attempt a rename on');
  }

  const res = await auth.renameSession(CTX_A, USER_A.access_token, USER_B.session_id, 'renamed-by-user-a');
  failOn429(res.status, 'CB-IDOR-03');

  expect(
    res.status,
    `User A renamed User B's session ${USER_B.session_id} (${res.status}). VAPT-001 covers DELETE ` +
      `and VAPT-001b covers create; PATCH is the third write path and must enforce the same ` +
      `require_session_owner check. body=${JSON.stringify(res.body).slice(0, 300)}`
  ).not.toBe(200);
  expect([401, 403, 404]).toContain(res.status);

  // Prove it from the victim's side too: a 403 that still mutated the row would be worse than a 200.
  const check = await auth.listSessions(CTX_B, USER_B.access_token, USER_B.user_id, 50);
  if (check.status === 200) {
    const rows = Array.isArray(check.body) ? check.body : check.body?.sessions || [];
    const victim = rows.find((s) => s && s.id === USER_B.session_id);
    if (victim) {
      expect(
        victim.title || '',
        `The PATCH was rejected with ${res.status} but User B's session title is now ` +
          `"${victim.title}" — the write happened anyway.`
      ).not.toBe('renamed-by-user-a');
    }
  }
});

test('[CB-IDOR-04] POST /api/chat/query must not write into another user\'s session', async () => {
  test.setTimeout(120_000); // one LLM query plus a read-back
  requireBothIdentities('CB-IDOR-04');
  if (!USER_B.session_id) {
    failNotExecuted('CB-IDOR-04', FAILURE_CLASSES.SETUP, 'User B has no session id to attempt a write into');
  }

  const marker = 'CB-IDOR-04-INJECTED-BY-USER-A';
  const res = await auth.chatQuery(CTX_A, USER_A.access_token, `${marker} what paint do you sell?`, {
    sessionId: USER_B.session_id,
    userId: USER_A.user_id,
    persona: USER_A.persona,
  });
  failOn429(res.status, 'CB-IDOR-04');

  // Two acceptable outcomes: refused outright, or accepted but written to a session User A owns.
  // The unacceptable outcome is User A's text landing in User B's history.
  const victim = await auth.sessionMessages(CTX_B, USER_B.access_token, USER_B.session_id, 50);
  if (victim.status !== 200) {
    failNotExecuted(
      'CB-IDOR-04',
      FAILURE_CLASSES.SERVER,
      `could not read User B's own session back (${victim.status}), so the write could not be confirmed either way`,
      `The attempted cross-write returned ${res.status}. Re-run once User B's session is readable.`
    );
  }
  const rows = Array.isArray(victim.body) ? victim.body : [];
  const injected = rows.filter((m) => typeof m.content === 'string' && m.content.includes(marker));
  expect(
    injected,
    `CROSS-ACCOUNT WRITE: User A posted into User B's session ${USER_B.session_id} ` +
      `(query returned ${res.status}) and the marker text is now in User B's history. ` +
      `session_id from the request body must be validated against the JWT sub.`
  ).toHaveLength(0);
});

test('[CB-IDOR-05] POST /api/feedback on another user\'s message must be refused', async () => {
  requireBothIdentities('CB-IDOR-05');
  if (!USER_B.message_id) {
    failNotExecuted(
      'CB-IDOR-05',
      FAILURE_CLASSES.SETUP,
      'User B has no assistant message_id, so there was no real message to rate',
      "bootstrapIdentity() queries once and reads message_id back from /messages. If it is null, " +
        'the query or the read-back failed — check the beforeAll log line for User B.'
    );
  }

  const res = await auth.submitFeedback(CTX_A, USER_A.access_token, USER_B.message_id, 'not_helpful');
  failOn429(res.status, 'CB-IDOR-05');

  expect(
    res.status,
    `User A submitted feedback on User B's message ${USER_B.message_id} (${res.status}). ` +
      `SEC-005 only covers path traversal in message_id; ownership of a REAL foreign message is ` +
      `this case. Unchecked, any user can skew another user's conversation ratings. ` +
      `body=${JSON.stringify(res.body).slice(0, 300)}`
  ).not.toBe(200);
  expect([401, 403, 404]).toContain(res.status);
});

// =============================================================================
// GAP 5 — STREAMING (SSE)
//
// FUNC-015 accepts text/event-stream OR application/json, so a regression that turns the stream
// into one buffered JSON response keeps it green. These cases assert the properties that make
// streaming streaming.
// =============================================================================

test('[CB-SSE-01] /api/chat/query/stream must return text/event-stream, not buffered JSON', async () => {
  test.setTimeout(120_000);
  requireIdentity(USER_A, 'CB-SSE-01');

  const res = await sseProbe({
    token: USER_A.access_token,
    payload: { query: 'What paint products do you offer?', session_id: USER_A.session_id },
    params: { user_id: USER_A.user_id, persona: USER_A.persona },
  });
  if (res.error) {
    failNotExecuted('CB-SSE-01', FAILURE_CLASSES.HARNESS, `the stream request errored: ${res.error}`);
  }
  failOn429(res.status, 'CB-SSE-01');
  if (res.timedOut && !res.text) {
    failNotExecuted(
      'CB-SSE-01',
      FAILURE_CLASSES.SERVER,
      'the stream produced no bytes within 45 s',
      'Nothing was asserted about the content type because no response body arrived.'
    );
  }

  expect(res.status, `Expected 200 from the stream endpoint, got ${res.status}`).toBe(200);
  expect(
    String(res.headers['content-type'] || ''),
    `Content-Type is "${res.headers['content-type']}". This endpoint is an SSE stream and must say ` +
      `so — FUNC-015 previously also accepted application/json, which let a silent degradation from ` +
      `streaming to a single buffered response pass as healthy. The frontend's incremental rendering ` +
      `depends on this.`
  ).toContain('text/event-stream');
});

test('[CB-SSE-02] /api/chat/query/stream without a Bearer token must be rejected', async () => {
  test.setTimeout(120_000);

  const res = await sseProbe({
    token: null,
    payload: { query: 'What paint products do you offer?' },
    params: { user_id: 'anonymous', persona: 'dealer' },
    maxMs: 30_000,
  });
  if (res.error) {
    failNotExecuted('CB-SSE-02', FAILURE_CLASSES.HARNESS, `the stream request errored: ${res.error}`);
  }
  failOn429(res.status, 'CB-SSE-02');

  // The non-streaming /api/chat/query allows anonymous callers, so 200 is defensible here — what is
  // NOT defensible is 200 while the body carries someone's history. Assert on both facts.
  console.log(`[CB-SSE-02] unauthenticated stream → ${res.status}, ${res.text.length} bytes`);
  expect(
    res.status,
    `Unauthenticated stream returned ${res.status}. Expected 401/403 if the stream requires auth, ` +
      `or 200 with anonymous-only content if it does not — a 5xx means the missing header crashes ` +
      `the handler. body=${res.text.slice(0, 300)}`
  ).toBeLessThan(500);
  if (res.status === 200) {
    expect(
      res.text,
      'The unauthenticated stream returned 200 AND leaked a user_id/session_id in the payload, so ' +
        'anonymous access is exposing account-scoped data.'
    ).not.toMatch(/"user_id"\s*:\s*"[0-9a-f]{8}-/i);
  }
});

test('[CB-SSE-03] The stream must end with an explicit terminal event, not a bare socket close', async () => {
  test.setTimeout(120_000);
  requireIdentity(USER_A, 'CB-SSE-03');

  const res = await sseProbe({
    token: USER_A.access_token,
    payload: { query: 'What is the coverage area per litre?', session_id: USER_A.session_id },
    params: { user_id: USER_A.user_id, persona: USER_A.persona },
  });
  if (res.error) {
    failNotExecuted('CB-SSE-03', FAILURE_CLASSES.HARNESS, `the stream request errored: ${res.error}`);
  }
  failOn429(res.status, 'CB-SSE-03');
  if (res.timedOut) {
    failNotExecuted(
      'CB-SSE-03',
      FAILURE_CLASSES.SERVER,
      'the stream never terminated within 45 s',
      `Received ${res.text.length} bytes, events: ${sseEvents(res.text).join(', ') || 'none'}. ` +
        `A stream that neither ends nor errors leaves the client spinning.`
    );
  }

  const events = sseEvents(res.text);
  console.log(`[CB-SSE-03] events: ${events.join(', ') || '(none — data-only stream)'}`);
  expect(
    res.text.length,
    'The stream returned zero bytes, so there was nothing to terminate.'
  ).toBeGreaterThan(0);
  // FUNC-015 documents the event vocabulary as delta | final | error, so "final" is the terminal
  // marker on this API. The alternatives are accepted too rather than pinning the test to one
  // spelling of a thing that is not specified in the BRD.
  expect(
    `${events.join(',')} ${res.text}`.toLowerCase(),
    `The stream produced ${res.text.length} bytes and then simply closed, with no final/done/ ` +
      `complete/end/error marker (events seen: ${events.join(', ') || 'none'}). A client cannot ` +
      `distinguish a finished answer from a dropped connection, so a truncated reply renders as a ` +
      `complete one.`
  ).toMatch(/final|done|complete|\[end\]|"end"|event:\s*end|error/);
});

test('[CB-SSE-04] The stream must deliver bytes progressively, not all at once at the end', async () => {
  test.setTimeout(120_000);
  requireIdentity(USER_A, 'CB-SSE-04');

  const res = await sseProbe({
    token: USER_A.access_token,
    payload: { query: 'Tell me about RetailCrm Opus exterior paints.', session_id: USER_A.session_id },
    params: { user_id: USER_A.user_id, persona: USER_A.persona },
  });
  if (res.error) {
    failNotExecuted('CB-SSE-04', FAILURE_CLASSES.HARNESS, `the stream request errored: ${res.error}`);
  }
  failOn429(res.status, 'CB-SSE-04');
  if (res.firstByteMs === null) {
    failNotExecuted(
      'CB-SSE-04',
      FAILURE_CLASSES.SERVER,
      'no bytes ever arrived, so time-to-first-byte could not be measured',
      `status=${res.status}, timedOut=${res.timedOut}`
    );
  }

  console.log(`[CB-SSE-04] TTFB ${res.firstByteMs} ms of ${res.totalMs} ms total`);
  // The whole point of SSE is that the first token arrives long before the last. If TTFB is
  // essentially the total duration, the server generated the full answer and then flushed it —
  // functionally identical to the non-streaming endpoint, and the reason FUNC-015's JSON fallback
  // was dangerous.
  expect(
    res.firstByteMs,
    `Time-to-first-byte was ${res.firstByteMs} ms out of ${res.totalMs} ms total — the response was ` +
      `buffered and flushed at the end, not streamed. Users see nothing for the whole generation, ` +
      `which is what the streaming endpoint exists to avoid.`
  ).toBeLessThan(Math.max(1_500, res.totalMs * 0.8));
});

test('[CB-SSE-05] A client aborting mid-stream must not destabilise the server', async () => {
  test.setTimeout(120_000);
  requireIdentity(USER_A, 'CB-SSE-05');

  const res = await sseProbe({
    token: USER_A.access_token,
    payload: { query: 'How do I apply textured paint?', session_id: USER_A.session_id },
    params: { user_id: USER_A.user_id, persona: USER_A.persona },
    abortAfterFirstByte: true,
  });
  if (res.error) {
    failNotExecuted('CB-SSE-05', FAILURE_CLASSES.HARNESS, `the stream request errored before it could be aborted: ${res.error}`);
  }
  if (!res.aborted) {
    failNotExecuted(
      'CB-SSE-05',
      FAILURE_CLASSES.SERVER,
      'the stream finished or timed out before a mid-flight abort was possible',
      `status=${res.status}, firstByte=${res.firstByteMs}, total=${res.totalMs}, timedOut=${res.timedOut}. ` +
        `Nothing was asserted about abort handling.`
    );
  }
  console.log(`[CB-SSE-05] aborted after ${res.totalMs} ms (${res.text.length} bytes received)`);

  // The assertion is about what the server does next, not about the aborted request itself.
  const health = await CTX_A.get(`${BASE_URL}/health`, { timeout: 20_000 });
  expect(
    health.status(),
    `After a client abort mid-stream, GET /health returned ${health.status()}. An abandoned SSE ` +
      `connection must be cleaned up, not left holding a worker or an LLM stream.`
  ).toBe(200);

  const after = await auth.authMe(CTX_A, USER_A.access_token);
  expect(
    after.status,
    `After a client abort mid-stream, /api/auth/me returned ${after.status} — the session or the ` +
      `worker appears to have been damaged by the disconnect.`
  ).toBe(200);
});

// =============================================================================
// GAP 7 — FEEDBACK: CHANGING A RATING
//
// The Postman collection posts `helpful` then `not_helpful` to the SAME message_id, which is what a
// user does when they change their mind. FUNC-025/026 make both calls but assert nothing about the
// interaction between them.
// =============================================================================

test('[CB-FBK-01] Changing a rating on the same message must succeed, not conflict', async () => {
  requireIdentity(USER_A, 'CB-FBK-01');
  if (!USER_A.message_id) {
    failNotExecuted(
      'CB-FBK-01',
      FAILURE_CLASSES.SETUP,
      'no assistant message_id was captured for User A, so no rating could be submitted',
      'See the beforeAll log line for User A — the seed query or the /messages read-back failed.'
    );
  }

  const first = await auth.submitFeedback(CTX_A, USER_A.access_token, USER_A.message_id, 'helpful');
  failOn429(first.status, 'CB-FBK-01');
  expect(first.status, `First rating failed (${first.status}): ${JSON.stringify(first.body).slice(0, 200)}`).toBe(200);

  const second = await auth.submitFeedback(CTX_A, USER_A.access_token, USER_A.message_id, 'not_helpful');
  failOn429(second.status, 'CB-FBK-01');
  expect(
    second.status,
    `Changing "helpful" to "not_helpful" on message ${USER_A.message_id} returned ${second.status}. ` +
      `This is the exact sequence the Postman collection performs, and the sequence a user performs ` +
      `when they change their mind — it must be accepted, not rejected as a duplicate. ` +
      `body=${JSON.stringify(second.body).slice(0, 300)}`
  ).toBe(200);
  expect(second.body, 'FeedbackResponse must report success').toHaveProperty('success');
  expect(second.body.success, `success was ${JSON.stringify(second.body.success)}`).toBeTruthy();

  // Read-back: the stored rating is only observable if /messages exposes it.
  const messages = await auth.sessionMessages(CTX_A, USER_A.access_token, USER_A.session_id, 50);
  const msg = Array.isArray(messages.body)
    ? messages.body.find((m) => m.message_id === USER_A.message_id)
    : null;
  const ratingField = msg
    ? ['rating', 'feedback', 'feedback_rating'].find((k) => msg[k] !== undefined && msg[k] !== null)
    : null;

  if (ratingField) {
    const stored = typeof msg[ratingField] === 'object' ? JSON.stringify(msg[ratingField]) : String(msg[ratingField]);
    expect(
      stored,
      `The last rating submitted was "not_helpful" but the stored value reads "${stored}" — the ` +
        `update did not overwrite the earlier "helpful".`
    ).toContain('not_helpful');
  } else {
    // Deliberately recorded rather than silently ignored: a 200 alone does not prove the value was
    // stored, and no documented endpoint returns it. Gap G13.
    test.info().annotations.push({
      type: 'coverage-gap',
      description:
        'G13 — no endpoint exposes a stored feedback rating, so CB-FBK-01 can only assert the ' +
        'status of the change, not that the stored value is now not_helpful. Add the rating to ' +
        'MessageResponse (or a GET /api/feedback/{message_id}) to make this verifiable.',
    });
    console.log('[CB-FBK-01] G13: rating not exposed by /messages — overwrite asserted by status only.');
  }
});

test('[CB-FBK-02] Submitting the same rating twice must be idempotent', async () => {
  requireIdentity(USER_A, 'CB-FBK-02');
  if (!USER_A.message_id) {
    failNotExecuted('CB-FBK-02', FAILURE_CLASSES.SETUP, 'no assistant message_id was captured for User A');
  }

  const first = await auth.submitFeedback(CTX_A, USER_A.access_token, USER_A.message_id, 'helpful');
  failOn429(first.status, 'CB-FBK-02');
  const second = await auth.submitFeedback(CTX_A, USER_A.access_token, USER_A.message_id, 'helpful');
  failOn429(second.status, 'CB-FBK-02');

  expect(first.status, `First submission returned ${first.status}`).toBe(200);
  expect(
    second.status,
    `Re-submitting the identical rating returned ${second.status}. A double-tap in the UI, or a ` +
      `retry after a timeout, must be absorbed idempotently — a 409/422/500 here surfaces as an ` +
      `error toast for an action the user already completed. ` +
      `body=${JSON.stringify(second.body).slice(0, 300)}`
  ).toBe(200);
});

// =============================================================================
// GAP 8 — INFORMATION DISCLOSURE ON THE UNAUTHENTICATED ENDPOINTS
//
// FUNC-002 asserts 200 + a truthy body on /info. These are regression guards: /info is currently
// clean (message, version, pipeline, description), and the point is that it stays that way when
// somebody adds "helpful" diagnostics to it.
// =============================================================================

const SECRET_PATTERNS = [
  { re: /\/(Users|home|var|opt|etc|root)\//, what: 'a filesystem path' },
  { re: /(mongodb(\+srv)?|postgres(ql)?|mysql|redis|amqp):\/\//i, what: 'a database or broker connection string' },
  { re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, what: 'a private key' },
  { re: /\b(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,})/, what: 'an API key or token' },
  { re: /"[^"]*(password|passwd|secret|api_?key|private_?key|token)[^"]*"\s*:\s*"[^"]{4,}"/i, what: 'a populated credential field' },
  { re: /\b(AUTH_TEST_OTP_CODES|SFA_KNOW_PRODUCT_API_KEY|JWT_PRIVATE_KEY|MONGO_URI)\b/, what: 'an .env variable name' },
];

test('[CB-INFO-01] GET /info must not disclose secrets, paths or connection strings', async () => {
  const res = await CTX_A.get(`${BASE_URL}/info`, { timeout: 20_000 });
  failOn429(res.status(), 'CB-INFO-01');
  const text = await res.text();
  expect(res.status(), `GET /info returned ${res.status()}`).toBe(200);
  expect(text.length, '/info returned an empty body, so nothing was inspected').toBeGreaterThan(0);

  for (const { re, what } of SECRET_PATTERNS) {
    expect(
      text,
      `/info is unauthenticated and its body contains ${what} (pattern ${re}). ` +
        `Body: ${text.slice(0, 400)}`
    ).not.toMatch(re);
  }
});

test('[CB-INFO-02] GET /info and GET / must not disclose framework, runtime or model identifiers', async () => {
  const targets = ['/info', '/'];
  for (const p of targets) {
    const res = await CTX_A.get(`${BASE_URL}${p}`, { timeout: 20_000 });
    failOn429(res.status(), 'CB-INFO-02');
    const text = await res.text();
    expect(res.status(), `GET ${p} returned ${res.status()}`).toBe(200);

    // The app's own "version":"1.0.0" is fine — it identifies the product, not the attack surface.
    // What must not appear is the stack: a CVE lookup against a pinned framework version is the
    // first move after banner grabbing (VAPT 5.11).
    expect(
      text,
      `GET ${p} discloses a framework/runtime version, which turns a public endpoint into a ` +
        `CVE shopping list (VAPT 5.11). Body: ${text.slice(0, 400)}`
    ).not.toMatch(/\b(fastapi|uvicorn|starlette|gunicorn|python|node(js)?|express|flask|django)[ /-]?v?\d+\.\d+/i);

    expect(
      text,
      `GET ${p} discloses an LLM model identifier. That reveals the vendor and version behind the ` +
        `assistant and helps an attacker tailor prompt-injection payloads. Body: ${text.slice(0, 400)}`
    ).not.toMatch(/\b(gpt-[0-9o]|claude-[0-9]|gemini-[0-9]|llama-?[0-9]|mistral-|text-embedding-)/i);

    expect(
      text,
      `GET ${p} discloses an internal host or private IP. Body: ${text.slice(0, 400)}`
    ).not.toMatch(/\b(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|\.internal\b|\.local\b|localhost:\d+)/);
  }
});

test('[CB-INFO-03] Unexpected query strings on / and /info must not produce a stack trace', async () => {
  const probes = [
    '?debug=true',
    '?__proto__[x]=1',
    "?q='%22><script>alert(1)</script>",
    '?limit=notanumber',
  ];
  for (const p of ['/info', '/']) {
    for (const q of probes) {
      const res = await CTX_A.get(`${BASE_URL}${p}${q}`, { timeout: 20_000 });
      failOn429(res.status(), 'CB-INFO-03');
      const text = await res.text();
      expect(
        res.status(),
        `GET ${p}${q} returned ${res.status()} — an unexpected query string must not crash the ` +
          `handler. Body: ${text.slice(0, 300)}`
      ).toBeLessThan(500);
      expect(
        text,
        `GET ${p}${q} returned a stack trace or internal module path, which maps the codebase for ` +
          `an attacker. Body: ${text.slice(0, 400)}`
      ).not.toMatch(/Traceback \(most recent call last\)|File "\/|at [A-Za-z]+ \(\/|site-packages\//);
      // The XSS probe must also not come back verbatim in a non-HTML body.
      if (q.includes('script')) {
        expect(
          text,
          `GET ${p}${q} reflected the raw <script> payload back in the response body.`
        ).not.toContain('<script>alert(1)</script>');
      }
    }
  }
});

// =============================================================================
// GAP 9 — VOICE TRANSCRIBE: NEGATIVE BOUNDARIES
//
// EDGE-015 checks the VALID ends of sample_rate_hertz (8000 and 96000). Nothing checks one step
// outside, a bogus language, or a file that is not audio at all.
// =============================================================================

const AUDIO_BYTES = Buffer.alloc(64, 0xaa); // 64 B clears the server's 32 B minimum

async function transcribe(ctx, token, { params = {}, file } = {}) {
  const res = await ctx.post(`${BASE_URL}/api/voice/transcribe`, {
    params,
    multipart: { file: file || { name: 'test.webm', mimeType: 'audio/webm', buffer: AUDIO_BYTES } },
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });
  return { status: res.status(), text: await res.text().catch(() => '') };
}

/** 503 means the Google Speech backend is down — that is a service outage, not a validation result. */
function requireVoiceService(result, testId, context) {
  if (result.status !== 503) return;
  failNotExecuted(
    testId,
    FAILURE_CLASSES.SERVER,
    `the transcription service returned 503 for ${context}, so input validation was never reached`,
    `Check Google Cloud Speech connectivity on this environment. Body: ${result.text.slice(0, 200)}`
  );
}

test('[CB-VOI-01] sample_rate_hertz one step outside the documented range must be rejected', async () => {
  requireIdentity(USER_A, 'CB-VOI-01');

  for (const rate of ['7999', '96001', '0', '-16000']) {
    const res = await transcribe(CTX_A, USER_A.access_token, { params: { sample_rate_hertz: rate } });
    failOn429(res.status, 'CB-VOI-01');
    requireVoiceService(res, 'CB-VOI-01', `sample_rate_hertz=${rate}`);
    expect(
      res.status,
      `sample_rate_hertz=${rate} returned ${res.status}. EDGE-015 proves 8000 and 96000 are ` +
        `accepted; one step outside must be a clean 400/422, never a 5xx and never a silent 200 ` +
        `that hands an out-of-range rate to the speech backend. Body: ${res.text.slice(0, 300)}`
    ).not.toBe(200);
    expect([400, 422], `sample_rate_hertz=${rate} → ${res.status}`).toContain(res.status);
  }
});

test('[CB-VOI-02] An unsupported language_code must be rejected, not silently defaulted', async () => {
  requireIdentity(USER_A, 'CB-VOI-02');

  const res = await transcribe(CTX_A, USER_A.access_token, { params: { language_code: 'xx-XX' } });
  failOn429(res.status, 'CB-VOI-02');
  requireVoiceService(res, 'CB-VOI-02', 'language_code=xx-XX');

  expect(
    res.status,
    `language_code=xx-XX returned ${res.status}. FUNC-029 proves hi-IN is honoured; a bogus locale ` +
      `must fail loudly. A 200 means the server quietly fell back to en-IN, so a Hindi or Marathi ` +
      `user whose locale is misconfigured gets silently mis-transcribed instead of an error. ` +
      `Body: ${res.text.slice(0, 300)}`
  ).not.toBe(200);
  expect([400, 422], `language_code=xx-XX → ${res.status}`).toContain(res.status);
});

test('[CB-VOI-03] A non-audio payload with an audio filename must not be accepted', async () => {
  requireIdentity(USER_A, 'CB-VOI-03');

  const pdf = Buffer.from('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n%%EOF\n');
  const res = await transcribe(CTX_A, USER_A.access_token, {
    file: { name: 'audio.wav', mimeType: 'audio/wav', buffer: pdf },
  });
  failOn429(res.status, 'CB-VOI-03');
  requireVoiceService(res, 'CB-VOI-03', 'a PDF named audio.wav');

  expect(
    res.status,
    `A PDF sent as audio.wav with mimeType audio/wav returned ${res.status}. Filename and ` +
      `Content-Type are attacker-controlled; the file must be rejected on its contents. ` +
      `Body: ${res.text.slice(0, 300)}`
  ).not.toBe(200);
  expect(res.status, `Expected a 4xx, got ${res.status}`).toBeLessThan(500);
  expect([400, 415, 422]).toContain(res.status);
  // Honest limit: FUNC-028 shows random bytes can also yield 422, so this proves REJECTION, not
  // that the server sniffed the magic bytes. Distinguishing the two needs a server-side check.
});

test('[CB-VOI-04] A zero-byte upload must be rejected cleanly', async () => {
  requireIdentity(USER_A, 'CB-VOI-04');

  const res = await transcribe(CTX_A, USER_A.access_token, {
    file: { name: 'empty.webm', mimeType: 'audio/webm', buffer: Buffer.alloc(0) },
  });
  failOn429(res.status, 'CB-VOI-04');
  requireVoiceService(res, 'CB-VOI-04', 'a zero-byte file');

  expect(
    res.status,
    `A zero-byte upload returned ${res.status}. NEG-031 covers 1 byte; 0 bytes is the distinct case ` +
      `where a truncated recording or a failed mic permission produces an empty blob — very common ` +
      `from the browser. It must be a clean 400/422, never a 5xx. Body: ${res.text.slice(0, 300)}`
  ).not.toBe(200);
  expect([400, 413, 422]).toContain(res.status);
});

// =============================================================================
// GAP 4 — WHAT THE DEV OTP BYPASS ACTUALLY DOES
//
// The bypass code is supplied by dev on purpose so automation can call verify-otp without the
// request-otp handshake. That is a feature, and the first version of these cases got it wrong: they
// asserted that the bypass should be bound to one phone and should still honour the login_challenge,
// and filed the resulting reds as defects. Neither is a requirement — the challenge is minted BY
// request-otp, so a bypass that demanded a valid one would be useless for the thing it exists for.
//
// CB-BYP-01 and CB-BYP-02 therefore asserted PRESENT behaviour, following SFA-AUTH-18/19: they pass
// today, and they go red the day the behaviour changes — at which point the gap they document has
// either closed or moved. What they must never do is report a defect that is not one.
//
// That day came for CB-BYP-01. On 2026-08-06 it went red because the bypass had been SCOPED: an
// unpaired number is now refused with 401, so bug Sr. 128 is fixed. The case is inverted accordingly
// and now guards the fix. CB-BYP-02 still documents present behaviour — the bypass continues to
// ignore login_challenge for the configured number, so the VAPT 5.3 coverage gap below is unchanged.
//
// The assertion that genuinely matters is CB-BYP-05: the shim must not work outside dev.
//
// DECLARED LATE ON PURPOSE. CB-BYP-04 drives the OTP endpoint into its lockout and leaves TEST_PHONE
// throttled for ~11 minutes, which would poison every login above it — hence its @lockout tag.
// =============================================================================

test('[CB-BYP-01] The dev OTP bypass is scoped — an unpaired phone number is NOT authenticated (Sr. 128)', async () => {
  const ctx = await auth.newIsolatedContext();
  try {
    const otpReq = await auth.requestOtp(ctx, UNPAIRED_PHONE);
    const verify = await auth.verifyOtp(ctx, UNPAIRED_PHONE, TEST_OTP, otpReq.login_challenge);
    failOn429(verify.status, 'CB-BYP-01');

    const token = verify.body.access_token || auth.cookieValue(verify.setCookie, auth.ACCESS_COOKIE);
    console.log(
      `[CB-BYP-01] request-otp(${UNPAIRED_PHONE}) → ${otpReq.status}; ` +
        `verify-otp with the bypass code → ${verify.status}`
    );

    // A 403 is the per-phone lockout, not a scoping verdict. Without this guard a throttled run
    // would report "no token" as proof of scoping when nothing was actually evaluated.
    if (verify.status === 403) {
      failNotExecuted(
        'CB-BYP-01',
        FAILURE_CLASSES.SETUP,
        `verify-otp returned 403 for ${UNPAIRED_PHONE} — the number is throttled, so bypass scoping was never evaluated`,
        'Wait ~11 minutes and re-run. A 403 must not be read as "the bypass refused this number".'
      );
    }

    // Re-verified 2026-08-06: the shim used to be "create-or-login ANY phone number" and this case
    // asserted that present behaviour (bug Sr. 128, Low/P3). Dev has since scoped it — an unpaired
    // number is now refused outright — so the assertion is inverted to lock the fix in. CB-BYP-02
    // still passes, i.e. the bypass continues to work for the CONFIGURED test number, which is what
    // it exists for; only the "any number" reach is gone.
    //
    // Dev confirmed the config (2026-08-06): AUTH_TEST_OTP_CODES is phone:otp PAIRS —
    //   9000000002:847291, 9000000001:847291, 9000000003:847291, 9000000004:847291
    // The same code VALUE across four QA numbers is deliberate, so "one code authenticates more
    // than one number" is NOT a defect — the allow-list is what matters, and it is enforced:
    // all four enrolled numbers return 200 with four DISTINCT subs, while 5550000123 and
    // 9999999999 are both refused. That is the property this case guards. Do not re-file the
    // shared code value as a bug; check the allow-list instead.
    expect(
      token,
      `The dev bypass authenticated ${UNPAIRED_PHONE} and returned a token (verify-otp → ` +
        `${verify.status}). Bug Sr. 128 has REGRESSED: the shim is reachable for arbitrary phone ` +
        `numbers again, creating persisted accounts on demand for numbers request-otp itself ` +
        `refuses. body=${JSON.stringify(verify.body).slice(0, 300)}`
    ).toBeFalsy();
    expect(
      verify.status,
      `verify-otp returned ${verify.status} for an unpaired number; expected a 4xx refusal. ` +
        `body=${JSON.stringify(verify.body).slice(0, 300)}`
    ).toBe(401);

    test.info().annotations.push({
      type: 'fix-verified',
      description:
        `Sr. 128 verified fixed on dev (2026-08-06): the OTP bypass no longer authenticates ` +
        `${UNPAIRED_PHONE}. request-otp → ${otpReq.status}, verify-otp with the bypass code → ` +
        `${verify.status} with no token issued, so no on-demand account is created. The shim is now ` +
        `scoped to configured test numbers (CB-BYP-02 still authenticates TEST_PHONE). CB-BYP-05 ` +
        `continues to assert it is off on UAT.`,
    });
    console.log(
      `[CB-BYP-01] Sr. 128 FIXED — unpaired number refused with ${verify.status}, no token, ` +
        `no on-demand account. Bypass remains scoped to configured numbers.`
    );
  } finally {
    await ctx.dispose();
  }
});

test('[CB-BYP-02] The bypass path ignores login_challenge (documents intended dev behaviour; VAPT 5.3 unverifiable here)', async () => {
  const ctx = await auth.newIsolatedContext();
  try {
    // A forged challenge with an otherwise perfect phone + bypass code.
    const verify = await auth.verifyOtp(ctx, TEST_PHONE, TEST_OTP, 'cb-byp-02-not-a-real-challenge');
    failOn429(verify.status, 'CB-BYP-02');

    const token = verify.body.access_token || auth.cookieValue(verify.setCookie, auth.ACCESS_COOKIE);
    console.log(`[CB-BYP-02] verify-otp with a forged login_challenge → ${verify.status}`);

    // A 403 is the phone lockout, not a challenge verdict. Without this guard a throttled run would
    // report a result for a check that never ran.
    if (verify.status === 403) {
      failNotExecuted(
        'CB-BYP-02',
        FAILURE_CLASSES.SETUP,
        `verify-otp returned 403 for ${TEST_PHONE} — the phone is locked out, so the forged challenge was never evaluated`,
        'CB-BYP-04 deliberately triggers this lockout; if that case ran recently, wait ~11 minutes ' +
          'and re-run. A 403 must not be read as "the challenge was rejected".'
      );
    }

    // ASSERTS PRESENT BEHAVIOUR, NOT DESIRED BEHAVIOUR.
    //
    // The first version of this case failed here, claiming "VAPT 5.3 NOT ENFORCED". That was wrong:
    // the login_challenge is minted by request-otp, and the bypass exists precisely so a client can
    // skip request-otp. A bypass that still required a valid challenge could not do its job. Ignoring
    // the nonce is inherent to the feature, not a defect in it.
    expect(
      token,
      `The bypass path now REJECTS a forged login_challenge (verify-otp → ${verify.status}). That is ` +
        `likely an improvement, and it would mean VAPT 5.3 has become verifiable from the outside — ` +
        `at which point re-enable NEG-032 and assert enforcement properly instead of documenting its ` +
        `absence. body=${JSON.stringify(verify.body).slice(0, 300)}`
    ).toBeTruthy();
    expect(verify.status, `verify-otp with a forged challenge returned ${verify.status}`).toBe(200);

    // The consequence IS worth recording, and it is a coverage gap rather than a bug: the only valid
    // OTP QA can present is the bypass code, and that path ignores the challenge — so nothing in this
    // repo can currently exercise nonce enforcement.
    test.info().annotations.push({
      type: 'coverage-gap',
      description:
        'VAPT 5.3 (login_challenge as a single-use nonce) is UNVERIFIABLE from the outside on this ' +
        'environment. The only valid OTP available to QA is the dev bypass code, and the bypass path ' +
        'ignores the challenge by design. NEG-028 does not close this either — it sends a WRONG OTP ' +
        'alongside a bad challenge, so its 401 is fully explained by the wrong OTP. NEG-032 is ' +
        'commented out for the same reason: it replays its challenge through the bypass. ' +
        'TO CLOSE, dev must supply one of: (a) an env flag that disables the bypass for a single ' +
        'test run, (b) a test hook that returns the real issued OTP so the normal path can be ' +
        'driven, or (c) server-side test evidence for the non-bypass path.',
    });
    console.log(
      '[CB-BYP-02] VAPT 5.3 is unverifiable from outside while the bypass is active — recorded as a ' +
        'coverage gap, not a defect. See the annotation for what dev must supply.'
    );
  } finally {
    await ctx.dispose();
  }
});

test('[CB-BYP-03] Neither /info nor /health may advertise that a test-OTP bypass is configured', async () => {
  for (const p of ['/info', '/health', '/']) {
    const res = await CTX_A.get(`${BASE_URL}${p}`, { timeout: 20_000 });
    failOn429(res.status(), 'CB-BYP-03');
    const text = await res.text();
    expect(
      text,
      `GET ${p} reveals that an OTP bypass is configured. That tells an attacker to go looking for ` +
        `the code instead of attacking the SMS flow. Body: ${text.slice(0, 400)}`
    ).not.toMatch(/bypass|test_otp|test-otp|AUTH_TEST_OTP|debug_mode|"debug"\s*:\s*true/i);
  }
});

// =============================================================================
// ⚠️  CB-BYP-05 IS THE ONLY TEST IN THIS REPOSITORY THAT TOUCHES UAT.  ⚠️
//
// Everything else runs against dev. This one case exists because it is the only assertion about the
// OTP bypass that actually matters: the bypass on dev is intended behaviour (see CB-BYP-01/02), so
// the real question is whether the shim is gated off elsewhere. That cannot be answered on dev.
//
// It sends EXACTLY TWO requests — one verify-otp per phone number, no loops and no retries. It must
// never resemble a brute-force attempt against another environment, and must not push a real account
// into cooldown there. If this case ever FAILS, escalate immediately: it means a dev-only
// authentication shim is live on a production-adjacent environment. Do not triage it as a flake.
//
// Point it elsewhere with UAT_BASE_URL=... (see chatbot-auth.js).
// =============================================================================

test('[CB-BYP-05] The dev OTP bypass must NOT authenticate on UAT', async () => {
  const ctx = await auth.newIsolatedContext();
  const probed = [];
  try {
    for (const phone of [TEST_PHONE, UNPAIRED_PHONE]) {
      let res;
      try {
        // One request. No request-otp, no retry — see the header comment.
        res = await ctx.post(`${auth.UAT_BASE_URL}/api/auth/verify-otp`, {
          data: { phone_number: phone, otp: TEST_OTP },
          headers: { 'Content-Type': 'application/json' },
          timeout: 20_000,
        });
      } catch (err) {
        failNotExecuted(
          'CB-BYP-05',
          FAILURE_CLASSES.SETUP,
          `could not reach UAT (${auth.UAT_BASE_URL}), so the gating question is UNANSWERED`,
          `Error: ${err.message}\nThis is NOT evidence that the bypass is absent on UAT — the ` +
            `request never completed. Re-run when UAT is reachable, or set UAT_BASE_URL. ` +
            `Probed so far: ${probed.join(', ') || 'none'}`
        );
      }

      const status = res.status();
      const body = await res.json().catch(() => ({}));
      const token = body.access_token || auth.cookieValue(res.headers()['set-cookie'], auth.ACCESS_COOKIE);
      probed.push(`${phone}→${status}`);
      console.log(`[CB-BYP-05] UAT verify-otp(${phone}) with the dev bypass code → ${status}`);

      failOn429(
        status,
        'CB-BYP-05',
        `UAT shed the request with 429 after probing ${probed.join(', ')}. A throttle response is ` +
          `NOT proof that the bypass code was rejected — the code may never have been evaluated. ` +
          `Re-run after the window clears.`
      );
      if (status === 403) {
        failNotExecuted(
          'CB-BYP-05',
          FAILURE_CLASSES.SETUP,
          `UAT returned 403 for ${phone}, which is a cooldown/throttle refusal rather than a verdict on the bypass code`,
          `A 403 means the request was refused before the code mattered, so it is not evidence the ` +
            `shim is absent. Probed: ${probed.join(', ')}. Re-run later, or use a different ` +
            `TEST_PHONE_UNPAIRED that is not in cooldown on UAT.`
        );
      }

      expect(
        token,
        `THE DEV OTP BYPASS IS LIVE ON UAT: verify-otp at ${auth.UAT_BASE_URL} returned ${status} and ` +
          `a usable access token for ${phone} using the DEV bypass code. This is the one outcome this ` +
          `case exists to catch — a dev-only authentication shim on a production-adjacent ` +
          `environment means anyone holding the code can mint a token for any phone number there. ` +
          `ESCALATE IMMEDIATELY; do not re-run and hope. See bug Sr. 128. ` +
          `body=${JSON.stringify(body).slice(0, 300)}`
      ).toBeFalsy();
      expect(
        status,
        `UAT verify-otp returned ${status} for the dev bypass code on ${phone}; expected an auth ` +
          `rejection (401/422). body=${JSON.stringify(body).slice(0, 200)}`
      ).not.toBe(200);
    }

    // Guard against the whole loop being skipped by a future edit — a green with nothing probed would
    // be the worst possible outcome for this particular case.
    expect(
      probed.length,
      'CB-BYP-05 asserted nothing: no UAT request was made. This case must probe both phone numbers.'
    ).toBe(2);
    console.log(`[CB-BYP-05] UAT gating confirmed — probed ${probed.join(', ')} (2 requests, no retries).`);
  } finally {
    await ctx.dispose();
  }
});

// -----------------------------------------------------------------------------
// CB-BYP-06 — added 2026-08-06 (Iteration 8).
//
// Bug Sr. 128 was closed on the strength of a hand-run curl loop, which is how a fix regresses
// silently. CB-BYP-01 covers ONE unpaired number; this covers the allow-list as a whole, which is
// the actual security property: the bypass must authenticate exactly the enrolled numbers and
// nothing else.
//
// Dev confirmed the config on 2026-08-06 (Dev Patel):
//   AUTH_TEST_OTP_CODES=9000000002:847291, 9000000001:847291, 9000000003:847291, 9000000004:847291
//
// Note the same code VALUE is deliberately reused across all four numbers. QA briefly re-filed that
// as "one code is a master key", then withdrew it: the pairing is per-phone, and the allow-list is
// what enforces the boundary. So this case asserts the BOUNDARY, not the uniqueness of the code —
// asserting distinct codes would fail against the intended configuration.
// -----------------------------------------------------------------------------

// The enrolled numbers from AUTH_TEST_OTP_CODES. Override when dev changes the list; the point of
// the env var is that a config change should update this case rather than silently invalidate it.
const ENROLLED_BYPASS_PHONES = (process.env.TEST_BYPASS_PHONES || '9000000002,9000000001,9000000003,9000000004')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Numbers that must NOT be enrolled. UNPAIRED_PHONE is the reserved one CB-BYP-01 uses; the second
// is an obvious non-number that no real config would contain.
const NON_ENROLLED_PHONES = [UNPAIRED_PHONE, '9999999999'];

test('[CB-BYP-06] The OTP bypass authenticates EXACTLY the enrolled numbers and no others (Sr. 128)', async () => {
  test.setTimeout(180_000);
  const ctx = await auth.newIsolatedContext();
  try {
    const enrolled = [];
    const problems = [];

    // --- The enrolled numbers must all work, each as its OWN account ---------
    for (const phone of ENROLLED_BYPASS_PHONES) {
      const verify = await auth.verifyOtp(ctx, phone, TEST_OTP);
      failOn429(verify.status, `CB-BYP-06 (${phone})`);

      // A 403 is the per-phone cooldown, not a verdict on enrolment. Reporting it as a failure of
      // the allow-list would be wrong, so it is a SETUP GAP naming the cause.
      if (verify.status === 403) {
        failNotExecuted(
          'CB-BYP-06',
          FAILURE_CLASSES.SETUP,
          `verify-otp returned 403 for the enrolled number ${phone} — it is in OTP cooldown, so its enrolment was never evaluated`,
          'CB-BYP-04 deliberately triggers this lockout. Wait ~11 minutes and re-run. A 403 must ' +
            'not be read as "this number is not enrolled".'
        );
      }

      const token = verify.body.access_token || auth.cookieValue(verify.setCookie, auth.ACCESS_COOKIE);
      if (verify.status !== 200 || !token) {
        problems.push(`${phone}: expected 200 + token (it is in AUTH_TEST_OTP_CODES) but got ${verify.status}`);
        continue;
      }
      const me = await auth.authMe(ctx, token);
      enrolled.push({ phone, status: verify.status, userId: me.body && me.body.user_id, username: me.body && me.body.username });
    }

    // --- Everything else must be refused ------------------------------------
    for (const phone of NON_ENROLLED_PHONES) {
      const verify = await auth.verifyOtp(ctx, phone, TEST_OTP);
      failOn429(verify.status, `CB-BYP-06 (${phone})`);
      const token = verify.body.access_token || auth.cookieValue(verify.setCookie, auth.ACCESS_COOKIE);
      if (token) {
        problems.push(
          `${phone}: NOT in AUTH_TEST_OTP_CODES yet the bypass issued a token (${verify.status}) — ` +
            `bug Sr. 128 has REGRESSED, the shim is reachable for arbitrary numbers again`
        );
      } else if (verify.status !== 401) {
        // Refused, but not the way it was on 2026-08-06. Worth noting, not worth failing over.
        console.log(`[CB-BYP-06] ${phone} refused with ${verify.status} (401 was observed on 2026-08-06)`);
      }
    }

    console.log(
      `[CB-BYP-06] enrolled authenticated: ` +
        enrolled.map((e) => `${e.phone}->${String(e.userId).slice(0, 8)}`).join(' ') +
        ` | non-enrolled refused: ${NON_ENROLLED_PHONES.join(', ')}`
    );

    expect(
      problems,
      `The bypass allow-list does not match AUTH_TEST_OTP_CODES:\n  - ${problems.join('\n  - ')}\n` +
        `Config confirmed by dev 2026-08-06: ${ENROLLED_BYPASS_PHONES.join(', ')} (all with the ` +
        `same code value, deliberately). If dev has legitimately changed the list, update ` +
        `ENROLLED_BYPASS_PHONES or set TEST_BYPASS_PHONES — do not weaken the non-enrolled half.`
    ).toEqual([]);

    // Each enrolled number must resolve to a DISTINCT account. If two shared a user_id, the shared
    // code value really would be a master key into one account, which is the thing Sr. 128 feared.
    const ids = enrolled.map((e) => e.userId).filter(Boolean);
    expect(
      new Set(ids).size,
      `The ${enrolled.length} enrolled numbers resolved to only ${new Set(ids).size} distinct ` +
        `user_ids: ${JSON.stringify(enrolled)}. They must be separate accounts — a shared identity ` +
        `would mean one code grants access to another number's data.`
    ).toBe(ids.length);
  } finally {
    await ctx.dispose();
  }
});

// TAGGED @lockout AND EXCLUDED FROM THE DEFAULT RUN.
//
// This case works by getting TEST_PHONE locked out, and the lockout observed on dev lasts ~11
// minutes. Every other case in this file logs in as TEST_PHONE, so leaving it in the default run
// means the next run within that window reports ~20 SETUP GAPs — the suite would spend most of its
// time reporting damage it did to itself. (That is exactly what happened the first time it ran.)
//
// Run it deliberately, ideally as the last thing before a break:
//   npm run test:chatbot:lockout
test('[CB-BYP-04] @lockout Repeated wrong OTPs must still hit the rate limit on the bypass phone', async () => {
  test.setTimeout(120_000);
  // UNPACED ON PURPOSE — this case measures a throttle, so its attempts must arrive close together.
  // Under the OTP pacer they would be spaced ~20s apart and the lockout would never engage, failing the
  // test for a reason unrelated to the server. recordSend() keeps the global budget honest afterwards.
  const ctx = await auth.newIsolatedContext({}, { paced: false });
  try {
    const otpReq = await auth.requestOtp(ctx, TEST_PHONE);
    const challenge = otpReq.login_challenge;

    const statuses = [];
    for (let i = 0; i < 8; i += 1) {
      const wrong = String(100000 + i); // never equal to TEST_OTP
      recordSend(`${BASE_URL}/api/auth/verify-otp`); // debit BOTH buckets; the burst is the point
      const res = await auth.verifyOtp(ctx, TEST_PHONE, wrong, challenge);
      // A lockout on the FIRST attempt is left over from a previous run, so this run never observed
      // a throttle engaging — only that one was already in place. Not the same claim.
      if (i === 0 && res.status === 403) {
        failNotExecuted(
          'CB-BYP-04',
          FAILURE_CLASSES.SETUP,
          `${TEST_PHONE} was ALREADY locked out (403) on the first attempt, so no throttle transition was observed`,
          'This case needs to watch the endpoint go from accepting attempts to refusing them. ' +
            'Wait for the cooldown from the previous run to expire and re-run.'
        );
      }
      statuses.push(res.status);
      if (res.status === 429) break;
      if (res.status === 200) {
        expect(
          res.status,
          `A wrong OTP (${wrong}) authenticated ${TEST_PHONE}. OTP validation is broken outright.`
        ).not.toBe(200);
      }
    }
    console.log(`[CB-BYP-04] wrong-OTP statuses: ${statuses.join(', ')}`);

    // The requirement is that brute force gets BLOCKED, not that it gets blocked with one particular
    // status code. Observed on dev: 401 ×5 then 403 — a lockout after five wrong attempts. 403 is
    // therefore a pass, and an earlier version of this case that demanded 429 was asserting a code,
    // not a security property, and would have filed a bug that does not exist.
    const throttled = statuses.filter((s) => s === 429 || s === 403);
    expect(
      throttled.length,
      `Eight consecutive wrong OTPs for ${TEST_PHONE} produced ${statuses.join(', ')} — no throttle ` +
        `ever engaged (neither 429 nor 403). A phone configured for the test bypass must not be ` +
        `exempt from brute-force protection: the OTP space is only 10^6, so an unthrottled endpoint ` +
        `is brute-forceable for any number an attacker guesses is a test account. NEG-029 and ` +
        `VAPT-008 assert this for the normal flow; this case asserts the bypass phone is not a carve-out.`
    ).toBeGreaterThan(0);

    // Worth recording, not worth failing over: the lockout answers 403 while NEG-029 and VAPT-008 are
    // written against 429. Same protection, two different codes for "slow down" across the auth
    // surface — a client cannot tell a permanent refusal from a temporary one.
    if (!statuses.includes(429)) {
      test.info().annotations.push({
        type: 'observation',
        description:
          `OTP lockout returns 403 (statuses: ${statuses.join(', ')}), while NEG-029 and VAPT-008 ` +
          `expect 429 for rate limiting on the same surface. Protection is present; the status code ` +
          `is inconsistent. Low severity, but it makes client-side retry logic guesswork.`,
      });
      console.log('[CB-BYP-04] throttle engaged as 403, not 429 — recorded as a low-severity inconsistency.');
    }
  } finally {
    await ctx.dispose();
  }
});

// =============================================================================
// GAP 6 — REFRESH TOKEN ROTATION
//
// FUNC-033 proves refresh returns a token. VAPT-012 proves it refuses with no cookie. Neither proves
// ROTATION, which is the entire security value: after a successful refresh the old cookie must be
// dead. If it is not, a stolen refresh cookie is valid for as long as the account exists.
//
// DECLARED LAST, AND SPENDS NO EXTRA LOGINS.
//
// The first version of these three cases each performed their own request-otp + verify-otp. Together
// with beforeAll's two logins that put 5 OTP requests on one phone inside a minute, and the server
// throttled with 403 — so all three reported a SETUP GAP and tested nothing. That was a harness
// defect, not a product one. They now share the refresh cookie beforeAll already obtained for User A
// and hand the rotated value down the chain, so the whole file needs exactly two logins.
//
// CB-RFR-02 logs out, which invalidates User A, so it must be the very last test in the file.
// =============================================================================

// The live refresh cookie for the chain below. Seeded from User A's login, replaced by each
// successful rotation.
let REFRESH_CHAIN = null;

function refreshChainCookie(testId) {
  if (REFRESH_CHAIN) return REFRESH_CHAIN;
  requireIdentity(USER_A, testId);
  if (!USER_A.refreshCookie) {
    failNotExecuted(
      testId,
      FAILURE_CLASSES.SETUP,
      'the login set no recognisable refresh cookie, so there was nothing to rotate or replay',
      `Set-Cookie was: ${String(USER_A.setCookie).slice(0, 300)}\n` +
        `FIX: if the refresh cookie has a different name, add it to REFRESH_COOKIE_CANDIDATES in ` +
        `chatbot-auth.js. If refresh tokens are not cookie-based on this build at all, these three ` +
        `cases must be rewritten against whatever transport is used — they must not be left green.`
    );
  }
  REFRESH_CHAIN = `${USER_A.refreshCookie.name}=${USER_A.refreshCookie.value}`;
  return REFRESH_CHAIN;
}

test('[CB-RFR-01] Replaying a rotated refresh cookie must be rejected', async () => {
  const original = refreshChainCookie('CB-RFR-01');

  const first = await auth.refresh(CTX_A, original);
  failOn429(first.status, 'CB-RFR-01');
  if (first.status !== 200) {
    failNotExecuted(
      'CB-RFR-01',
      FAILURE_CLASSES.SERVER,
      `the first refresh failed with ${first.status}, so there was no rotation to test`,
      `body=${JSON.stringify(first.body).slice(0, 300)}\nCookie sent: ${original.split('=')[0]}=<redacted>`
    );
  }

  // Rotation must issue a DIFFERENT refresh cookie. Without reissue there is nothing to rotate, and
  // the replay below could not distinguish old from new even in principle.
  const rotated = first.refreshCookie;
  expect(
    rotated && rotated.value,
    `Refresh returned 200 but set no new refresh cookie (Set-Cookie: ` +
      `${String(first.setCookie).slice(0, 200)}). Without reissue the refresh token never rotates, ` +
      `so a cookie captured once stays valid for its full lifetime.`
  ).toBeTruthy();
  expect(
    rotated.value,
    'Refresh reissued the IDENTICAL refresh cookie value — the token is not rotating.'
  ).not.toBe(USER_A.refreshCookie.value);

  REFRESH_CHAIN = `${rotated.name}=${rotated.value}`;

  // The replay, in a fresh context so no cookie jar can quietly substitute the new value.
  const replayCtx = await auth.newIsolatedContext();
  try {
    const replay = await auth.refresh(replayCtx, original);
    failOn429(replay.status, 'CB-RFR-01');
    expect(
      replay.status,
      `REFRESH TOKEN REPLAY: the pre-rotation refresh cookie still minted a new access token ` +
        `(${replay.status}). Rotation is then cosmetic — a refresh cookie captured once can be ` +
        `reused indefinitely, which defeats the point of the 30-minute access-token TTL ` +
        `(VAPT 5.7). body=${JSON.stringify(replay.body).slice(0, 300)}`
    ).not.toBe(200);
    expect([401, 403]).toContain(replay.status);
  } finally {
    await replayCtx.dispose();
  }
});

test('[CB-RFR-03] A rotated access token authenticates, and differs from the one it replaced', async () => {
  const cookie = refreshChainCookie('CB-RFR-03');
  requireIdentity(USER_A, 'CB-RFR-03');

  const before = await auth.authMe(CTX_A, USER_A.access_token);
  if (before.status !== 200) {
    failNotExecuted(
      'CB-RFR-03',
      FAILURE_CLASSES.SETUP,
      `User A's current access token no longer authenticates /api/auth/me (${before.status})`,
      'Nothing downstream of this can be interpreted. Most likely the 30-minute TTL expired ' +
        'mid-run, or CB-RFR-02 already ran and logged this session out.'
    );
  }

  const rot = await auth.refresh(CTX_A, cookie);
  failOn429(rot.status, 'CB-RFR-03');
  if (rot.status !== 200 || !rot.access_token) {
    failNotExecuted(
      'CB-RFR-03',
      FAILURE_CLASSES.SERVER,
      `refresh returned ${rot.status} with no access token, so there was no rotated token to test`,
      `body=${JSON.stringify(rot.body).slice(0, 300)}`
    );
  }
  if (rot.refreshCookie) REFRESH_CHAIN = `${rot.refreshCookie.name}=${rot.refreshCookie.value}`;

  expect(
    rot.access_token,
    'Refresh returned the IDENTICAL access token — nothing was rotated.'
  ).not.toBe(USER_A.access_token);

  const withNew = await auth.authMe(CTX_A, rot.access_token);
  expect(
    withNew.status,
    `The rotated access token did not authenticate /api/auth/me (${withNew.status}). A refresh that ` +
      `returns an unusable token forces the user back to the login screen. ` +
      `body=${JSON.stringify(withNew.body).slice(0, 200)}`
  ).toBe(200);

  // Whether the OLD access token must die immediately is a design choice, not a stated requirement,
  // so this records the observable fact instead of inventing an expectation for it.
  const withOld = await auth.authMe(CTX_A, USER_A.access_token);
  console.log(
    `[CB-RFR-03] pre-refresh access token after rotation → ${withOld.status} ` +
      `(200 = overlapping validity: both tokens live until the old one expires)`
  );
});

test('[CB-RFR-02] Refresh after logout must be rejected', async () => {
  const cookie = refreshChainCookie('CB-RFR-02');
  requireIdentity(USER_A, 'CB-RFR-02');

  const out = await auth.logout(CTX_A, USER_A.access_token);
  failOn429(out.status, 'CB-RFR-02');
  if (out.status !== 200) {
    failNotExecuted(
      'CB-RFR-02',
      FAILURE_CLASSES.SERVER,
      `logout returned ${out.status}, so there was no logged-out state to test against`,
      `body=${JSON.stringify(out.body).slice(0, 200)}`
    );
  }

  // This test invalidates User A, so drop the cache — a later run must not restore a logged-out
  // identity from disk and then report its 401s as product defects.
  try {
    fs.unlinkSync(CACHE_PATH);
  } catch {
    /* nothing to clean up */
  }

  const replayCtx = await auth.newIsolatedContext();
  try {
    const after = await auth.refresh(replayCtx, cookie);
    failOn429(after.status, 'CB-RFR-02');
    expect(
      after.status,
      `Refresh succeeded (${after.status}) AFTER logout. SEC-017 proves the ACCESS token dies at ` +
        `logout, but if the refresh cookie survives, the session can be resurrected from it and ` +
        `logout is only client-side — which is exactly what VAPT 5.7 asks to be closed. ` +
        `body=${JSON.stringify(after.body).slice(0, 300)}`
    ).not.toBe(200);
    expect([401, 403]).toContain(after.status);
  } finally {
    await replayCtx.dispose();
  }
});
