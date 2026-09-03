# Retail CRM Dealer Sales API – Test Suite

Playwright API test suite for the **Retail CRM Dealer Sales API** (`dealer_api.spec.js`).
Covers **170 test cases** across all 8 endpoints defined in `dealer_api.json` (organized into five classified sections), plus a sixth section covering the v2.0 redis-branch additions — the `GET /internal/stats` analytics endpoint, request-timeout handling, and Redis caching. The redis-branch section self-detects whether those features are deployed and skips cleanly when they are not.

---

## Files

| File | Description |
|------|-------------|
| `dealer_api.spec.js` | Playwright test spec (170 test cases) |
| `dealer_api.json` | OpenAPI 3.1.0 spec for the Dealer Sales API |
| `TEST_RESULTS.md` | Latest test execution report with bug findings |
| `README.md` | This file |

---

## Test Classification Summary

| Section | TC Range | Count | Description |
|---------|----------|-------|-------------|
| Functional | TC_1–TC_67 | 67 | Valid inputs, happy-path, all 200s. Covers all distributionChannel variants, sortBy/sortOrder combos, category/subBrand filters, parameter combinations, response body and Content-Type validation |
| Edge Cases | TC_68–TC_76 | 9 | Boundary and unusual-but-valid inputs: min/max limit, min/max pageSize, leap year dates, old dates, far-future dates, single-day CUSTOM range, out-of-bounds page |
| Negative Cases | TC_77–TC_103 | 27 | Invalid inputs that must return 4xx (never 500). Covers all endpoints for invalid dealer_id, boundary violations, invalid enum values, malformed dates |
| Security | TC_104_SEC–TC_135_SEC | 32 | Auth bypass, SQL injection, XSS, IDOR, path traversal, oversized inputs, HTTP method abuse, header leakage, CRLF injection, response header security (CWE-693), error body info disclosure (CWE-209), rate limiting, transport security |
| Data Validation | TC_136–TC_156 | 21 | Response body field contracts, sort order correctness, pagination result count, error body JSON structure, response time SLAs |
| v2.0 Redis-Branch Features | TC_157–TC_170 | 14 | `GET /internal/stats` analytics endpoint (auth, body shape, method abuse, headers, SLA), TimeoutMiddleware 503 contract, Redis cache-consistency. Self-skips if the redis branch is not deployed (probe on `/internal/stats`) |
| **Total** | | **170** | |

---

## Configuration

| Setting | Value | Override via |
|---------|-------|-------------|
| Base URL | `https://reqres.in` | `DEALER_API_BASE_URL` env var |
| API Key | `opusretail_crmdealerapis` | Hardcoded (header: `x-api-key`) |
| Dealer ID | `6100000001` | `DEALER_ID` env var |

---

## Running the Tests

### Run all tests
```bash
npx playwright test tests/api/retail_crm_Dealer/dealer_api.spec.js
```

### Run with custom base URL and dealer ID
```bash
DEALER_API_BASE_URL=https://your-api-url.com DEALER_ID=YOUR_ID \
  npx playwright test tests/api/retail_crm_Dealer/dealer_api.spec.js
```

### Run only functional tests
```bash
npx playwright test tests/api/retail_crm_Dealer/dealer_api.spec.js --grep "Functional"
```

### Run only edge case tests
```bash
npx playwright test tests/api/retail_crm_Dealer/dealer_api.spec.js --grep "Edge Cases"
```

### Run only negative tests
```bash
npx playwright test tests/api/retail_crm_Dealer/dealer_api.spec.js --grep "Negative Cases"
```

### Run only security tests (TC_104_SEC–TC_135_SEC)
```bash
npx playwright test tests/api/retail_crm_Dealer/dealer_api.spec.js --grep "_SEC"
```

### Run only v2.0 redis-branch feature tests (TC_157–TC_170)
```bash
npx playwright test tests/api/retail_crm_Dealer/dealer_api.spec.js --grep "Redis-Branch"
```

### Run a specific test case
```bash
npx playwright test tests/api/retail_crm_Dealer/dealer_api.spec.js --grep "TC_53 "
```

### Run with HTML report
```bash
npx playwright test tests/api/retail_crm_Dealer/dealer_api.spec.js --reporter=html
npx playwright show-report
```

