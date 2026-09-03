# SFA "Know About Product" API — Test Suite

Automation for `POST /api/v1/product/know-about-product`, the Sales Force Automation (SFA)
extension to the Retail CRM Opus Product Chatbot.

| | |
|---|---|
| **Endpoint** | `POST /api/v1/product/know-about-product` |
| **Spec** | BFRD *"Know About Product API — Product Chatbot Extension for SFA Integration"* v1.0, 09-Jul-2026 (Dev Patel) |
| **OpenAPI** | [retail_crm_chatbot_api.json](retail_crm_chatbot_api.json) → `paths./api/v1/product/know-about-product`, tag `sfa-integration` |
| **Test file** | [sfa_know_about_product_test.js](sfa_know_about_product_test.js) — 91 cases (90 default + SFA-DD-01 @sweep) |
| **Reference mint** | [mint_test_sfa_token.py](mint_test_sfa_token.py) — the backend's own token minter; `SFA-CFG-03` diffs our claim set against it |
| **Token helper** | [sfa-token.js](sfa-token.js) — mints the RS256 TSM Bearer token |
| **Environment** | `https://jsonplaceholder.typicode.com` (UAT URL is commented at the top of the test file) |

---

## 🔐 QA setup (one time per machine)

### 1. Install the JWT signing key

The backend issues a 2048-bit RSA private key used to sign the TSM Bearer token.
**The rule is: never _commit_ it, and never copy it to the server.** `.gitignore` enforces the first
part — it blocks `*.pem`, `*.key`, `*.p12`, `*.pfx`, `sfa_jwt_private*` and `.env.*.local`.

[sfa-token.js](sfa-token.js) checks three locations, **first readable wins**:

| # | Location | Notes |
|---|---|---|
| 1 | `$SFA_JWT_PRIVATE_KEY_PATH` | Explicit override. An unreadable value is not fatal — it falls through to #2. |
| 2 | `~/.retail_crm-sfa/sfa_jwt_private.pem` | **Preferred.** Outside the repo, so zips/syncs/backups of the repo folder can't pick it up. |
| 3 | `tests/api/retail_crm_chatbot/sfa_jwt_private.pem` | Convenient local copy beside the suite. Gitignored, so it will not be committed. Logs a one-line notice when used. |

Any of the three works. Pick one:

```bash
# Option 1 (preferred) — outside the repo
mkdir -p ~/.retail_crm-sfa && chmod 700 ~/.retail_crm-sfa
cp /path/to/sfa_jwt_private.pem ~/.retail_crm-sfa/sfa_jwt_private.pem
chmod 600 ~/.retail_crm-sfa/sfa_jwt_private.pem

# Option 2 — beside the suite (zero env setup)
cp /path/to/sfa_jwt_private.pem tests/api/retail_crm_chatbot/sfa_jwt_private.pem
chmod 600 tests/api/retail_crm_chatbot/sfa_jwt_private.pem

# Option 3 — anywhere, via the override
export SFA_JWT_PRIVATE_KEY_PATH=/some/other/path/sfa_jwt_private.pem
```

`chmod 600` either way — there is no reason for a private key to be world-readable.

### When dev issues a NEW key, replace every copy

Pasting the new key into only one location does not work: the **highest-precedence readable copy
wins**, and `~/.retail_crm-sfa/` outranks the repo folder. A stale copy left there silently shadows the new
one, every token 401s, and it looks like the backend never deployed the fix.

```bash
NEW=/path/to/new/sfa_jwt_private.pem
cp "$NEW" ~/.retail_crm-sfa/sfa_jwt_private.pem
cp "$NEW" tests/api/retail_crm_chatbot/sfa_jwt_private.pem   # only if you keep a local copy
chmod 600 ~/.retail_crm-sfa/sfa_jwt_private.pem tests/api/retail_crm_chatbot/sfa_jwt_private.pem

# Confirm which key is live, and that they agree:
node -e "const t=require('./tests/api/retail_crm_chatbot/sfa-token.js');
console.log(t.keyPath(), t.keyFingerprint()); console.log('conflicts:', t.keyConflicts());"
```

`SFA-CFG-02` fails with `SETUP GAP` if the installed keys disagree, and the startup banner always
prints the fingerprint of the key actually in use — so "which key am I running with?" is answerable
at a glance, and comparable to what dev computes for their side.

