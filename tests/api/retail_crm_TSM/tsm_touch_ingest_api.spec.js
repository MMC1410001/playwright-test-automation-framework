'use strict';

const { test, expect } = require('@playwright/test');

// ─── Configuration ────────────────────────────────────────────────────────────
// Dev is the default so an accidental run never writes objects to the production
// GCS bucket. Opt into Production explicitly for release verification:
//   TSM_BASE_URL=https://www.saucedemo.com  (Production, v1.1 — 31/07/2026)
const BASE_URL = process.env.TSM_BASE_URL || `${process.env.BILLING_API_URL || 'https://httpbin.org'}`;

const CLIENT_ID             = process.env.TSM_CLIENT_ID     || 'aethereus';
const CLIENT_SECRET         = process.env.TSM_CLIENT_SECRET || 'Chanakya-Evaluation-T0k3n';
const INVALID_CLIENT_ID     = 'invalid-client-id-xyz';
const INVALID_CLIENT_SECRET = 'wrong-secret-xyz-000';

// ─── Sample Payloads ─────────────────────────────────────────────────────────
const SAMPLE_JSON_PAYLOAD = JSON.stringify({
  batch_id: 'playwright-test-001',
  source: 'aethereus',
  submitted_at: '2026-05-20T12:00:00Z',
  records: [
    { dealer_code: 'DEMO001', touch_type: 'visit', touch_date: '2026-05-19', notes: 'Test record 1' },
    { dealer_code: 'DEMO002', touch_type: 'call',  touch_date: '2026-05-19', notes: 'Test record 2' },
  ],
});

const SAMPLE_CSV_PAYLOAD = [
  'dealer_code,touch_type,touch_date,notes',
  'DEMO001,visit,2026-05-19,Test record 1',
  'DEMO002,call,2026-05-19,Test record 2',
].join('\n');

const SAMPLE_NDJSON_PAYLOAD = [
  JSON.stringify({ dealer_code: 'DEMO001', touch_type: 'visit', touch_date: '2026-05-19', notes: 'Test record 1' }),
  JSON.stringify({ dealer_code: 'DEMO002', touch_type: 'call',  touch_date: '2026-05-19', notes: 'Test record 2' }),
].join('\n');

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getHealth(request) {
  const response = await request.get(`${BASE_URL}/healthz`);
  const body = await response.json().catch(() => ({}));
  return { status: response.status(), body };
}