---

## Test Case Index

### Functional Tests — TC_1 to TC_67

#### Health
| TC | Endpoint | Description | Expected |
|----|----------|-------------|----------|
| TC_1 | GET `/health` | Health check | 200 |

#### Overall Summary — `GET /dealers/{dealer_id}/sales/overall-summary`
| TC | Description | Expected |
|----|-------------|----------|
| TC_2 | Default params (no filters) | 200 |
| TC_3 | `asOfDate=2025-03-31` | 200 |
| TC_4 | `distributionChannel=11` | 200 |
| TC_5 | `distributionChannel=10` | 200 |
| TC_6 | `distributionChannel=21` | 200 |
| TC_7 | `distributionChannel=All` (explicit) | 200 |
| TC_8 | `asOfDate` + `distributionChannel=12` combo | 200 |

#### Top Products — `GET /dealers/{dealer_id}/sales/top-products`
| TC | Description | Expected |
|----|-------------|----------|
| TC_9 | Default params | 200 |
| TC_10 | `limit=10` | 200 |
| TC_11 | `distributionChannel=10` | 200 |
| TC_12 | `asOfDate` + `limit=10` combo | 200 |
| TC_13 | `limit=25` (mid-range) | 200 |

#### Category Breakdown — `GET /dealers/{dealer_id}/sales/category-breakdown`
| TC | Description | Expected |
|----|-------------|----------|
| TC_14 | Default params | 200 |
| TC_15 | `asOfDate` + `distributionChannel=11` | 200 |
| TC_16 | `distributionChannel=10` | 200 |
| TC_17 | `distributionChannel=21` | 200 |

#### Channel Split — `GET /dealers/{dealer_id}/sales/channel-split`
| TC | Description | Expected |
|----|-------------|----------|
| TC_18 | Default params | 200 |
| TC_19 | `distributionChannel=11` | 200 |
| TC_20 | `distributionChannel=10` | 200 |
| TC_21 | `distributionChannel=21` | 200 |

#### Subbrand Split — `GET /dealers/{dealer_id}/sales/subbrand-split`
| TC | Description | Expected |
|----|-------------|----------|
| TC_22 | Default params | 200 |
| TC_23 | `distributionChannel=12` | 200 |
| TC_24 | `distributionChannel=11` | 200 |
| TC_25 | `distributionChannel=21` | 200 |

#### Sales Analytics — `GET /dealers/{dealer_id}/sales/analytics`
| TC | Description | Expected |
|----|-------------|----------|
| TC_26 | Default params | 200 |
| TC_27 | `asOfDate` + `distributionChannel=11` | 200 |
| TC_28 | `distributionChannel=10` | 200 |
| TC_29 | `distributionChannel=12` | 200 |

#### Product Sales Report Search — `GET /dealers/{dealer_id}/sales/products/search`
| TC | Description | Expected |
|----|-------------|----------|
| TC_30 | Default params (`periodType=MTD`) | 200 |
| TC_31 | `periodType=YTD` | 200 |
| TC_32 | `periodType=QTD` | 200 |
| TC_33 | `periodType=PREVIOUS MONTH` | 200 |
| TC_34 | `periodType=PREVIOUS QUARTER` | 200 |
| TC_35 | `periodType=CUSTOM` with `startDate` + `endDate` | 200 |
| TC_36 | `category=Interior` | 200 |
| TC_37 | `subBrand=One` | 200 |
| TC_38 | Multi-select `distributionChannel=11,12` | 200 |
| TC_39 | `distributionChannel=10` | 200 |
| TC_40 | `distributionChannel=21` | 200 |
| TC_41 | `distributionChannel=All` (explicit) | 200 |
| TC_42 | `category=Enamels` | 200 |
| TC_43 | `category=Exterior` | 200 |
| TC_44 | `category=Waterproofing` | 200 |
| TC_45 | `subBrand=Calista` | 200 |
| TC_46 | `subBrand=Prime` | 200 |
| TC_47 | Multi-select `category=Interior,Exterior` | 200 |
| TC_48 | Multi-select `subBrand=One,Calista` | 200 |
| TC_49 | Multi-select `category=Enamels,Waterproofing` | 200 |
| TC_50 | Multi-select `subBrand=One,Prime,Calista` | 200 |
| TC_51 | `sortBy=volume`, `sortOrder=asc` | 200 |
| TC_52 | `sortBy=growth`, `sortOrder=desc` | 200 |
| TC_53 | `sortBy=value`, `sortOrder=asc` | 200 |
| TC_54 | `sortBy=value`, `sortOrder=desc` | 200 |
| TC_55 | `sortBy=volume`, `sortOrder=desc` | 200 |
| TC_56 | `sortBy=growth`, `sortOrder=asc` | 200 |
| TC_57 | Pagination (`page=0`, `pageSize=5`) | 200 |
| TC_58 | `page=1`, `pageSize=10` (second page) | 200 |
| TC_59 | `asOfDate` + `category=Interior` combo | 200 |
| TC_60 | `CUSTOM` + `distributionChannel=11` + `category=Interior` combo | 200 |
| TC_61 | `downloadReport=true` (all rows) | 200 |
| TC_62 | `downloadReport=true` + `category=Interior` | 200 |

