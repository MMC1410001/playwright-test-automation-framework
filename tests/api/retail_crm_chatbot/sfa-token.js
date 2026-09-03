/**
 * SFA TSM JWT minting for the "Know About Product" suite.
 *
 * The endpoint requires TWO credentials:
 *   1. X-API-KEY                    - the shared SFA platform key
 *   2. Authorization: Bearer <jwt>   - an RS256 token identifying the calling TSM
 *
 * The Bearer token is NOT a chatbot/OTP token. It is signed with a private key the backend
 * issued to QA. Equivalent to the reference helper, now kept beside this file:
 *   python3 tests/api/retail_crm_chatbot/mint_test_sfa_token.py --private-key <path> --tsm-id TSM12345
 *
 * NOTE the reference script's own warning: that key is a SELF-SIGNED DEV/TEST keypair standing in
 * for real SFA-issued credentials, which are not yet available. Every auth result from this suite is
 * therefore provisional — re-verify against genuinely SFA-issued tokens in UAT/prod.
 *
 * SECURITY — the signing key must never be COMMITTED. It may sit in the repo folder because
 * `.gitignore` blocks it (*.pem, *.key, *.p12, *.pfx, sfa_jwt_private*), but:
 *   - never `git add -f` it;
 *   - never copy it to the server;
 *   - `chmod 600` whichever copy you use;
 *   - remember a fresh clone will NOT contain it — each machine needs it placed once.
 *
 * The key is looked for in this order, first readable wins (see candidateKeyPaths()):
 *   1. $SFA_JWT_PRIVATE_KEY_PATH                     explicit override
 *   2. ~/.retail_crm-sfa/sfa_jwt_private.pem              preferred — outside the repo
 *   3. <this dir>/sfa_jwt_private.pem                gitignored local copy
 *
 * Uses jsonwebtoken@9, already a devDependency — nothing new to install.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const jwt = require('jsonwebtoken');

// =============================================================================
// TOKEN SPEC — CONFIRMED against dev, no longer inferred.
//
// Established by diffing a known-good token from ./mint_test_sfa_token.py against
// ours, then narrowing empirically one claim at a time:
//
//   sub + iat + exp                     -> 401    (what this suite sent originally)
//   + iss only                          -> 401
//   + aud only                          -> 401
//   + iss AND aud                       -> 200 SUCCESS   <- minimal working set
//   + tsmId, role, territory, productLine -> 200 (so those are NOT enforced)
//   wrong iss / wrong aud               -> 401    (both validated exactly)
//
// So `iss` and `aud` are mandatory and checked exactly. The four app-level claims the reference
// script also emits (tsmId/role/territory/productLine) are NOT enforced, but are still sent below for
// parity with the reference client — see the note on `claims` and SFA-CFG-03.
//
// Identity is barely checked at all: any non-empty `sub` is accepted (an unknown TSM id works),
// `sub` and `tsmId` may disagree, and role/territory/productLine are ignored. Only an EMPTY `sub`
// is rejected. Pinned by SFA-AUTH-18/19/20 and raised as gap G12.
//
// WARNING for anyone debugging a 401 against this endpoint: the server returns an IDENTICAL
// `401 INVALID_TOKEN / "Token validation failed."` for a bad signature, an expired token, a missing
// sub, a wrong iss, a wrong aud AND an unsupported algorithm (BUG-9). The response tells you nothing
// about which. Do not infer a cause from the error body — diff against a known-good token instead.
// =============================================================================

const SFA_TOKEN_SPEC = {
  algorithm: 'RS256',
  // Matches the reference script's --expires-in default. Immaterial to behaviour either way, since
  // freshSfaToken() re-mints at the 5-minute margin — but a needless difference is a needless
  // difference.
  ttlSeconds: Number(process.env.SFA_TOKEN_TTL_SECONDS || 3600),
  /**
   * The FULL claim set emitted by ./mint_test_sfa_token.py, not just the enforced subset.
   *
   * Only `iss`, `aud` and a non-empty `sub` are actually validated by the server today —
   * `tsmId`/`role`/`territory`/`productLine` are accepted and ignored. They are still sent, because
   * the suite should transmit exactly what the real client transmits: a divergence between our
   * tokens and the reference is the precise class of bug that made the original 401 take days to
   * diagnose. SFA-CFG-03 asserts this parity automatically so it cannot drift again.
   *
   * Every value is env-overridable — these are environment- and identity-scoped, and hardcoding
   * `iss`/`aud` is what caused the original failure.
   */
  claims: (tsmId) => ({
    iss: process.env.SFA_TOKEN_ISS || 'sfa-platform', // == server SFA_JWT_ISSUER
    aud: process.env.SFA_TOKEN_AUD || 'chatbot-api', // == server SFA_JWT_AUDIENCE
    sub: tsmId,
    tsmId, // the reference script duplicates sub into tsmId; the server checks neither's value
    role: process.env.SFA_TOKEN_ROLE || 'field_sales',
    territory: process.env.SFA_TOKEN_TERRITORY || 'North',
    productLine: (process.env.SFA_TOKEN_PRODUCT_LINE || 'pharma').split(','),
  }),
};