async function getToken(request, clientId = CLIENT_ID, clientSecret = CLIENT_SECRET) {
  const response = await request.post(`${BASE_URL}/v1/auth/token`, {
    form: {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    },
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status(), body };
}

// Decodes a JWT's payload segment. Returns null if the token is not a 3-segment JWT.
function decodeJwtPayload(token) {
  const segments = String(token || '').split('.');
  if (segments.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function ingestRawBody(request, body, contentType, token, idempotencyKey = null) {
  const headers = { 'Content-Type': contentType };
  if (token !== null && token !== undefined) headers['Authorization'] = `Bearer ${token}`;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const start = Date.now();
  const response = await request.post(`${BASE_URL}/v1/tsm-touch`, {
    data: body,
    headers,
  });
  const duration = Date.now() - start;
  const responseBody = await response.json().catch(() => ({}));
  return { status: response.status(), duration, body: responseBody, headers: response.headers() };
}

async function ingestMultipartFile(request, fileContent, fileName, mimeType, token, idempotencyKey = null) {
  const headers = {};
  if (token !== null && token !== undefined) headers['Authorization'] = `Bearer ${token}`;
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const start = Date.now();
  const response = await request.post(`${BASE_URL}/v1/tsm-touch`, {
    headers,
    multipart: {
      file: {
        name: fileName,
        mimeType,
        buffer: Buffer.from(fileContent),
      },
    },
  });
  const duration = Date.now() - start;
  const responseBody = await response.json().catch(() => ({}));
  return { status: response.status(), duration, body: responseBody, headers: response.headers() };
}

// ─── Test Suites ─────────────────────────────────────────────────────────────

test.describe('FUNCTIONAL Tests - TSM Touch Ingest API', () => {

  test.describe('Health Check - GET /healthz', () => {
    test('[FUNC-001] GET /healthz returns HTTP 200', async ({ request }) => {
      const { status } = await getHealth(request);
      console.log('[FUNC-001] Health check status:', status);
      expect(status).toBe(200);
    });

    test('[FUNC-002] GET /healthz returns a valid JSON body', async ({ request }) => {
      const { status, body } = await getHealth(request);
      console.log('[FUNC-002] Health body:', JSON.stringify(body));
      expect(status).toBe(200);
      expect(typeof body).toBe('object');
    });

    test('[FUNC-003] GET /healthz does not require authentication', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/healthz`);
      console.log('[FUNC-003] Unauthenticated health status:', response.status());
      expect(response.status()).toBe(200);
    });

    test('[FUNC-004] GET /healthz response Content-Type is application/json', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/healthz`);
      const contentType = response.headers()['content-type'];
      console.log('[FUNC-004] Content-Type:', contentType);
      expect(response.status()).toBe(200);
      expect(contentType).toMatch(/application\/json/);
    });
  });

  test.describe('Auth Token - POST /v1/auth/token', () => {
    test('[FUNC-005] POST /v1/auth/token with valid credentials returns 200', async ({ request }) => {
      const { status, body } = await getToken(request);
      console.log('[FUNC-005] Token status:', status, '| body:', JSON.stringify(body));
      expect(status).toBe(200);
    });

    test('[FUNC-006] Token response contains a non-empty access_token string', async ({ request }) => {
      const { status, body } = await getToken(request);
      console.log('[FUNC-006] access_token:', body.access_token);
      expect(status).toBe(200);
      expect(body).toHaveProperty('access_token');
      expect(typeof body.access_token).toBe('string');
      expect(body.access_token.length).toBeGreaterThan(0);
    });

    test('[FUNC-007] Token response token_type is "Bearer"', async ({ request }) => {
      const { status, body } = await getToken(request);
      console.log('[FUNC-007] token_type:', body.token_type);
      expect(status).toBe(200);
      expect(body.token_type).toMatch(/bearer/i);
    });

    test('[FUNC-008] Token response expires_in is the documented 2-hour default (7200s)', async ({ request }) => {
      const { status, body } = await getToken(request);
      console.log('[FUNC-008] expires_in:', body.expires_in);
      expect(status).toBe(200);
      expect(typeof body.expires_in).toBe('number');
      // Release Notes v1.1: access_token has a default 2-hour validity.
      expect(body.expires_in).toBe(7200);
    });

    test('[FUNC-009] access_token is a well-formed JWT whose exp-iat matches the 2-hour validity', async ({ request }) => {
      const { status, body } = await getToken(request);
      expect(status).toBe(200);

      const segments = String(body.access_token).split('.');
      console.log('[FUNC-009] JWT segment count:', segments.length);
      expect(segments).toHaveLength(3);

      const payload = decodeJwtPayload(body.access_token);
      console.log('[FUNC-009] JWT payload:', JSON.stringify(payload));
      expect(payload).not.toBeNull();
      expect(typeof payload.exp).toBe('number');
      expect(typeof payload.iat).toBe('number');
      // Confirms the 2-hour claim from the token itself, not just the response envelope.
      expect(payload.exp - payload.iat).toBe(7200);
    });
  });

  test.describe('Ingest - Raw Body Uploads - POST /v1/tsm-touch', () => {
    let accessToken;
    test.beforeAll(async ({ request }) => {
      const { body } = await getToken(request);
      accessToken = body.access_token;
    });

    test('[FUNC-010] POST with JSON raw body and valid token returns 200', async ({ request }) => {
      const { status, body } = await ingestRawBody(request, SAMPLE_JSON_PAYLOAD, 'application/json', accessToken);
      console.log('[FUNC-010] JSON ingest status:', status, '| body:', JSON.stringify(body));
      expect(status).toBe(200);
    });

    test('[FUNC-011] POST with CSV raw body and valid token returns 200', async ({ request }) => {
      const { status, body } = await ingestRawBody(request, SAMPLE_CSV_PAYLOAD, 'text/csv', accessToken);
      console.log('[FUNC-011] CSV ingest status:', status, '| body:', JSON.stringify(body));
      expect(status).toBe(200);
    });

    test('[FUNC-012] POST with NDJSON raw body and valid token returns 200', async ({ request }) => {
      const { status, body } = await ingestRawBody(request, SAMPLE_NDJSON_PAYLOAD, 'application/x-ndjson', accessToken);
      console.log('[FUNC-012] NDJSON ingest status:', status, '| body:', JSON.stringify(body));
      expect(status).toBe(200);
    });

    test('[FUNC-013] POST with plain text raw body and valid token returns 200', async ({ request }) => {
      const { status, body } = await ingestRawBody(request, 'DEMO001,visit,2026-05-19,test', 'text/plain', accessToken);
      console.log('[FUNC-013] Plain text ingest status:', status, '| body:', JSON.stringify(body));
      expect(status).toBe(200);
    });
  });

  test.describe('Ingest - Multipart File Upload - POST /v1/tsm-touch', () => {
    let accessToken;
    test.beforeAll(async ({ request }) => {
      const { body } = await getToken(request);
      accessToken = body.access_token;
    });

    test('[FUNC-020] POST multipart JSON file upload with valid token returns 200', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, 'tsm_touch.json', 'application/json', accessToken
      );
      console.log('[FUNC-020] Multipart JSON status:', status, '| body:', JSON.stringify(body));
      expect(status).toBe(200);
    });

    test('[FUNC-021] POST multipart CSV file upload with valid token returns 200', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_CSV_PAYLOAD, 'tsm_touch.csv', 'text/csv', accessToken
      );
      console.log('[FUNC-021] Multipart CSV status:', status, '| body:', JSON.stringify(body));
      expect(status).toBe(200);
    });

    test('[FUNC-022] POST multipart NDJSON file upload with valid token returns 200', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_NDJSON_PAYLOAD, 'tsm_touch.ndjson', 'application/x-ndjson', accessToken
      );
      console.log('[FUNC-022] Multipart NDJSON status:', status, '| body:', JSON.stringify(body));
      expect(status).toBe(200);
    });

    test('[FUNC-023] POST multipart plain text file upload with valid token returns 200', async ({ request }) => {
      // Release Notes v1.1 lists plain text among the supported payload formats;
      // FUNC-013 covers it as a raw body, this covers the multipart path.
      const { status, body } = await ingestMultipartFile(
        request, 'DEMO001,visit,2026-05-19,test', 'tsm_touch.txt', 'text/plain', accessToken
      );
      console.log('[FUNC-023] Multipart plain text status:', status, '| body:', JSON.stringify(body));
      expect(status).toBe(200);
    });
  });

  test.describe('Response Structure Validation', () => {
    let accessToken;
    test.beforeAll(async ({ request }) => {
      const { body } = await getToken(request);
      accessToken = body.access_token;
    });

    test('[FUNC-030] Successful ingest response contains ingest_id', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
      );
      console.log('[FUNC-030] Response body:', JSON.stringify(body));
      expect(status).toBe(200);
      expect(body).toHaveProperty('ingest_id');
      expect(typeof body.ingest_id).toBe('string');
      expect(body.ingest_id.length).toBeGreaterThan(0);
    });

    test('[FUNC-031] Successful ingest response contains gcs_uri starting with gs://', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
      );
      console.log('[FUNC-031] gcs_uri:', body.gcs_uri);
      expect(status).toBe(200);
      expect(body).toHaveProperty('gcs_uri');
      expect(body.gcs_uri).toMatch(/^gs:\/\//);
    });

    test('[FUNC-032] Successful ingest response contains non-empty bucket field', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
      );
      console.log('[FUNC-032] bucket:', body.bucket);
      expect(status).toBe(200);
      expect(body).toHaveProperty('bucket');
      expect(typeof body.bucket).toBe('string');
      expect(body.bucket.length).toBeGreaterThan(0);
    });

    test('[FUNC-033] Successful ingest response contains non-empty object field', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
      );
      console.log('[FUNC-033] object path:', body.object);
      expect(status).toBe(200);
      expect(body).toHaveProperty('object');
      expect(typeof body.object).toBe('string');
      expect(body.object.length).toBeGreaterThan(0);
    });

    test('[FUNC-034] Ingest response Content-Type header is application/json', async ({ request }) => {
      const { status, headers } = await ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
      );
      console.log('[FUNC-034] Content-Type:', headers['content-type']);
      expect(status).toBe(200);
      expect(headers['content-type']).toMatch(/application\/json/);
    });

    test('[FUNC-035] GCS object path follows date-partitioned format YYYY/MM/DD', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
      );
      console.log('[FUNC-035] GCS object path:', body.object);
      expect(status).toBe(200);
      expect(body.object).toMatch(/\d{4}\/\d{2}\/\d{2}\//);
    });

    test('[FUNC-036] GCS object path file extension matches JSON content type', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
      );
      console.log('[FUNC-036] Object path:', body.object);
      expect(status).toBe(200);
      // Server appends content-type-derived extension; doc example omitted it but actual behaviour confirmed
      expect(body.object).toMatch(/\.json$/);
    });

    test('[FUNC-037] GCS object path file extension matches CSV content type', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_CSV_PAYLOAD, 'tsm.csv', 'text/csv', accessToken
      );
      console.log('[FUNC-037] Object path:', body.object);
      expect(status).toBe(200);
      expect(body.object).toMatch(/\.csv$/);
    });

    test('[FUNC-038] GCS object path file extension matches NDJSON content type', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, SAMPLE_NDJSON_PAYLOAD, 'tsm.ndjson', 'application/x-ndjson', accessToken
      );
      console.log('[FUNC-038] Object path:', body.object);
      expect(status).toBe(200);
      expect(body.object).toMatch(/\.ndjson$/);
    });

    // BY DESIGN (confirmed with dev): plain text payloads are normalised and stored as .json,
    // not .txt. This is intentional (JSON-only object storage), so it is a documentation matter,
    // not a functional defect — see bugs.txt iteration 3, bug 2 (Documentation).
    test('[FUNC-039] Plain text payload is stored with a .json extension (JSON-only, by design)', async ({ request }) => {
      const { status, body } = await ingestMultipartFile(
        request, 'DEMO001,visit,2026-05-19,test', 'tsm.txt', 'text/plain', accessToken
      );
      console.log('[FUNC-039] Object path:', body.object);
      expect(status).toBe(200);
      expect(body.object).toMatch(/\.json$/);
    });
  });

  test.describe('Idempotency', () => {
    let accessToken;
    test.beforeAll(async ({ request }) => {
      const { body } = await getToken(request);
      accessToken = body.access_token;
    });

    test('[FUNC-040] Same Idempotency-Key maps to the same GCS object path on retry', async ({ request }) => {
      const idempotencyKey = `test-idem-${Date.now()}`;
      const first  = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken, idempotencyKey);
      const second = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken, idempotencyKey);
      console.log('[FUNC-040] First object:', first.body.object, '| Second object:', second.body.object);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.object).toBe(second.body.object);
    });

    test('[FUNC-041] Different Idempotency-Keys produce different GCS object paths', async ({ request }) => {
      const ts = Date.now();
      const first  = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken, `idem-a-${ts}`);
      const second = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken, `idem-b-${ts + 1}`);
      console.log('[FUNC-041] First:', first.body.object, '| Second:', second.body.object);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.object).not.toBe(second.body.object);
    });

    test('[FUNC-042] Requests without Idempotency-Key produce unique GCS object paths', async ({ request }) => {
      const first  = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken);
      const second = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken);
      console.log('[FUNC-042] First:', first.body.object, '| Second:', second.body.object);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.object).not.toBe(second.body.object);
    });

    test('[FUNC-043] ingest_id is unique for each new request without Idempotency-Key', async ({ request }) => {
      const first  = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken);
      const second = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken);
      console.log('[FUNC-043] First ingest_id:', first.body.ingest_id, '| Second:', second.body.ingest_id);
      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(first.body.ingest_id).not.toBe(second.body.ingest_id);
    });
  });
});

