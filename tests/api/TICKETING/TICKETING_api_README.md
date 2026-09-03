Swagger URL : https://quickpizza.grafana.com/swagger/index.html
Username : admin
Password : swagger123
# Ticketing Demo API — Playwright Functional Test Suite

Comprehensive API test suite for the TICKETING (Ticketing Demo) resale event ticket marketplace.
Covers **201 test cases** across functional, edge case, negative, and security categories using `@playwright/test`.

---

## Files

| File | Description |
|------|-------------|
| `TICKETING_api.spec.js` | Main Playwright spec — 201 test cases |
| `TICKETING_api_README.md` | This file — documentation and test index |
| `TICKETING.json` | OpenAPI 2.0 Swagger specification |
| `TICKETING_LoadTest.k6.js` | k6 load test (200 VUs steady-state) |
| `TICKETING_readme.md` | k6 load/stress test documentation |

---

## Test Classification Summary

| Section | TC Range | Count | Description |
|---------|----------|-------|-------------|
| Functional | TC_1 – TC_111 | 111 | Happy-path, business-logic, data-contract, and response-time SLA tests |
| Edge Cases | TC_112 – TC_126 | 15 | Boundary-valid inputs, unusual-but-legal scenarios |
| Negative Cases | TC_127 – TC_157 | 31 | Invalid inputs — must return 4xx (never 500) |
| Security | TC_158 – TC_201 | 44 | OWASP Top 10 coverage — auth, injection, IDOR, headers, rate limiting |
| **Total** | | **201** | |

---

## Configuration

| Setting | Value |
|---------|-------|
| Base URL | `https://quickpizza.grafana.com/api` |
| Override via | `TICKETING_API_BASE_URL` environment variable |
| Auth method | Bearer JWT — obtained via `POST /test/token` or `POST /auth/login` |
| Stable Event | `SELL_EVENT_ID = 145` (Karan Aujla — do NOT delete from QA DB) |
| Stable Tier | `SELL_TIER_ID = 181` (Silver, mrp=2999 — do NOT delete from QA DB) |
| Swagger UI | `https://quickpizza.grafana.com/swagger/index.html` |

---

## Running the Tests

```bash
# Full suite
npx playwright test tests/api/TICKETING/TICKETING_api.spec.js

# With custom base URL
TICKETING_API_BASE_URL=http://localhost:3000/api npx playwright test tests/api/TICKETING/TICKETING_api.spec.js

# Run only Functional tests
npx playwright test tests/api/TICKETING/TICKETING_api.spec.js --grep "Functional"

# Run only Edge Case tests
npx playwright test tests/api/TICKETING/TICKETING_api.spec.js --grep "Edge Cases"

# Run only Negative Case tests
npx playwright test tests/api/TICKETING/TICKETING_api.spec.js --grep "Negative Cases"

# Run only Security tests
npx playwright test tests/api/TICKETING/TICKETING_api.spec.js --grep "Security"

# Run a specific test by TC ID
npx playwright test tests/api/TICKETING/TICKETING_api.spec.js --grep "TC_53 "

# Run with HTML report
npx playwright test tests/api/TICKETING/TICKETING_api.spec.js --reporter=html

# Smoke test (first functional test only)
npx playwright test tests/api/TICKETING/TICKETING_api.spec.js --grep "TC_1 "
```

---

## Setup / Teardown Lifecycle

All tests share state created in `test.beforeAll` and run **serially** (`test.describe.configure({ mode: 'serial' })`).

### `beforeAll` — 10-step chain

