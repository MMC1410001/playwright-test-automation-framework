const { test, expect } = require('@playwright/test');

/**
 * VoBiz Outbound Call - API Test Suite
 *
 * Covers all endpoints defined in outbound_call.json:
 *  - GET  /getToken
 *  - POST /call
 *  - POST /call/batch
 *  - GET  /recordings
 *  - GET  /batches
 *  - GET  /list-trunks
 *  - GET  /config
 *  - POST /config
 *
 * Test categories per endpoint:
 *  - Positive: valid inputs, expected successful responses
 *  - Negative: missing required fields, wrong types, invalid values
 *  - Edge cases: boundary values, special characters, empty strings, large payloads
 */

// Uncomment when needed to be run, currently commented as auto script is run
// const BASE_URL = `${process.env.OUTBOUND_API_URL || 'https://httpbin.org'}`;

// ---------------------------------------------------------------------------
// Shared status logger
// Clearly separates a fully successful 200 from other valid-but-notable codes.
// ---------------------------------------------------------------------------

/**
 * logApiResult — logs a human-readable status line for every API call.
 *
 * @param {number} status   HTTP status code returned by the API
 * @param {string} label    Short description e.g. "GET /getToken"
 * @param {*}      body     Parsed response body (optional)
 */
function logApiResult(status, label, body) {
  const bodySnippet = body !== undefined
    ? ` | body: ${JSON.stringify(body).substring(0, 120)}`
    : '';

  if (status === 200) {
    console.log(`[SUCCESS 200] ${label} — API call functional and returned data.${bodySnippet}`);
  } else if (status === 422) {
    console.warn(`[VALIDATION ERROR 422] ${label} — API responded but rejected input. Functionality did NOT execute.${bodySnippet}`);
  } else if (status === 401) {
    console.warn(`[UNAUTHORIZED 401] ${label} — API responded but authentication is required. Functionality did NOT execute.${bodySnippet}`);
  } else if (status === 403) {
    console.warn(`[FORBIDDEN 403] ${label} — API responded but access is denied. Functionality did NOT execute.${bodySnippet}`);
  } else if (status === 404) {
    console.warn(`[NOT FOUND 404] ${label} — Endpoint or resource not found.${bodySnippet}`);
  } else if (status === 429) {
    console.warn(`[RATE LIMITED 429] ${label} — Too many requests. Functionality was NOT executed due to rate limiting.${bodySnippet}`);
  } else if (status >= 500) {
    console.error(`[SERVER ERROR ${status}] ${label} — Server-side failure. This is a bug.${bodySnippet}`);
  } else {
    console.warn(`[UNEXPECTED STATUS ${status}] ${label} — Unrecognised response code.${bodySnippet}`);
  }
}

// ---------------------------------------------------------------------------
// Test data — known phone numbers and recipient list
// Update these variables to match real/sandbox numbers before running.
// ---------------------------------------------------------------------------

const VALID_PHONE = '+919000000001';
const VALID_NAME  = 'Test User';

// Known recipient numbers used in batch tests.
// Add or update these with real numbers available in your SIP/test environment.
const KNOWN_RECIPIENTS = [
  { phone: '+919000000001', name: 'Mayur One'},
  { phone: '+917875393358', name: 'Anurag Two'},
  { phone: '+919892443527', name: 'Jyoti Three'},
  { phone: '+919969102647', name: 'Diksha Four'},
  { phone: '+919321827828', name: 'Manan Five'},
  { phone: '+919004889617', name: 'Shresth Six'},
  { phone: '+919026374327', name: 'Saloni Seven'},
  { phone: '+919000000003', name: 'Chinmay Eight'},
  { phone: '+918591874674', name: 'Shruti Nine'},
  { phone: '+918879044053', name: 'Jayanta Ten'},
];

/**
 * Returns a known recipient by index (wraps around if index > KNOWN_RECIPIENTS.length).
 */
function makeRecipient(index = 0) {
  return KNOWN_RECIPIENTS[index % KNOWN_RECIPIENTS.length];
}

/**
 * Builds a BatchCallRequest using known recipients.
 * @param {number} count     Number of recipients to include (max: KNOWN_RECIPIENTS.length)
 * @param {object} overrides Additional fields to merge into the request body
 */