test.describe('NEGATIVE Tests - TSM Touch Ingest API', () => {

  test.describe('Auth Token Failures - POST /v1/auth/token', () => {
    test('[NEG-020] POST /v1/auth/token with invalid client_secret returns 401 or 400', async ({ request }) => {
      const { status, body } = await getToken(request, CLIENT_ID, INVALID_CLIENT_SECRET);
      console.log('[NEG-020] Invalid secret status:', status, '| body:', JSON.stringify(body));
      expect([400, 401]).toContain(status);
    });

    test('[NEG-021] POST /v1/auth/token with invalid client_id returns 401 or 400', async ({ request }) => {
      const { status, body } = await getToken(request, INVALID_CLIENT_ID, CLIENT_SECRET);
      console.log('[NEG-021] Invalid client_id status:', status, '| body:', JSON.stringify(body));
      expect([400, 401]).toContain(status);
    });

    test('[NEG-022] POST /v1/auth/token without grant_type returns 400 or 422', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/v1/auth/token`, {
        form: { client_id: CLIENT_ID, client_secret: CLIENT_SECRET },
      });
      console.log('[NEG-022] Missing grant_type status:', response.status());
      // bugs.txt iteration 2, bug 2 (Closed 5/21/2026): grant_type is now enforced as required.
      // 200 is deliberately NOT accepted here — it would silently pass a regression of that fix.
      expect([400, 422]).toContain(response.status());
    });

    test('[NEG-024] POST /v1/auth/token with empty request body returns 400 or 415', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/v1/auth/token`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: '',
      });
      console.log('[NEG-024] Empty body status:', response.status());
      expect([400, 415]).toContain(response.status());
    });

    test('[NEG-025] POST /v1/auth/token with Content-Type application/json is accepted or rejected gracefully', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/v1/auth/token`, {
        headers: { 'Content-Type': 'application/json' },
        data: JSON.stringify({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
      });
      console.log('[NEG-025] application/json Content-Type status:', response.status());
      // Doc (AUTH-07) says 415; server currently returns 200 (lenient) — flagged to dev as doc discrepancy
      expect([200, 415, 422]).toContain(response.status());
    });

    test('[NEG-023] POST /v1/auth/token with wrong grant_type returns 400 or 422', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/v1/auth/token`, {
        form: { grant_type: 'authorization_code', client_id: CLIENT_ID, client_secret: CLIENT_SECRET },
      });
      console.log('[NEG-023] Wrong grant_type status:', response.status());
      expect([400, 422]).toContain(response.status());
    });
  });

  test.describe('Ingest Auth Failures - POST /v1/tsm-touch', () => {
    test('[NEG-001] POST /v1/tsm-touch without Authorization header returns 401 or 403', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/v1/tsm-touch`, {
        multipart: { file: { name: 'tsm.json', mimeType: 'application/json', buffer: Buffer.from(SAMPLE_JSON_PAYLOAD) } },
      });
      console.log('[NEG-001] No auth header status:', response.status());
      expect([401, 403]).toContain(response.status());
    });

    test('[NEG-002] POST /v1/tsm-touch with invalid Bearer token returns 401 or 403', async ({ request }) => {
      const { status } = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', 'invalid-token-xyz-000');
      console.log('[NEG-002] Invalid token status:', status);
      expect([401, 403]).toContain(status);
    });

    test('[NEG-003] POST /v1/tsm-touch with empty Bearer token string returns 401 or 403', async ({ request }) => {
      const { status } = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', '');
      console.log('[NEG-003] Empty token status:', status);
      expect([401, 403]).toContain(status);
    });

    test('[NEG-004] POST /v1/tsm-touch with malformed JWT returns 401 or 403', async ({ request }) => {
      const { status } = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', 'aaa.bbb.ccc');
      console.log('[NEG-004] Malformed JWT status:', status);
      expect([401, 403]).toContain(status);
    });

    test('[NEG-005] GET /v1/tsm-touch is not allowed - returns 404 or 405', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/v1/tsm-touch`);
      console.log('[NEG-005] GET on POST endpoint:', response.status());
      expect([404, 405]).toContain(response.status());
    });

    test('[NEG-006] DELETE /v1/tsm-touch is not allowed - returns 404 or 405', async ({ request }) => {
      const response = await request.delete(`${BASE_URL}/v1/tsm-touch`);
      console.log('[NEG-006] DELETE on ingest endpoint:', response.status());
      expect([404, 405]).toContain(response.status());
    });

    test('[NEG-007] PUT /v1/tsm-touch is not allowed - returns 404 or 405', async ({ request }) => {
      const response = await request.put(`${BASE_URL}/v1/tsm-touch`, { data: SAMPLE_JSON_PAYLOAD });
      console.log('[NEG-007] PUT on ingest endpoint:', response.status());
      expect([404, 405]).toContain(response.status());
    });

    test('[NEG-008] Request to non-existent endpoint returns 404', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/v1/unknown-endpoint`);
      console.log('[NEG-008] Unknown endpoint status:', response.status());
      expect(response.status()).toBe(404);
    });

    test('[NEG-009] POST /v1/tsm-touch with empty body does not cause 5xx', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/v1/tsm-touch`, {
        headers: { 'Content-Type': 'application/json' },
        data: '',
      });
      console.log('[NEG-009] Empty body status:', response.status());
      expect(response.status()).toBeLessThan(500);
    });

    test('[NEG-010] POST /v1/tsm-touch without any body or file does not cause 5xx', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/v1/tsm-touch`);
      console.log('[NEG-010] No body status:', response.status());
      expect(response.status()).toBeLessThan(500);
    });
  });
});

test.describe('REGRESSION Tests - TSM Touch Ingest API', () => {

  test('[REG-001] Old X-API-Key header is rejected on the new JWT-authenticated build', async ({ request }) => {
    // REG-02 from dev handoff doc: the previous auth scheme used X-API-Key.
    // The new build must reject it so old integrations cannot bypass JWT auth.
    const response = await request.post(`${BASE_URL}/v1/tsm-touch`, {
      headers: { 'X-API-Key': CLIENT_SECRET },
      multipart: {
        file: { name: 'tsm.json', mimeType: 'application/json', buffer: Buffer.from(SAMPLE_JSON_PAYLOAD) },
      },
    });
    console.log('[REG-001] X-API-Key auth status:', response.status());
    expect([401, 403]).toContain(response.status());
  });

});

test.describe('EDGE CASE Tests - TSM Touch Ingest API', () => {
  let accessToken;
  test.beforeAll(async ({ request }) => {
    const { body } = await getToken(request);
    accessToken = body.access_token;
  });

  test('[EDGE-001] POST with minimal single-record JSON body returns 200', async ({ request }) => {
    const minimalBody = JSON.stringify({ dealer_code: 'DEMO001', touch_type: 'visit', touch_date: '2026-05-19' });
    const { status } = await ingestMultipartFile(request, minimalBody, 'minimal.json', 'application/json', accessToken);
    console.log('[EDGE-001] Minimal JSON status:', status);
    expect(status).toBe(200);
  });

  test('[EDGE-002] POST with unicode/multilingual characters in JSON payload returns 200', async ({ request }) => {
    const unicodeBody = JSON.stringify({ dealer_code: 'DEMO-日本語-001', touch_type: 'visit', notes: 'मुंबई déaler' });
    const { status } = await ingestMultipartFile(request, unicodeBody, 'unicode.json', 'application/json', accessToken);
    console.log('[EDGE-002] Unicode payload status:', status);
    expect(status).toBe(200);
  });

  test('[EDGE-003] POST with large JSON payload (~50KB) returns 200 or 413', async ({ request }) => {
    test.setTimeout(30000);
    const largeRecords = Array.from({ length: 500 }, (_, i) => ({
      dealer_code: `DEMO${String(i).padStart(4, '0')}`,
      touch_type: ['visit', 'call', 'email', 'sms'][i % 4],
      touch_date: '2026-05-19',
      notes: 'A'.repeat(50),
    }));
    const largeBody = JSON.stringify({ batch_id: 'large-test', source: 'aethereus', submitted_at: '2026-05-20T12:00:00Z', records: largeRecords });
    console.log('[EDGE-003] Payload size:', largeBody.length, 'bytes');
    const { status } = await ingestMultipartFile(request, largeBody, 'large.json', 'application/json', accessToken);
    console.log('[EDGE-003] Large payload status:', status);
    expect([200, 413]).toContain(status);
  });

  test('[EDGE-004] POST with single-row CSV body returns 200', async ({ request }) => {
    const singleRow = 'dealer_code,touch_type,touch_date\nDEMO001,visit,2026-05-19';
    const { status } = await ingestMultipartFile(request, singleRow, 'single_row.csv', 'text/csv', accessToken);
    console.log('[EDGE-004] Single-row CSV status:', status);
    expect(status).toBe(200);
  });

  test('[EDGE-005] POST with CSV header-only (no data rows) returns 200', async ({ request }) => {
    const headerOnly = 'dealer_code,touch_type,touch_date,notes';
    const { status } = await ingestMultipartFile(request, headerOnly, 'header_only.csv', 'text/csv', accessToken);
    console.log('[EDGE-005] Header-only CSV status:', status);
    expect(status).toBe(200);
  });

  test('[EDGE-006] Idempotency-Key reuse with different format payloads returns the same object path', async ({ request }) => {
    const idempotencyKey = `reuse-test-${Date.now()}`;
    const first  = await ingestMultipartFile(request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken, idempotencyKey);
    const second = await ingestMultipartFile(request, SAMPLE_CSV_PAYLOAD,  'tsm.csv',  'text/csv',         accessToken, idempotencyKey);
    console.log('[EDGE-006] First:', first.body.object, '| Second:', second.body.object);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.object).toBe(second.body.object);
  });

  test('[EDGE-007] POST multipart upload without file field returns 400 or 422', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/v1/tsm-touch`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      multipart: {},
    });
    console.log('[EDGE-007] Empty multipart status:', response.status());
    // Doc (ING-05): missing file field with valid auth should return 400
    expect([400, 422]).toContain(response.status());
  });

  test('[EDGE-008] Idempotency-Key with special characters is handled without 5xx', async ({ request }) => {
    const specialKey = `key-${Date.now()}-abc_xyz.test`;
    const { status } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken, specialKey
    );
    console.log('[EDGE-008] Special char Idempotency-Key status:', status);
    expect([200, 400]).toContain(status);
  });

  test('[EDGE-009] POST with single valid NDJSON line returns 200', async ({ request }) => {
    const singleLine = JSON.stringify({ dealer_code: 'DEMO001', touch_type: 'visit', touch_date: '2026-05-19' });
    const { status } = await ingestMultipartFile(request, singleLine, 'single.ndjson', 'application/x-ndjson', accessToken);
    console.log('[EDGE-009] Single NDJSON line status:', status);
    expect(status).toBe(200);
  });
});