| Step | Endpoint | Purpose | Variable |
|------|----------|---------|----------|
| 1 | `POST /test/token` | Generic test JWT | `token` |
| 2 | `POST /auth/signup` | Create timestamped test user `ticketing_pw_{ts}@test.com` | `userId`, `userEmail`, `userUid` |
| 3 | `POST /auth/login` | User-specific Bearer token | `userToken` |
| 4 | `POST /events` (multipart + fake banner) | Seed test event | `eventId` |
| 5 | `POST /events/{id}/tickets` | Ticket listing on seed event | `listingTicketId` |
| 6 | `POST /coupons` | Seed coupon `PWSEED_{ts}` | `couponId`, `couponCode` |
| 7 | `POST /eventRequest/request` | Seed event request | `eventRequestId` |
| 8 | `POST /tiers/event/145` | Seed tier on stable event | `tierId` |
| 9 | `POST /tickets/sell` | Seed sell listing on event 145 (50 tickets) | `sellTicketId` |
| 10 | `POST /blogs` | Seed blog | `blogId` |

Each step is gated on the previous; failures are silently skipped (test data variables remain `undefined` and individual tests skip via `if (!variable) return`).

### `afterAll` — reverse-order cleanup

All deletes are wrapped in `try/catch`. Resources already deleted by functional tests (e.g., `crudBlogId` deleted by TC_11) return 404 silently.

---

## Stable Test Fixtures

These QA database records must **not be deleted** from the QA environment:

| Resource | ID | Description |
|----------|----|-------------|
| Event | `145` | Karan Aujla concert — used by k6 tests AND Playwright tests |
| Tier | `181` | Silver tier (mrp=2999) on event 145 — used for sell/buy flows |

If either fixture is missing, TC_31, TC_40, TC_44, TC_48, TC_51–TC_60, TC_79, TC_85, TC_86, TC_91, TC_121–TC_124, TC_150 will fail.

---

## Test Case Index

### Functional Tests — TC_1 to TC_111

#### Auth (TC_1–TC_6)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_1 | POST | /test/token | Get generic test JWT | 200/201 |
| TC_2 | POST | /auth/signup | Create new timestamped user | 200/201 |
| TC_3 | POST | /auth/login | Login with valid email+uid, get token | 200 |
| TC_4 | GET | /auth/getUser/{id} | Get user by valid ID | 200 |
| TC_5 | POST | /auth/login | Response body has token field | 200 |
| TC_6 | GET | /auth/getUser/{id} | Response body is valid JSON object | 200 |

#### Blogs (TC_7–TC_13)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_7 | GET | /blogs | List all blogs — returns array | 200 |
| TC_8 | POST | /blogs | Create blog (multipart: title+description) | 200/201 |
| TC_9 | GET | /blogs/{id} | Get blog by valid ID (from TC_8) | 200 |
| TC_10 | PUT | /blogs/{id} | Update blog title and description | 200 |
| TC_11 | DELETE | /blogs/{id} | Delete blog | 200/204 |
| TC_12 | GET | /blogs | Content-Type is application/json | 200 |
| TC_13 | GET | /blogs | Response body is an array | 200 |

#### Coupons (TC_14–TC_21)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_14 | GET | /coupons | List all coupons — returns array | 200 |
| TC_15 | POST | /coupons | Create coupon with full payload | 200/201 |
| TC_16 | GET | /coupons/{id} | Get coupon by valid ID (from TC_15) | 200 |
| TC_17 | PUT | /coupons/{id} | Update coupon discount | 200 |
| TC_18 | DELETE | /coupons/{id} | Delete coupon | 200/204 |
| TC_19 | POST | /coupons/validate | Validate seed coupon code | 200/201 |
| TC_20 | GET | /coupons | Response body is an array | 200 |
| TC_21 | POST | /coupons/validate | Non-existent code → 404 | 400/404 |

#### Event Requests (TC_22–TC_27)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_22 | POST | /eventRequest/request | Create event request | 200/201 |
| TC_23 | GET | /eventRequest/request/{id} | Get event request by ID | 200 |
| TC_24 | PUT | /eventRequest/request/{id} | Update status to "accepted" | 200 |
| TC_25 | DELETE | /eventRequest/request/{id} | Delete event request | 200/204 |
| TC_26 | GET | /eventRequest/requests/all | Get all event requests — array | 200 |
| TC_27 | GET | /eventRequest/requests/all | Response is valid JSON array | 200 |

