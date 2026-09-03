# Retail CRM Dealer Sales API — Test Execution Report

**Latest Run:** 2026-07-16
**Environment:** `https://reqres.in`
**Dealer ID:** `6100000001`
**Auth:** `x-api-key: opusretail_crmdealerapis`
**Tool:** Playwright (Chromium)
**Backend Redis:** ON (`/internal/stats` → 200 with live analytics, `redisState: up`)
**Total Tests:** 170 | ✅ Passed: 170 | ❌ Failed: 0 | ⏭️ Skipped: 0

---

## Summary by Category

_Latest run = **Redis ON** (2026-07-16, `redisState: up`). All redis-branch tests executed — no skips. Full green._

| Category | Total | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Functional | 67 | 67 | 0 | 0 |
| Edge Cases | 9 | 9 | 0 | 0 |
| Negative Cases | 27 | 27 | 0 | 0 |
| Security | 32 | 32 | 0 | 0 |
| Data Validation | 21 | 21 | 0 | 0 |
| v2.0 Redis-Branch Features | 14 | 14 | 0 | 0 |
| **Total** | **170** | **170** | **0** | **0** |

---

## ✅ No Active Failures

**170/170 pass as of 2026-07-16 (Iteration 13), with Redis ON (`redisState: up`).** Redis has been
restored on dev — `/internal/stats` returns live analytics (~149ms). The four tests that skipped
during the Redis-off runs now all execute and pass:
- TC_161, TC_162, TC_163 — `today`/`all_time` analytics field-shape checks
- TC_166 — `/internal/stats` SLA, now **17ms** (well under the 2000ms limit)

No failures, no skips, no open bugs.

---

## Resolved Issues (from previous runs)

### ✅ RESOLVED — TC_166 SLA Failed Whenever Redis Was Down (test-design gap)

**TC:** `TC_166` (v2.0 Redis-Branch)
**Root Cause:** TC_166 hard-asserted `/internal/stats` < 2000ms ("read entirely from Redis"),
but the **v2.0 Solution Doc §8** sets Redis timeouts to `2s connect, 2s socket`, and **§9.4** has
the endpoint degrade to `analytics unavailable` when Redis is down. On the Redis-down path the
endpoint *must* pay the ~2s connect timeout before responding, so the SLA is architecturally
impossible to meet — not an API defect. The assertion was only ever meaningful when Redis is up.
**Fix (2026-07-16):** Guarded the test — `test.skip(redisState !== 'up', …)`, consistent with how
TC_161–163 already skip on the down path. TC_166 now runs (and enforces < 2000ms) only when
`redisState === 'up'`, and skips cleanly when Redis is down. ✅

---

### ✅ RESOLVED — TC_103 Under-Tested `distributionChannel` Validation

**TC:** `TC_103` (Negative Cases)
**Root Cause:** TC_103 only asserted `not.toBe(500)` for `distributionChannel=99`, so it never
verified the documented contract and covered only `overall-summary`. **Solution Doc §7** requires
*every* channel-accepting endpoint to return **422 `INVALID_FILTER_VALUE`** for unknown values.
**Fix (2026-07-16):** TC_103 rewritten to loop over all seven channel endpoints
(`overall-summary`, `top-products`, `category-breakdown`, `channel-split`, `subbrand-split`,
`analytics`, `products/search`), asserting **422** + `INVALID_FILTER_VALUE` body for each.
Verified: all seven return 422 on dev. TC count stays 170 (single multi-endpoint test). ✅

---

### ✅ RESOLVED — Invalid `distributionChannel` Not Server-Validated (`99` → 200)

**TC:** `TC_103` (observation flagged in Iterations 8–10)
**Root Cause:** `overall-summary` accepted any `distributionChannel` value — an invalid channel
like `99` (only `10/11/12/21`/`All` are real) returned **200** and echoed `"99"` back in the
response config, whereas an invalid `category` was rejected with `422 INVALID_FILTER_VALUE`.
`distributionChannel` was not validated server-side.
**Fix (verified 2026-07-16):** API now validates `distributionChannel`. Direct probe:
`GET /dealers/6100000001/sales/overall-summary?distributionChannel=99` → **422**
`{"detail":{"errorCode":"INVALID_FILTER_VALUE","message":"Invalid distributionChannel value(s): 99","hint":"Allowed values: 10, 11, 12, 21 (or 'All')"}}`.
Valid `distributionChannel=11` still returns 200 (no regression). TC_103 has since been tightened
to assert `422` + `INVALID_FILTER_VALUE` across all seven channel endpoints (see resolved entry
above). ✅

---

