# VoBiz Outbound Call — API Test Suite

Automated API tests for the VoBiz Outbound Call service using [Playwright Test](https://playwright.dev/).

**Base URL:** `https://httpbin.org`
**Spec file:** `outbound_call.spec.js`
**OpenAPI spec:** `outbound_call.json`

---

## Endpoints Under Test

| Method | Endpoint        | Description                        |
|--------|-----------------|------------------------------------|
| GET    | `/getToken`     | Generate a LiveKit access token    |
| POST   | `/call`         | Initiate a single outbound call    |
| POST   | `/call/batch`   | Initiate a batch of outbound calls |
| GET    | `/recordings`   | Fetch call recordings from MongoDB |
| GET    | `/batches`      | List all call batches              |
| GET    | `/list-trunks`  | List available SIP trunks          |
| GET    | `/config`       | Get current system configuration   |
| POST   | `/config`       | Update system configuration        |

---

## Running the Tests

**Run all outbound call tests:**
```bash
npx playwright test tests/api/outbound_call/outbound_call.spec.js
```

**Run with detailed output:**
```bash
npx playwright test tests/api/outbound_call/outbound_call.spec.js --reporter=list
```

**Run a specific test group:**
```bash
npx playwright test tests/api/outbound_call/outbound_call.spec.js --grep "GET /getToken"
```

**Run only positive tests:**
```bash
npx playwright test tests/api/outbound_call/outbound_call.spec.js --grep "POSITIVE"
```

**Run only negative tests:**
```bash
npx playwright test tests/api/outbound_call/outbound_call.spec.js --grep "NEGATIVE"
```

**Run only edge case tests:**
```bash
npx playwright test tests/api/outbound_call/outbound_call.spec.js --grep "EDGE"
```

**Run only integration flow tests:**
```bash
npx playwright test tests/api/outbound_call/outbound_call.spec.js --grep "FLOW"
```

**Run a single test case by TC number:**
```bash
npx playwright test tests/api/outbound_call/outbound_call.spec.js --grep "TC-15"
```

**Run a range of test cases (e.g. TC-29 to TC-50):**
```bash
npx playwright test tests/api/outbound_call/outbound_call.spec.js --grep "TC-(29|30|31|32|33|34|35|36|37|38|39|40|41|42|43|44|45|46|47|48|49|50)"
```

---

## Console Log Conventions

Every test calls a shared `logApiResult(status, label, body)` helper. The prefix in each console line tells you exactly what happened:

| Prefix | Meaning |
|--------|---------|
| `[SUCCESS 200]` | API call was fully functional and returned data |
| `[VALIDATION ERROR 422]` | API responded but rejected the input — functionality did **not** execute |
| `[UNAUTHORIZED 401]` | API responded but authentication is required — functionality did **not** execute |
| `[FORBIDDEN 403]` | API responded but access was denied — functionality did **not** execute |
| `[RATE LIMITED 429]` | Too many requests — functionality was **not** executed |
| `[SERVER ERROR 5xx]` | Server-side failure — this is a **bug** |
| `[UNEXPECTED STATUS nnn]` | Unrecognised response code |

Negative tests that expect 422 additionally log:
- `EXPECTED: Server correctly rejected ... with 422.` — validation is working as designed
- `UNEXPECTED: Expected 422 but got N — validation may be missing.` — flags a potential gap

Positive tests that do not get 200 log a `NOTE:` warning explaining why functionality may not have executed (e.g. SIP trunk not configured, phone number rejected).

All request calls are wrapped in `try/catch`. On network or unexpected errors the message is logged with `console.error` and re-thrown so Playwright marks the test as failed.

---

## Test Structure

Tests are organised into 10 describe groups. Each test name is prefixed with a TC number and its category (`POSITIVE` / `NEGATIVE` / `EDGE` / `FLOW`) for easy filtering and traceability.

### 1. GET /getToken — TC-01 to TC-11
Tests token generation with various combinations of `identity`, `name`, and `room` query parameters.

| TC | Category | Scenario |
|----|----------|----------|
| TC-01 | POSITIVE | No query params |
| TC-02 | POSITIVE | Valid identity + name |
| TC-03 | POSITIVE | All three params (identity, name, room) |
| TC-04 | POSITIVE | Only name param |
| TC-05 | POSITIVE | Only room param |
| TC-06 | NEGATIVE | Unknown/extra query param — must not 5xx |
| TC-07 | EDGE | Identity as empty string |
| TC-08 | EDGE | Name with special characters |
| TC-09 | EDGE | Identity 255 chars long |
| TC-10 | EDGE | Room with spaces and special characters |
| TC-11 | EDGE | 5 concurrent token requests |

### 2. POST /call — TC-12 to TC-28
Tests single outbound call initiation. Required fields: `phone_number` (string), `name` (string).

| TC | Category | Scenario |
|----|----------|----------|
| TC-12 | POSITIVE | Valid phone_number and name |
| TC-13 | POSITIVE | International E.164 format number |
| TC-14 | POSITIVE | Name with spaces and mixed case |
| TC-15 | NEGATIVE | Missing phone_number → expects 422 |
| TC-16 | NEGATIVE | Missing name → expects 422 |
| TC-17 | NEGATIVE | Empty request body → expects 422 |
| TC-18 | NEGATIVE | phone_number as integer type |
| TC-19 | NEGATIVE | name as null → expects 422 |
| TC-20 | NEGATIVE | No Content-Type header |
| TC-21 | NEGATIVE | No request body → expects 422 |
| TC-22 | EDGE | phone_number as empty string |
| TC-23 | EDGE | name as empty string |
| TC-24 | EDGE | phone_number with alphabetic characters |
| TC-25 | EDGE | XSS payload in name |
| TC-26 | EDGE | Name 1000 characters long |
| TC-27 | EDGE | Extra unknown fields in body |
| TC-28 | EDGE | 3 concurrent calls to same number |

### 3. POST /call/batch — TC-29 to TC-50
Tests batch call initiation. Required field: `recipients` (array of objects with `phone`).

| TC | Category | Scenario |
|----|----------|----------|
| TC-29 | POSITIVE | 3 known recipients |
| TC-30 | POSITIVE | Single recipient |
| TC-31 | POSITIVE | Recipients only (no optional fields) |
| TC-32 | POSITIVE | Custom max_concurrent + delay |
| TC-33 | POSITIVE | scheduled_at in future |
| TC-34 | POSITIVE | All 10 known recipients |
| TC-35 | NEGATIVE | Missing recipients field → expects 422 |
| TC-36 | NEGATIVE | Empty recipients array |
| TC-37 | NEGATIVE | Recipient missing phone → expects 422 |
| TC-38 | NEGATIVE | Empty request body → expects 422 |
| TC-39 | NEGATIVE | max_concurrent as string → expects 422 |
| TC-40 | NEGATIVE | delay_between_batches as string → expects 422 |
| TC-41 | NEGATIVE | recipients as string → expects 422 |
| TC-42 | EDGE | max_concurrent = 0 |
| TC-43 | EDGE | Negative max_concurrent |
| TC-44 | EDGE | delay_between_batches = 0 |
| TC-45 | EDGE | Very large delay (9999.99) |
| TC-46 | EDGE | scheduled_at in the past |
| TC-47 | EDGE | Invalid scheduled_at format |
| TC-48 | EDGE | Phone with formatting characters (spaces, parens) |
| TC-49 | EDGE | Large batch — 50 recipients (uses KNOWN_RECIPIENTS cycling) |
| TC-50 | EDGE | Duplicate phone numbers in same batch |

### 4. GET /recordings — TC-51 to TC-64
Tests fetching call recordings with optional `batch_id` and `limit` filters.

| TC | Category | Scenario |
|----|----------|----------|
| TC-51 | POSITIVE | No params (default limit 100) |
| TC-52 | POSITIVE | limit=10 |
| TC-53 | POSITIVE | Filter by batch_id |
| TC-54 | POSITIVE | batch_id + limit combined |
| TC-55 | NEGATIVE | limit as non-integer string → expects 422 |
| TC-56 | NEGATIVE | limit as float |
| TC-57 | EDGE | limit = 0 |
| TC-58 | EDGE | limit = 1 |
| TC-59 | EDGE | Very large limit (100000) |
| TC-60 | EDGE | Negative limit |
| TC-61 | EDGE | batch_id as empty string |
| TC-62 | EDGE | Non-existent batch_id → expects empty array |
| TC-63 | EDGE | Response schema validation (success, count, recordings) |
| TC-64 | EDGE | 5 concurrent requests — no 5xx |

### 5. GET /batches — TC-65 to TC-70
Tests listing all call batches. No parameters.

| TC | Category | Scenario |
|----|----------|----------|
| TC-65 | POSITIVE | Returns 200 |
| TC-66 | POSITIVE | Response is valid JSON |
| TC-67 | POSITIVE | Response is array or object |
| TC-68 | EDGE | Unknown query param — must not 5xx |
| TC-69 | EDGE | 5 concurrent requests |
| TC-70 | EDGE | Response time under 10s |

### 6. GET /list-trunks — TC-71 to TC-76
Tests listing available SIP trunks. No parameters.

| TC | Category | Scenario |
|----|----------|----------|
| TC-71 | POSITIVE | Returns 200 |
| TC-72 | POSITIVE | Response is valid JSON |
| TC-73 | POSITIVE | Response contains trunks data |
| TC-74 | EDGE | Unknown query param — must not 5xx |
| TC-75 | EDGE | 5 concurrent requests |
| TC-76 | EDGE | Response time under 10s |

### 7. GET /config — TC-77 to TC-81
Tests reading the current system configuration. No parameters.

| TC | Category | Scenario |
|----|----------|----------|
| TC-77 | POSITIVE | Returns 200 |
| TC-78 | POSITIVE | Response is valid JSON |
| TC-79 | POSITIVE | Response is an object with config keys |
| TC-80 | EDGE | Unknown query param — must not 5xx |
| TC-81 | EDGE | 5 concurrent requests return identical config |

### 8. POST /config — TC-82 to TC-88
Tests updating the system configuration. No required body fields defined in spec.

| TC | Category | Scenario |
|----|----------|----------|
| TC-82 | POSITIVE | Empty body → returns 200 |
| TC-83 | POSITIVE | No body → returns 200 |
| TC-84 | POSITIVE | GET after POST is idempotent |
| TC-85 | POSITIVE | Response is valid JSON |
| TC-86 | EDGE | Arbitrary unknown fields — must not 5xx |
| TC-87 | EDGE | 3 concurrent requests — no 5xx |
| TC-88 | EDGE | Deeply nested payload — must not 5xx |

### 9. Cross-Endpoint Integration Flows — TC-89 to TC-94
End-to-end flows testing how endpoints interact with each other.

| TC | Flow | Steps |
|----|------|-------|
| TC-89 | Config round-trip | GET /config → POST /config with same body |
| TC-90 | Batch → Recordings | GET /batches → GET /recordings filtered by first batch_id |
| TC-91 | Parallel reads | GET /list-trunks and GET /getToken in parallel |
| TC-92 | Batch creation check | POST /call/batch → GET /batches to verify list |
| TC-93 | Sequential read timing | All 4 GET endpoints sequentially, each under 10s |
| TC-94 | Concurrent all reads | All GET endpoints simultaneously, no 5xx |

### 10. 422 Validation Error Schema — TC-95 to TC-97
Validates that 422 error responses conform to FastAPI's `HTTPValidationError` schema.

| TC | Endpoint | Trigger | Fields Validated |
|----|----------|---------|-----------------|
| TC-95 | POST /call | Empty body | `detail[].loc`, `detail[].msg`, `detail[].type` |
| TC-96 | POST /call/batch | Empty body | Same schema |
| TC-97 | GET /recordings | `limit=invalid` | Same schema (if 422 returned) |

---

## Response Schema Reference

### 422 HTTPValidationError
```json
{
  "detail": [
    {
      "loc": ["body", "phone_number"],
      "msg": "Field required",
      "type": "missing"
    }
  ]
}
```

### GET /recordings 200 Response
```json
{
  "success": true,
  "count": 10,
  "recordings": [
    {
      "session_id": "...",
      "batch_id": "...",
      "room": {},
      "sip": {},
      "transcript": [],
      "duration": {},
      "started_at": "...",
      "ended_at": "..."
    }
  ]
}
```

### Test Phone Numbers

All phone numbers used in tests are defined as named variables at the top of `outbound_call.spec.js`. Update these before running to match real or sandbox numbers in your SIP environment:

```js
// Single call number
const VALID_PHONE = '+919000000001';

// Batch recipients — 10 known numbers used across all batch tests
const KNOWN_RECIPIENTS = [
  { phone: '+919000000001', name: 'Recipient One'   },
  { phone: '+918779296501', name: 'Recipient Two'   },
  // ... up to Recipient Ten
];
```

`makeRecipient(index)` picks from `KNOWN_RECIPIENTS` by index (wraps around).
`makeBatchRequest(count)` slices the first N entries from `KNOWN_RECIPIENTS`.

---

### SingleCallRequest (POST /call)
```json
{
  "phone_number": "+919000000001",
  "name": "Test User"
}
```

### BatchCallRequest (POST /call/batch)
```json
{
  "recipients": [
    { "phone": "+919000000001", "name": "Recipient One" },
    { "phone": "+918779296501", "name": "Recipient Two" }
  ],
  "name": "My Batch",
  "max_concurrent": 5,
  "delay_between_batches": 0.5,
  "scheduled_at": "2026-03-10T10:00:00.000Z"
}
```

---

## Test Count Summary

| Group | TC Range | Tests |
|-------|----------|-------|
| 1. GET /getToken | TC-01 – TC-11 | 11 |
| 2. POST /call | TC-12 – TC-28 | 17 |
| 3. POST /call/batch | TC-29 – TC-50 | 22 |
| 4. GET /recordings | TC-51 – TC-64 | 14 |
| 5. GET /batches | TC-65 – TC-70 | 6 |
| 6. GET /list-trunks | TC-71 – TC-76 | 6 |
| 7. GET /config | TC-77 – TC-81 | 5 |
| 8. POST /config | TC-82 – TC-88 | 7 |
| 9. Cross-Endpoint Flows | TC-89 – TC-94 | 6 |
| 10. 422 Schema Validation | TC-95 – TC-97 | 3 |
| **Total** | **TC-01 – TC-97** | **97** |

---

## Notes

- Tests that trigger actual outbound SIP calls (`POST /call`, `POST /call/batch`) will dial real phone numbers if the server processes them. Use test/sandbox phone numbers in a controlled environment.
- All tests use `expect(status).toBeLessThan(500)` as a baseline — the API must never return a 5xx for any input.
- Concurrent test scenarios use `Promise.all` to simulate parallel load and verify the server handles it without crashing.
- Response time assertions (where present) use a 10-second threshold for read endpoints, with a 3-second soft warning logged to the console.
- All requests are wrapped in `try/catch` — network failures are logged with `console.error` and re-thrown so Playwright correctly marks the test as failed.
- A non-200 status in a positive test does **not** automatically fail the assertion (where both 200 and 422 are accepted), but it always logs a `NOTE:` warning explaining that the functionality did not execute, so the result is visible in the test output.