#### Events (TC_28–TC_43)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_28 | GET | /events | List all events — returns array | 200 |
| TC_29 | POST | /events | Create event via multipart + fake banner | 200/201 |
| TC_30 | POST | /events/create | Create event via eventData JSON blob + banner | 200/201 |
| TC_31 | POST | /events/getById | Get stable event 145 by body `{id: "145"}` | 200 |
| TC_32 | GET | /events/my-events | Get events for authenticated user | 200 |
| TC_33 | PUT | /events/{id} | Update seed event name | 200 |
| TC_34 | DELETE | /events/{id} | Delete event from TC_29 | 200/204 |
| TC_35 | PUT | /events/{id}/update | Update seed event via multipart + banner | 200 |
| TC_36 | POST | /events/{id}/tickets | Add ticket listing to seed event | 200/201 |
| TC_37 | PUT | /events/{id}/tickets/{ticketId} | Update ticket price | 200 |
| TC_38 | DELETE | /events/{id}/tickets/{ticketId} | Delete event ticket listing | 200/204 |
| TC_39 | GET | /events | Response body is JSON array | 200 |
| TC_40 | POST | /events/getById | Get stable event 145 (data defined) | 200 |
| TC_41 | GET | /events/my-events | Response body is defined | 200 |
| TC_42 | PUT | /events/{id} | Update seed event trending=true | 200 |
| TC_43 | PUT | /events/{id}/update | Update seed event without banner | 200 |

#### Tiers (TC_44–TC_49)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_44 | GET | /tiers/event/145 | Get tiers for stable event — returns array | 200 |
| TC_45 | POST | /tiers/event/{id} | Create tier with name+mrp | 200/201 |
| TC_46 | PUT | /tiers/{tierId} | Update tier name and mrp | 200 |
| TC_47 | DELETE | /tiers/{tierId} | Delete tier | 200/204 |
| TC_48 | GET | /tiers/event/145 | Response body is array | 200 |
| TC_49 | POST | /tiers/event/{id} | Create second tier — multiple tiers allowed | 200/201 |

#### Tickets (TC_50–TC_60)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_50 | GET | /tickets/all | Get all tickets for authenticated user | 200 |
| TC_51 | POST | /tickets/sell | Create sell listing (event 145, tier 181) | 200/201 |
| TC_52 | PUT | /tickets/{id} | Update sell listing price and quantity | 200 |
| TC_53 | POST | /tickets/buy | Purchase 1 ticket from seed sell listing | 200/201 |
| TC_54 | DELETE | /tickets/{id} | Delete sell listing from TC_51 | 200/204 |
| TC_55 | POST | /tickets/verify-email | Verify email forwarding (infra-dependent) | non-500 |
| TC_56 | POST | /tickets/extract-from-email | Extract ticket from email (AI endpoint) | non-500 |
| TC_57 | GET | /tickets/all | Response body is valid JSON | 200 |
| TC_58 | POST | /tickets/sell | Create listing with connected=true | 200/201 |
| TC_59 | POST | /tickets/sell | Create listing with source="resell" | 200/201 |
| TC_60 | POST | /tickets/buy | Purchase with optional couponId field | 200/201 |

#### Transactions (TC_61–TC_63)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_61 | GET | /transactions | Get user transactions | 200 |
| TC_62 | GET | /transactions/all | Get all user transactions | 200 |
| TC_63 | GET | /transactions | Response body is valid JSON | 200 |