test.describe('SECURITY Tests - TSM Touch Ingest API', () => {
  let accessToken;
  test.beforeAll(async ({ request }) => {
    const { body } = await getToken(request);
    accessToken = body.access_token;
  });

  test('[SEC-001] SQL injection in JSON payload is stored safely without causing 5xx', async ({ request }) => {
    const sqlPayload = JSON.stringify({ dealer_code: "'; DROP TABLE tsm_touch; --", touch_type: "1 OR '1'='1" });
    const { status } = await ingestMultipartFile(request, sqlPayload, 'sql_inject.json', 'application/json', accessToken);
    console.log('[SEC-001] SQL injection status:', status);
    expect(status).toBeLessThan(500);
  });

  test('[SEC-002] NoSQL injection in JSON payload does not cause 5xx', async ({ request }) => {
    const nosqlPayload = JSON.stringify({ dealer_code: { $gt: '' }, touch_type: { $where: 'this.a == 1' } });
    const { status } = await ingestMultipartFile(request, nosqlPayload, 'nosql_inject.json', 'application/json', accessToken);
    console.log('[SEC-002] NoSQL injection status:', status);
    expect(status).toBeLessThan(500);
  });

  test('[SEC-003] XSS payload in JSON body is accepted without 5xx', async ({ request }) => {
    const xssPayload = JSON.stringify({ dealer_code: '<script>alert("XSS")</script>', notes: 'javascript:void(0)' });
    const { status } = await ingestMultipartFile(request, xssPayload, 'xss_payload.json', 'application/json', accessToken);
    console.log('[SEC-003] XSS payload status:', status);
    expect(status).toBeLessThan(500);
  });

  test('[SEC-004] Path traversal string as Bearer token is rejected with 401 or 403', async ({ request }) => {
    const { status } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', '../../etc/passwd'
    );
    console.log('[SEC-004] Path traversal token status:', status);
    expect([401, 403]).toContain(status);
  });

  test('[SEC-005] Excessively long Bearer token is rejected cleanly without 5xx', async ({ request }) => {
    const longToken = 'A'.repeat(5000);
    const { status } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', longToken
    );
    console.log('[SEC-005] Oversized token status:', status);
    expect(status).toBeLessThan(500);
    expect([400, 401, 403, 431]).toContain(status);
  });

  test('[SEC-006] Error response for invalid token does not expose server internals', async ({ request }) => {
    const { status, body } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', 'invalid-token-xyz-000'
    );
    console.log('[SEC-006] Error body:', JSON.stringify(body));
    expect([401, 403]).toContain(status);
    const bodyStr = JSON.stringify(body).toLowerCase();
    expect(bodyStr).not.toContain('traceback');
    expect(bodyStr).not.toContain('stack trace');
    expect(bodyStr).not.toContain('exception at');
  });

  test('[SEC-007] GCS object path in response does not contain path traversal sequences', async ({ request }) => {
    const { status, body } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
    );
    console.log('[SEC-007] Object path:', body.object);
    expect(status).toBe(200);
    if (body.object) {
      expect(body.object).not.toContain('..');
      expect(body.object).not.toContain('//');
    }
  });

  test('[SEC-008] Successful ingest response does not expose GCS credentials or service account info', async ({ request }) => {
    const { status, body } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
    );
    const bodyStr = JSON.stringify(body);
    console.log('[SEC-008] Response body (checking for secret exposure):', bodyStr.substring(0, 200));
    if (status === 200) {
      expect(bodyStr).not.toContain('GOOGLE_APPLICATION_CREDENTIALS');
      expect(bodyStr).not.toContain('service_account');
      expect(bodyStr).not.toContain('private_key');
    }
  });
});