/** The reference minting implementation, kept beside the suite. See SFA-CFG-03. */
const REFERENCE_MINT_SCRIPT = path.join(__dirname, 'mint_test_sfa_token.py');

/** Preferred location — outside the repo, so archives and syncs of the repo folder miss it. */
const DEFAULT_KEY_PATH = path.join(os.homedir(), '.retail_crm-sfa', 'sfa_jwt_private.pem');
/** Gitignored copy beside this module. Convenient, but reachable by repo zips/backups. */
const IN_REPO_KEY_PATH = path.join(__dirname, 'sfa_jwt_private.pem');
const DEFAULT_TSM_ID = process.env.SFA_TSM_ID || 'TSM12345';

// =============================================================================
// Key loading
// =============================================================================

let cachedKey = null;
let resolvedKeyPath = null;
let attemptErrors = [];
let warnedInRepo = false;

/** Candidate locations, highest precedence first. */
function candidateKeyPaths() {
  return [
    process.env.SFA_JWT_PRIVATE_KEY_PATH,
    DEFAULT_KEY_PATH,
    IN_REPO_KEY_PATH,
  ].filter(Boolean);
}

/**
 * Reads and validates the private key, walking the candidates until one works.
 * Returns null (never throws) when none is usable, so callers skip with a readable reason
 * instead of erroring the whole file. An unreadable or bad override is NOT fatal — it falls
 * through to the next candidate and is reported in keyUnavailableReason().
 */
function loadPrivateKey() {
  if (cachedKey) return cachedKey;
  attemptErrors = [];

  for (const p of candidateKeyPaths()) {
    try {
      const pem = fs.readFileSync(p, 'utf8');
      crypto.createPrivateKey(pem); // fail fast on a truncated/garbage file
      cachedKey = pem;
      resolvedKeyPath = p;

      if (p === IN_REPO_KEY_PATH && !warnedInRepo) {
        warnedInRepo = true;
        console.log(
          `[SFA] Signing key loaded from INSIDE the repo: ${p}\n` +
            `[SFA] It is gitignored so it will not be committed — but avoid zipping or sharing the ` +
            `repo folder, and prefer ${DEFAULT_KEY_PATH}.`
        );
      }
      return cachedKey;
    } catch (err) {
      attemptErrors.push(`${p} (${err.code || err.message})`);
    }
  }
  return null;
}

/** The path the key was actually loaded from, or the highest-precedence candidate if none worked. */
function keyPath() {
  if (!cachedKey) loadPrivateKey();
  return resolvedKeyPath || candidateKeyPaths()[0];
}

/**
 * SHA-256 of the DERIVED PUBLIC key, not of the private file — so it is safe to print, paste into a
 * ticket, and compare directly against what the backend team can compute for whichever key their
 * environment is configured with:
 *   openssl rsa -pubin -in <their-public-key> -pubout | openssl sha256
 * Returns null rather than throwing when no key is usable.
 */
function keyFingerprint(pem) {
  const material = pem || loadPrivateKey();
  if (!material) return null;
  try {
    const spki = crypto
      .createPublicKey(material)
      .export({ type: 'spki', format: 'pem' });
    return crypto.createHash('sha256').update(spki).digest('hex');
  } catch {
    return null;
  }
}

/**
 * Every readable candidate key, but ONLY when they disagree — otherwise an empty array.
 *
 * Why this exists: loadPrivateKey() returns the FIRST readable candidate, and ~/.retail_crm-sfa/ outranks
 * the in-repo copy. So pasting a newly-issued key beside the suite while a stale one still sits in
 * the home directory means the stale key silently wins and every token 401s — which reads exactly
 * like "the backend still hasn't deployed our key". There is no way to guess which key was intended,
 * so callers should treat a non-empty result as a hard stop.
 */
function keyConflicts() {
  const seen = [];
  for (const p of candidateKeyPaths()) {
    try {
      const pem = fs.readFileSync(p, 'utf8');
      const fingerprint = keyFingerprint(pem);
      if (fingerprint) seen.push({ path: p, fingerprint });
    } catch {
      // Unreadable candidates are not conflicts — same tolerance as loadPrivateKey().
    }
  }
  const distinct = new Set(seen.map((s) => s.fingerprint));
  return distinct.size > 1 ? seen : [];
}