#### Response Body & Header Validation
| TC | Description | Expected |
|----|-------------|----------|
| TC_63 | products/search — response body is valid JSON object | 200 + `typeof === 'object'` |
| TC_64 | overall-summary — response body is valid JSON object | 200 + `typeof === 'object'` |
| TC_65 | top-products — response body is valid JSON object | 200 + `typeof === 'object'` |
| TC_66 | `/health` — `Content-Type: application/json` | header matches |
| TC_67 | overall-summary — `Content-Type: application/json` | header matches |

---

### Edge Case Tests — TC_68 to TC_76

| TC | Description | Expected |
|----|-------------|----------|
| TC_68 | top-products `limit=1` (minimum valid) | 200 |
| TC_69 | top-products `limit=50` (maximum valid) | 200 |
| TC_70 | overall-summary `asOfDate=2099-12-31` (far future) | 200 (empty/zero data) |
| TC_71 | products/search `page=999999` (out-of-bounds) | 200 (empty results) |
| TC_72 | products/search `CUSTOM` with leap year `endDate=2024-02-29` | 200 |
| TC_73 | overall-summary `asOfDate=1900-01-01` (very old date) | 200 (empty data) |
| TC_74 | products/search `CUSTOM` `startDate` equals `endDate` (single-day range) | 200 |
| TC_75 | products/search `pageSize=1` (minimum valid) | 200 |
| TC_76 | products/search `pageSize=200` (maximum valid) | 200 |

---

### Negative Case Tests — TC_77 to TC_103

| TC | Description | Expected |
|----|-------------|----------|
| TC_77 | Invalid `dealer_id` — overall-summary | non-500 |
| TC_78 | top-products `limit=0` (below min=1) | 422 |
| TC_79 | top-products `limit=51` (above max=50) | 422 |
| TC_80 | products/search `pageSize=0` (below min=1) | 422 |
| TC_81 | products/search `pageSize=201` (above max=200) | 422 |
| TC_82 | overall-summary invalid `asOfDate` format | 422 |
| TC_83 | top-products invalid `asOfDate` format | 422 |
| TC_84 | category-breakdown invalid `asOfDate` format | 422 |
| TC_85 | channel-split invalid `asOfDate` format | 422 |
| TC_86 | subbrand-split invalid `asOfDate` format | 422 |
| TC_87 | analytics invalid `asOfDate` format | 422 |
| TC_88 | products/search `CUSTOM` — no `startDate` / `endDate` | non-200 |
| TC_89 | products/search `CUSTOM` — only `startDate`, missing `endDate` | non-200 |
| TC_90 | products/search `startDate` after `endDate` (inverted range) | non-200 |
| TC_91 | products/search invalid `periodType` value (`WEEKLY`) | 422 |
| TC_92 | products/search invalid `sortBy` value (`price`) | 422 |
| TC_93 | products/search invalid `sortOrder` value (`random`) | 422 |
| TC_94 | products/search negative `page` value (`page=-1`) | 422 |
| TC_95 | Invalid `dealer_id` — category-breakdown | non-500 |
| TC_96 | Invalid `dealer_id` — channel-split | non-500 |
| TC_97 | Invalid `dealer_id` — subbrand-split | non-500 |
| TC_98 | Invalid `dealer_id` — analytics | non-500 |
| TC_99 | Invalid `dealer_id` — products/search | non-500 |
| TC_100 | products/search `pageSize=-5` (negative) | 422 |
| TC_101 | top-products `limit=-1` (negative) | 422 |
| TC_102 | products/search invalid `category` value | non-500 |
| TC_103 | overall-summary invalid `distributionChannel=99` | non-500 |