> **A fresh clone will not contain the key** (that is the point of the gitignore rule). Each machine
> needs it placed once. Until it is, the token-dependent cases **fail with `SETUP GAP`**, listing
> every path that was tried. They are not skipped — see [Failure classes](#failure-classes-nothing-is-ever-skipped).
>
> If you keep the copy inside the repo folder: don't `git add -f` it, and be careful about zipping
> or sharing that directory.

### 2. Get a token — either way works

**Option A — let the suite mint one (default, nothing to do).**
[sfa-token.js](sfa-token.js) signs a fresh RS256 token per run, so tokens never expire mid-session.

**Option B — mint manually with the backend script and export it.** Takes precedence over Option A,
so it is also how you confirm the suite's claim set matches the server's expectation:

```bash
python3 tests/api/retail_crm_chatbot/mint_test_sfa_token.py \
  --private-key ~/.retail_crm-sfa/sfa_jwt_private.pem --tsm-id TSM12345
export SFA_TEST_JWT='<token from the script>'
```

> ✅ **Claim set confirmed** against dev — `{iss:'sfa-platform', aud:'chatbot-api', sub:'<tsmId>'}`,
> see [Current status](#-current-status-unblocked). `SFA_TOKEN_SPEC` in [sfa-token.js](sfa-token.js)
> is still the single place to change if a future environment differs; `SFA_TOKEN_ISS` /
> `SFA_TOKEN_AUD` override it without an edit.

### 3. Verify the setup offline (no deployment needed)

```bash
node -e "const t=require('./tests/api/retail_crm_chatbot/sfa-token.js');
console.log(t.tokenSource(), t.keyPath()); console.log(t.describeToken(t.getSfaToken()));"
```

Expect `minted`, the key path, and a decoded `{alg:'RS256'}` header with `sub`/`iat`/`exp`.

### 4. Manual call

```bash
curl -X POST https://jsonplaceholder.typicode.com/api/v1/product/know-about-product \
  -H "X-API-KEY: $SFA_KNOW_PRODUCT_API_KEY" \
  -H "Authorization: Bearer $SFA_TEST_JWT" \
  -H "Content-Type: application/json" \
  -d '{"productCode": "950001"}'
```

---

## ✅ Current status: unblocked

Both earlier blockers are resolved. `SFA-CFG-01` and `SFA-CFG-02` pass; the preflight reports
`Credential preflight OK (HTTP 200)` and lookups return real KB content.

### Root cause of the long-running 401 — and a correction

The endpoint rejected every locally minted token with `401 INVALID_TOKEN`. The cause was **two
missing registered claims**, `iss` and `aud`.

> **An earlier version of this README and of the `SFA-CFG-02` message diagnosed this as a
> "key-pair mismatch" and stated that `SFA_TOKEN_SPEC` was not the fix. That was wrong.** The signing
> key was correct all along — a working token from dev verifies against our own pem. The wrong
> conclusion came from a differential that looked decisive but was not: our key and a randomly
> generated key returned byte-identical errors, which was read as "the server can't recognise our
> key". In fact this endpoint returns **the same opaque error for every token fault** (BUG-9), so that
> comparison could never separate a signature problem from a claims problem. The correct verdict at
> the time was *undetermined*.

### The confirmed claim set

Established by diffing a known-good token from `mint_test_sfa_token.py`, then narrowing one claim at
a time against dev:

| Claims sent | Result |
|---|---|
| `sub` + `iat` + `exp` | `401` |
| … + `iss` only | `401` |
| … + `aud` only | `401` |
| **`sub` + `iat` + `exp` + `iss` + `aud`** | **`200 SUCCESS`** — minimal working set |
| … + `tsmId`, `role`, `territory`, `productLine` | `200` — so these are **not** enforced |
| wrong `iss` / wrong `aud` | `401` — both validated exactly |

```js
// sfa-token.js > SFA_TOKEN_SPEC.claims — full parity with ./mint_test_sfa_token.py
{ iss: 'sfa-platform', aud: 'chatbot-api', sub: '<tsmId>',
  tsmId: '<tsmId>', role: 'field_sales', territory: 'North', productLine: ['pharma'] }
```

Only `iss`, `aud` and a non-empty `sub` are enforced; the last four are sent purely for **parity with
the reference client**, because a divergence between our tokens and the real client's is what made the
original 401 take days to diagnose. **`SFA-CFG-03` now asserts that parity automatically** by running
the Python reference and diffing claim sets — the check that would have caught the original bug in one
run.

### The server's side of the contract

Named by the reference script, so no longer guesswork:

| Server setting | Must match |
|---|---|
| `SFA_JWT_PUBLIC_KEY_PATH` | the public half of our `sfa_jwt_private.pem` |
| `SFA_JWT_ISSUER` | our `iss` — `sfa-platform` |
| `SFA_JWT_AUDIENCE` | our `aud` — `chatbot-api` |

### ⚠️ These auth results are provisional — the key is a dev stand-in

`mint_test_sfa_token.py` states plainly: *"Never point this at a real SFA-issued private key — this is
for self-signed dev/test tokens only, while real SFA access is unavailable."*

So every auth result in this suite validates a **self-signed dev keypair**, not the real SFA issuer.
When real SFA-issued credentials arrive, the whole of section A (`SFA-AUTH-*`) must be re-run against
them — the issuer, audience, claim set and key management may all differ. Treat current auth passes as
"the mechanism works", not "production auth is verified".

Override per environment with `SFA_TOKEN_ISS` / `SFA_TOKEN_AUD` — UAT/prod will likely differ, and
hardcoding these is what caused the original failure. All three mint helpers share
`SFA_TOKEN_SPEC.claims()`, so `SFA-AUTH-11` (expired) and `SFA-AUTH-15` (wrong key) now isolate their
own single cause for the first time.

`SFA-AUTH-16` / `SFA-AUTH-17` were added to lock in `iss` / `aud` enforcement — it is real and was
previously untested. `AUTH-17` in particular covers **audience confusion**: a token issued for a
sibling service sharing this key pair must not be replayable here.

### ⚠️ Debugging a 401 against this endpoint

**Do not infer a cause from the error body.** Bad signature, expired, missing `sub`, wrong `iss`,
wrong `aud` and an unsupported algorithm all return the identical
`401 INVALID_TOKEN / "Token validation failed."` (BUG-9). Get a known-good token, `export
SFA_TEST_JWT=<token>`, and diff the claims — that is the only reliable method.

---

## Failure classes — nothing is ever skipped

**There is no `test.skip()` anywhere in this suite.** A skipped test is a test nobody reads: the
report says "1 skipped" and the reader cannot tell whether that meant *the product is broken*, *my
machine is missing a key*, or *we hit a rate limit*. Every test that cannot execute therefore
**fails**, through `failNotExecuted()`, with one of four classes in the message:

| Class | Meaning | Who fixes it |
|---|---|---|
| `SETUP GAP` | A credential is missing **on this machine** | QA — [§1 above](#1-install-the-jwt-signing-key) |
| `BLOCKED BY SERVER` | 503 not-configured, or the server rejected our credentials | Backend / infra |
| `NOT EXECUTED (RATE LIMITED)` | 429 survived the pacer and 3 retries | Backend (raise the limit) or lower `RATE_LIMIT_BUDGET` |
| `HARNESS ERROR` | Token mint failed, the request threw, the body was unparseable | QA — this test file |

Every such message ends with **"NOTHING WAS ASSERTED in this test"**, so a red is never mistaken for
a proven product defect. The class also lands in the HTML report as a `failure-class` annotation.

### Triage order

1. **`SFA-CFG-01` / `SFA-CFG-02` first.** If either is red, most other reds are downstream symptoms
   and carry no independent information. `SFA-CFG-02` runs its own differential (no-token / our key /
   a throwaway key) and prints a finished diagnosis rather than "401, good luck".
2. Then any `SETUP GAP` — your machine, not the product.
3. Then real assertion failures.

### Rate-limit pacing

The endpoint allows **~60 requests / 60 s**, and that bucket is **shared between authenticated and
unauthenticated callers** (BUG-2 — BFRD §6 asks for per-API-key limiting). The suite is large enough
to exceed the limit on its own, which used to produce skipped tests. Now:

- A token-bucket pacer holds the suite to `RATE_LIMIT_BUDGET = 50` per rolling 60 s.
- Any 429 is retried 3× with 5 s / 10 s / 20 s backoff (honouring `Retry-After` if the server ever
  starts sending it — it does not today, BUG-7).
- Only then does the case fail, as `NOT EXECUTED (RATE LIMITED)`.
- `SFA-PERF-02/03/04` deliberately opt out (`pace: false, retryOn429: false`) — pacing a
  rate-limit measurement would destroy what it measures.

A run that reports zero `RATE LIMITED` failures is the expected state.

### Verifying the failure messages themselves

The blocker paths are unreachable on a healthy environment, so `SFA_SIMULATE_BLOCKER` forces one:

```bash
SFA_SIMULATE_BLOCKER=no-token       npm run test:sfa -- -g "SFA-AUTH-11"
SFA_SIMULATE_BLOCKER=no-api-key     npm run test:sfa -- -g "SFA-FUNC-01"
SFA_SIMULATE_BLOCKER=not-configured npm run test:sfa -- -g "SFA-CFG-01"
SFA_SIMULATE_BLOCKER=rate-limited   npm run test:sfa -- -g "SFA-NEG-01"
```

Simulated failures are tagged `(SIMULATED: …)` and are never written to the preflight cache, so they
cannot poison the next real run. **Unset the variable for real results.**

### Why two things are cached on disk

Playwright **discards the worker process after every failed test** and starts a fresh one, which
re-runs `beforeAll` and resets all module state. On a 43-failure run that happens 43 times. Two
pieces of state therefore live in files under `test-results/` rather than in memory:

| File | Why | Bypass |
|---|---|---|
| `.sfa-preflight.json` | Otherwise the endpoint probe and the OTP flow re-run per restart, spending rate-limit budget and OTP quota the suite then fails on. 10-minute TTL. | `SFA_FORCE_PREFLIGHT=1` |
| `.sfa-rate-window.json` | The pacer's rolling 60 s window. In memory it resets on every restart, so the pacer would be inert exactly when it is needed most — on a red run. | delete the file |

Expect exactly **one** `Preflight: endpoint is reachable` line per run; the rest read
`Preflight reused from cache`. Both files are inside the already-gitignored `test-results/`.

### Attribution is scoped, not blanket

When credentials are rejected, lookup failures get a `>>> ROOT CAUSE` banner pointing at
`SFA-CFG-02` — but **only when the observed status (401/403) is one the blocker could have caused.**
A failure with any other status gets a `>>> NOTE` instead, saying the blocker does *not* explain it
and it should be triaged on its own merits. Stamping "just a symptom" onto an independent defect
would bury it just as effectively as a skip.

---

## Running

```bash
# Default run — 87 cases. Excludes SFA-DD-01 via --grep-invert @sweep, so the sweep never
# appears in the report at all (rather than appearing as an unexplained grey line).
npm run test:sfa

# A single case or group
npm run test:sfa -- -g "SFA-NEG"
npm run test:sfa -- -g "SFA-FUNC-23"

# Override credentials for a non-dev environment
SFA_KNOW_PRODUCT_API_KEY='<uat key>' npm run test:sfa

# Full 361-code KB coverage sweep — SFA-DD-01 only. ~1 hour, exhausts DAILY_TOKEN_LIMIT for
# every other suite. Prints a banner and waits 10s so you can Ctrl-C if it was unintended.
npm run test:sfa:sweep
```

> A bare `npx playwright test <file>` has no `--grep-invert @sweep` and **will** start the
> hour-long sweep. Use the npm scripts.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `SFA_KNOW_PRODUCT_API_KEY` | No on dev | `X-API-KEY` header. Dev value is a hardcoded fallback in the test file; **must** be set for UAT/prod — do not reuse the dev key. |
| `SFA_JWT_PRIVATE_KEY_PATH` | No | Highest-precedence key location. Falls through to `~/.retail_crm-sfa/sfa_jwt_private.pem`, then `tests/api/retail_crm_chatbot/sfa_jwt_private.pem`. |
| `SFA_TEST_JWT` | No | A pre-minted TSM token. Takes precedence over local minting. |
| `SFA_TSM_ID` | No (default `TSM12345`) | `sub` claim of the minted token |
| `SFA_TOKEN_TTL_SECONDS` | No (default `1800`) | Minted token lifetime |
| `SFA_TOKEN_ISS` | No (default `sfa-platform`) | `iss` claim — **required and validated exactly** by the endpoint |
| `SFA_TOKEN_AUD` | No (default `chatbot-api`) | `aud` claim — **required and validated exactly** by the endpoint |
| `SFA_TOKEN_ROLE` / `SFA_TOKEN_TERRITORY` / `SFA_TOKEN_PRODUCT_LINE` | No | Unenforced scope claims, sent for parity with the reference script (G12) |
| `PYTHON_BIN` | No (default `python3`) | Interpreter used by `SFA-CFG-03` to run the reference minter. **That interpreter needs `pyjwt[crypto]`** — `pip3 install "pyjwt[crypto]"`. Plain `pyjwt` is not enough: without the `cryptography` extra the minter dies on `KeyError: 'RS256'`, and `SFA-CFG-03` fails as `SETUP GAP` with nothing asserted. This cost one false red on 2026-08-06 |
| `TEST_PHONE` / `TEST_OTP` | No | Chatbot OTP login — needed **only** by `SFA-INT-01/02/03` |
| `TEST_AUTH_TOKEN` | No | Pre-supplied *chatbot* JWT; avoids the OTP flow entirely |
| `SFA_FORCE_PREFLIGHT` | No | Set to `1` to ignore `test-results/.sfa-preflight.json` and re-probe |
| `SFA_SIMULATE_BLOCKER` | No | `no-api-key` \| `no-token` \| `not-configured` \| `rate-limited` — forces one blocker so its failure message can be verified. **Never set in a real run.** |

`SFA_RUN_FULL_SWEEP` is gone — `SFA-DD-01` is now selected by the `@sweep` tag
(`npm run test:sfa:sweep`) instead of by an env var and a skip.

`playwright.config.js` does **not** load `.env` (dotenv is commented out at
[playwright.config.js:8-10](../../../playwright.config.js#L8-L10)), so these must come from the shell.

### Why two credentials, and two *kinds* of token

The endpoint needs `X-API-KEY` **and** a Bearer JWT. Critically, that JWT is an **RS256 TSM token**
signed with the key above — **not** a chatbot/OTP token. They are different keys with different
claims, which is exactly what `SFA-INT-02` asserts: a chatbot JWT must be rejected even when paired
with a valid API key.

The chatbot OTP flow is still used, but only by `SFA-INT-01/02/03`, and it is fetched lazily so a
blocked run does not burn OTP requests against the phone-number throttle.

---

## Findings already confirmed against dev

Recorded from live runs on dev.

Everything below the divider was previously invisible: while credentials were rejected, no lookup
ever reached the product logic. These are the findings the suite was built for.

> **Iteration 8 — 2026-08-06 full regression.** Run: **86 passed / 1 failed** of 87 (the one red is
> `SFA-SEC-07`, bug Sr. 109). Nine of the findings below are now **resolved and struck through**.
> Two remain open: **Sr. 121** (rate-limit scope) and **Sr. 124 / G12** (token identity). One is new
> and is a *content* gap rather than a code defect — see [What the Sr. 116 fix did and did not
> fix](#what-the-sr-116-fix-did-and-did-not-fix). Details in
> [chatbot_bug.txt](chatbot_bug.txt) under `ITERATION 8`.

| Case | Finding | Severity |
|---|---|---|
| ~~`SFA-FUNC-17` `SFA-FUNC-19` `SFA-NEG-07`~~ | ~~**The validator is numeric-only and rejects 5 real SKUs.** `productCode must be a numeric product code (4-8 digits)` → `400 INVALID_PRODUCT_CODE` for `FGP`, `56X305MM`, and by extension ` PEN`, ` NOTEPAD`, `1NOTEPAD`~~ | ✅ **Resolved 2026-08-06** (Sr. 116) — the numeric-only rule is gone. `FGP` → `404`, `56X305MM` → `404`, `ABCDEF` → `404 PRODUCT_NOT_FOUND`, `51718` → `200`. All four cases pass. **But read the section below — those SKUs still return no data**, so *reachability* is not fixed, only the validator |
| ~~`SFA-FUNC-23`~~ | ~~**HALLUCINATION — confirmed, not theoretical (G10).** `999002` "PASS INTERIOR" is a `Collaterals` row, yet the API fabricated `openingLine`, `keySellingPoints` and `competitorDetails`~~ | ✅ **Resolved 2026-08-06** (Sr. 119, was Critical/P0) — `999002` → `200` with `openingLine: ""` and `keySellingPoints`, `objectionHandling`, `competitorDetails` all `[]`. The composer no longer invents sales content for merchandise. `" PEN"` → `404` |
| ~~`SFA-NEG-06`~~ | ~~Numeric JSON `productCode` (`950001`) → **`422`** with FastAPI's `{"detail":[…]}` body~~ | ✅ **Resolved 2026-08-06** (Sr. 117 + Sr. 118) — `{"productCode": 950001}` → **`200`**. The FastAPI-envelope leak on this path is gone with it |
| ~~`SFA-PERF-01`~~ | ~~Single lookup took **19,981 ms** … under 10-way concurrency latency degrades to **43 s**~~ | ✅ **Resolved 2026-08-06** (Sr. 120) — single lookup **5,190 ms**; 10 concurrent all `200` at **6,832–9,157 ms** with `requestId`s correctly paired; `404` paths 30–50 ms. **G6 stays open as a decision:** 5.2 s still exceeds BFRD §7's indicative 1–2 s, and §7 leaves the SLA "to be defined" — business must set the number now that the 24 s defect is gone |
| ~~`SFA-PERF-04`~~ | ~~**BUG-5** — the `429` body is `{"error":"Too Many Requests","message":…}`, breaking the BFRD §5.4 envelope~~ | ✅ **Resolved 2026-08-06** (Sr. 118) — `429` now returns `{"status":"FAILURE","errorCode":"RATE_LIMITED","message":"Rate limit of 60 requests per 60s exceeded."}`. Limit reached at request 61. Sr. 122 fixed too: `retry-after: 59`, `x-ratelimit-limit: 60`, `-remaining: 0`, `-reset: <epoch>` |
| `SFA-PERF-04` `SFA-PERF-05` | **Sr. 121 — the rate limit is not scoped by authentication state.** 61 token-less calls carrying a **valid** `X-API-KEY` (each a `401`) exhausted the 60/60 s budget, and the next fully valid key+token call returned `429`. A client whose token expires can therefore lock itself out of its own good traffic. **Partially verified:** whether two *distinct valid* keys get separate buckets could not be tested — QA holds one valid key, and an invalid second key is refused with `401 UNAUTHORIZED` before the limiter is consulted. Dev to confirm the intended scope | **High** — open |
| `SFA-AUTH-18/19/20` | **G12 / Sr. 124 — the token's identity is barely checked. STILL OPEN at Iteration 8.** Any non-empty `sub` is accepted (`NOT-A-REAL-TSM-9999` → 200), `sub` and `tsmId` may disagree, and `role`/`territory`/`productLine` are ignored. Only an empty `sub` is rejected. The endpoint authenticates the **key**, not the **TSM**, so AC §10.2's "identifies the calling TSM" is nominal. **These three cases assert the permissive behaviour deliberately, so their passing is the evidence the bug is unfixed** — see the note under Design notes. Severity depends on whether scope enforcement was ever intended — raise as a decision, not a bug | Open question |
| — | **The signing key is a self-signed dev stand-in**, per `mint_test_sfa_token.py`'s own warning: *"Never point this at a real SFA-issued private key… while real SFA access is unavailable."* Every `SFA-AUTH-*` pass therefore validates the *mechanism*, not production auth. **All of section A must be re-run in UAT/prod against genuinely SFA-issued tokens** | ⚠️ Scope caveat |
| `SFA-AUTH-11` etc. | **BUG-9 / Sr. 123 — PARTIALLY resolved 2026-08-06.** The operationally important half is fixed: expiry is now distinguishable (`401 TOKEN_EXPIRED` / "Token has expired.") and a missing header is its own code (`MISSING_TOKEN`), so a client can tell *refresh* from *credentials are wrong*. **But seven faults still share one opaque `INVALID_TOKEN` / "Token validation failed.":** wrong signing key, tampered payload, missing `sub`, wrong `iss`, wrong `aud`, `alg=none`, garbage string. BFRD §5.5's full distinct-code set is not implemented. The original bug asked for *"at minimum separate expiry as `TOKEN_EXPIRED`"* — that was delivered, and the security counter-argument (don't tell a forger which part failed) applies to exactly the remaining seven, none of which are client-recoverable. **Recommend Low/P3, retitled — not closed.** Positive: `alg=none` **is** rejected | Low — partial |
| ~~`SFA-CFG-01`~~ | ~~Endpoint returns 503 — not configured on dev~~ | ✅ **Resolved** — endpoint deployed and configured |
| ~~"key-pair mismatch"~~ | ~~Server does not hold the public key matching our pem~~ | ❌ **Withdrawn — was never a defect.** The key was correct throughout; the real cause was our tokens omitting `iss`/`aud`. Do not chase this |
| ~~`SFA-INT-04`~~ | ~~Live OpenAPI declares only `["200","422"]` for this path. BFRD §5.5 defines 400/401/403/404/500~~ | ✅ **Resolved 2026-08-06** (Sr. 125) — declares `["200","400","401","403","404","422","429","500"]`, and `components.securitySchemes` now defines `SfaApiKey` (apiKey, `X-API-KEY`) + `SfaBearerJwt` (http bearer JWT) with the operation carrying both. **This case was an expected-failure-by-design and is now green** — G4 closed |
| `SFA-MTH-01` | `GET` → **405**. BFRD §2.1 promises *"GET/POST by Product Code"*; only POST exists (**G3**). BFRD overstates scope. Re-verified 2026-08-06: unchanged, and it is a **doc fix** — no code change is expected (Sr. 127) | Low — doc fix |
| `SFA-MTH-02/03` | `PUT` / `DELETE` → 405 | ✅ Pass |
| `SFA-MTH-04` | `POST` with a trailing slash → **200** as of 2026-08-06 (previously a **307**). The redirect is gone, so either URL form works directly. Still worth pinning one form in the SFA client | Low |
| `SFA-SEC-07` | `X-Frame-Options: DENY`, CSP includes `frame-ancestors 'none'`, HSTS `max-age=31536000; includeSubDomains; preload`, `cache-control: no-store, no-cache, must-revalidate` (**new — Sr. 105/111 fixed**) | ✅ Pass on these |
| `SFA-SEC-07` | **Sr. 109 — `x-content-type-options` is sent twice (`"nosniff, nosniff"`), and `Server: nginx` is disclosed (Sr. 102/110).** Re-verified 2026-08-06 with `curl -D -`: a raw duplicate pair, not a client merge artefact, on `/health`, `/api/chat/sessions` **and** this endpoint — one global middleware/nginx duplication. **This is the single red in the 87-case run.** Fix one side only, and apply `server_tokens off` to both the API and frontend server blocks | Medium — open |
| `SFA-AUTH-14` | Plain `http://` POST → 405, i.e. answered rather than redirected. BFRD §6 wants cleartext *rejected*; a 301/308 to HTTPS would be cleaner than a 405 from a default server block | Low |
| — | ~~The failure envelope … the `422` (`SFA-NEG-06`) and the `429` (`SFA-PERF-04`) both bypass it. So **G5 is partly satisfied**~~ | ✅ **G5 now fully satisfied (2026-08-06).** Both escapes are closed: the numeric-JSON path returns `200` instead of a FastAPI `422`, and the `429` returns `{"status":"FAILURE","errorCode":"RATE_LIMITED",…}`. Every observed failure path now uses BFRD §5.4 |

### What the Sr. 116 fix did and did not fix

The validator defect is genuinely closed — but the fix changed the **failure mode** of the five
non-numeric master-data codes rather than making them reachable. Measured 2026-08-06:

| Code | Before | After | Time |
|---|---|---|---|
| `FGP` | `400 INVALID_PRODUCT_CODE` | `404 PRODUCT_NOT_FOUND` | 33 ms |
| `56X305MM` | `400` | `404` | 31 ms |
| `" PEN"` | `400` | `404` | 51 ms |
| `51718` | `200` | `200` | 9.1 s |

The 30–50 ms timings mean no KB retrieval is attempted, so these are **content misses, not slow
lookups**. `SFA-FUNC-17/19` and `SFA-NEG-07` pass because they assert *"not 400"* — the correct
assertion for the validator bug, and one that says nothing about coverage.

**`SFA-DD-01` was then run to quantify it, and the answer is reassuring** (2026-08-06, 38.9 min,
`test-results/sfa-kb-coverage.json` / `.csv`):

```
processed:            361      paintSkusMissing:         0
resolved200:          356      paintSkusNoBenefits:      0
notFound404:            5      paintSkusNoCompetitors:   0
otherStatus:            0      paintSkusNoPitch:         0
                               p95LatencyMs:          9000
```

The 5 misses are **exactly** the 5 non-numeric codes — `56X305MM`, `FGP`, `" PEN"`, `" NOTEPAD"`,
`"1NOTEPAD"` — all blank-sub-brand junk/merchandise rows, **not sellable paint**. Every one of the
**356 paint SKUs resolves with benefits, competitor data and a pitch**.

So the honest reading: **AC §10.1 is met.** A 404 on a notepad or a pen is arguably the *correct*
answer, and consistent with the Sr. 119 fix that stopped fabricating pitches for merchandise. The
residual is a master-data hygiene question — should junk rows be in the product code space at all
(**G10**) — not an API defect.

> An earlier draft of this section warned that "real SKUs return nothing" and treated it as a
> blocker for AC §10.1. The sweep disproved that: zero paint SKUs are missing. Recorded here rather
> than quietly deleted.

---

## Contract gaps (G1–G11)

Raise these with the chatbot backend / BFRD author. Several cases below are written to *document*
the current behaviour rather than assert a guess — they will need updating once these are answered.

| # | Gap | Detail | Blocked cases |
|---|---|---|---|
| **G1** | ~~Undeclared JWT requirement~~ **mechanism resolved, documentation defect remains** | **Resolved:** a TSM Bearer JWT *is* required alongside `X-API-KEY`. It is an RS256 token signed with a private key the backend issues; QA mints their own (see QA setup). **Still open:** BFRD §6 documents only "API Key + IP Whitelisting" and never mentions the JWT, so the BFRD is wrong and any SFA integrator reading it will fail. Raise as a BFRD correction. | `SFA-AUTH-09` (confirms enforcement), `SFA-AUTH-15` (confirms key pinning) |
| **G2** | ~~productCode type — a CONFIRMED defect, both halves~~ | ✅ **CLOSED 2026-08-06.** Both halves fixed: the numeric-only 4–8-digit rule is gone (`FGP`/`56X305MM`/`ABCDEF` → `404`, not `400`), and a JSON **number** `950001` now returns `200`. BFRD §4.2's *"String / Number"* wording is finally harmless. **Residual, tracked separately:** the five non-numeric SKUs return `404` with no KB data — a content gap, not a type gap | `SFA-FUNC-17/19`, `SFA-NEG-06/07` |
| **G3** | GET vs POST | BFRD §2.1 says "GET/POST"; only POST implemented (confirmed 405, re-verified 2026-08-06). Doc fix only — Sr. 127 | `SFA-MTH-01` |
| **G4** | ~~Undocumented error responses~~ | ✅ **CLOSED 2026-08-06.** Spec now declares `200/400/401/403/404/422/429/500` and defines both security schemes. `SFA-INT-04` flipped from expected-fail to pass | `SFA-INT-04` |
| **G5** | ~~Error envelope divergence~~ | ✅ **CLOSED 2026-08-06.** Both escapes fixed: the numeric-JSON path no longer produces a FastAPI `422`, and the `429` now returns `{"status":"FAILURE","errorCode":"RATE_LIMITED",…}`. Every observed failure path uses BFRD §5.4 | all NEG, `SFA-NEG-06`, `SFA-PERF-04` |
| **G6** | No performance SLA — **still open, now purely a business decision** | BFRD §7 leaves it "to be defined". The 24 s / 43 s defect (Sr. 120) is fixed: **5.2 s** single, **6.8–9.2 s** at 10-way concurrency, `404`s in 30–50 ms. That is still above §7's indicative 1–2 s, so someone must set the actual number rather than leave it undefined. Caching or a non-LLM path for the static sections would be the lever if 1–2 s is genuinely required | `SFA-PERF-01` |
| **G13** | **Rate-limit scope — new, Sr. 121. MEASURED: the API-key limit binds and identity gives no isolation** | The limit is **60 / 60 s on the API key**, and it applies regardless of authentication state. Proven 2026-08-06 with two tokens differing only in `sub`/`tsmId` on the same key (bursting absent code `999999`, so ~50 ms 404s and no LLM cost): identity A `429` at request **61**; identity B, a fresh `sub`, `429` **immediately**. A new TSM gets zero budget of its own. 61 *token-less* calls trip it identically, so a client with an expired token starves its own valid traffic. **Consequence: if SFA holds one shared key, 60/60 s is the ceiling for all TSMs combined** — at 5.2 s/lookup that caps the whole integration, and one TSM's retry storm throttles the rest. Whatever identity limiting exists is unobservable, being the looser of the two (or not wired here). **Dev answered 2026-08-06: "keyed purely on the literal `X-API-KEY` header value — nothing else."** So it is **by design**, and QA's measurement agrees (a fresh `sub` gets zero budget, which rules out any identity component — note this contradicts dev's earlier "rakha identity pe hai"; treat that as intent). What follows: failed-auth counting is intended; "which limiter fired" is moot as there is only one. **The sharp consequence is a DoS surface** — anyone holding the key can exhaust the whole integration's budget with 60 junk calls/min and **no JWT at all**, so IP whitelisting (BFRD §6) is the *sole* control and `SFA-MAN-01` becomes a go-live gate. **Still open:** does each distinct *valid* key get a full independent 60/60 s? Dev's wording implies yes but it needs a second valid key — an invalid one returns `401` and the `x-ratelimit-*` counters are **not emitted on non-throttled responses**, so QA cannot tell whether it consumed a bucket. And: will SFA hold one shared key or one per TSM/region? That single fact decides whether 60/60 s is the whole field force's ceiling | `SFA-PERF-04/05/06/07/08` |
| **G14** | **`x-ratelimit-*` counters are only sent on the 429 — new, 2026-08-06** | Verified absent on both a `404` and a `200`; present only on the throttled response (`retry-after: 59`, `x-ratelimit-limit: 60`, `-remaining: 0`, `-reset: <epoch>`). A client therefore cannot see its remaining budget until it has already been throttled. Emitting them on every response would let SFA pace itself and never hit the limit — low effort, and it prevents the very `429`s Sr. 121/122 are about | `SFA-PERF-06` |
| **G7** | Bulk lookup | BFRD §9 open question. Until specified, non-scalar input must be a clean 4xx | `SFA-NEG-11` |
| **G8** | `specifications` always empty | Documented as empty "until a structured spec schema exists in the KB". AC §10.1 only partly met at go-live | `SFA-FUNC-04` |
| **G9** | **Duplicate product codes** | `924004` ×2 (Allwood Pro / Allwood), `974001` ×2 (Calista / Sample Kit). Which row wins? Must be deterministic | `SFA-FUNC-21/22` |
| **G10** | ~~**Non-product SKUs share the code space** — may hallucinate a pitch for merchandise~~ | ✅ **CLOSED 2026-08-06** (Sr. 119, was Critical/P0). `999002` "PASS INTERIOR" (a `Collaterals` row) returns `200` with `openingLine: ""` and empty `keySellingPoints` / `objectionHandling` / `competitorDetails`. The code space is still shared, but the composer no longer invents sales content for it | `SFA-FUNC-23` |
| **G11** | `category` source undefined | Is `category` = `subBrandName`? 36 of 361 rows have a blank sub-brand, so `category` will be `""` for ~10% of the catalog | `SFA-FUNC-25/26` |
| **G12** | **Token identity and scope claims are not enforced — STILL OPEN, re-verified 2026-08-06 (Sr. 124)** | BFRD §6 / AC §10.2 say the JWT *identifies the calling TSM*, but in practice: **any non-empty `sub` is accepted** (an unknown TSM id returns 200), `sub` and `tsmId` may disagree with no consistency check, and `role`/`territory`/`productLine` are transmitted and ignored — a `productLine:['pharma']` token retrieves paint. So the endpoint authenticates the signing **key**, not the **TSM**: no per-TSM authorization, throttling or audit attribution is possible from it. **Severity depends on intent** — if scope enforcement was never planned, slim the token; if it was, this is a missing control. Decide, then either enforce or remove. **This is the only Aug-3 SFA bug that did not move**, and the three cases still passing is the proof | `SFA-AUTH-18/19/20` |

---

## Master data — `product_codes.json`

Generated from `product ids and names.xlsx` (361 rows: `baseproduct`, `baseProductName`,
`subBrandName`). The suite loads it at runtime so master-data refreshes cannot silently rot the
fixtures — `beforeAll` asserts the row count and that the key fixtures still resolve.

### Properties that shape the tests

| Property | Value | Why it matters |
|---|---|---|
| Code length | 6 chars ×354, 5 ×2, 3 ×2, 7 ×1, 8 ×2 | **No fixed-length validation is safe** — a "6 digits" rule rejects 7 real SKUs |
| Non-numeric codes | 5: `56X305MM`, `FGP`, ` PEN`, ` NOTEPAD`, `1NOTEPAD` | Alphabetic input is **not** malformed → must be 404, never 400 |
| Leading spaces | `' PEN'`, `' NOTEPAD'` | Blind input trimming would break these real codes |
| Duplicates | `924004`, `974001` | Ambiguous lookup (G9) |
| Blank `subBrandName` | 36 rows (28 `COLORANT *`, `ECO GRADE PAINT` ×2, `PAINT CRAFT KIT`, 5 junk) | `category` will be `""` (G11) |
| Blank `baseProductName` | 0 | Safe to assert `productName` is always non-empty |
| Numeric range | `51718` – `999044` | `999999` is verified absent → safe `ABSENT_CODE`. Note `999002`–`999044` are **real** Collaterals |
| Sub-brands | Allwood 87, Prime 58, One 43, Style 40, Calista 34, Artist 25, Alldry 21, Allwood Pro 8, Collaterals 8, Sample Kit 1, blank 36 | Drives the `SFA-FUNC-20` sweep |

### Named fixtures

| Constant | Value | Master-data row |
|---|---|---|
| `VALID_CODE` | `950001` | ITALIAN PU SEALER — Allwood (the BFRD §4.2 example, confirmed present) |
| `VALID_5DIGIT` | `51718` | EPOXY ISOLANT BASE — Allwood |
| `VALID_ALPHA` | `FGP` | non-numeric, 3 chars |
| `VALID_ALNUM` | `56X305MM` | 8 chars, mixed |
| `DUPLICATE_CODE` | `924004` | PRO PU SEALER BASE — two rows |
| `DUPLICATE_CODE_2` | `974001` | COMPANY PS — Calista + Sample Kit |
| `BLANK_CATEGORY` | `970001` | COLORANT WHITE — no sub-brand |
| `COLLATERAL_CODE` | `999002` | PASS INTERIOR — Collaterals |
| `JUNK_CODE` | `" PEN"` | leading space is significant |
| `ABSENT_CODE` | `999999` | verified absent from all 361 rows |

### Refreshing master data

There is no `xlsx` dependency in `package.json`, so the sheet is converted once and committed.
After replacing `product ids and names.xlsx`, regenerate the fixture:

```bash
cd tests/api/retail_crm_chatbot && python3 -c "
import zipfile, xml.etree.ElementTree as ET, re, json
z = zipfile.ZipFile('product ids and names.xlsx')
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
ss = [''.join(t.text or '' for t in si.iter(NS+'t'))
      for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(NS+'si')]
rows = []
for row in ET.fromstring(z.read('xl/worksheets/sheet1.xml')).iter(NS+'row'):
    d = {}
    for c in row.findall(NS+'c'):
        col = re.match(r'([A-Z]+)', c.get('r')).group(1)
        v, t = c.find(NS+'v'), c.get('t')
        d[col] = ss[int(v.text)] if (t == 's' and v is not None) else (v.text if v is not None else '')
    rows.append(d)
out = [{'code': r.get('A',''), 'name': r.get('B',''), 'subBrand': r.get('C','')} for r in rows[1:]]
json.dump({'_source':'product ids and names.xlsx','_generated':'YYYY-MM-DD',
           '_note':'Codes are verbatim, including significant leading spaces.',
           '_rowCount':len(out),'products':out},
          open('product_codes.json','w'), indent=2, ensure_ascii=False)
print('rows:', len(out))
"
```

Then update the `expect(PRODUCTS.length).toBe(361)` guard in the test file's fixture `beforeAll`
if the row count changed.

---

## Test case index

87 cases in a default run. IDs are in the test titles, so `-g "SFA-NEG"` / `-g "SFA-FUNC-2"` work as filters.

### Pre-condition
| ID | Case |
|---|---|
| `SFA-CFG-01` | Endpoint is enabled on this environment (server-side `SFA_KNOW_PRODUCT_API_KEY` is set) |

### A. Authentication & authorization — 20 (BFRD §6, AC §10.2)
| ID | Case | Expected |
|---|---|---|
| `SFA-AUTH-01` | Valid key + JWT + valid code | 200 SUCCESS |
| `SFA-AUTH-02` | No `X-API-KEY` header | 401 `UNAUTHORIZED` |
| `SFA-AUTH-03` | Empty `X-API-KEY` | 401 |
| `SFA-AUTH-04` | Wrong `X-API-KEY` | 401 |
| `SFA-AUTH-05` | Key with trailing whitespace | 200 or 401 — pinned + logged |
| `SFA-AUTH-06` | Lowercase `x-api-key` header name | 200 (headers are case-insensitive) |
| `SFA-AUTH-07` | Key as a query parameter | 401 — must never be accepted in a URL |
| `SFA-AUTH-08` | Key via `Authorization: ApiKey` | 401 |
| `SFA-AUTH-09` | Valid key, no Bearer JWT | Confirms the JWT requirement empirically (**G1**) |
| `SFA-AUTH-10` | Malformed JWT | 401, not 500 |
| `SFA-AUTH-11` | Expired JWT — minted with the **correct** key, `exp` in the past | 401. A true expiry test: isolates expiry from signature/claim problems |
| `SFA-AUTH-12` | Tampered TSM token payload, original signature | 401 |
| `SFA-AUTH-13` | Spoofed `X-Forwarded-For` / `X-Real-IP` | Outcome unchanged — spoofing must not affect the IP whitelist |
| `SFA-AUTH-14` | Plain `http://` | Never 200 over cleartext |
| `SFA-AUTH-15` | Token signed with a **different** RSA key | 401 — proves the server pins the issued public key and does not accept any well-formed RS256 token |
| `SFA-AUTH-16` | Correct key, **foreign `iss`** | 401 — `iss` is validated exactly, so the signing key alone does not let a caller assert any issuer identity |
| `SFA-AUTH-17` | Correct key, **foreign `aud`** | 401 — **audience confusion**: a token legitimately issued for a sibling service sharing this key pair must not be replayable against the SFA surface |
| `SFA-AUTH-18` | Unknown `sub` (`NOT-A-REAL-TSM-9999`) | **200 — documents that TSM identity is NOT validated (G12).** Asserts current behaviour so the day the backend starts checking, this goes red and G12 can be closed |
| `SFA-AUTH-19` | `sub` ≠ `tsmId` | **200 — documents the missing consistency check (G12).** Audit trails can disagree with the authenticated identity |
| `SFA-AUTH-20` | Empty `sub` | 401 — the one identity check that does exist, and a genuine requirement: a token asserting no subject must never authenticate |

### B. Functional / response contract — 16 (BFRD §4.3, §5.3, AC §10.1)
| ID | Case |
|---|---|
| `SFA-FUNC-01` | Valid code → 200 `SUCCESS` |
| `SFA-FUNC-02` | `productCode` echoed exactly |
| `SFA-FUNC-03` | All 4 BFRD sections present |
| `SFA-FUNC-04` | `productInfo` types (`category` asserted as string only — G11; `specifications` object — G8) |
| `SFA-FUNC-05` | `productName` non-empty |
| `SFA-FUNC-06` | `description` > 50 chars |
| `SFA-FUNC-07` | `productBenefits` element types |
| `SFA-FUNC-08` | `productBenefits` non-empty for a paint SKU |
| `SFA-FUNC-09` | `competitorDetails` element types |
| `SFA-FUNC-10` | `salesPitch` shape incl. `objectionHandling[{objection,response}]` |
| `SFA-FUNC-11` | `keySellingPoints` non-empty |
| `SFA-FUNC-12` | `requestId` echoed byte-identical (AC §10.5) |
| `SFA-FUNC-13` | Omitted `requestId` still 200, echoed as null |
| `SFA-FUNC-14` | `Content-Type: application/json` |
| `SFA-FUNC-15` | Unknown extra body fields ignored |
| `SFA-FUNC-16` | Repeat calls structurally stable (no exact-text assertions — LLM-composed) |

### B2. Master-data-driven — 11
| ID | Case |
|---|---|
| `SFA-FUNC-17` | `FGP` (alpha) → not 400 |
| `SFA-FUNC-18` | `51718` (5-digit) → no length rule |
| `SFA-FUNC-19` | `56X305MM` (8 chars) → not 400 |
| `SFA-FUNC-20` | Sub-brand sweep, 11 representatives; paint sub-brands must resolve |
| `SFA-FUNC-21` | `924004` duplicate → one deterministic product across 3 calls (G9) |
| `SFA-FUNC-22` | `974001` duplicate across two sub-brands → not merged (G9) |
| `SFA-FUNC-23` | **Hallucination guard** — collateral/merchandise codes must not get an invented pitch (G10) |
| `SFA-FUNC-24` | `productName` parity vs the xlsx for 10 sampled paint SKUs |
| `SFA-FUNC-25` | Blank sub-brand → `category` is `""`, not null (G11) |
| `SFA-FUNC-26` | Diagnostic: does `category` map to `subBrandName`? (G11) |
| `SFA-FUNC-27` | Lowercase code resolves the same as uppercase |

### C. Input validation — 16 (BFRD §5.5, AC §10.3)
| ID | Case | Expected |
|---|---|---|
| `SFA-NEG-01` | `productCode` omitted | 400 `INVALID_PRODUCT_CODE`, **not** 422 |
| `SFA-NEG-02` | `null` | 400 `INVALID_PRODUCT_CODE` |
| `SFA-NEG-03` | `""` | 400 `INVALID_PRODUCT_CODE` |
| `SFA-NEG-04` | `"   "` | 400 `INVALID_PRODUCT_CODE` |
| `SFA-NEG-05` | `" 950001 "` | Trimming behaviour pinned — pairs with NEG-16 |
| `SFA-NEG-06` | Numeric `950001` | 200 via coercion (G2) |
| `SFA-NEG-07` | `"ABCDEF"` | **404 `PRODUCT_NOT_FOUND`, not 400** — alpha codes are well-formed here |
| `SFA-NEG-08` | `"!@#$%^&*"` | 400/404, no 500 |
| `SFA-NEG-09` | `999999` (absent) | 404 `PRODUCT_NOT_FOUND` |
| `SFA-NEG-10` | 5000-char code | 400/413/422, never reaches the LLM |
| `SFA-NEG-11` | Array / object `productCode` | Clean 4xx, never partial (G7) |
| `SFA-NEG-12` | Malformed JSON | 4xx whose body is still valid JSON |
| `SFA-NEG-13` | JSON array body | 4xx |
| `SFA-NEG-14` | `Content-Type: text/plain` | 415/422, not 200 |
| `SFA-NEG-15` | Empty body | 4xx |
| `SFA-NEG-16` | `" PEN"` — real code with a significant leading space | Forces the trim-vs-exact-match decision |

### D. Method & routing — 4
`SFA-MTH-01` GET (G3) · `SFA-MTH-02` PUT · `SFA-MTH-03` DELETE · `SFA-MTH-04` trailing slash

### E. Security / VAPT — 8
| ID | Case |
|---|---|
| `SFA-SEC-01` | SQL injection → no DB error text, no traceback |
| `SFA-SEC-02` | NoSQL `{"$ne": null}` → never 200 with an arbitrary product |
| `SFA-SEC-03` | XSS payload not reflected unescaped in any string field |
| `SFA-SEC-04` | Path traversal → no filesystem content |
| `SFA-SEC-05` | **Prompt injection** — must not dump the KB or reveal the system prompt. Highest-value case here: the endpoint sits on the router+composer LLM pipeline |
| `SFA-SEC-06` | 1 MB body → 413/4xx, no 500 |
| `SFA-SEC-07` | `X-Frame-Options`, CSP `frame-ancestors`, no version disclosure |
| `SFA-SEC-08` | No tracebacks or env-var names in any error body |

### F. Performance & rate limiting — 8 (BFRD §6, §7, AC §10.4)
| ID | Case | Note |
|---|---|---|
| `SFA-PERF-01` | Single-call latency vs SLA | Hang-guard (`LATENCY_CEILING_MS` = 15 s) only until G6 is answered. Measured 5,190 ms on 2026-08-06 |
| `SFA-PERF-02` | 10 concurrent calls, `requestId` pairing | Detects cross-request state bleed. 2026-08-06: all 200, 6.8–9.2 s, ids correctly paired. Note it asserts **no 5xx + id pairing**, not latency — the latency numbers come from its `console.log` |
| `SFA-PERF-03` | Concurrent valid + invalid | Each gets its own status |
| `SFA-PERF-04` | Rate limit exists + its 429 uses the BFRD §5.4 envelope | Phase 1: 25 valid-key calls (5xx check). Phase 2: forces the limit with ~60 token-less calls that 401 before any LLM work, so it is cheap. **Passes as of 2026-08-06** — limit at request 61, body is `{"status":"FAILURE","errorCode":"RATE_LIMITED",…}` |
| `SFA-PERF-05` | 15-call burst, invalid keys | Rejection must be cheap; also generates the 401 traffic for SFA-MAN-05. 2026-08-06: 15× `401`, avg 49 ms |
| `SFA-PERF-06` | **429 throttle metadata (Sr. 122)** — added 2026-08-06 | Asserts `retry-after`, `x-ratelimit-limit/-remaining/-reset` are all present, that `retry-after` parses to a **positive** number (a `0`/`NaN` would make a compliant client hot-loop), that `-remaining` is `0`, and that the 429 keeps the BFRD §5.4 envelope. Bursts `ABSENT_CODE`, so ~50 ms 404s and no LLM cost |
| `SFA-PERF-07` | **Rate-limit scope, identity dimension (Sr. 121 / G13)** — added 2026-08-06 | Two tokens differing only in `sub`, same key: exhausts identity A, then calls as identity B. **Documents present behaviour** (B → `429`, key-level binds). Waits for a clean window first and fails as `NOT EXECUTED` if A trips below request 10 — otherwise a pre-spent budget would attribute A's throttle to traffic it never sent. If B ever succeeds, that is dev scoping per identity: re-assert and close G13 |
| `SFA-PERF-08` | **Rate-limit scope, cross-key dimension (Sr. 121 / G13)** — added 2026-08-06 | Exhausts key 1, then calls with `SFA_KNOW_PRODUCT_API_KEY_2`. **Reports a `SETUP GAP` until dev issues a second key** — it cannot be minted locally. Deliberately does not assert isolated-vs-shared: both are legitimate designs and the choice is dev's (G13). It fails only when it could not measure, and guards against a `401` second key being misread as "shared bucket" |

### G. Cross-endpoint consistency — 4
| ID | Case |
|---|---|
| `SFA-INT-01` | Product name consistent between the SFA API and `/api/chat/query` |
| `SFA-INT-02` | Chatbot JWT rejected both alone AND when paired with a valid API key |
| `SFA-INT-03` | SFA key is not accepted on chatbot routes |
| `SFA-INT-04` | Live OpenAPI documents 400/401/404 — ✅ **now passes** (2026-08-06); was fails-by-design under G4 |

### H. Full-catalog sweep — 1
`SFA-DD-01` — all 361 codes, one call each. Writes `test-results/sfa-kb-coverage.json` and
`.csv` plus a summary: how many paint SKUs are missing, have no benefits, no competitor data or no
pitch. **Report-only; never fails the build.** This is what AC §10.1 actually needs — the criterion
cannot honestly be signed off on one product code.

---

## Expected failures

**None remain as of 2026-08-06.** The one entry here has cleared.

| ID | Fails because | Status |
|---|---|---|
| ~~`SFA-INT-04`~~ | ~~Spec declares only `200`/`422`~~ | ✅ **CLEARED 2026-08-06** — the spec now declares `200/400/401/403/404/422/429/500` and defines `SfaApiKey` + `SfaBearerJwt`. Exactly the condition written here as the clearing criterion. Keep the case: it now guards the contract instead of documenting its absence |

### Cases whose PASS is the bug (do not "fix" them by inverting on sight)

`SFA-AUTH-18/19/20` assert the **permissive** behaviour deliberately, so a green means G12 / Sr. 124
is still unfixed and a red would mean it was fixed. Their failure messages say so. As of 2026-08-06
they still pass — the bug is open. When they do go red, update them to expect `401` and close G12
rather than filing a regression.

The same pattern applied to `CB-BYP-01` in the boundary suite: it went red on 2026-08-06 because the
OTP bypass had been scoped (Sr. 128 fixed), and it has been inverted to guard the new behaviour.

---

## Manual / infra verification (not automatable)

| ID | Item | Why manual |
|---|---|---|
| `SFA-MAN-01` | 403 `FORBIDDEN_IP` from a genuinely non-whitelisted IP | Needs a call from outside `SFA_ALLOWED_IPS`. `SFA-AUTH-13` covers only the header-spoofing half |
| `SFA-MAN-02` | Key stored in a secrets vault, not hardcoded (BFRD §6) | Config/code review both sides |
| `SFA-MAN-03` | 90-day key rotation process (BFRD §6) | Process sign-off; owner still unassigned (BFRD §9) |
| `SFA-MAN-04` | Centralised logging with `requestId`, responses masked (AC §10.5) | Log-platform inspection — every request the suite sends carries a unique `SFA-QA-<case>-<seq>` id, so this is a cheap spot-check |
| `SFA-MAN-05` | Alerting on repeated 401/403 (BFRD §6) | Alert-rule check; `SFA-PERF-05` generates the traffic |
| `SFA-MAN-06` | Prod/UAT IP ranges whitelisted before go-live (BFRD §8) | Infra checklist |
| `SFA-MAN-07` | Availability aligned to the chatbot SLA (BFRD §7) | Monitoring review |

---

## Design notes

- **The signing key is never committed, but may live locally in the repo folder.**
  [sfa-token.js](sfa-token.js) resolves `SFA_JWT_PRIVATE_KEY_PATH` → `~/.retail_crm-sfa/…` →
  `tests/api/retail_crm_chatbot/…`, and logs a notice when the in-repo copy is the one used.
  `.gitignore` is what makes that copy safe; the module never throws on a missing key, so a machine
  without it produces a clean `SETUP GAP` failure per case rather than erroring the whole file at
  import time and reporting nothing at all. The API key *is* hardcoded as
  a dev fallback — an explicit, recorded decision; rotating it therefore means a commit, so use
  `SFA_KNOW_PRODUCT_API_KEY` for UAT/prod.
- **Tokens are minted per run, not pasted.** Every token has a 30-minute TTL, so a pasted one
  expires mid-session and produces 401s that look like server bugs. Minting also makes
  `SFA-AUTH-11` (expired), `SFA-AUTH-12` (tampered) and `SFA-AUTH-15` (wrong key) exact: each
  isolates a single failure cause instead of relying on a stale token where a 401 is ambiguous.
- **Flat tests, no `describe` blocks** — matches `retail_crm_chatbot_api_test.js` (zero describes across
  115 tests) and `workers: 1` in [playwright.config.js](../../../playwright.config.js#L30).
- **Separate file, not appended to `retail_crm_chatbot_api_test.js`** — that file is already 1830 lines,
  and the SFA suite needs its own credentials, its own error envelope and its own exclusion flags.
- **`assertFailureEnvelope()` asserts `detail` is absent.** The SFA contract is
  `{status,errorCode,message}`; a `{detail}` body means the SFA-specific handler was bypassed and
  SFA's error handling would break. The `NEG-*` patterns in the sibling file assert the opposite
  shape and are not reusable here.
- **429 is never swallowed, and never skipped.** `assertExecuted()` fails with the body attached, so
  rate limiting can masquerade as neither a pass nor a silent exclusion. Loops that used to `break`
  on a 429 and then assert on partial data now fail too — a sweep that reached 3 of 14 sub-brands is
  not a passing sweep.
- **No `Math.random()` anywhere.** `samplePaintSkus()` uses a fixed stride so runs are reproducible
  and failures are re-runnable.
- **LLM-composed responses are asserted structurally.** `SFA-FUNC-16` compares section keys,
  `productName` and counts — never exact text, which would flake on every run.
- **The OTP flow does not run when the endpoint is unconfigured**, and its result is cached.
  Playwright restarts the worker after each failure and re-runs `beforeAll`; without both guards a
  blocked run burns one OTP request per failure and trips the phone throttle (403).

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| **A red test — where do I start?** | Read the class in the message. `BLOCKED BY SERVER` / `SETUP GAP` / `RATE LIMITED` / `HARNESS ERROR` all mean *nothing was asserted*; only an unclassified failure is a real assertion failure. Triage `SFA-CFG-01`/`-02` first. |
| Everything fails `BLOCKED BY SERVER — NOT CONFIGURED` | Server-side `SFA_KNOW_PRODUCT_API_KEY` is unset. Infra fix, not a test problem |
| Cases fail `SETUP GAP — no TSM Bearer token` | The message lists every path tried. Drop the key at any of the three locations in QA setup step 1 (chmod 600), or export `SFA_TEST_JWT`. |
| Startup logs "Signing key loaded from INSIDE the repo" | Informational, not an error — the gitignored copy at `tests/api/retail_crm_chatbot/sfa_jwt_private.pem` was used. Move it to `~/.retail_crm-sfa/` to silence it. |
| **Pasted a new key but still get 401** | **The highest-precedence readable copy wins, and `~/.retail_crm-sfa/` outranks the repo folder** — so a stale copy there silently shadows the new one. `SFA-CFG-02` now fails `SETUP GAP` when installed keys disagree, listing every path and fingerprint. Replace **all** copies (see below). |
| `CONFLICTING SIGNING KEYS` at startup | Two or more installed keys have different fingerprints. There is no way to guess which was intended, so this is a hard stop, not a warning. |
| `SFA-INT-01/02/03` fail `SETUP GAP — no chatbot OTP JWT` | The OTP flow was throttled (403). Wait for the cooldown, or pass `TEST_AUTH_TOKEN=<jwt>`. Only these three need it. |
| Auth cases 401 with a locally minted token but pass with `SFA_TEST_JWT` | The inferred claim set is wrong. Fix `SFA_TOKEN_SPEC` in `sfa-token.js` — see QA setup step 2. |
| Cases fail `NOT EXECUTED (RATE LIMITED)` | The pacer plus 3 retries could not get through. Wait ~60 s and re-run; if it persists, lower `RATE_LIMIT_BUDGET` in the test file. Don't run `test:sfa:sweep` alongside a normal run. |
| `[SFA][pace] 50/50 requests used … holding 42s` | Working as designed — the pacer is keeping the suite under the server's 60/60 s limit. It lengthens the run and prevents self-inflicted 429s. |
| A run is much slower than the last one | The pacer engaged. Check how many `[SFA][pace]` lines appeared; delete `test-results/.sfa-rate-window.json` only if you know the window is stale. |
| `product_codes.json row count` assertion fails | Master data changed — regenerate the fixture and update the expected count |