/**
 * Human-readable reason the key could not be used — names EVERY path tried.
 * Callers may invoke this even when a key IS available (Playwright evaluates skip messages
 * eagerly), so report success honestly rather than listing the candidates that were skipped.
 */
function keyUnavailableReason() {
  if (!cachedKey) loadPrivateKey();
  if (cachedKey) return `SFA JWT signing key is available (${resolvedKeyPath}).`;
  const tried = attemptErrors.length ? attemptErrors.join('; ') : candidateKeyPaths().join('; ');
  return (
    `SFA JWT signing key not usable. Tried: ${tried}. ` +
    `Place the key at ${DEFAULT_KEY_PATH} (preferred) or beside the suite at ${IN_REPO_KEY_PATH}, ` +
    `chmod 600 — or set SFA_JWT_PRIVATE_KEY_PATH. Alternatively export SFA_TEST_JWT=<token> from ` +
    `mint_test_sfa_token.py. Never commit the key — see SFA_KnowAboutProduct_README.md.`
  );
}

/** True when a Bearer token can be produced by either route. */
function canProduceToken() {
  return Boolean(process.env.SFA_TEST_JWT || loadPrivateKey());
}

// =============================================================================
// Minting
// =============================================================================

/**
 * Mint a fresh TSM token.
 * @param {{tsmId?: string, ttlSeconds?: number, claims?: object, key?: string,
 *          notBeforeOffset?: number}} [opts]
 *   ttlSeconds may be negative to produce an already-expired token.
 *   claims are merged over the spec defaults (used by the negative cases).
 * @returns {string|null} the token, or null when no signing key is available.
 */
function mintSfaToken(opts = {}) {
  const key = opts.key || loadPrivateKey();
  if (!key) return null;

  const tsmId = opts.tsmId || DEFAULT_TSM_ID;
  const ttl = opts.ttlSeconds === undefined ? SFA_TOKEN_SPEC.ttlSeconds : opts.ttlSeconds;
  const now = Math.floor(Date.now() / 1000);

  const payload = {
    ...SFA_TOKEN_SPEC.claims(tsmId),
    ...(opts.claims || {}),
    iat: now,
    exp: now + ttl,
  };

  return jwt.sign(payload, key, { algorithm: SFA_TOKEN_SPEC.algorithm });
}

/**
 * A genuinely expired token: correct key, correct claims, `exp` in the past.
 * Isolates expiry from signature or claim problems — unlike reusing a stale hardcoded token,
 * where a 401 could mean any of several things.
 */
function mintExpiredToken(opts = {}) {
  return mintSfaToken({ ...opts, ttlSeconds: -3600 });
}

/**
 * A structurally valid RS256 token signed with a DIFFERENT key.
 * The server must reject it: accepting it would mean any well-formed RS256 token passes,
 * i.e. the issued public key is not actually pinned.
 */
function mintWrongKeyToken(opts = {}) {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  // Pass the key explicitly so this works even when the real key is absent.
  const tsmId = opts.tsmId || DEFAULT_TSM_ID;
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { ...SFA_TOKEN_SPEC.claims(tsmId), iat: now, exp: now + SFA_TOKEN_SPEC.ttlSeconds },
    pem,
    { algorithm: SFA_TOKEN_SPEC.algorithm }
  );
}

/**
 * Tamper a token's payload while keeping its original signature.
 * Signature verification must fail.
 */
function tamperToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return 'invalid.jwt.token';
  let payload;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return 'invalid.jwt.token';
  }
  payload.sub = 'TSM00000-forged';
  const forged = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${parts[0]}.${forged}.${parts[2]}`;
}

// =============================================================================
// Resolution
// =============================================================================

/**
 * The token the suite should send.
 * SFA_TEST_JWT wins when set, so a token minted by the Python script can be used verbatim
 * (useful for confirming the claim set in SFA_TOKEN_SPEC).
 * @returns {string|null}
 */
function getSfaToken(opts = {}) {
  const fromEnv = process.env.SFA_TEST_JWT;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  return mintSfaToken(opts);
}

// --- Freshness ---------------------------------------------------------------
// Tokens carry a 30-minute TTL but a run can exceed that (SFA-DD-01 budgets 60 minutes for the
// 361-code sweep). A token minted once at module load would expire mid-run and turn every later
// call into a 401 — which reads as a product defect ("KB has no data for these SKUs") when it is
// really a harness problem. Always fetch through freshSfaToken() so long runs stay authenticated.

const REFRESH_MARGIN_SECONDS = 300; // re-mint when less than 5 minutes remain

let currentToken = null;
let currentTokenExp = 0;

/** Seconds until the given token expires; Infinity when it carries no exp. */
function secondsUntilExpiry(token) {
  const payload = describeToken(token)?.payload;
  if (!payload || typeof payload.exp !== 'number') return Infinity;
  return payload.exp - Math.floor(Date.now() / 1000);
}

/**
 * A token guaranteed valid for at least REFRESH_MARGIN_SECONDS, re-minting when needed.
 * An SFA_TEST_JWT supplied by the caller is returned as-is and never re-minted — we cannot
 * regenerate someone else's token — but its remaining life is reported by tokenExpiryWarning().
 */
function freshSfaToken(opts = {}) {
  const fromEnv = process.env.SFA_TEST_JWT;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();

  if (currentToken && currentTokenExp - Math.floor(Date.now() / 1000) > REFRESH_MARGIN_SECONDS) {
    return currentToken;
  }
  const minted = mintSfaToken(opts);
  if (!minted) return null;
  currentToken = minted;
  currentTokenExp = describeToken(minted)?.payload?.exp || 0;
  return currentToken;
}

/**
 * Warning string when the active token cannot outlast a long run, else null.
 * Only meaningful for an externally supplied SFA_TEST_JWT, since minted tokens self-refresh.
 */
function tokenExpiryWarning(neededSeconds = 0) {
  const fromEnv = process.env.SFA_TEST_JWT;
  if (!fromEnv || !fromEnv.trim()) return null;
  const left = secondsUntilExpiry(fromEnv.trim());
  if (left === Infinity) return null;
  if (left <= 0) {
    return `SFA_TEST_JWT has ALREADY EXPIRED (${Math.abs(left)}s ago). Re-run mint_test_sfa_token.py.`;
  }
  if (left < Math.max(neededSeconds, REFRESH_MARGIN_SECONDS)) {
    return `SFA_TEST_JWT expires in ${left}s — too short for this run. Re-mint it, or unset ` +
      `SFA_TEST_JWT to let the suite mint self-refreshing tokens.`;
  }
  return null;
}

/** 'env' | 'minted' | 'unavailable' — for the startup banner. */
function tokenSource() {
  if (process.env.SFA_TEST_JWT && process.env.SFA_TEST_JWT.trim()) return 'env';
  return loadPrivateKey() ? 'minted' : 'unavailable';
}

/** Decoded header+payload of a token, or null. Diagnostics only — no verification. */
function describeToken(token) {
  try {
    return jwt.decode(token, { complete: true });
  } catch {
    return null;
  }
}

/**
 * Mint a token using the REFERENCE Python implementation, so our claim set can be diffed against
 * the source of truth (SFA-CFG-03). Returns `{token}` on success or `{error}` describing why not —
 * never throws, so the caller decides how to report it.
 *
 * Requires python3 + pyjwt on the machine. Missing either is a real QA setup gap with an obvious fix
 * (`pip install pyjwt`), so the caller reports it as SETUP GAP rather than hiding it.
 */
function mintViaReferenceScript(tsmId = DEFAULT_TSM_ID) {
  const key = keyPath();
  if (!fs.existsSync(REFERENCE_MINT_SCRIPT)) {
    return { error: `reference script not found at ${REFERENCE_MINT_SCRIPT}` };
  }
  if (!key || !fs.existsSync(key)) {
    return { error: `no signing key available (${keyUnavailableReason()})` };
  }
  try {
    const token = execFileSync(
      process.env.PYTHON_BIN || 'python3',
      [REFERENCE_MINT_SCRIPT, '--private-key', key, '--tsm-id', tsmId],
      { encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();
    if (!token || token.split('.').length !== 3) {
      return { error: `script produced no usable JWT (got: ${String(token).slice(0, 200)})` };
    }
    return { token };
  } catch (err) {
    const detail = [err.message, err.stderr && err.stderr.toString()].filter(Boolean).join(' | ');
    return { error: detail.slice(0, 600) };
  }
}

/** PEM public key derived from the private key — lets tests self-verify offline. */
function derivePublicKey() {
  const key = loadPrivateKey();
  if (!key) return null;
  return crypto
    .createPublicKey(key)
    .export({ type: 'spki', format: 'pem' })
    .toString();
}

module.exports = {
  SFA_TOKEN_SPEC,
  DEFAULT_KEY_PATH,
  IN_REPO_KEY_PATH,
  DEFAULT_TSM_ID,
  candidateKeyPaths,
  keyPath,
  keyFingerprint,
  keyConflicts,
  REFERENCE_MINT_SCRIPT,
  mintViaReferenceScript,
  keyUnavailableReason,
  canProduceToken,
  mintSfaToken,
  mintExpiredToken,
  mintWrongKeyToken,
  tamperToken,
  getSfaToken,
  freshSfaToken,
  secondsUntilExpiry,
  tokenExpiryWarning,
  tokenSource,
  describeToken,
  derivePublicKey,
};