### ✅ RESOLVED — BUG-5 | `/health` Auth Test Was Testing Wrong Endpoint

**TC:** `TC_104_SEC`, `TC_105_SEC`, `TC_106_SEC`
**Root Cause:** Tests were asserting `401/403` on `/health`, but `dealer_api.json` v1.1.0 explicitly marks `/health` as `"security": []` — intentionally unauthenticated for health probes.
**Fix:** Tests updated to call `GET /dealers/{dealer_id}/sales/overall-summary` (a protected endpoint). Protected endpoint correctly rejects missing/invalid/empty keys with `401/403`. ✅

---

### ✅ RESOLVED — Invalid `asOfDate` / `periodType` Returns 400 Instead of 422

**TC:** `TC_82`, `TC_83`, `TC_84`, `TC_85`, `TC_86`, `TC_87`, `TC_91`
**Root Cause:** API was returning `400` instead of FastAPI-standard `422` for invalid query param formats.
**Fix:** API updated on dev — now returns `422` for all invalid `asOfDate` and `periodType` inputs. Tests remain unchanged (still assert `422`). ✅

---

### ✅ RESOLVED — Cache-Control Assertion Mismatch on Sensitive Endpoints

**TC:** `TC_125_SEC`, `TC_135_SEC`
**Root Cause:** Tests asserted `Cache-Control` must contain `no-store` or `no-cache`, but the API returns `Cache-Control: private, max-age=120`. `dealer_api.json` v1.1.0 defines no Cache-Control requirement, so the hard assertion was incorrect.
**Fix:** Assertions relaxed to require the header be present and match `private|no-store|no-cache`, reflecting actual API behaviour. Suite returned to 156/156. ✅

---

**Key discoveries from implementation:**
- Error body format is FastAPI standard: `{ detail: [{ type, loc, msg, input, ctx }] }`
- `/health` returns `{ status: "ok", maxInvoiceDate: "YYYY-MM-DD" }`
- `products/search` pagination object: `{ page, pageSize, totalRows, totalPages, hasNext, hasPrev }`
- Dealer `6100000001` has 9 products in current dataset (`totalRows: 9`)

---

## QA Run History

| Iteration | Date | Passed | Failed | Pass Rate | Notes |
|-----------|------|--------|--------|-----------|-------|
| Iteration 1 | 2026-03-27 | 135 | 21 | 86.5% | Initial run |
| Iteration 2 | 2026-03-27 | 141 | 15 | 90.4% | Data Validation TCs added |
| Iteration 3 | 2026-03-27 | 146 | 10 | 93.6% | Further fixes |
| Iteration 4 | 2026-03-27 | 146 | 10 | 93.6% | No change |
| Iteration 5 | 2026-04-01 | 146 | 10 | 93.6% | No change |
| Iteration 6 | 2026-04-03 | 156 | 0 | 100% | All failures resolved — API fix (422) + TC_104–106 endpoint corrected per spec v1.1.0 |
| Iteration 7 | 2026-06-16 | 156 | 0 | 100% | Cache-Control assertions (TC_125/135_SEC) updated to match actual API behaviour (private, max-age=120) |
| Iteration 8 | 2026-07-15 | 170 | 0 | 100% | +14 v2.0 redis-branch tests (TC_157–170: `/internal/stats`, timeout, cache). `distributionChannel` not server-validated (`99` → 200) noted as low-severity observation |
| Iteration 9 | 2026-07-16 | 170 | 0 | 100% | Explicit **Redis-on** full run — `/internal/stats` → 200, `redisState: up`; all TC_157–170 executed (no degradation/skip). No regressions |
| Iteration 10 | 2026-07-16 | 166 | 1 | 99.4% | Explicit **Redis-OFF** full run — `redisState: down`, DOWN banner shown. TC_161–163 skipped by design (analytics unavailable); TC_166 failed on 2000ms SLA (2283ms — dead-Redis overhead, environmental). 3 skipped. Pass rate = 166/167 executed |
| Iteration 11 | 2026-07-16 | 166 | 1 | 99.4% | **`distributionChannel=99` fix verified** — now `422 INVALID_FILTER_VALUE` (TC_103 confirmed 422). Redis still unreachable (`/internal/stats`: DNS failure to `dev-dealer-api-redis:6379`), so `redisState: down` persists — TC_161–163 skipped, TC_166 still fails SLA (3720ms). Same 166/3/1 shape as Iter 10 |
| Iteration 12 | 2026-07-16 | 166 | 0 | 100% | **Two test fixes per v2.0 Solution Doc.** TC_103 tightened to assert `422 INVALID_FILTER_VALUE` across all 7 channel endpoints (§7); TC_166 guarded on `redisState === 'up'` (§8/§9.4 — Redis-down SLA is architectural, not a bug). Redis still down, so 4 skipped (TC_161–163 + TC_166), **0 failed**. Pass rate 166/166 executed |
| **Iteration 13** | **2026-07-16** | **170** | **0** | **100%** | **Redis restored** (`redisState: up`). All 4 previously-skipped tests now execute and pass — TC_161–163 (analytics field-shape) + TC_166 (`/internal/stats` SLA, 17ms). Full green, 0 skips, 0 failures. Suite 22.1s |