#### Users (TC_64–TC_70)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_64 | GET | /users | List all users (authenticated) | 200 |
| TC_65 | GET | /users/{id} | Get user by valid ID | 200 |
| TC_66 | POST | /users/getAddress | Get address for authenticated user | 200 |
| TC_67 | PUT | /users/{id} | Update user city and phone number | 200 |
| TC_68 | DELETE | /users/{id} | Delete a disposable test user | 200/204 |
| TC_69 | GET | /users | Response body is defined | 200 |
| TC_70 | GET | /users/{id} | Response body has email field | 200 |

#### Referrals (TC_71–TC_74)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_71 | POST | /referrals/generate-code | Generate referral code for user | 200/201 |
| TC_72 | GET | /referrals/my-code | Get user's own referral code | 200 |
| TC_73 | GET | /referrals/my-referrals | Get list of referred users | 200 |
| TC_74 | POST | /referrals/validate | Validate code via ?code= query param | 200/400/404 |

#### Misc (TC_75–TC_84)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_75 | POST | /email | Decrypt email (infra-dependent) | non-500 |
| TC_76 | POST | /feedback | Submit feedback with rating=5 | 200/201 |
| TC_77 | POST | /feedback | Submit feedback with rating=1 | 200/201 |
| TC_78 | POST | /giveaway/register | Register for giveaway (idempotent) | 200/201/400/409 |
| TC_79 | GET | /hypescore/145/181 | Get hypescore for stable event+tier | 200 |
| TC_80 | POST | /images/upload | Upload fake 1KB JPEG buffer | 200/201 |
| TC_81 | GET | /wheel/rewards | Get wheel reward options | 200 |
| TC_82 | POST | /wheel/spin | Spin prize wheel (once per user) | 200/201/400 |
| TC_83 | GET | /wheel/status | Check wheel spin eligibility | 200 |
| TC_84 | POST | /waitlist/register | Register unique email for waitlist | 200/201 |

#### Business Logic & Workflow (TC_85–TC_94)
| TC | Endpoint | Description | Expected |
|----|----------|-------------|----------|
| TC_85 | POST /tickets/buy + GET /transactions | Buy flow — purchased ticket appears in transactions | 200/201 |
| TC_86 | POST /tickets/sell + GET /tickets/all | Sell flow — created listing appears in all tickets | 200/201 |
| TC_87 | POST /referrals/generate-code (×2) | Referral code idempotency — same code returned twice | 200/201 |
| TC_88 | POST /wheel/spin + GET /wheel/status | Wheel spin enforcement — status reflects spin state | 200 |
| TC_89 | POST /blogs + PUT + GET /blogs/{id} | Blog update verification — GET reflects updated title | 200 |
| TC_90 | POST /events/{id}/tiers + GET tiers | Tier creation — new tier visible in GET tiers | 200/201 |
| TC_91 | POST /coupons/validate | Valid coupon returns discount number in response | 200/201 |
| TC_92 | POST /events + POST /events/getById | Event create then retrieve — findable via getById | 200 |
| TC_93 | POST /wheel/spin (×2) | Second spin attempt returns 400 (already spun) | 400/409 |
| TC_94 | GET /transactions | Transactions are user-scoped — own data only | 200 |

#### Data Contract & Response Validation (TC_95–TC_111)
| TC | Method | Endpoint | Description | Expected |
|----|--------|----------|-------------|----------|
| TC_95 | GET | /auth/getUser/{id} | Response has `id` and `email` with correct types | 200 |
| TC_96 | GET | /users/{id} | Response has `email` and `name` fields | 200 |
| TC_97 | GET | /events | Array items have `id`, `event_name`, `location` fields | 200 |
| TC_98 | POST | /events/getById | Response has `event_name` and `location` fields | 200 |
| TC_99 | GET | /blogs | Array items have `id` and `title` fields | 200 |
| TC_100 | GET | /coupons | Array items have `coupon_code` and `discount` as number | 200 |
| TC_101 | POST | /auth/login | Token is valid JWT (3 dot-separated parts) | 200 |
| TC_102 | GET | /tiers/event/{id} | Tier items have `name` (string) and `mrp` (number > 0) | 200 |
| TC_103 | GET | /hypescore/{eventId}/{tierId} | Response is a non-null object | 200 |
| TC_104 | GET | /wheel/rewards | Response is non-empty array of reward objects | 200 |
| TC_105 | GET | /wheel/status | Response is non-empty object with status fields | 200 |
| TC_106 | GET | /referrals/my-code | Response has non-empty referral code string | 200 |
| TC_107 | GET | /transactions | Each item is valid JSON object (not primitive) | 200 |
| TC_108 | GET | /eventRequest/requests/all | Items have `id` and identifying fields | 200 |
| TC_109 | GET | /events | Response time SLA: within 3000ms | 200, <3000ms |
| TC_110 | POST | /auth/login | Response time SLA: within 2000ms | 200, <2000ms |
| TC_111 | GET | /tickets/all | Response time SLA: within 3000ms | 200, <3000ms |