---

### Security Tests — TC_104_SEC to TC_135_SEC

| TC | Category | Description | Expected |
|----|----------|-------------|----------|
| TC_104_SEC | Authentication | Missing `x-api-key` — tests on `overall-summary` (protected endpoint) | 401 / 403 |
| TC_105_SEC | Authentication | Invalid `x-api-key` — tests on `overall-summary` (protected endpoint) | 401 / 403 |
| TC_106_SEC | Authentication | Empty `x-api-key` — tests on `overall-summary` (protected endpoint) | 401 / 403 |
| TC_107_SEC | Path Traversal | `../admin`, `../../etc/passwd`, URL-encoded variant in `dealer_id` | 400 / 404 / 422 (no 500) |
| TC_108_SEC | SQL Injection | SQLi payloads in `dealer_id` path param | non-500 |
| TC_109_SEC | SQL Injection | SQLi payload in `category` query param | non-500 |
| TC_110_SEC | XSS | `<script>` tag in `category` query param — must not be reflected in body | no `<script>` in response |
| TC_111_SEC | IDOR | Different `dealer_id` with same API key | non-500 |
| TC_112_SEC | Oversized Input | 5000-char `dealer_id` | non-500 |
| TC_113_SEC | Oversized Input | 5000-char `category` query param | non-500 |
| TC_114_SEC | Method Abuse | `POST` on GET-only endpoint | 404 / 405 |
| TC_115_SEC | Method Abuse | `DELETE` on GET-only endpoint | 404 / 405 |
| TC_116_SEC | Header Leakage | `x-powered-by` / server version in response headers | absent / generic |
| TC_117_SEC | Parameter Pollution | Malformed comma-injected `distributionChannel` | non-500 |
| TC_118_SEC | Null Byte Injection | Null byte `\x00` in `dealer_id` | non-500 |
| TC_119_SEC | SQL Injection | SQLi payload in `asOfDate` query param | non-500 |
| TC_120_SEC | XSS | `<script>` tag in `dealer_id` path — must not be reflected in body | no `<script>` in response |
| TC_121_SEC | CRLF Injection | CRLF characters in `category` param — must not inject response headers | non-500, no injected headers |
| TC_122_SEC | Method Abuse | `PUT` on GET-only endpoint | 404 / 405 |
| TC_123_SEC | Response Headers (CWE-693) | `X-Content-Type-Options` must be `nosniff` | header present = `nosniff` |
| TC_124_SEC | Response Headers (CWE-693) | `Strict-Transport-Security` (HSTS) must be present | header present |
| TC_125_SEC | Response Headers (CWE-693) | `Cache-Control` on overall-summary must include `no-store`/`no-cache` | contains `no-store` or `no-cache` |
| TC_126_SEC | Response Headers (CWE-693) | `Content-Security-Policy` must be present | header present |
| TC_127_SEC | Server Version (CWE-200) | `server` header must not expose version number | no `word/digit` pattern |
| TC_128_SEC | Info Disclosure (CWE-209) | Invalid `dealer_id` 4xx response must not leak stack/path details | no traceback / `.py` in body |
| TC_129_SEC | Info Disclosure (CWE-209) | Invalid `asOfDate` error response must not leak DB or stack info | no traceback / `ORA-` / `PG::` in body |
| TC_130_SEC | Info Disclosure (CWE-209) | SQL injection in `dealer_id` must not expose DB error messages | no `syntax error` / `ORA-` in body |
| TC_131_SEC | Rate Limiting | 20 rapid `/health` requests must not cause 500 (documents if 429 active) | no 500s |
| TC_132_SEC | Rate Limiting | 20 rapid `overall-summary` requests must not cause 500 | no 500s |
| TC_133_SEC | Transport Security | Plain HTTP request must redirect or be refused (not return 200) | 301/302/307/308 or connection error |
| TC_134_SEC | Transport Security | HSTS `max-age` must be ≥ 31536000 (1 year) | `max-age` ≥ 31536000 |
| TC_135_SEC | Response Headers (CWE-693) | `Cache-Control` on `products/search` must include `no-store`/`no-cache` | contains `no-store` or `no-cache` |