---

## QA Report — Run 2026-04-03

**Iteration 6** &nbsp; 03 Apr 2026 &nbsp; | &nbsp; Total Tests: 156 &nbsp; | &nbsp; ✅ Passed: 156 &nbsp; | &nbsp; ❌ Failed: 0 &nbsp; | &nbsp; Pass Rate: 100%

| Severity of bugs | Critical | High | Medium | Low | Reopened | Backlog | Total |
|------------------|----------|------|--------|-----|----------|---------|-------|
| Count            | 0        | 0    | 0      | 0   | 0        | 0       | 0     |

No open bugs. All previously failing TCs resolved.

---

## QA Report — Run 2026-06-16

**Iteration 7** &nbsp; 16 Jun 2026 &nbsp; | &nbsp; Total Tests: 156 &nbsp; | &nbsp; ✅ Passed: 156 &nbsp; | &nbsp; ❌ Failed: 0 &nbsp; | &nbsp; Pass Rate: 100%

| Severity of bugs | Critical | High | Medium | Low | Reopened | Backlog | Total |
|------------------|----------|------|--------|-----|----------|---------|-------|
| Count            | 0        | 0    | 0      | 0   | 0        | 0       | 0     |

No open bugs. TC_125_SEC and TC_135_SEC Cache-Control assertions updated to match actual API behaviour (`private, max-age=120`).

---

## QA Report — Run 2026-07-15

**Iteration 8** &nbsp; 15 Jul 2026 &nbsp; | &nbsp; Total Tests: 170 &nbsp; | &nbsp; ✅ Passed: 170 &nbsp; | &nbsp; ❌ Failed: 0 &nbsp; | &nbsp; Pass Rate: 100%

| Severity of bugs | Critical | High | Medium | Low | Reopened | Backlog | Total |
|------------------|----------|------|--------|-----|----------|---------|-------|
| Count            | 0        | 0    | 0      | 0   | 0        | 0       | 0     |

Added **14 v2.0 redis-branch feature tests (TC_157–TC_170)** covering the `GET /internal/stats` analytics endpoint (auth, body shape, method abuse, headers, SLA), the TimeoutMiddleware 503 contract, and Redis cache-consistency. The redis branch is confirmed deployed on dev (`/internal/stats` → 200), so all 14 executed and passed.

**Observation (not counted as an open bug):** `distributionChannel=99` (invalid channel — only 10/11/12/21 are real) returns **200** and echoes `"99"` back in the response config, whereas an invalid `category` is rejected with **422** (`INVALID_FILTER_VALUE`). The API validates `category` server-side but not `distributionChannel`. This is arguably within spec — `dealer_api.json` types `distributionChannel` as a free-form string, not an enum — and is masked by TC_103's `not.toBe(500)` assertion. Flagged for awareness only.

---

## QA Report — Run 2026-07-16

**Iteration 9** &nbsp; 16 Jul 2026 &nbsp; | &nbsp; Total Tests: 170 &nbsp; | &nbsp; ✅ Passed: 170 &nbsp; | &nbsp; ❌ Failed: 0 &nbsp; | &nbsp; Pass Rate: 100%

| Severity of bugs | Critical | High | Medium | Low | Reopened | Backlog | Total |
|------------------|----------|------|--------|-----|----------|---------|-------|
| Count            | 0        | 0    | 0      | 0   | 0        | 0       | 0     |

Explicit **Redis-on** full-suite run against dev. The `beforeAll` probe classified `redisState: up` (`/internal/stats` → 200, no `REDIS STATE: DOWN` banner), so all 14 redis-branch tests (TC_157–TC_170) ran against a live Redis rather than the graceful-degradation / skip paths:
- `/internal/stats` returned populated `today` + `all_time` analytics blocks (7 endpoints tracked: `overall_summary`, `top_products`, `category_breakdown`, `channel_split`, `subbrand_split`, `analytics`, `product_search`).
- Cache consistency (TC_169) held — two identical `overall-summary` requests returned byte-identical bodies.
- `/internal/stats` served from Redis in ~12ms (TC_166 SLA < 2000ms); warm-cache timing observed (TC_170: 18ms → 28ms, latency not hard-asserted).