test.describe('NON-FUNCTIONAL Tests - TSM Touch Ingest API', () => {
  let accessToken;
  test.beforeAll(async ({ request }) => {
    const { body } = await getToken(request);
    accessToken = body.access_token;
  });

  test('[NFNC-001] GET /healthz responds within 2000ms', async ({ request }) => {
    const start = Date.now();
    const { status } = await getHealth(request);
    const duration = Date.now() - start;
    console.log('[NFNC-001] Health check duration:', duration, 'ms');
    expect(status).toBe(200);
    expect(duration).toBeLessThan(2000);
  });

  test('[NFNC-002] POST /v1/tsm-touch ingest responds within 10000ms', async ({ request }) => {
    test.setTimeout(20000);
    const { status, duration } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', accessToken
    );
    console.log('[NFNC-002] Ingest duration:', duration, 'ms');
    expect(status).toBe(200);
    expect(duration).toBeLessThan(10000);
  });

  test('[NFNC-003] 10 concurrent GET /healthz all return 200', async ({ request }) => {
    test.setTimeout(30000);
    const promises = Array.from({ length: 10 }, () => request.get(`${BASE_URL}/healthz`));
    const results = await Promise.all(promises);
    results.forEach((r, i) => {
      console.log(`[NFNC-003] Concurrent health #${i + 1}:`, r.status());
      expect(r.status()).toBe(200);
    });
  });

  test('[NFNC-004] 5 concurrent POST /v1/tsm-touch ingests all return 200', async ({ request }) => {
    test.setTimeout(60000);
    const promises = Array.from({ length: 5 }, (_, i) =>
      ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, `tsm_concurrent_${i}.json`, 'application/json',
        accessToken, `concurrent-${Date.now()}-${i}`
      )
    );
    const results = await Promise.all(promises);
    results.forEach((r, i) => {
      console.log(`[NFNC-004] Concurrent ingest #${i + 1}: status=${r.status}, duration=${r.duration}ms`);
      expect(r.status).toBe(200);
    });
  });

  test('[NFNC-005] 5 concurrent ingests with unique Idempotency-Keys produce 5 distinct object paths', async ({ request }) => {
    test.setTimeout(60000);
    const ts = Date.now();
    const promises = Array.from({ length: 5 }, (_, i) =>
      ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, `tsm_${i}.json`, 'application/json',
        accessToken, `unique-path-${ts}-${i}`
      )
    );
    const results = await Promise.all(promises);
    const objectPaths = results.map((r) => r.body.object);
    const uniquePaths = new Set(objectPaths);
    console.log('[NFNC-005] Object paths:', objectPaths);
    expect(uniquePaths.size).toBe(5);
  });

  test('[NFNC-006] 5 sequential health checks all remain stable at 200', async ({ request }) => {
    for (let i = 0; i < 5; i++) {
      const { status } = await getHealth(request);
      console.log(`[NFNC-006] Sequential health #${i + 1}:`, status);
      expect(status).toBe(200);
    }
  });

  test('[NFNC-007] 3 sequential ingests all return 200 within acceptable duration', async ({ request }) => {
    test.setTimeout(60000);
    for (let i = 0; i < 3; i++) {
      const { status, duration } = await ingestMultipartFile(
        request, SAMPLE_JSON_PAYLOAD, `tsm_seq_${i}.json`, 'application/json', accessToken
      );
      console.log(`[NFNC-007] Sequential ingest #${i + 1}: status=${status}, duration=${duration}ms`);
      expect(status).toBe(200);
      expect(duration).toBeLessThan(10000);
    }
  });
});