---

### Data Validation Tests — TC_136 to TC_156

#### Response Body Field Contracts
| TC | Endpoint | What Is Validated |
|----|----------|-------------------|
| TC_136 | `/health` | Body has `status` (string) and `maxInvoiceDate` fields |
| TC_137 | `overall-summary` | Has `chartConfig` (object), `data` (array with `xAxis`/`value`/`volume` per item), `meta.dealerId` |
| TC_138 | `top-products` | `data` is object with period keys (`MTD`, `YTD`, `QTD`, etc.); `meta.limit` is number |
| TC_139 | `category-breakdown` | `data` array items have `filter`, `option`, `total`, `points` fields |
| TC_140 | `channel-split` | Has `graphConfig`; `data` array items have `filter`, `option`, `total` |
| TC_141 | `subbrand-split` | Has `graphConfig`; `data` array items have `filter`, `option`, `total` |
| TC_142 | `analytics` | `data` has `Value` and `Volume` metric group keys |
| TC_143 | `products/search` | `pagination` has `page`/`pageSize`/`totalRows`/`totalPages`/`hasNext`/`hasPrev`; `data` items have `productCode`, `productName` (string), `value` (number), `volume` (number), `growth` |

#### Sort Order Verification
| TC | Sort Config | Assertion |
|----|-------------|-----------|
| TC_144 | `sortBy=value`, `sortOrder=desc` | `data[0].value` ≥ `data[1].value` |
| TC_145 | `sortBy=value`, `sortOrder=asc` | `data[0].value` ≤ `data[1].value` |
| TC_146 | `sortBy=volume`, `sortOrder=desc` | `data[0].volume` ≥ `data[1].volume` |

#### Pagination Count Verification
| TC | Scenario | Assertion |
|----|----------|-----------|
| TC_147 | `pageSize=5` | `data.length` ≤ 5; `pagination.pageSize` === 5 |
| TC_148 | `pageSize=10` | `data.length` ≤ 10; `pagination.pageSize` === 10 |
| TC_149 | `page=999999` (out of bounds) | `data.length` === 0 (empty result set) |
| TC_150 | `downloadReport=true` vs `pageSize=5` | `downloadReport=true` returns ≥ records than paged response |

#### Error Body Structure
| TC | Trigger | Assertion |
|----|---------|-----------|
| TC_151 | `top-products limit=0` → 400/422 | Body is JSON; has `detail`/`message`/`error` field; no `<!DOCTYPE` |
| TC_152 | `products/search sortBy=price` → 400/422 | Body is JSON; has error field |
| TC_153 | `products/search CUSTOM` without dates → non-200 | Body is JSON; has error indicator |

#### Response Time SLA
| TC | Endpoint | SLA |
|----|----------|-----|
| TC_154 | `/health` | < 1000ms |
| TC_155 | `overall-summary` | < 5000ms |
| TC_156 | `products/search` | < 5000ms |

---

### v2.0 Redis-Branch Feature Tests — TC_157 to TC_170

> These cover the redis-branch additions from the v2.0 Solution Doc. A `beforeAll` probe on `/internal/stats` sets a `redisFeaturesLive` flag (200 → live, 404 → not deployed); every test below `test.skip`s when the branch is not deployed, so the suite passes on both master and the redis branch.

#### `GET /internal/stats` — Authentication (Section 9.4)
| TC | Description | Expected |
|----|-------------|----------|
| TC_157 | Missing `x-api-key` | 401 / 403 |
| TC_158 | Invalid `x-api-key` | 401 / 403 |