Suite completed in **25.6s**. No regressions. The `distributionChannel=99` → 200 observation from Iteration 8 remains unchanged (awareness only). Note: dealer `6100000001` now reports `totalRows: 15` for `products/search` (was 9 in earlier datasets).

---

## QA Report — Run 2026-07-16 (Redis OFF)

**Iteration 10** &nbsp; 16 Jul 2026 &nbsp; | &nbsp; Total Tests: 170 &nbsp; | &nbsp; ✅ Passed: 166 &nbsp; | &nbsp; ❌ Failed: 1 &nbsp; | &nbsp; ⏭️ Skipped: 3 &nbsp; | &nbsp; Pass Rate: 99.4% (166/167 executed)

| Severity of bugs | Critical | High | Medium | Low | Reopened | Backlog | Total |
|------------------|----------|------|--------|-----|----------|---------|-------|
| Count            | 0        | 0    | 0      | 1   | 0        | 0       | 1     |

Explicit **Redis-OFF** full-suite run against dev. The `beforeAll` probe classified `redisState: down` — `/internal/stats` returned **200** with `{ error, detail: "analytics unavailable" }`, and the `================ REDIS STATE: DOWN ================` banner printed. The graceful-degradation path behaved exactly as designed:

- **TC_160 passed** — accepted the `analytics unavailable` body (still 200, not 500) and pushed the `redis-status` annotation onto the report.
- **TC_161, TC_162, TC_163 skipped** (`test.skip` — "REDIS DOWN — analytics unavailable") — the `today`/`all_time` field-shape assertions correctly do not run when Redis is down.
- **TC_157–159, 164, 165, 167, 168, 169, 170 passed** — auth (401), method abuse (405), `nosniff` header, `/health` not-503, `/dealers/*` 200, and cache-consistency (identical bodies) all held with Redis off.
- **TC_166 failed (Low / environmental)** — `/internal/stats` took **2283ms** vs the `< 2000ms` "read entirely from Redis" SLA. With Redis down the endpoint cannot serve from cache and pays dead-Redis connection/retry overhead (other `/internal/stats` calls ran ~3.4–3.7s this run). Not a contract regression; passes with Redis on (Iteration 9: 12ms). See **Active Failures** above.

No `500`s anywhere in the suite. All 143 core tests (Functional / Edge / Negative / Security / Data Validation) passed unchanged — the Redis outage is contained to the `/internal/stats` analytics dashboard and does not degrade the dealer-facing sales endpoints. Suite completed in **2.4m** (elevated wall-clock is the dead-Redis timeout overhead on the `/internal/stats` calls).

---

## QA Report — Run 2026-07-16 (dist-channel validation fix verified)

**Iteration 11** &nbsp; 16 Jul 2026 &nbsp; | &nbsp; Total Tests: 170 &nbsp; | &nbsp; ✅ Passed: 166 &nbsp; | &nbsp; ❌ Failed: 1 &nbsp; | &nbsp; ⏭️ Skipped: 3 &nbsp; | &nbsp; Pass Rate: 99.4% (166/167 executed)

| Severity of bugs | Critical | High | Medium | Low | Reopened | Backlog | Total |
|------------------|----------|------|--------|-----|----------|---------|-------|
| Count            | 0        | 0    | 0      | 1   | 0        | 0       | 1     |

**Fix verified — invalid `distributionChannel` now rejected.** Direct probe of the reported repro:
- `GET /dealers/6100000001/sales/overall-summary?distributionChannel=99` (with `x-api-key`) → **422** `{"detail":{"errorCode":"INVALID_FILTER_VALUE","message":"Invalid distributionChannel value(s): 99","hint":"Allowed values: 10, 11, 12, 21 (or 'All')"}}`. Previously this returned **200** echoing `"99"`.
- Regression guard: `distributionChannel=11` → **200** (valid values unaffected).
- In-suite, **TC_103 now observes 422** (was 200); it still passes since it only asserts `not.toBe(500)`. The long-standing observation from Iterations 8–10 is now **resolved** (see Resolved Issues).

**Redis still unavailable — not actually restored.** Despite the intent to bring Redis back up, `/internal/stats` still returns `{"error":"analytics unavailable","detail":"Error -3 connecting to dev-dealer-api-redis:6379. Temporary failure in name resolution."}` (DNS resolution failure for the Redis host). The `beforeAll` probe therefore still classified `redisState: down` and printed the DOWN banner. Consequently the redis-branch anomalies are **unchanged** from Iteration 10:
- TC_161–163 skipped (analytics unavailable, by design).
- TC_166 still fails the 2000ms SLA (**3720ms** this run — dead-Redis connection overhead).