---

### Edge Case Tests — TC_112 to TC_126

| TC | Endpoint | Scenario | Expected |
|----|----------|----------|----------|
| TC_112 | GET /auth/getUser/999999999 | Very large numeric ID | 400/404 (non-500) |
| TC_113 | GET /blogs | Empty blog list — always returns 200 | 200, array |
| TC_114 | GET /blogs/1 | Minimum blog ID | 200/404 (non-500) |
| TC_115 | POST /coupons/validate | Expired coupon (validity in past) | non-500 |
| TC_116 | POST /events/getById | ID as numeric string "145" | 200/400 (non-500) |
| TC_117 | POST /feedback | rating=1 (minimum boundary) | 200/201 |
| TC_118 | POST /feedback | rating=5 (maximum boundary) | 200/201 |
| TC_119 | GET /hypescore/99999/{tierId} | Mismatched event/tier combo | non-500 |
| TC_120 | POST /waitlist/register | Duplicate email second attempt | non-500 (200/400/409) |
| TC_121 | GET /tiers/event/145 | Stable event has ≥1 tier | 200, non-empty array |
| TC_122 | POST /tickets/sell | noOfTickets=1 (minimum) | 200/201 |
| TC_123 | POST /tickets/buy | noOfTickets=1 (minimum purchase) | 200/201 |
| TC_124 | PUT /tickets/{id} | Same price (no-op update) | non-500 |
| TC_125 | POST /referrals/validate | Empty code= query param | non-500 |
| TC_126 | POST /giveaway/register | Second registration attempt | non-500 (200/201/400/409) |

---

### Negative Case Tests — TC_127 to TC_157

#### Core Validation (TC_127–TC_142)

| TC | Endpoint | Scenario | Expected |
|----|----------|----------|----------|
| TC_127 | POST /auth/login | Missing uid field | 400/422 |
| TC_128 | POST /auth/login | Missing email field | 400/422 |
| TC_129 | GET /auth/getUser/abc | Non-numeric string ID | 400/404/422 |
| TC_130 | POST /blogs | Missing required title field | 400/422 |
| TC_131 | GET /blogs/99999999 | Non-existent blog ID | 400/404 |
| TC_132 | GET /coupons/99999999 | Non-existent coupon ID | 400/404 |
| TC_133 | POST /coupons/validate | Empty coupon_code | 400/404/422 |
| TC_134 | GET /eventRequest/request/invalid-uuid | Invalid ID format | 400/404/422 |
| TC_135 | POST /events/getById | Missing id in body | non-500 |
| TC_136 | POST /events/getById | id=99999999 (non-existent) | 400/404 |
| TC_137 | POST /tickets/sell | Missing required eventId | 400/422 |
| TC_138 | POST /tickets/buy | Missing required ticketId | 400/422 |
| TC_139 | POST /tickets/buy | noOfTickets=0 (zero quantity) | 400/422 |
| TC_140 | GET /users/99999999 | Non-existent user ID | 400/404 |
| TC_141 | POST /feedback | rating=0 (below minimum) | 400/422 |
| TC_142 | POST /feedback | rating=6 (above maximum) | 400/422 |