#### `GET /internal/stats` — Success & Body Shape (Section 9.4)
| TC | Description | Expected |
|----|-------------|----------|
| TC_159 | Valid key returns success + JSON content-type | 200 + `application/json` |
| TC_160 | Body has `today` and `all_time` blocks (accepts graceful `analytics unavailable` if Redis is down) | 200 + both objects present |
| TC_161 | `today` block exposes `total_requests` (number), `by_endpoint`, `top_dealers`, `cache` | fields present + typed |
| TC_162 | Per-endpoint metrics have `count`, `avg_ms`, `slow_2s`, `slow_10s`, `errors` | fields present + typed |
| TC_163 | `all_time` block exposes `total_requests` (number) and `by_endpoint` | fields present + typed |

#### `GET /internal/stats` — Method Abuse & Headers
| TC | Description | Expected |
|----|-------------|----------|
| TC_164 | `POST /internal/stats` | 404 / 405 |
| TC_165 | `X-Content-Type-Options` must be `nosniff` | header = `nosniff` |
| TC_166 | Responds within 2000ms (read entirely from Redis) | < 2000ms |

#### TimeoutMiddleware (Section 9.1)
| TC | Description | Expected |
|----|-------------|----------|
| TC_167 | `/health` must not return timeout `503` (timeout applies only to `/dealers/*`) | not 503 |
| TC_168 | If a `/dealers/*` request returns `503`, body must be `{"error":"request_timeout"}` | 200, or 503 with correct body |

> **Known limitation:** the timeout `503` cannot be triggered deterministically from a black-box client without a slow query or a low `REQUEST_TIMEOUT_SECONDS` set server-side. TC_168 asserts the contract conditionally.

#### Redis Cache Behaviour (Sections 8, 11)
| TC | Description | Expected |
|----|-------------|----------|
| TC_169 | Two identical `overall-summary` requests return byte-identical bodies (cache consistency) | bodies equal |
| TC_170 | Repeated identical request — logs 1st vs warm-cache timing (observational; latency not hard-asserted) | both 200 |

---

## API Authentication

All requests use an API key passed in the request header:

```
x-api-key: opusretail_crmdealerapis
```

Security tests TC_104_SEC – TC_106_SEC intentionally omit or corrupt this key to verify the API rejects unauthenticated requests on **protected endpoints** (e.g. `overall-summary`).

> **Note:** `/health` is intentionally public and requires no authentication. This is explicitly documented in `dealer_api.json` v1.1.0 via `"security": []` on the health path.

---

## Notes

- **`asOfDate`** format: `YYYY-MM-DD`. Defaults to the dataset's max `invoice_date` when omitted.
- **`distributionChannel`** accepts individual IDs (`10`, `11`, `12`, `21`), comma-separated multi-select (e.g. `11,12`), or `All`. Defaults to `All`.
- **`periodType`** options: `MTD` | `YTD` | `QTD` | `PREVIOUS MONTH` | `PREVIOUS QUARTER` | `CUSTOM`. `CUSTOM` requires both `startDate` and `endDate`.
- **`pageSize`** valid range: `1–200`. Values outside this range return `422`.
- **`limit`** (top-products) valid range: `1–50`. Values outside this range return `422`.
- **`sortBy`** enum: `value` | `volume` | `growth`. Other values return `422`.
- **`sortOrder`** enum: `asc` | `desc`. Other values return `422`.
- **`category`** and **`subBrand`** accept comma-separated values or `All`. Unknown values return `400`.
- **`downloadReport=true`** returns all rows without pagination limits.
- **`/health`** is a public endpoint (no auth required) as per spec v1.1.0 — auth tests use `overall-summary` instead.
- **`/internal/stats`** is the v2.0 redis-branch live-analytics dashboard endpoint. It requires `x-api-key`, is served entirely from Redis, and returns `today` + `all_time` blocks (request counts, per-endpoint timing/errors, cache hit-rate, filter usage, top dealers).
- **Redis-branch tests (TC_157–TC_170)** auto-detect deployment via an `/internal/stats` probe in `beforeAll` and skip cleanly on master (where the endpoint returns 404). Confirmed live on the dev environment at time of writing.
- **`dealer_api.json`** (OpenAPI 1.1.0) does **not** yet list `/internal/stats` or the timeout behaviour — these are pending merge to master. Update the OpenAPI spec once merged.