Net: the `distributionChannel` bug is **fixed**; the suite shape stays **166 passed / 3 skipped / 1 failed** purely because Redis is not yet reachable. Restoring Redis (fixing the `dev-dealer-api-redis:6379` DNS/connectivity) is the remaining item to return to 170/170.

---

## QA Report — Run 2026-07-16 (v2.0 Solution Doc alignment — TC_103 & TC_166 fixed)

**Iteration 12** &nbsp; 16 Jul 2026 &nbsp; | &nbsp; Total Tests: 170 &nbsp; | &nbsp; ✅ Passed: 166 &nbsp; | &nbsp; ❌ Failed: 0 &nbsp; | &nbsp; ⏭️ Skipped: 4 &nbsp; | &nbsp; Pass Rate: 100% (166/166 executed)

| Severity of bugs | Critical | High | Medium | Low | Reopened | Backlog | Total |
|------------------|----------|------|--------|-----|----------|---------|-------|
| Count            | 0        | 0    | 0      | 0   | 0        | 0       | 0     |

Two **test-correctness** fixes made after reviewing the API against the **v2.0 Technical Solution Doc** (Dev Patel, 16 Jul 2026). Both were test-side gaps, not API defects:

- **TC_103 — now enforces the documented contract (§7).** Was a lenient `not.toBe(500)` on a single endpoint; rewritten to loop all seven `distributionChannel`-accepting endpoints (`overall-summary`, `top-products`, `category-breakdown`, `channel-split`, `subbrand-split`, `analytics`, `products/search`) asserting **422 + `INVALID_FILTER_VALUE`**. Pre-run probe confirmed all seven return 422; the in-suite run passed (445ms). Remains a single test — TC count still 170.
- **TC_166 — guarded on Redis state (§8/§9.4).** The `< 2000ms` "read entirely from Redis" SLA is architecturally impossible on the Redis-down path (§8: 2s connect + 2s socket timeout before the §9.4 `analytics unavailable` degrade). Added `test.skip(redisState !== 'up', …)` so it enforces the SLA only when Redis is up and skips (not fails) when down — mirroring TC_161–163.

**Run:** Redis is still down on dev (`Error -3 connecting to dev-dealer-api-redis:6379`), so the run is **166 passed / 4 skipped / 0 failed** — the 4 skips (TC_161, 162, 163, 166) are all by-design Redis-down skips. **No failures, no open bugs.** With Redis restored, all four execute and the suite reads 170/170.

**Verdict on the v2.0 doc:** the script aligns with the documented contract. Two minor config/observation notes remain (not bugs): dev returns `Cache-Control: private, max-age=120` vs the doc's `no-store` default (implies `API_BROWSER_CACHE_SECONDS=120` set on dev, §10/§12); and the HSTS tests (TC_124/134) assert an edge/proxy header not in the app's documented header set (§10) — both currently pass.

---

## QA Report — Run 2026-07-16 (Redis ON — full green)

**Iteration 13** &nbsp; 16 Jul 2026 &nbsp; | &nbsp; Total Tests: 170 &nbsp; | &nbsp; ✅ Passed: 170 &nbsp; | &nbsp; ❌ Failed: 0 &nbsp; | &nbsp; ⏭️ Skipped: 0 &nbsp; | &nbsp; Pass Rate: 100%

| Severity of bugs | Critical | High | Medium | Low | Reopened | Backlog | Total |
|------------------|----------|------|--------|-----|----------|---------|-------|
| Count            | 0        | 0    | 0      | 0   | 0        | 0       | 0     |

Redis restored on dev. The `beforeAll` probe classified `redisState: up` (`/internal/stats` → 200 with live analytics, ~149ms). The four tests that skipped in the Redis-off runs (Iterations 10–12) all executed and passed this run:

- **TC_161, TC_162, TC_163** — `today` / `all_time` analytics blocks present and correctly typed (7 endpoints tracked; `today.total_requests` in the tens of thousands, confirming live metric collection).
- **TC_166** — `/internal/stats` served entirely from Redis in **17ms**, comfortably within the 2000ms SLA (vs the ~2.3–3.7s dead-Redis overhead seen when Redis was down — exactly the §8 2s-connect-timeout behaviour the guard was added for).

The Iteration 12 test fixes hold under Redis-on: TC_103 still asserts 422 across all channel endpoints; TC_166's `redisState` guard correctly *allowed* the test to run (and enforce the SLA) now that Redis is up. Suite completed in **22.1s**. **Full green — 170/170, no skips, no open bugs.**