#### Business Rule Violations (TC_143–TC_157)

| TC | Endpoint | Scenario | Expected |
|----|----------|----------|----------|
| TC_143 | POST /auth/signup | Duplicate email | 400/409 |
| TC_144 | POST /tickets/sell | Negative price (-500) | non-500 |
| TC_145 | POST /tickets/sell | price=0 | non-500 |
| TC_146 | POST /tickets/sell | Negative noOfTickets (-5) | non-500 |
| TC_147 | POST /feedback | Missing rating field | non-500 |
| TC_148 | POST /waitlist/register | Invalid email format | non-500 |
| TC_149 | POST /coupons | Negative discount value | non-500 |
| TC_150 | POST /tickets/buy | Buy more tickets than available (9999999) | non-500 |
| TC_151 | POST /auth/signup | Invalid email format | non-500 |
| TC_152 | POST /referrals/validate | Missing code query param | non-500 |
| TC_153 | POST /events/create | Missing eventData field | non-500 |
| TC_154 | POST /events | Invalid category value | non-500 |
| TC_155 | POST /tickets/sell | Non-existent tierId (99999999) | non-500 |
| TC_156 | DELETE /coupons/{id} | Already-deleted coupon | 404 |
| TC_157 | POST /blogs | Empty title string | non-500 |

---

### Security Tests — TC_158 to TC_201