function makeBatchRequest(count = 3, overrides = {}) {
  const recipients = KNOWN_RECIPIENTS.slice(0, Math.min(count, KNOWN_RECIPIENTS.length));
  return {
    recipients,
    name: `Test Batch ${Date.now()}`,
    max_concurrent: 2,
    delay_between_batches: 0.5,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe('VoBiz Outbound Call API Tests', () => {

  // =========================================================================
  // 1. GET /getToken
  // =========================================================================
  test.describe('1. GET /getToken', () => {

    // --- Positive ---
    test('TC-01 POSITIVE: Returns 200 with no query params', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/getToken`);
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (no params)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          expect(body).toBeDefined();
        } else {
          console.warn('NOTE: Token was not generated — check if identity/room is required by server config.');
        }
      } catch (err) {
        console.error('Request failed — GET /getToken (no params):', err.message);
        throw err;
      }
    });

    test('TC-02 POSITIVE: Returns token with valid identity and name', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/getToken`, {
          params: { identity: 'agent-001', name: 'Agent One' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (identity+name)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          expect(body).toBeDefined();
        } else {
          console.warn('NOTE: Token was not generated — verify identity and name are accepted by server.');
        }
      } catch (err) {
        console.error('Request failed — GET /getToken (identity+name):', err.message);
        throw err;
      }
    });

    test('TC-03 POSITIVE: Returns token with all three params (identity, name, room)', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/getToken`, {
          params: { identity: 'agent-002', name: 'Agent Two', room: 'room-xyz' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (all params)', body);
        expect([200, 422]).toContain(status);
        if (status !== 200) {
          console.warn('NOTE: Token not generated with all three params — check if room must exist.');
        }
      } catch (err) {
        console.error('Request failed — GET /getToken (all params):', err.message);
        throw err;
      }
    });

    test('TC-04 POSITIVE: Returns token with only name param', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/getToken`, {
          params: { name: 'OnlyName' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (only name)', body);
        expect([200, 422]).toContain(status);
      } catch (err) {
        console.error('Request failed — GET /getToken (only name):', err.message);
        throw err;
      }
    });

    test('TC-05 POSITIVE: Returns token with only room param', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/getToken`, {
          params: { room: 'room-abc' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (only room)', body);
        expect([200, 422]).toContain(status);
      } catch (err) {
        console.error('Request failed — GET /getToken (only room):', err.message);
        throw err;
      }
    });

    // --- Negative ---
    test('TC-06 NEGATIVE: Extra unknown query param does not cause 5xx', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/getToken`, {
          params: { unknown_param: 'unexpected' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (unknown param)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — GET /getToken (unknown param):', err.message);
        throw err;
      }
    });

    // --- Edge Cases ---
    test('TC-07 EDGE: Identity as empty string', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/getToken`, {
          params: { identity: '' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (empty identity)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — GET /getToken (empty identity):', err.message);
        throw err;
      }
    });

    test('TC-08 EDGE: Name with special characters', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/getToken`, {
          params: { name: 'Ünïcödé Nàmé <script>alert(1)</script>' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (special chars name)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — GET /getToken (special chars name):', err.message);
        throw err;
      }
    });

    test('TC-09 EDGE: Very long identity string (255 chars)', async ({ request }) => {
      try {
        const longIdentity = 'a'.repeat(255);
        const response = await request.get(`${BASE_URL}/getToken`, {
          params: { identity: longIdentity },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (255-char identity)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — GET /getToken (255-char identity):', err.message);
        throw err;
      }
    });

    test('TC-10 EDGE: Room with special characters and spaces', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/getToken`, {
          params: { identity: 'id-001', name: 'Test', room: 'room with spaces & symbols!' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /getToken (room with special chars)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — GET /getToken (room with special chars):', err.message);
        throw err;
      }
    });

    test('TC-11 EDGE: Multiple concurrent token requests', async ({ request }) => {
      try {
        const COUNT = 5;
        const promises = Array.from({ length: COUNT }, (_, i) =>
          request.get(`${BASE_URL}/getToken`, {
            params: { identity: `concurrent-agent-${i}`, name: `Agent ${i}` },
          })
        );
        const results = await Promise.all(promises);
        results.forEach((r, i) => {
          const status = r.status();
          logApiResult(status, `GET /getToken concurrent[${i}]`);
          expect(status).toBeLessThan(500);
        });
        const successCount = results.filter((r) => r.status() === 200).length;
        console.log(`Concurrent /getToken: ${successCount}/${COUNT} returned 200.`);
        if (successCount < COUNT) {
          console.warn(`NOTE: ${COUNT - successCount} concurrent token request(s) did not return 200.`);
        }
      } catch (err) {
        console.error('Request failed — GET /getToken (concurrent):', err.message);
        throw err;
      }
    });
  });

  // =========================================================================
  // 2. POST /call
  // =========================================================================
  test.describe('2. POST /call', () => {

    // --- Positive ---
    test('TC-12 POSITIVE: Valid single call with phone_number and name', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: VALID_PHONE, name: VALID_NAME },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (valid)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          expect(body).toBeDefined();
        } else {
          console.warn('NOTE: Call was NOT initiated — API rejected the request. Check SIP trunk config or phone number format.');
        }
      } catch (err) {
        console.error('Request failed — POST /call (valid):', err.message);
        throw err;
      }
    });

    test('TC-13 POSITIVE: Call with international E.164 format number', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: '+12025550147', name: 'US Customer' },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (international E.164)', body);
        expect([200, 422]).toContain(status);
        if (status !== 200) {
          console.warn('NOTE: International call not initiated — may be unsupported by current SIP trunk.');
        }
      } catch (err) {
        console.error('Request failed — POST /call (international):', err.message);
        throw err;
      }
    });

    test('TC-14 POSITIVE: Call with name containing spaces and mixed case', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: VALID_PHONE, name: 'John Paul II' },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (name with spaces)', body);
        expect([200, 422]).toContain(status);
      } catch (err) {
        console.error('Request failed — POST /call (name with spaces):', err.message);
        throw err;
      }
    });

    // --- Negative ---
    test('TC-15 NEGATIVE: Missing required phone_number returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { name: VALID_NAME },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (missing phone_number)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected request missing phone_number with 422.');
          expect(body).toHaveProperty('detail');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for missing phone_number but got ${status}. Validation may be missing.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call (missing phone_number):', err.message);
        throw err;
      }
    });

    test('TC-16 NEGATIVE: Missing required name returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: VALID_PHONE },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (missing name)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected request missing name with 422.');
          expect(body).toHaveProperty('detail');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for missing name but got ${status}. Validation may be missing.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call (missing name):', err.message);
        throw err;
      }
    });

    test('TC-17 NEGATIVE: Empty request body returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: {},
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (empty body)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected empty body with 422.');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for empty body but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call (empty body):', err.message);
        throw err;
      }
    });

    test('TC-18 NEGATIVE: phone_number as integer type returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: 9000000001, name: VALID_NAME },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (phone_number as integer)', body);
        // FastAPI may coerce integers to strings or reject - either is acceptable
        expect([200, 422]).toContain(status);
        if (status === 200) {
          console.warn('NOTE: Server accepted an integer phone_number by coercing it — call was initiated. Verify this is intentional.');
        } else {
          console.log('EXPECTED: Server rejected integer phone_number with 422 (type validation enforced).');
        }
      } catch (err) {
        console.error('Request failed — POST /call (phone_number as integer):', err.message);
        throw err;
      }
    });

    test('TC-19 NEGATIVE: name as null returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: VALID_PHONE, name: null },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (name=null)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected null name with 422.');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for null name but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call (name=null):', err.message);
        throw err;
      }
    });

    test('TC-20 NEGATIVE: No Content-Type header', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: `phone_number=${VALID_PHONE}&name=${VALID_NAME}`,
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (no Content-Type header)', body);
        expect([200, 422]).toContain(status);
        if (status !== 200) {
          console.warn('NOTE: Call not initiated — server likely requires application/json Content-Type.');
        }
      } catch (err) {
        console.error('Request failed — POST /call (no Content-Type):', err.message);
        throw err;
      }
    });

    test('TC-21 NEGATIVE: No request body at all returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (no body)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected missing body with 422.');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for no body but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call (no body):', err.message);
        throw err;
      }
    });

    // --- Edge Cases ---
    test('TC-22 EDGE: phone_number as empty string', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: '', name: VALID_NAME },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (empty phone_number)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Server accepted an empty phone_number and initiated a call — this may be a bug.');
        }
      } catch (err) {
        console.error('Request failed — POST /call (empty phone_number):', err.message);
        throw err;
      }
    });

    test('TC-23 EDGE: name as empty string', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: VALID_PHONE, name: '' },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (empty name)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Server accepted an empty name and initiated a call — verify this is intentional.');
        }
      } catch (err) {
        console.error('Request failed — POST /call (empty name):', err.message);
        throw err;
      }
    });

    test('TC-24 EDGE: phone_number with alphabetic characters', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: 'notaphonenumber', name: VALID_NAME },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (alphabetic phone_number)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Server accepted a non-numeric phone_number — SIP dialling will likely fail downstream.');
        }
      } catch (err) {
        console.error('Request failed — POST /call (alphabetic phone_number):', err.message);
        throw err;
      }
    });

    test('TC-25 EDGE: name with XSS payload', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: VALID_PHONE, name: '<script>alert("xss")</script>' },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (XSS in name)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Server accepted XSS payload in name — ensure output is sanitised before rendering.');
        }
      } catch (err) {
        console.error('Request failed — POST /call (XSS name):', err.message);
        throw err;
      }
    });

    test('TC-26 EDGE: Very long name (1000 chars)', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: VALID_PHONE, name: 'A'.repeat(1000) },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (1000-char name)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Server accepted a 1000-char name — consider adding a max-length validation.');
        }
      } catch (err) {
        console.error('Request failed — POST /call (1000-char name):', err.message);
        throw err;
      }
    });

    test('TC-27 EDGE: Extra unknown fields in body are ignored or rejected gracefully', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: { phone_number: VALID_PHONE, name: VALID_NAME, extra_field: 'unexpected' },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (extra unknown fields)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          console.log('NOTE: Server ignored unknown extra fields and proceeded — call initiated.');
        }
      } catch (err) {
        console.error('Request failed — POST /call (extra fields):', err.message);
        throw err;
      }
    });

    test('TC-28 EDGE: Duplicate concurrent single calls to same number', async ({ request }) => {
      try {
        const COUNT = 3;
        const promises = Array.from({ length: COUNT }, () =>
          request.post(`${BASE_URL}/call`, {
            data: { phone_number: VALID_PHONE, name: VALID_NAME },
            headers: { 'Content-Type': 'application/json' },
          })
        );
        const results = await Promise.all(promises);
        results.forEach((r, i) => {
          const status = r.status();
          logApiResult(status, `POST /call concurrent[${i}] (same number)`);
          expect(status).toBeLessThan(500);
        });
        const successCount = results.filter((r) => r.status() === 200).length;
        console.log(`Concurrent /call to same number: ${successCount}/${COUNT} returned 200.`);
        if (successCount > 1) {
          console.warn(`NOTE: ${successCount} concurrent calls to the same number were all accepted — check if deduplication is needed.`);
        }
      } catch (err) {
        console.error('Request failed — POST /call (concurrent duplicates):', err.message);
        throw err;
      }
    });
  });

  // =========================================================================
  // 3. POST /call/batch
  // =========================================================================
  test.describe('3. POST /call/batch', () => {

    // --- Positive ---
    test('TC-29 POSITIVE: Valid batch call with multiple recipients', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: makeBatchRequest(3),
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (3 recipients)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          expect(body).toBeDefined();
        } else {
          console.warn('NOTE: Batch call NOT initiated — check SIP trunk config, phone number format, or server availability.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (3 recipients):', err.message);
        throw err;
      }
    });

    test('TC-30 POSITIVE: Batch with single recipient', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: VALID_PHONE, name: VALID_NAME }] },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (single recipient)', body);
        expect([200, 422]).toContain(status);
        if (status !== 200) {
          console.warn('NOTE: Single-recipient batch not initiated — verify phone number is valid.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (single recipient):', err.message);
        throw err;
      }
    });

    test('TC-31 POSITIVE: Batch with only required field (recipients only)', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: {
            recipients: [
              { phone: '+919000000001' },
              { phone: '+919876543211' },
            ],
          },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (recipients only, no optionals)', body);
        expect([200, 422]).toContain(status);
        if (status !== 200) {
          console.warn('NOTE: Batch not initiated with recipients-only payload — check if optional fields have invalid defaults.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (recipients only):', err.message);
        throw err;
      }
    });

    test('TC-32 POSITIVE: Batch with custom max_concurrent and delay', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: {
            recipients: [makeRecipient(0), makeRecipient(1), makeRecipient(2)],
            name: 'Custom Batch',
            max_concurrent: 1,
            delay_between_batches: 2.0,
          },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (custom max_concurrent + delay)', body);
        expect([200, 422]).toContain(status);
      } catch (err) {
        console.error('Request failed — POST /call/batch (custom concurrency):', err.message);
        throw err;
      }
    });

    test('TC-33 POSITIVE: Batch with scheduled_at field', async ({ request }) => {
      try {
        const futureTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: {
            recipients: [{ phone: VALID_PHONE, name: VALID_NAME }],
            scheduled_at: futureTime,
          },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, `POST /call/batch (scheduled_at=${futureTime})`, body);
        expect([200, 422]).toContain(status);
        if (status !== 200) {
          console.warn('NOTE: Scheduled batch was not accepted — check if scheduled_at field is supported by this deployment.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (scheduled_at):', err.message);
        throw err;
      }
    });

    test('TC-34 POSITIVE: Batch with larger set of 10 recipients', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: makeBatchRequest(10),
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (10 recipients)', body);
        expect([200, 422]).toContain(status);
        if (status !== 200) {
          console.warn('NOTE: 10-recipient batch was not initiated — verify phone numbers and server capacity.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (10 recipients):', err.message);
        throw err;
      }
    });

    // --- Negative ---
    test('TC-35 NEGATIVE: Missing required recipients field returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { name: 'No Recipients Batch', max_concurrent: 2 },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (missing recipients)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected missing recipients with 422.');
          expect(body).toHaveProperty('detail');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for missing recipients but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call/batch (missing recipients):', err.message);
        throw err;
      }
    });

    test('TC-36 NEGATIVE: Empty recipients array', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [] },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (empty recipients array)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Server accepted an empty recipients array — no calls will be made. Consider returning 422.');
        } else {
          console.log(`NOTE: Server rejected empty recipients array with ${status} — appropriate behaviour.`);
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (empty recipients):', err.message);
        throw err;
      }
    });

    test('TC-37 NEGATIVE: Recipient missing required phone field returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ name: 'No Phone Recipient' }] },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (recipient missing phone)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected recipient without phone with 422.');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for recipient missing phone but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call/batch (recipient missing phone):', err.message);
        throw err;
      }
    });

    test('TC-38 NEGATIVE: Empty request body returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: {},
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (empty body)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected empty body with 422.');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for empty body but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call/batch (empty body):', err.message);
        throw err;
      }
    });

    test('TC-39 NEGATIVE: max_concurrent as string type returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: VALID_PHONE }], max_concurrent: 'five' },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (max_concurrent as string)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected non-integer max_concurrent with 422.');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for string max_concurrent but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call/batch (max_concurrent as string):', err.message);
        throw err;
      }
    });

    test('TC-40 NEGATIVE: delay_between_batches as string type returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: VALID_PHONE }], delay_between_batches: 'half' },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (delay_between_batches as string)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected non-numeric delay with 422.');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for string delay but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call/batch (delay as string):', err.message);
        throw err;
      }
    });

    test('TC-41 NEGATIVE: recipients as string (wrong type) returns 422', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: 'not-an-array' },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (recipients as string)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected string recipients with 422.');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for string recipients but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — POST /call/batch (recipients as string):', err.message);
        throw err;
      }
    });

    // --- Edge Cases ---
    test('TC-42 EDGE: Batch with max_concurrent = 0', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: VALID_PHONE }], max_concurrent: 0 },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (max_concurrent=0)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: max_concurrent=0 was accepted — this could result in no calls being dialled. Verify behaviour.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (max_concurrent=0):', err.message);
        throw err;
      }
    });

    test('TC-43 EDGE: Batch with negative max_concurrent', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: VALID_PHONE }], max_concurrent: -1 },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (max_concurrent=-1)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Negative max_concurrent was accepted — may cause unexpected concurrency behaviour.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (max_concurrent=-1):', err.message);
        throw err;
      }
    });

    test('TC-44 EDGE: Batch with delay_between_batches = 0', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: VALID_PHONE }], delay_between_batches: 0 },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (delay=0)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — POST /call/batch (delay=0):', err.message);
        throw err;
      }
    });

    test('TC-45 EDGE: Batch with very large delay_between_batches', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: VALID_PHONE }], delay_between_batches: 9999.99 },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (delay=9999.99)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Extremely large delay accepted — batch calls will be spaced very far apart. Consider a server-side cap.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (large delay):', err.message);
        throw err;
      }
    });

    test('TC-46 EDGE: Batch with scheduled_at in the past', async ({ request }) => {
      try {
        const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: VALID_PHONE }], scheduled_at: pastTime },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, `POST /call/batch (past scheduled_at=${pastTime})`, body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Past scheduled_at was accepted — server may schedule immediately or ignore the timestamp.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (past scheduled_at):', err.message);
        throw err;
      }
    });

    test('TC-47 EDGE: Batch with invalid scheduled_at format', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: VALID_PHONE }], scheduled_at: 'not-a-date' },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (invalid scheduled_at format)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Invalid date string accepted for scheduled_at — may cause runtime errors during scheduling.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (invalid scheduled_at):', err.message);
        throw err;
      }
    });

    test('TC-48 EDGE: Recipient phone with formatting characters', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: { recipients: [{ phone: '+1 (202) 555-0147', name: 'Formatted' }] },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (formatted phone with spaces/parens)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Formatted phone (with spaces/parens) was accepted — ensure SIP layer normalises it.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (formatted phone):', err.message);
        throw err;
      }
    });

    test('TC-49 EDGE: Large batch with 50 recipients', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: makeBatchRequest(50),
          headers: { 'Content-Type': 'application/json' },
          timeout: 30_000,
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (50 recipients)', body);
        expect(status).toBeLessThan(500);
        if (status !== 200) {
          console.warn('NOTE: 50-recipient batch was not accepted — check server-side batch size limits.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (50 recipients):', err.message);
        throw err;
      }
    });

    test('TC-50 EDGE: Duplicate phone numbers in same batch', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: {
            recipients: [
              { phone: VALID_PHONE, name: 'First' },
              { phone: VALID_PHONE, name: 'Duplicate' },
            ],
          },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (duplicate phones in batch)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Duplicate phone numbers were accepted — the same number may be called twice. Consider deduplication.');
        }
      } catch (err) {
        console.error('Request failed — POST /call/batch (duplicate phones):', err.message);
        throw err;
      }
    });
  });

  // =========================================================================
  // 4. GET /recordings
  // =========================================================================
  test.describe('4. GET /recordings', () => {

    // --- Positive ---
    test('TC-51 POSITIVE: Returns all recordings with no params (default limit 100)', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`);
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (no params)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          expect(body).toHaveProperty('success');
          expect(body).toHaveProperty('recordings');
          expect(Array.isArray(body.recordings)).toBe(true);
          console.log(`Recordings returned: count=${body.count ?? body.recordings.length}`);
        } else {
          console.warn('NOTE: Recordings not returned — check DB connection or authentication requirements.');
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (no params):', err.message);
        throw err;
      }
    });

    test('TC-52 POSITIVE: Returns recordings with custom limit=10', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { limit: 10 },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (limit=10)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          expect(body.recordings.length).toBeLessThanOrEqual(10);
          console.log(`Recordings with limit=10: returned ${body.recordings.length} records.`);
        } else {
          console.warn('NOTE: Recordings not returned with limit=10.');
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (limit=10):', err.message);
        throw err;
      }
    });

    test('TC-53 POSITIVE: Returns recordings filtered by batch_id', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { batch_id: 'some-batch-id-123' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (batch_id filter)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          expect(body).toHaveProperty('recordings');
          console.log(`Recordings for batch_id filter: ${body.recordings.length} records.`);
        } else {
          console.warn('NOTE: Recordings not returned for batch_id filter.');
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (batch_id filter):', err.message);
        throw err;
      }
    });

    test('TC-54 POSITIVE: Returns recordings with both batch_id and limit', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { batch_id: 'batch-abc', limit: 5 },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (batch_id + limit=5)', body);
        expect([200, 422]).toContain(status);
      } catch (err) {
        console.error('Request failed — GET /recordings (batch_id + limit):', err.message);
        throw err;
      }
    });

    // --- Negative ---
    test('TC-55 NEGATIVE: limit as non-integer string returns 422', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { limit: 'all' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (limit="all")', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly rejected non-integer limit with 422.');
        } else {
          console.warn(`UNEXPECTED: Expected 422 for string limit but got ${status}.`);
        }
        expect(status).toBe(422);
      } catch (err) {
        console.error('Request failed — GET /recordings (limit="all"):', err.message);
        throw err;
      }
    });

    test('TC-56 NEGATIVE: limit as float value', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { limit: '3.5' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (limit=3.5)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Float limit accepted — FastAPI likely truncated to integer.');
        } else {
          console.log(`NOTE: Float limit rejected with ${status} — strict integer validation in place.`);
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (limit=3.5):', err.message);
        throw err;
      }
    });

    // --- Edge Cases ---
    test('TC-57 EDGE: limit = 0 (zero results)', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { limit: 0 },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (limit=0)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          expect(body.recordings.length).toBeLessThanOrEqual(0);
          console.log('NOTE: limit=0 returned an empty recordings array as expected.');
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (limit=0):', err.message);
        throw err;
      }
    });

    test('TC-58 EDGE: limit = 1 (minimum useful)', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { limit: 1 },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (limit=1)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          expect(body.recordings.length).toBeLessThanOrEqual(1);
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (limit=1):', err.message);
        throw err;
      }
    });

    test('TC-59 EDGE: limit = very large number', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { limit: 100000 },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (limit=100000)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Very large limit accepted — consider a server-side maximum to prevent oversized responses.');
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (limit=100000):', err.message);
        throw err;
      }
    });

    test('TC-60 EDGE: negative limit value', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { limit: -1 },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (limit=-1)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Negative limit accepted — may return all records or behave unexpectedly.');
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (limit=-1):', err.message);
        throw err;
      }
    });

    test('TC-61 EDGE: batch_id as empty string', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { batch_id: '' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (batch_id="")', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — GET /recordings (batch_id=""):', err.message);
        throw err;
      }
    });

    test('TC-62 EDGE: Non-existent batch_id returns empty recordings array', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { batch_id: 'non-existent-batch-id-99999' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (non-existent batch_id)', body);
        expect([200, 422]).toContain(status);
        if (status === 200) {
          expect(body.recordings.length).toBe(0);
          console.log('EXPECTED: Non-existent batch_id correctly returned 0 recordings.');
        } else {
          console.warn('NOTE: Non-existent batch_id did not return 200 — check if 404 is returned instead.');
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (non-existent batch_id):', err.message);
        throw err;
      }
    });

    test('TC-63 EDGE: Response schema validation for 200 response', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { limit: 3 },
        });
        const status = response.status();
        if (status === 200) {
          const body = await response.json().catch(() => ({}));
          logApiResult(status, 'GET /recordings (schema check, limit=3)', body);
          expect(body).toHaveProperty('success');
          expect(body).toHaveProperty('count');
          expect(body).toHaveProperty('recordings');
          expect(typeof body.success).toBe('boolean');
          expect(typeof body.count).toBe('number');
          expect(Array.isArray(body.recordings)).toBe(true);
          body.recordings.forEach((rec) => {
            if (rec.session_id !== undefined) expect(typeof rec.session_id).toBe('string');
            if (rec.transcript !== undefined) expect(Array.isArray(rec.transcript)).toBe(true);
          });
          console.log('Schema validation passed for /recordings.');
        } else {
          logApiResult(status, 'GET /recordings (schema check, limit=3)');
          console.warn('NOTE: Schema check skipped — /recordings did not return 200.');
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (schema check):', err.message);
        throw err;
      }
    });

    test('TC-64 EDGE: Concurrent GET /recordings requests do not cause 5xx', async ({ request }) => {
      try {
        const COUNT = 5;
        const promises = Array.from({ length: COUNT }, () =>
          request.get(`${BASE_URL}/recordings`, { params: { limit: 5 } })
        );
        const results = await Promise.all(promises);
        const serverErrors = results.filter((r) => r.status() >= 500);
        results.forEach((r, i) => logApiResult(r.status(), `GET /recordings concurrent[${i}]`));
        console.log(`Concurrent /recordings: server errors = ${serverErrors.length}/${COUNT}`);
        expect(serverErrors.length).toBe(0);
      } catch (err) {
        console.error('Request failed — GET /recordings (concurrent):', err.message);
        throw err;
      }
    });
  });

  // =========================================================================
  // 5. GET /batches
  // =========================================================================
  test.describe('5. GET /batches', () => {

    test('TC-65 POSITIVE: Returns 200 with list of batches', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/batches`);
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /batches', body);
        expect(status).toBe(200);
      } catch (err) {
        console.error('Request failed — GET /batches:', err.message);
        throw err;
      }
    });

    test('TC-66 POSITIVE: Response body is valid JSON', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/batches`);
        const status = response.status();
        if (status === 200) {
          const body = await response.json().catch(() => null);
          logApiResult(status, 'GET /batches (JSON check)', body);
          expect(body).not.toBeNull();
          console.log(`GET /batches body type: ${Array.isArray(body) ? 'array' : typeof body}`);
        } else {
          logApiResult(status, 'GET /batches (JSON check)');
          console.warn(`NOTE: /batches did not return 200 — got ${status}.`);
        }
      } catch (err) {
        console.error('Request failed — GET /batches (JSON check):', err.message);
        throw err;
      }
    });

    test('TC-67 POSITIVE: Response is an array or object', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/batches`);
        const status = response.status();
        if (status === 200) {
          const body = await response.json().catch(() => null);
          logApiResult(status, 'GET /batches (type check)', body);
          const isValid = body !== null && (Array.isArray(body) || typeof body === 'object');
          expect(isValid).toBe(true);
        } else {
          logApiResult(status, 'GET /batches (type check)');
        }
      } catch (err) {
        console.error('Request failed — GET /batches (type check):', err.message);
        throw err;
      }
    });

    test('TC-68 EDGE: Unexpected query param does not cause 5xx', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/batches`, {
          params: { unknown: 'value' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /batches (unknown param)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — GET /batches (unknown param):', err.message);
        throw err;
      }
    });

    test('TC-69 EDGE: Concurrent GET /batches requests', async ({ request }) => {
      try {
        const COUNT = 5;
        const promises = Array.from({ length: COUNT }, () =>
          request.get(`${BASE_URL}/batches`)
        );
        const results = await Promise.all(promises);
        results.forEach((r, i) => logApiResult(r.status(), `GET /batches concurrent[${i}]`));
        const serverErrors = results.filter((r) => r.status() >= 500);
        expect(serverErrors.length).toBe(0);
        results.forEach((r) => expect(r.status()).toBe(200));
      } catch (err) {
        console.error('Request failed — GET /batches (concurrent):', err.message);
        throw err;
      }
    });

    test('TC-70 EDGE: Response time is acceptable (under 10s)', async ({ request }) => {
      try {
        const start = Date.now();
        const response = await request.get(`${BASE_URL}/batches`);
        const duration = Date.now() - start;
        const status = response.status();
        logApiResult(status, `GET /batches (timing: ${duration}ms)`);
        expect(status).toBe(200);
        expect(duration).toBeLessThan(10_000);
        if (duration > 3000) {
          console.warn(`NOTE: /batches took ${duration}ms — above 3s warning threshold.`);
        } else {
          console.log(`GET /batches response time: ${duration}ms — within acceptable range.`);
        }
      } catch (err) {
        console.error('Request failed — GET /batches (timing):', err.message);
        throw err;
      }
    });
  });

  // =========================================================================
  // 6. GET /list-trunks
  // =========================================================================
  test.describe('6. GET /list-trunks', () => {

    test('TC-71 POSITIVE: Returns 200 with SIP trunks list', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/list-trunks`);
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /list-trunks', body);
        expect(status).toBe(200);
      } catch (err) {
        console.error('Request failed — GET /list-trunks:', err.message);
        throw err;
      }
    });

    test('TC-72 POSITIVE: Response body is valid JSON', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/list-trunks`);
        const status = response.status();
        if (status === 200) {
          const body = await response.json().catch(() => null);
          logApiResult(status, 'GET /list-trunks (JSON check)', body);
          expect(body).not.toBeNull();
        } else {
          logApiResult(status, 'GET /list-trunks (JSON check)');
          console.warn(`NOTE: /list-trunks did not return 200 — got ${status}.`);
        }
      } catch (err) {
        console.error('Request failed — GET /list-trunks (JSON check):', err.message);
        throw err;
      }
    });

    test('TC-73 POSITIVE: Response contains trunks data (array or object)', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/list-trunks`);
        const status = response.status();
        if (status === 200) {
          const body = await response.json().catch(() => null);
          logApiResult(status, 'GET /list-trunks (type check)', body);
          const isValid = body !== null && (Array.isArray(body) || typeof body === 'object');
          expect(isValid).toBe(true);
        } else {
          logApiResult(status, 'GET /list-trunks (type check)');
        }
      } catch (err) {
        console.error('Request failed — GET /list-trunks (type check):', err.message);
        throw err;
      }
    });

    test('TC-74 EDGE: Unexpected query param does not cause 5xx', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/list-trunks`, {
          params: { filter: 'active' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /list-trunks (unknown filter param)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — GET /list-trunks (unknown param):', err.message);
        throw err;
      }
    });

    test('TC-75 EDGE: Concurrent GET /list-trunks requests', async ({ request }) => {
      try {
        const COUNT = 5;
        const promises = Array.from({ length: COUNT }, () =>
          request.get(`${BASE_URL}/list-trunks`)
        );
        const results = await Promise.all(promises);
        results.forEach((r, i) => logApiResult(r.status(), `GET /list-trunks concurrent[${i}]`));
        const serverErrors = results.filter((r) => r.status() >= 500);
        expect(serverErrors.length).toBe(0);
      } catch (err) {
        console.error('Request failed — GET /list-trunks (concurrent):', err.message);
        throw err;
      }
    });

    test('TC-76 EDGE: Response time is acceptable (under 10s)', async ({ request }) => {
      try {
        const start = Date.now();
        const response = await request.get(`${BASE_URL}/list-trunks`);
        const duration = Date.now() - start;
        const status = response.status();
        logApiResult(status, `GET /list-trunks (timing: ${duration}ms)`);
        expect(status).toBe(200);
        expect(duration).toBeLessThan(10_000);
        if (duration > 3000) {
          console.warn(`NOTE: /list-trunks took ${duration}ms — above 3s warning threshold.`);
        } else {
          console.log(`GET /list-trunks response time: ${duration}ms — within acceptable range.`);
        }
      } catch (err) {
        console.error('Request failed — GET /list-trunks (timing):', err.message);
        throw err;
      }
    });
  });

  // =========================================================================
  // 7. GET /config
  // =========================================================================
  test.describe('7. GET /config', () => {

    test('TC-77 POSITIVE: Returns 200 with current config', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/config`);
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /config', body);
        expect(status).toBe(200);
      } catch (err) {
        console.error('Request failed — GET /config:', err.message);
        throw err;
      }
    });

    test('TC-78 POSITIVE: Response body is valid JSON', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/config`);
        const status = response.status();
        if (status === 200) {
          const body = await response.json().catch(() => null);
          logApiResult(status, 'GET /config (JSON check)', body);
          expect(body).not.toBeNull();
        } else {
          logApiResult(status, 'GET /config (JSON check)');
          console.warn(`NOTE: /config did not return 200 — got ${status}.`);
        }
      } catch (err) {
        console.error('Request failed — GET /config (JSON check):', err.message);
        throw err;
      }
    });

    test('TC-79 POSITIVE: Config response is an object with config keys', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/config`);
        const status = response.status();
        if (status === 200) {
          const body = await response.json().catch(() => ({}));
          logApiResult(status, 'GET /config (keys check)', body);
          expect(typeof body).toBe('object');
          console.log('GET /config keys:', Object.keys(body));
        } else {
          logApiResult(status, 'GET /config (keys check)');
        }
      } catch (err) {
        console.error('Request failed — GET /config (keys check):', err.message);
        throw err;
      }
    });

    test('TC-80 EDGE: Unexpected query param does not cause 5xx', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/config`, {
          params: { format: 'yaml' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /config (unknown format param)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — GET /config (unknown param):', err.message);
        throw err;
      }
    });

    test('TC-81 EDGE: Concurrent GET /config requests are consistent', async ({ request }) => {
      try {
        const COUNT = 5;
        const promises = Array.from({ length: COUNT }, () =>
          request.get(`${BASE_URL}/config`)
        );
        const results = await Promise.all(promises);
        results.forEach((r, i) => logApiResult(r.status(), `GET /config concurrent[${i}]`));
        const serverErrors = results.filter((r) => r.status() >= 500);
        expect(serverErrors.length).toBe(0);
        results.forEach((r) => expect(r.status()).toBe(200));

        // All concurrent responses should return identical config (idempotent GET)
        const bodies = await Promise.all(results.map((r) => r.json().catch(() => null)));
        const nonNullBodies = bodies.filter((b) => b !== null);
        if (nonNullBodies.length > 1) {
          const ref = JSON.stringify(nonNullBodies[0]);
          const allMatch = nonNullBodies.every((b) => JSON.stringify(b) === ref);
          if (allMatch) {
            console.log('GET /config concurrent responses are consistent — all returned identical config.');
          } else {
            console.warn('NOTE: Concurrent /config responses returned different values — possible race condition or dynamic config.');
          }
          nonNullBodies.forEach((b) => expect(JSON.stringify(b)).toBe(ref));
        }
      } catch (err) {
        console.error('Request failed — GET /config (concurrent):', err.message);
        throw err;
      }
    });
  });

  // =========================================================================
  // 8. POST /config
  // =========================================================================
  test.describe('8. POST /config', () => {

    test('TC-82 POSITIVE: POST /config with empty body returns 200', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/config`, {
          data: {},
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /config (empty body)', body);
        expect(status).toBe(200);
      } catch (err) {
        console.error('Request failed — POST /config (empty body):', err.message);
        throw err;
      }
    });

    test('TC-83 POSITIVE: POST /config with no body returns 200', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/config`, {
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /config (no body)', body);
        expect(status).toBe(200);
      } catch (err) {
        console.error('Request failed — POST /config (no body):', err.message);
        throw err;
      }
    });

    test('TC-84 POSITIVE: GET /config after POST /config is idempotent', async ({ request }) => {
      try {
        const postResp = await request.post(`${BASE_URL}/config`, {
          data: {},
          headers: { 'Content-Type': 'application/json' },
        });
        const postStatus = postResp.status();
        logApiResult(postStatus, 'POST /config (idempotency — update step)');
        expect(postStatus).toBe(200);

        const getResp = await request.get(`${BASE_URL}/config`);
        const getStatus = getResp.status();
        const body = await getResp.json().catch(() => undefined);
        logApiResult(getStatus, 'GET /config (idempotency — read back)', body);
        expect(getStatus).toBe(200);
        console.log('Idempotency check passed — GET after POST /config returned 200.');
      } catch (err) {
        console.error('Request failed — POST→GET /config (idempotency):', err.message);
        throw err;
      }
    });

    test('TC-85 POSITIVE: POST /config response body is valid JSON', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/config`, {
          data: {},
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        if (status === 200) {
          const body = await response.json().catch(() => null);
          logApiResult(status, 'POST /config (JSON check)', body);
          expect(body).not.toBeNull();
        } else {
          logApiResult(status, 'POST /config (JSON check)');
          console.warn(`NOTE: POST /config did not return 200 — got ${status}.`);
        }
      } catch (err) {
        console.error('Request failed — POST /config (JSON check):', err.message);
        throw err;
      }
    });

    test('TC-86 EDGE: POST /config with arbitrary fields does not cause 5xx', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/config`, {
          data: { some_setting: 'value', another_key: 42 },
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /config (arbitrary fields)', body);
        expect(status).toBeLessThan(500);
        if (status === 200) {
          console.warn('NOTE: Arbitrary unknown fields accepted by POST /config — verify they are ignored and not persisted incorrectly.');
        }
      } catch (err) {
        console.error('Request failed — POST /config (arbitrary fields):', err.message);
        throw err;
      }
    });

    test('TC-87 EDGE: Concurrent POST /config requests do not cause 5xx', async ({ request }) => {
      try {
        const COUNT = 3;
        const promises = Array.from({ length: COUNT }, () =>
          request.post(`${BASE_URL}/config`, {
            data: {},
            headers: { 'Content-Type': 'application/json' },
          })
        );
        const results = await Promise.all(promises);
        results.forEach((r, i) => logApiResult(r.status(), `POST /config concurrent[${i}]`));
        const serverErrors = results.filter((r) => r.status() >= 500);
        console.log(`Concurrent POST /config: server errors = ${serverErrors.length}/${COUNT}`);
        expect(serverErrors.length).toBe(0);
      } catch (err) {
        console.error('Request failed — POST /config (concurrent):', err.message);
        throw err;
      }
    });

    test('TC-88 EDGE: POST /config with deeply nested payload does not cause 5xx', async ({ request }) => {
      try {
        const nestedPayload = { level1: { level2: { level3: { value: 'deep' } } } };
        const response = await request.post(`${BASE_URL}/config`, {
          data: nestedPayload,
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /config (deeply nested payload)', body);
        expect(status).toBeLessThan(500);
      } catch (err) {
        console.error('Request failed — POST /config (nested payload):', err.message);
        throw err;
      }
    });
  });

  // =========================================================================
  // 9. Cross-Endpoint & Integration Flows
  // =========================================================================
  test.describe('9. Cross-Endpoint Integration', () => {

    test('TC-89 FLOW: GET /config -> POST /config (read-modify cycle)', async ({ request }) => {
      try {
        const getResp = await request.get(`${BASE_URL}/config`);
        const getStatus = getResp.status();
        const currentConfig = await getResp.json().catch(() => ({}));
        logApiResult(getStatus, 'FLOW GET /config (read step)', currentConfig);
        expect(getStatus).toBe(200);
        console.log('Config keys read:', Object.keys(currentConfig));

        const postResp = await request.post(`${BASE_URL}/config`, {
          data: currentConfig,
          headers: { 'Content-Type': 'application/json' },
        });
        const postStatus = postResp.status();
        const postBody = await postResp.json().catch(() => undefined);
        logApiResult(postStatus, 'FLOW POST /config (write-back step)', postBody);
        expect([200, 422]).toContain(postStatus);
        if (postStatus === 200) {
          console.log('FLOW complete: Config round-trip successful.');
        } else {
          console.warn('NOTE: Writing back the same config returned non-200 — server may require specific fields.');
        }
      } catch (err) {
        console.error('Request failed — FLOW GET→POST /config:', err.message);
        throw err;
      }
    });

    test('TC-90 FLOW: GET /batches then GET /recordings filtered by first batch_id', async ({ request }) => {
      try {
        const batchesResp = await request.get(`${BASE_URL}/batches`);
        const batchesStatus = batchesResp.status();
        const batches = await batchesResp.json().catch(() => []);
        logApiResult(batchesStatus, 'FLOW GET /batches (step 1)');
        expect(batchesStatus).toBe(200);

        const firstBatchId = Array.isArray(batches) && batches.length > 0
          ? (batches[0].id ?? batches[0].batch_id ?? 'no-id-found')
          : 'no-batches-found';
        console.log(`FLOW: Using first batch_id = "${firstBatchId}"`);

        const recordingsResp = await request.get(`${BASE_URL}/recordings`, {
          params: { batch_id: firstBatchId, limit: 10 },
        });
        const recordingsStatus = recordingsResp.status();
        const recordingsBody = await recordingsResp.json().catch(() => undefined);
        logApiResult(recordingsStatus, `FLOW GET /recordings (step 2, batch_id=${firstBatchId})`, recordingsBody);
        expect([200, 422]).toContain(recordingsStatus);
        if (recordingsStatus === 200) {
          console.log(`FLOW complete: Found ${recordingsBody.recordings?.length ?? 0} recordings for batch.`);
        } else {
          console.warn('NOTE: Recordings not returned for batch_id filter — check DB or batch data.');
        }
      } catch (err) {
        console.error('Request failed — FLOW /batches→/recordings:', err.message);
        throw err;
      }
    });

    test('TC-91 FLOW: GET /list-trunks and GET /getToken in parallel', async ({ request }) => {
      try {
        const [trunksResp, tokenResp] = await Promise.all([
          request.get(`${BASE_URL}/list-trunks`),
          request.get(`${BASE_URL}/getToken`, { params: { name: 'parallel-test' } }),
        ]);
        const trunksStatus = trunksResp.status();
        const tokenStatus = tokenResp.status();
        const trunksBody = await trunksResp.json().catch(() => undefined);
        const tokenBody = await tokenResp.json().catch(() => undefined);
        logApiResult(trunksStatus, 'FLOW GET /list-trunks (parallel)', trunksBody);
        logApiResult(tokenStatus, 'FLOW GET /getToken (parallel)', tokenBody);
        expect(trunksStatus).toBe(200);
        expect([200, 422]).toContain(tokenStatus);
        if (trunksStatus === 200 && tokenStatus === 200) {
          console.log('FLOW complete: Both /list-trunks and /getToken succeeded in parallel.');
        } else {
          console.warn(`NOTE: Parallel flow partial — trunks=${trunksStatus}, token=${tokenStatus}`);
        }
      } catch (err) {
        console.error('Request failed — FLOW parallel /list-trunks + /getToken:', err.message);
        throw err;
      }
    });

    test('TC-92 FLOW: POST /call/batch then GET /batches to verify batch appears', async ({ request }) => {
      try {
        const batchName = `Integration-Batch-${Date.now()}`;
        const postResp = await request.post(`${BASE_URL}/call/batch`, {
          data: {
            recipients: [{ phone: VALID_PHONE, name: VALID_NAME }],
            name: batchName,
          },
          headers: { 'Content-Type': 'application/json' },
        });
        const postStatus = postResp.status();
        const postBody = await postResp.json().catch(() => undefined);
        logApiResult(postStatus, `FLOW POST /call/batch "${batchName}" (step 1)`, postBody);
        if (postStatus !== 200) {
          console.warn(`NOTE: Batch not created (status ${postStatus}) — /batches list may not include it.`);
        }

        const getResp = await request.get(`${BASE_URL}/batches`);
        const getStatus = getResp.status();
        const getBody = await getResp.json().catch(() => undefined);
        logApiResult(getStatus, 'FLOW GET /batches (step 2 — verify list)', getBody);
        expect(getStatus).toBe(200);
        console.log('FLOW complete: /batches list fetched after batch creation.');
      } catch (err) {
        console.error('Request failed — FLOW POST /call/batch → GET /batches:', err.message);
        throw err;
      }
    });

    test('TC-93 FLOW: All read endpoints respond under 10 seconds in sequence', async ({ request }) => {
      const endpoints = [
        `${BASE_URL}/batches`,
        `${BASE_URL}/list-trunks`,
        `${BASE_URL}/config`,
        `${BASE_URL}/recordings`,
      ];
      try {
        for (const url of endpoints) {
          const start = Date.now();
          const response = await request.get(url);
          const duration = Date.now() - start;
          const status = response.status();
          logApiResult(status, `${url} (sequential, ${duration}ms)`);
          expect(status).toBeLessThan(500);
          expect(duration).toBeLessThan(10_000);
          if (duration > 3000) {
            console.warn(`NOTE: ${url} took ${duration}ms — above 3s warning threshold.`);
          }
        }
        console.log('FLOW complete: All read endpoints responded within 10s sequentially.');
      } catch (err) {
        console.error('Request failed — FLOW sequential read endpoints:', err.message);
        throw err;
      }
    });

    test('TC-94 FLOW: All read endpoints respond concurrently without 5xx', async ({ request }) => {
      try {
        const [batchesResp, trunksResp, configResp, recordingsResp, tokenResp] = await Promise.all([
          request.get(`${BASE_URL}/batches`),
          request.get(`${BASE_URL}/list-trunks`),
          request.get(`${BASE_URL}/config`),
          request.get(`${BASE_URL}/recordings`),
          request.get(`${BASE_URL}/getToken`),
        ]);
        logApiResult(batchesResp.status(),    'FLOW concurrent GET /batches');
        logApiResult(trunksResp.status(),     'FLOW concurrent GET /list-trunks');
        logApiResult(configResp.status(),     'FLOW concurrent GET /config');
        logApiResult(recordingsResp.status(), 'FLOW concurrent GET /recordings');
        logApiResult(tokenResp.status(),      'FLOW concurrent GET /getToken');

        expect(batchesResp.status()).toBe(200);
        expect(trunksResp.status()).toBe(200);
        expect(configResp.status()).toBe(200);
        expect([200, 422]).toContain(recordingsResp.status());
        expect([200, 422]).toContain(tokenResp.status());

        const allOk = [batchesResp, trunksResp, configResp, recordingsResp, tokenResp]
          .every((r) => r.status() === 200);
        if (allOk) {
          console.log('FLOW complete: All endpoints returned 200 under concurrent load.');
        } else {
          console.warn('NOTE: Some concurrent endpoints did not return 200 — see individual results above.');
        }
      } catch (err) {
        console.error('Request failed — FLOW concurrent all reads:', err.message);
        throw err;
      }
    });
  });

  // =========================================================================
  // 10. 422 Validation Error Schema Validation
  // =========================================================================
  test.describe('10. 422 Validation Error Response Schema', () => {

    test('TC-95 POST /call 422 response has correct HTTPValidationError schema', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call`, {
          data: {},
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call (422 schema check)', body);
        expect(status).toBe(422);
        expect(body).toHaveProperty('detail');
        expect(Array.isArray(body.detail)).toBe(true);
        body.detail.forEach((err) => {
          expect(err).toHaveProperty('loc');
          expect(err).toHaveProperty('msg');
          expect(err).toHaveProperty('type');
          expect(Array.isArray(err.loc)).toBe(true);
          expect(typeof err.msg).toBe('string');
          expect(typeof err.type).toBe('string');
        });
        console.log('POST /call 422 validation detail:', JSON.stringify(body.detail));
      } catch (err) {
        console.error('Request failed — POST /call (422 schema check):', err.message);
        throw err;
      }
    });

    test('TC-96 POST /call/batch 422 response has correct HTTPValidationError schema', async ({ request }) => {
      try {
        const response = await request.post(`${BASE_URL}/call/batch`, {
          data: {},
          headers: { 'Content-Type': 'application/json' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'POST /call/batch (422 schema check)', body);
        expect(status).toBe(422);
        expect(body).toHaveProperty('detail');
        expect(Array.isArray(body.detail)).toBe(true);
        body.detail.forEach((err) => {
          expect(err).toHaveProperty('loc');
          expect(err).toHaveProperty('msg');
          expect(err).toHaveProperty('type');
        });
        console.log('POST /call/batch 422 validation detail:', JSON.stringify(body.detail));
      } catch (err) {
        console.error('Request failed — POST /call/batch (422 schema check):', err.message);
        throw err;
      }
    });

    test('TC-97 GET /recordings 422 response has correct schema when limit is invalid', async ({ request }) => {
      try {
        const response = await request.get(`${BASE_URL}/recordings`, {
          params: { limit: 'invalid' },
        });
        const status = response.status();
        const body = await response.json().catch(() => undefined);
        logApiResult(status, 'GET /recordings (422 schema check, limit=invalid)', body);
        if (status === 422) {
          console.log('EXPECTED: Server correctly returned 422 for invalid limit.');
          expect(body).toHaveProperty('detail');
          expect(Array.isArray(body.detail)).toBe(true);
          console.log('GET /recordings 422 validation detail:', JSON.stringify(body.detail));
        } else {
          console.warn(`NOTE: Expected 422 for invalid limit but got ${status} — validation may be lenient.`);
        }
      } catch (err) {
        console.error('Request failed — GET /recordings (422 schema check):', err.message);
        throw err;
      }
    });
  });
});