test.describe('RATE LIMITING Tests - POST /v1/auth/token', () => {

  test('[RATE-001] Burst of 20 rapid valid-credential requests produces no 5xx', async ({ request }) => {
    test.setTimeout(60000);
    const promises = Array.from({ length: 20 }, () => getToken(request));
    const results = await Promise.all(promises);
    const statuses = results.map(r => r.status);
    console.log('[RATE-001] Burst valid-auth statuses:', statuses);
    // 429 is acceptable (rate limit triggered); 5xx is not
    statuses.forEach(s => expect(s).toBeLessThan(500));
  });

  test('[RATE-002] Burst of 20 invalid-credential requests simulating credential-stuffing returns 4xx — not 5xx', async ({ request }) => {
    test.setTimeout(60000);
    const promises = Array.from({ length: 20 }, () =>
      getToken(request, INVALID_CLIENT_ID, INVALID_CLIENT_SECRET)
    );
    const results = await Promise.all(promises);
    const statuses = results.map(r => r.status);
    console.log('[RATE-002] Credential-stuffing statuses:', statuses);
    statuses.forEach(s => {
      expect(s).toBeLessThan(500);
      expect([400, 401, 429]).toContain(s);
    });
  });

  test('[RATE-003] Valid auth request immediately after credential-stuffing burst returns 200 or 429 — not 5xx', async ({ request }) => {
    test.setTimeout(60000);
    // Simulate a credential-stuffing burst first
    const burst = Array.from({ length: 15 }, () =>
      getToken(request, INVALID_CLIENT_ID, INVALID_CLIENT_SECRET)
    );
    await Promise.all(burst);
    // Legitimate auth attempt after the burst — must not cause a 5xx
    const { status, body } = await getToken(request);
    console.log('[RATE-003] Post-burst valid auth status:', status, '| has token:', !!body.access_token);
    expect(status).toBeLessThan(500);
    expect([200, 429]).toContain(status);
  });
});