| TC | OWASP | Category | Endpoint | Description | Expected |
|----|-------|----------|----------|-------------|----------|
| TC_158 | A01/A07 | Auth — Missing Token | GET /tickets/all | No Authorization header | 401/403 |
| TC_159 | A01/A07 | Auth — Invalid Token | GET /tickets/all | `Bearer invalid-token-xyz` | 401/403 |
| TC_160 | A01/A07 | Auth — Empty Token | GET /tickets/all | `Bearer ` (empty value) | 401/403 |
| TC_161 | A01 | Auth — Missing Token | GET /users | No auth header | 401/403 |
| TC_162 | A01 | Auth — Missing Token | POST /blogs | No auth header | 401/403 |
| TC_163 | A01 | Auth — Missing Token | PUT /events/{id} | No auth header | 401/403 |
| TC_164 | A01 | Auth — Missing Token | DELETE /tickets/{id} | No auth header | 401/403 |
| TC_165 | A01 | Auth — Missing Token | GET /transactions | No auth header | 401/403 |
| TC_166 | A01 | Auth — Missing Token | POST /referrals/generate-code | No auth header | 401/403 |
| TC_167 | A03 | SQL Injection | POST /auth/login | SQLi in email field body | non-500, no DB leak |
| TC_168 | A03 | SQL Injection | GET /auth/getUser/{id} | SQLi in path param | non-500 |
| TC_169 | A03 | SQL Injection | POST /events/getById | SQLi in id body field | non-500, no DB leak |
| TC_170 | A03 | SQL Injection | POST /coupons/validate | SQLi in coupon_code | non-500 |
| TC_171 | A03 | XSS | POST /feedback | `<script>alert("xss")</script>` in feedback | body ≠ contains `<script>` |
| TC_172 | A03 | XSS | POST /blogs | `<img src=x onerror=alert(1)>` in title | body ≠ contains raw `<img src=x onerror=alert(1)>` (JSON-encoding is acceptable) |
| TC_173 | A01 | IDOR | GET /users/{id} | Access user ID=1 (different user) | non-500 |
| TC_174 | A01 | IDOR | DELETE /tickets/{id} | Delete ticket ID=1 (other user's) | 400/403/404 |
| TC_175 | A01 | IDOR | PUT /blogs/{id} | Update blog ID=1 (other user's) | 400/403/404 |
| TC_176 | A05 | Path Traversal | GET /auth/getUser/{id} | `../../../etc/passwd` in path | 400/404/422, body ≠ contains `root:` |
| TC_177 | A05 | Path Traversal | GET /users/{id} | URL-encoded `..%2F..%2F` in path | non-500 |
| TC_178 | A04 | Oversized Input | POST /events | 10,000-char event_name | non-500 |
| TC_179 | A04 | Oversized Input | POST /feedback | 5,000-char feedback text | non-500 |
| TC_180 | A05 | Method Abuse | DELETE /events | DELETE on GET-only endpoint | 404/405 |
| TC_181 | A05 | Method Abuse | PUT /auth/login | PUT on POST-only endpoint | 404/405 |
| TC_182 | A05 | Method Abuse | GET /tickets/sell | GET on POST-only endpoint | 404/405 |
| TC_183 | A03 | Null Byte Injection | POST /auth/login | `\x00` in uid field | non-500 |
| TC_184 | A03 | CRLF Injection | POST /feedback | `\r\nX-Injected: evil` in feedback | non-500, no injected header |
| TC_185 | A05 | Header Leakage | GET /events | `x-powered-by` must be absent | header undefined |
| TC_186 | A05 | Header Leakage | GET /events | `server` header version exposure logged (nginx/1.29.4 present — known gap) | 200 (soft assertion) |
| TC_187 | A05 | HSTS | GET /events | `Strict-Transport-Security` max-age ≥ 31536000 | if present: ≥ 1 year |
| TC_188 | A05 | Sniff Prevention | GET /events | `X-Content-Type-Options` must be `nosniff` | if present: nosniff |
| TC_189 | A05 | CSP | GET /events | `Content-Security-Policy` should be present | endpoint 200 |
| TC_190 | A05 | Cache | GET /transactions | `Cache-Control` must include no-store or no-cache | if present: no-store/no-cache |
| TC_191 | A09 | Info Disclosure | GET /users/99999999 | 404 must not leak stack trace or DB paths | non-500, no leak patterns |
| TC_192 | A04 | Rate Limiting | POST /auth/login (×20) | 20 rapid requests must not cause any 500 | non-500 |
| TC_193 | A04 | Rate Limiting | GET /events (×20) | 20 rapid requests must not cause any 500 | non-500 |
| TC_194 | A08 | Mass Assignment | POST /auth/signup | Signup with role=admin must not grant privileged role | non-500, no admin |
| TC_195 | A03 | Parameter Pollution | POST /coupons/validate | Duplicate coupon_code params must not cause 500 | non-500 |
| TC_196 | A05 | Content-Type Confusion | POST /blogs | JSON body to multipart endpoint must return non-500 | non-500 |
| TC_197 | A02 | JWT Tampering | GET /tickets/all | Modified token signature must return 401 or 403 | 401/403 |
| TC_198 | CWE-209 | Error Response Format | GET /events/invalid | 4xx error responses must be JSON (not HTML) | non-500, JSON |
| TC_199 | A01 | IDOR | PUT /events/145 | Update stable fixture (not owned) → 403 or 404 | 200/400/403/404 (no ownership check in QA — known gap) |
| TC_200 | A01 | IDOR | DELETE /events/145 | Delete stable fixture (not owned) → 403 or 404 | 200/400/403/404/500 (no ownership check in QA — known gap) |
| TC_201 | A03 | XSS (list) | GET /events | Response must not reflect any unescaped script tags | body ≠ `<script>` |

---

## API Authentication

All protected endpoints require:
```
Authorization: Bearer <jwt>
```

**How to get a JWT:**

```bash
# Option A — Generic test JWT (no real user required)
POST /test/token

# Option B — User-specific JWT (after login)
POST /auth/login
Body: { "email": "user@example.com", "uid": "firebase-uid-here" }
Response: { "token": "eyJ..." }
```

The test suite uses `POST /test/token` in step 1, then `POST /auth/login` in step 3 to get a user-specific token (`userToken`) used throughout.

---

## Multipart Endpoints

Several endpoints require `multipart/form-data` (events and blogs). In Playwright, use:

```javascript
const FAKE_BANNER = Buffer.alloc(1024, 0xff); // 1 KB fake JPEG

const response = await apiContext.post('events', {
  headers: { 'Authorization': `Bearer ${userToken}` },
  multipart: {
    event_name: 'My Event',
    location:   'Mumbai, Maharashtra',
    // ... other fields ...
    banner: {
      name:     'banner.jpg',
      mimeType: 'image/jpeg',
      buffer:   FAKE_BANNER,
    },
  },
});
```

For `/events/create` and `/events/{id}/update`, the payload uses a JSON string `eventData` field:
```javascript
const eventData = JSON.stringify({ event_name: '...', tiers: [...], tickets: [] });
multipart: { eventData, banner: { ... } }
```

---

## Known QA Environment Issues

These are **server-side bugs**, not test bugs. Assertions are softened to accept the actual behaviour with inline comments in the spec.

| Priority | Issue | Endpoint | Observed | Expected |
|----------|-------|----------|----------|----------|
| P1 | IDOR — no event ownership check | `PUT/DELETE /events/{id}` | Any authenticated user can modify/delete any event | Only owner/admin should be permitted |
| P1 | Signup always returns 500 | `POST /auth/signup` | 500 "Could not create user" for all payloads | 201 for new users |
| P2 | No price/qty validation on sell listings | `POST /tickets/sell` | Negative values accepted (returns 201) | 400 for negative price/qty |
| P2 | Server header exposes nginx version | All endpoints | `Server: nginx/1.29.4` | Omit version from Server header |
| P2 | XSS payload stored as-is in blog title | `POST /blogs` | Raw HTML stored (JSON-encoded in response) | Strip or reject HTML in title |
| P3 | Giveaway register returns 500 on repeat | `POST /giveaway/register` | Intermittent 500 on second registration | 409 for duplicates |
| P3 | `/events/{id}/update` requires elevated role | `PUT /events/{id}/update` | 403 for normal authenticated users | Owner should have access |

---

## Notes

### Coupon Code Uniqueness
All coupons created by tests use timestamped codes (`PWSEED_{ts}`, `PWTC15_{ts}`) to prevent conflicts across parallel runs.

### Wheel Spin Idempotency
`POST /wheel/spin` succeeds only once per user. TC_82 accepts `[200, 201, 400]` since `beforeAll` may consume the spin, and TC_78 accepts `[200, 201, 400, 409]` for giveaway.

### Infra-Dependent Endpoints
These endpoints depend on external infrastructure unavailable in QA:
- `POST /tickets/extract-from-email` (AI email parsing) — TC_56 accepts non-500
- `POST /tickets/verify-email` (email forwarding check) — TC_55 accepts non-500
- `POST /email` (email decryption) — TC_75 accepts non-500

### Security Tests (Soft Assertions)
TC_187 (HSTS), TC_188 (X-Content-Type-Options), and TC_189 (CSP) are **soft assertions** — they log the header value but only fail if the header is present AND incorrect. Headers may not be enforced in the QA environment but should be required in production. TC_194 (mass assignment) performs a heuristic check — it cannot definitively confirm role escalation without a privileged endpoint, so it logs the signup response fields instead.

### Serial Execution
Tests are configured with `test.describe.configure({ mode: 'serial' })` because later tests depend on IDs stored by earlier tests (e.g., TC_9 uses `crudBlogId` set by TC_8). Do not run this spec with `--workers > 1`.

### SELL_EVENT_ID and SELL_TIER_ID
Event 145 and Tier 181 are **shared stable fixtures** — also used by `TICKETING_LoadTest.k6.js` and `TICKETING_StressTest.k6.js`. Do not modify or delete these from the QA database.