test.describe('TOKEN EXPIRY & CREDENTIAL GRACE PERIOD Tests', () => {
  // Release Notes v1.1: "Optional credential expiry with configurable grace-period handling
  // for client_id/client_secret pairs." These tests activate automatically once the
  // corresponding test credentials are provisioned — no code change required.
  // See bugs.txt for the open entry tracking the missing credentials.

  test('[EXPIRY-001] Expired token is rejected with 401 or 403', async ({ request }) => {
    test.skip(!process.env.TSM_EXPIRED_TOKEN, 'Set TSM_EXPIRED_TOKEN to a pre-expired JWT to enable.');

    const expiredToken = process.env.TSM_EXPIRED_TOKEN;
    const { status } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', expiredToken
    );
    console.log('[EXPIRY-001] Expired token ingest status:', status);
    expect([401, 403]).toContain(status);
  });

  test('[EXPIRY-002] Token reused beyond its expires_in window is rejected with 401 or 403', async ({ request }) => {
    // Needs a dedicated short-TTL key (expires_in <= 60s) so expiry is observable within a
    // single run — authenticating with the default key would mean sleeping for two hours.
    test.skip(
      !process.env.TSM_SHORT_TTL_CLIENT_ID || !process.env.TSM_SHORT_TTL_CLIENT_SECRET,
      'Set TSM_SHORT_TTL_CLIENT_ID / TSM_SHORT_TTL_CLIENT_SECRET to a key with expires_in <= 60s to enable.'
    );
    test.setTimeout(180000);

    const { status: authStatus, body: authBody } = await getToken(
      request, process.env.TSM_SHORT_TTL_CLIENT_ID, process.env.TSM_SHORT_TTL_CLIENT_SECRET
    );
    expect(authStatus).toBe(200);
    const ttl = authBody.expires_in;
    console.log(`[EXPIRY-002] Token TTL: ${ttl}s — waiting ${ttl + 5}s for expiry…`);
    expect(ttl).toBeLessThanOrEqual(60); // guard: a long-TTL key here would stall the run
    await new Promise(resolve => setTimeout(resolve, (ttl + 5) * 1000));
    const { status } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', authBody.access_token
    );
    console.log('[EXPIRY-002] Post-expiry ingest status:', status);
    expect([401, 403]).toContain(status);
  });

  test('[EXPIRY-003] Credential expired but within the grace period still issues a usable token', async ({ request }) => {
    test.skip(
      !process.env.TSM_GRACE_CLIENT_ID || !process.env.TSM_GRACE_CLIENT_SECRET,
      'Set TSM_GRACE_CLIENT_ID / TSM_GRACE_CLIENT_SECRET to a credential expired but inside its grace window to enable.'
    );

    const { status, body } = await getToken(
      request, process.env.TSM_GRACE_CLIENT_ID, process.env.TSM_GRACE_CLIENT_SECRET
    );
    console.log('[EXPIRY-003] In-grace auth status:', status, '| has token:', !!body.access_token);
    expect(status).toBe(200);
    expect(typeof body.access_token).toBe('string');
    expect(body.access_token.length).toBeGreaterThan(0);

    // The grace-period token must be fully usable for ingest, not merely issued.
    const { status: ingestStatus, body: ingestBody } = await ingestMultipartFile(
      request, SAMPLE_JSON_PAYLOAD, 'tsm.json', 'application/json', body.access_token
    );
    console.log('[EXPIRY-003] In-grace ingest status:', ingestStatus, '| object:', ingestBody.object);
    expect(ingestStatus).toBe(200);
    expect(ingestBody).toHaveProperty('gcs_uri');
  });

  test('[EXPIRY-004] Credential past its grace period is rejected without leaking internals', async ({ request }) => {
    test.skip(
      !process.env.TSM_EXPIRED_GRACE_CLIENT_ID || !process.env.TSM_EXPIRED_GRACE_CLIENT_SECRET,
      'Set TSM_EXPIRED_GRACE_CLIENT_ID / TSM_EXPIRED_GRACE_CLIENT_SECRET to a credential past its grace window to enable.'
    );

    const { status, body } = await getToken(
      request, process.env.TSM_EXPIRED_GRACE_CLIENT_ID, process.env.TSM_EXPIRED_GRACE_CLIENT_SECRET
    );
    console.log('[EXPIRY-004] Post-grace auth status:', status, '| body:', JSON.stringify(body));
    expect([400, 401]).toContain(status);
    expect(body).not.toHaveProperty('access_token');

    const bodyStr = JSON.stringify(body).toLowerCase();
    expect(bodyStr).not.toContain('traceback');
    expect(bodyStr).not.toContain('stack trace');
    expect(bodyStr).not.toContain('exception at');
  });
});
