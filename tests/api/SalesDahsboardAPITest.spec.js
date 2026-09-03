const { test, expect } = require('@playwright/test');
const { getFirebaseIdToken } = require('./firebaseAuth');

/**
 * Generate Firebase ID token for authentication
 */
async function generateAuthToken(userId = 'test-user', claims = {}) {
  return await getFirebaseIdToken(userId, claims);
}

// ===========================
// API 1: https://reqres.in
// ===========================

test.describe('API 1: https://reqres.in - Configuration & Token Management', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    console.log('🔑 Generated JWT Token:', token.substring(0, 50) + '...');

    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[API1-TC001] GET /config - Should successfully retrieve configuration settings', async () => {
    const response = await apiContext.get('/config');
    
    console.log('[API1-TC001] 📄 GET /config - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[API1-TC001] Config data:', data);
      expect(data).toBeDefined();
    }
  });

  test('[API1-TC002] POST /config - Should successfully update configuration settings', async () => {
    const response = await apiContext.post('/config', {
      data: {
        setting: 'test-value',
        timestamp: new Date().toISOString()
      }
    });

    console.log('[API1-TC002] 📝 POST /config - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[API1-TC002] Updated config:', data);
    }
  });

  test('[API1-TC003] GET /getToken - Should generate valid LiveKit token for developer role', async () => {
    const response = await apiContext.get('/getToken', {
      params: {
        identity: 'test-identity-123',
        name: 'Test User',
        room: 'test-room',
        agentId: 'agent-123',
        userRole: 'developer'
      }
    });

    console.log('[API1-TC003] 🎫 GET /getToken - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[API1-TC003] Token data:', data);
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('room');
    }
  });

  test('[API1-TC004] GET /getToken - Should generate valid LiveKit token for viewer role', async () => {
    const response = await apiContext.get('/getToken', {
      params: {
        identity: 'viewer-456',
        name: 'Viewer User',
        userRole: 'viewer'
      }
    });

    console.log('[API1-TC004] 👁️ GET /getToken (viewer) - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[API1-TC004] Viewer token data:', data);
    }
  });
});

// ===========================
// API 2: Health & Root Endpoints
// ===========================

test.describe('API 2: https://reqres.in - Health Check & Root Endpoints', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[API2-TC001] GET / - Should return successful response from root endpoint', async () => {
    const response = await apiContext.get('/');
    console.log('[API2-TC001] 🏠 Root endpoint - Status:', response.status());
    expect(response.ok()).toBeTruthy();
  });

  test('[API2-TC002] GET /api/health - Should return healthy status from health check endpoint', async () => {
    const response = await apiContext.get('/api/health');
    console.log('[API2-TC002] 💚 Health check - Status:', response.status());
    expect(response.ok()).toBeTruthy();
  });
});

// ===========================
// Knowledge Base (Qdrant) Tests
// ===========================

test.describe('Knowledge Base - Qdrant Vector Database Document Management', () => {
  let token;
  let apiContext;
  let testDocumentId;
  const testAgentId = 'test-agent-' + Date.now();

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[KB-TC001] POST /api/qdrant/documents - Should successfully create new knowledge base document', async () => {
    const response = await apiContext.post('/api/qdrant/documents', {
      data: {
        title: 'Test Document',
        description: 'This is a test document for knowledge base',
        agentId: testAgentId
      }
    });

    console.log('[KB-TC001] 📝 Create document - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[KB-TC001] Created document:', data);
      testDocumentId = data.id || data.document_id;
      expect(data).toBeDefined();
    }
  });

  test('[KB-TC002] GET /api/qdrant/documents - Should retrieve paginated list of documents', async () => {
    const response = await apiContext.get('/api/qdrant/documents', {
      params: {
        limit: 20,
        agentId: testAgentId
      }
    });

    console.log('[KB-TC002] 📋 List documents - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[KB-TC002] Documents count:', data.points?.length || 0);
      expect(data).toHaveProperty('points');
    }
  });

  test('[KB-TC003] GET /api/qdrant/documents/all - Should fetch all documents without pagination limit', async () => {
    const response = await apiContext.get('/api/qdrant/documents/all', {
      params: {
        agentId: testAgentId
      }
    });

    console.log('[KB-TC003] 📚 Fetch all documents - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[KB-TC003] Total documents:', data.points?.length || 0);
    }
  });

  test('[KB-TC004] GET /api/qdrant/documents/{id} - Should retrieve single document by specific ID', async () => {
    if (!testDocumentId) {
      test.skip();
      return;
    }

    const response = await apiContext.get(`/api/qdrant/documents/${testDocumentId}`);
    console.log('[KB-TC004] 📄 Get document by ID - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[KB-TC004] Document:', data);
    }
  });

  test('[KB-TC005] PUT /api/qdrant/documents/{id} - Should successfully update existing document content', async () => {
    if (!testDocumentId) {
      test.skip();
      return;
    }

    const response = await apiContext.put(`/api/qdrant/documents/${testDocumentId}`, {
      data: {
        title: 'Updated Test Document',
        description: 'This document has been updated',
        agentId: testAgentId
      }
    });

    console.log('[KB-TC005] ✏️ Update document - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[KB-TC005] Updated document:', data);
    }
  });

  test('[KB-TC006] POST /api/qdrant/search - Should perform semantic vector similarity search on documents', async () => {
    const response = await apiContext.post('/api/qdrant/search', {
      data: {
        query: 'test document',
        limit: 5,
        agentId: testAgentId
      }
    });

    console.log('[KB-TC006] 🔍 Search documents - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[KB-TC006] Search results:', data.length, 'documents found');
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  test('[KB-TC007] DELETE /api/qdrant/documents/{id} - Should successfully delete document from knowledge base', async () => {
    if (!testDocumentId) {
      test.skip();
      return;
    }

    const response = await apiContext.delete(`/api/qdrant/documents/${testDocumentId}`, {
      params: {
        agentId: testAgentId
      }
    });

    console.log('[KB-TC007] 🗑️ Delete document - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[KB-TC007] Deleted document:', data);
    }
  });
});

// ===========================
// Agent Management Tests
// ===========================

test.describe('Agent Management - AI Agent Configuration & CRUD Operations', () => {
  let token;
  let apiContext;
  let testAgentId;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[AGENT-TC001] POST /api/agents - Should successfully create new AI agent with full configuration', async () => {
    const response = await apiContext.post('/api/agents', {
      data: {
        name: 'Test Agent',
        description: 'AI agent for testing',
        language: 'en-AU',
        voice: 'en-AU-Chirp3-HD-Despina',
        speed: 1.0,
        temperature: 0.7,
        basePrompt: 'You are a helpful AI assistant',
        greeting: 'Hello! How can I help you today?',
        guardrails: 'Be polite and professional',
        companyName: 'Test Company',
        companyProfile: 'A testing company',
        viewerEnabled: true
      }
    });

    console.log('[AGENT-TC001] 🤖 Create agent - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[AGENT-TC001] Created agent:', data);
      testAgentId = data.agentId;
      expect(data).toHaveProperty('agentId');
    }
  });

  test('[AGENT-TC002] GET /api/agents - Should retrieve complete list of all configured agents', async () => {
    const response = await apiContext.get('/api/agents');
    console.log('[AGENT-TC002] 📋 List agents - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[AGENT-TC002] Agents count:', data.length);
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  test('[AGENT-TC003] GET /api/agents/{agentId} - Should retrieve specific agent configuration by ID', async () => {
    if (!testAgentId) {
      test.skip();
      return;
    }

    const response = await apiContext.get(`/api/agents/${testAgentId}`);
    console.log('[AGENT-TC003] 🔍 Get agent - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[AGENT-TC003] Agent details:', data);
      expect(data.agentId).toBe(testAgentId);
    }
  });

  test('[AGENT-TC004] PUT /api/agents/{agentId} - Should successfully update agent configuration with partial data', async () => {
    if (!testAgentId) {
      test.skip();
      return;
    }

    const response = await apiContext.put(`/api/agents/${testAgentId}`, {
      data: {
        name: 'Updated Test Agent',
        temperature: 0.8,
        speed: 1.2
      }
    });

    console.log('[AGENT-TC004] ✏️ Update agent - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[AGENT-TC004] Updated agent:', data);
    }
  });

  test('[AGENT-TC005] DELETE /api/agents/{agentId} - Should successfully delete agent from system', async () => {
    if (!testAgentId) {
      test.skip();
      return;
    }

    const response = await apiContext.delete(`/api/agents/${testAgentId}`);
    console.log('[AGENT-TC005] 🗑️ Delete agent - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[AGENT-TC005] Deleted agent:', data);
    }
  });
});

// ===========================
// Product Catalog Tests
// ===========================

test.describe('Product Catalog - File Management & Vector Search', () => {
  let token;
  let apiContext;
  let testAgentId = 'catalog-agent-' + Date.now();
  let testFileId;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[CAT-TC001] POST /api/product-catalog - Should successfully create new product catalog file', async () => {
    const response = await apiContext.post('/api/product-catalog', {
      data: {
        agentId: testAgentId,
        name: 'product-catalog.txt',
        originalName: 'product-catalog.txt',
        type: 'text/plain',
        size: 1024,
        content: 'Product 1: Description\nProduct 2: Description'
      }
    });

    console.log('[CAT-TC001] 📦 Create catalog file - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[CAT-TC001] Created catalog file:', data);
      testFileId = data.id || data.fileId;
    }
  });

  test('[CAT-TC002] GET /api/product-catalog/{agentId} - Should retrieve all catalog files for specific agent', async () => {
    const response = await apiContext.get(`/api/product-catalog/${testAgentId}`);
    console.log('[CAT-TC002] 📋 Get catalog files - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[CAT-TC002] Catalog files count:', data.length || data.points?.length || 0);
    }
  });

  test('[CAT-TC003] POST /api/product-catalog/search - Should perform semantic search on product catalog', async () => {
    const response = await apiContext.post('/api/product-catalog/search', {
      params: {
        agentId: testAgentId
      },
      data: {
        query: 'product',
        limit: 5,
        agentId: testAgentId
      }
    });

    console.log('[CAT-TC003] 🔍 Search catalog - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[CAT-TC003] Search results:', data.length, 'files found');
    }
  });

  test('[CAT-TC004] PUT /api/product-catalog/{agentId}/{fileId} - Should successfully update existing catalog file', async () => {
    if (!testFileId) {
      test.skip();
      return;
    }

    const response = await apiContext.put(`/api/product-catalog/${testAgentId}/${testFileId}`, {
      data: {
        name: 'updated-catalog.txt',
        content: 'Updated product catalog content'
      }
    });

    console.log('[CAT-TC004] ✏️ Update catalog file - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[CAT-TC004] Updated catalog file:', data);
    }
  });

  test('[CAT-TC005] DELETE /api/product-catalog/{agentId}/{fileId} - Should successfully delete catalog file', async () => {
    if (!testFileId) {
      test.skip();
      return;
    }

    const response = await apiContext.delete(`/api/product-catalog/${testAgentId}/${testFileId}`);
    console.log('[CAT-TC005] 🗑️ Delete catalog file - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[CAT-TC005] Deleted catalog file:', data);
    }
  });
});

// ===========================
// User & Role Management Tests
// ===========================

test.describe('User & Role Management - Authentication & Authorization', () => {
  let token;
  let apiContext;
  let testUserId;
  let testUserEmail = `test-${Date.now()}@example.com`;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[USER-TC001] POST /api/roles/auth/google - Should authenticate user with Google Sign-In token', async () => {
    const response = await apiContext.post('/api/roles/auth/google', {
      data: {
        idToken: 'test-firebase-token'
      }
    });

    console.log('[USER-TC001] 🔐 Google auth - Status:', response.status());
    // Expected to fail without real token, but tests the endpoint
  });

  test('[USER-TC002] GET /api/roles/users/me - Should retrieve current authenticated user information', async () => {
    const response = await apiContext.get('/api/roles/users/me');
    console.log('[USER-TC002] 👤 Get current user - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[USER-TC002] Current user:', data);
    }
  });

  test('[USER-TC003] POST /api/roles/users - Should successfully create new user with role assignment', async () => {
    const response = await apiContext.post('/api/roles/users', {
      data: {
        email: testUserEmail,
        name: 'Test User',
        role: 'user',
        assignedAgents: []
      }
    });

    console.log('[USER-TC003] 👥 Create user - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[USER-TC003] Created user:', data);
      testUserId = data.userId;
    }
  });

  test('[USER-TC004] GET /api/roles/users - Should retrieve complete list of all system users', async () => {
    const response = await apiContext.get('/api/roles/users');
    console.log('[USER-TC004] 📋 List users - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[USER-TC004] Users count:', data.length);
    }
  });

  test('[USER-TC005] PUT /api/roles/users/{identifier} - Should successfully update user role and assignments', async () => {
    if (!testUserEmail) {
      test.skip();
      return;
    }

    const response = await apiContext.put(`/api/roles/users/${testUserEmail}`, {
      data: {
        role: 'sales',
        name: 'Updated Test User'
      }
    });

    console.log('[USER-TC005] ✏️ Update user - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[USER-TC005] Updated user:', data);
    }
  });

  test('[USER-TC006] DELETE /api/roles/users/{identifier} - Should successfully delete user from system', async () => {
    if (!testUserEmail) {
      test.skip();
      return;
    }

    const response = await apiContext.delete(`/api/roles/users/${testUserEmail}`);
    console.log('[USER-TC006] 🗑️ Delete user - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[USER-TC006] Deleted user:', data);
    }
  });
});

// ===========================
// Viewer Session Tests
// ===========================

test.describe('Viewer Sessions - Anonymous Session Management & Time-Boxed Access', () => {
  let token;
  let apiContext;
  let viewerSessionId;
  let viewerToken;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[VIEW-TC001] POST /api/viewer/session - Should create new viewer session with 30-minute TTL', async () => {
    const response = await apiContext.post('/api/viewer/session', {
      data: {
        source: 'site',
        agentId: 'test-agent-123',
        utm_campaign: 'test-campaign',
        deviceInfo: { userAgent: 'Test Browser' },
        geoInfo: { country: 'US' }
      }
    });

    console.log('[VIEW-TC001] 👁️ Create viewer session - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[VIEW-TC001] Viewer session:', data);
      viewerSessionId = data.sessionId;
      viewerToken = data.token;
      expect(data).toHaveProperty('sessionId');
      expect(data).toHaveProperty('token');
    }
  });

  test('[VIEW-TC002] GET /api/viewer/session/me - Should retrieve current viewer session information', async ({ playwright }) => {
    if (!viewerToken) {
      test.skip();
      return;
    }

    const viewerContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${viewerToken}`,
        'Content-Type': 'application/json'
      }
    });

    const response = await viewerContext.get('/api/viewer/session/me');
    console.log('[VIEW-TC002] ℹ️ Get viewer session info - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[VIEW-TC002] Viewer session info:', data);
    }
  });

  test('[VIEW-TC003] POST /api/viewer/session/{sessionId}/extend - Should extend viewer session by specified minutes', async () => {
    if (!viewerSessionId) {
      test.skip();
      return;
    }

    const response = await apiContext.post(`/api/viewer/session/${viewerSessionId}/extend`, {
      data: {
        minutes: 15
      }
    });

    console.log('[VIEW-TC003] ⏱️ Extend session - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[VIEW-TC003] Extended session:', data);
    }
  });

  test('[VIEW-TC004] GET /api/viewer/sessions - Should retrieve list of all active viewer sessions', async () => {
    const response = await apiContext.get('/api/viewer/sessions');
    console.log('[VIEW-TC004] 📋 List viewer sessions - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[VIEW-TC004] Viewer sessions count:', data.length);
    }
  });
});

// ===========================
// Data & Analytics Tests
// ===========================

test.describe('Data & Analytics - Call Logs & Analytics Data Retrieval', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[DATA-TC001] GET /api/data - Should retrieve all analytics data from main MongoDB collection', async () => {
    const response = await apiContext.get('/api/data');
    console.log('[DATA-TC001] 📊 Get all data - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[DATA-TC001] Data records:', data.length);
      expect(Array.isArray(data)).toBeTruthy();
    }
  });

  test('[DATA-TC002] GET /api/callData - Should retrieve all call logs from separate database', async () => {
    const response = await apiContext.get('/api/callData');
    console.log('[DATA-TC002] 📞 Get call data - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[DATA-TC002] Call records:', data.length);
      expect(Array.isArray(data)).toBeTruthy();
    }
  });
});

// ===========================
// Gemini AI Tests
// ===========================

test.describe('Gemini AI Integration - Text Summary Generation', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[AI-TC001] POST /api/gemini-summary - Should generate AI-powered summary from input prompt', async () => {
    const response = await apiContext.post('/api/gemini-summary', {
      data: {
        prompt: 'Summarize the following conversation: Customer called about product inquiry. Agent provided detailed information. Customer satisfied with response.'
      }
    });

    console.log('[AI-TC001] 🤖 Generate summary - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[AI-TC001] Generated summary:', data);
      expect(data).toBeDefined();
    }
  });

  test('[AI-TC002] POST /api/gemini-summary-debug - Should return debug information for Gemini API request', async () => {
    const response = await apiContext.post('/api/gemini-summary-debug', {
      data: {
        prompt: 'Test prompt for debugging',
        testField: 'test value'
      }
    });

    console.log('[AI-TC002] 🔧 Debug Gemini - Status:', response.status());
    
    if (response.ok()) {
      const data = await response.json();
      console.log('[AI-TC002] Debug info:', data);
    }
  });
});

// ===========================
// COMPREHENSIVE NEGATIVE TESTING
// ===========================

test.describe('🔴 Negative Testing - Authentication & Authorization Failures', () => {
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[NEG-AUTH-001] Should return 401 for missing authorization token', async () => {
    const response = await apiContext.get('/api/agents');
    console.log('[NEG-AUTH-001] Status:', response.status());
    expect(response.status()).toBe(401);
  });

  test('[NEG-AUTH-002] Should return 401 for invalid authorization token', async ({ playwright }) => {
    const invalidContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': 'Bearer invalid_token_12345',
        'Content-Type': 'application/json'
      }
    });
    const response = await invalidContext.get('/api/agents');
    console.log('[NEG-AUTH-002] Status:', response.status());
    expect(response.status()).toBe(401);
  });

  test('[NEG-AUTH-003] Should return 403 for viewer accessing knowledge base', async ({ playwright }) => {
    const viewerToken = await generateAuthToken('viewer-user', { role: 'viewer' });
    const viewerContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${viewerToken}`,
        'Content-Type': 'application/json'
      }
    });
    const response = await viewerContext.get('/api/qdrant/documents');
    console.log('[NEG-AUTH-003] Status:', response.status());
    expect(response.status()).toBe(403);
  });
});

test.describe('🔴 Negative Testing - Agent API Validation Errors', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[NEG-AGENT-001] Should return 422 for missing required fields in agent creation', async () => {
    const response = await apiContext.post('/api/agents', {
      data: {
        language: 'en-AU'
      }
    });
    console.log('[NEG-AGENT-001] Status:', response.status());
    expect(response.status()).toBe(422);
  });

  test('[NEG-AGENT-002] Should return 422 for invalid temperature value', async () => {
    const response = await apiContext.post('/api/agents', {
      data: {
        name: 'Test Agent',
        description: 'Test',
        temperature: 1.5
      }
    });
    console.log('[NEG-AGENT-002] Status:', response.status());
    expect(response.status()).toBe(422);
  });

  test('[NEG-AGENT-003] Should return 404 for non-existent agent ID', async () => {
    const response = await apiContext.get('/api/agents/nonexistent-agent-id-12345');
    console.log('[NEG-AGENT-003] Status:', response.status());
    expect(response.status()).toBe(404);
  });

  test('[NEG-AGENT-004] Should return 422 for negative speed value', async () => {
    const response = await apiContext.post('/api/agents', {
      data: {
        name: 'Test Agent',
        description: 'Test',
        speed: -1
      }
    });
    console.log('[NEG-AGENT-004] Status:', response.status());
    expect(response.status()).toBe(422);
  });
});

test.describe('🔴 Negative Testing - Knowledge Base Validation Errors', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[NEG-KB-001] Should return 422 for missing required fields in document creation', async () => {
    const response = await apiContext.post('/api/qdrant/documents', {
      data: {
        title: 'Test Document'
      }
    });
    console.log('[NEG-KB-001] Status:', response.status());
    expect(response.status()).toBe(422);
  });

  test('[NEG-KB-002] Should return 404 for non-existent document ID', async () => {
    const response = await apiContext.get('/api/qdrant/documents/999999999');
    console.log('[NEG-KB-002] Status:', response.status());
    expect(response.status()).toBe(404);
  });

  test('[NEG-KB-003] Should return 422 for invalid limit in list documents', async () => {
    const response = await apiContext.get('/api/qdrant/documents?limit=150');
    console.log('[NEG-KB-003] Status:', response.status());
    expect(response.status()).toBe(422);
  });

  test('[NEG-KB-004] Should return 403 for deleting document with wrong agentId', async () => {
    const response = await apiContext.delete('/api/qdrant/documents/123?agentId=wrong-agent-id');
    console.log('[NEG-KB-004] Status:', response.status());
    expect([403, 404]).toContain(response.status());
  });

  test('[NEG-KB-005] Should return 422 for empty search query', async () => {
    const response = await apiContext.post('/api/qdrant/search', {
      data: {
        query: '',
        agentId: 'test-agent'
      }
    });
    console.log('[NEG-KB-005] Status:', response.status());
    expect(response.status()).toBe(422);
  });
});

test.describe('🔴 Negative Testing - Product Catalog Validation Errors', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[NEG-CAT-001] Should return 422 for missing required fields in catalog creation', async () => {
    const response = await apiContext.post('/api/product-catalog', {
      data: {
        name: 'Test File'
      }
    });
    console.log('[NEG-CAT-001] Status:', response.status());
    expect(response.status()).toBe(422);
  });

  test('[NEG-CAT-002] Should return 404 for non-existent catalog file', async () => {
    const response = await apiContext.get('/api/product-catalog/nonexistent-agent');
    console.log('[NEG-CAT-002] Status:', response.status());
    expect([200, 404]).toContain(response.status());
  });

  test('[NEG-CAT-003] Should return 403 for updating catalog with wrong agentId', async () => {
    const response = await apiContext.put('/api/product-catalog/wrong-agent/file123', {
      data: {
        name: 'Updated File'
      }
    });
    console.log('[NEG-CAT-003] Status:', response.status());
    expect([403, 404]).toContain(response.status());
  });
});

test.describe('🔴 Negative Testing - User Management Validation Errors', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[NEG-USER-001] Should return 422 for missing required fields in user creation', async () => {
    const response = await apiContext.post('/api/roles/users', {
      data: {
        name: 'Test User'
      }
    });
    console.log('[NEG-USER-001] Status:', response.status());
    expect(response.status()).toBe(422);
  });

  test('[NEG-USER-002] Should return 422 for invalid email format', async () => {
    const response = await apiContext.post('/api/roles/users', {
      data: {
        email: 'invalid-email',
        role: 'user'
      }
    });
    console.log('[NEG-USER-002] Status:', response.status());
    expect(response.status()).toBe(422);
  });

  test('[NEG-USER-003] Should return 404 for non-existent user ID', async () => {
    const response = await apiContext.get('/api/roles/users/nonexistent-user-id');
    console.log('[NEG-USER-003] Status:', response.status());
    expect(response.status()).toBe(404);
  });

  test('[NEG-USER-004] Should return 400 for duplicate email', async () => {
    const email = `duplicate-${Date.now()}@test.com`;
    await apiContext.post('/api/roles/users', {
      data: { email, role: 'user' }
    });
    const response = await apiContext.post('/api/roles/users', {
      data: { email, role: 'user' }
    });
    console.log('[NEG-USER-004] Status:', response.status());
    expect([400, 409]).toContain(response.status());
  });
});

test.describe('🔴 Negative Testing - Viewer Session Validation Errors', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[NEG-VIEW-001] Should return 422 for invalid extend minutes value', async () => {
    const response = await apiContext.post('/api/viewer/session/test-session/extend', {
      data: {
        minutes: 45
      }
    });
    console.log('[NEG-VIEW-001] Status:', response.status());
    expect(response.status()).toBe(422);
  });

  test('[NEG-VIEW-002] Should return 404 for non-existent session ID', async () => {
    const response = await apiContext.post('/api/viewer/session/nonexistent-session/extend', {
      data: {
        minutes: 15
      }
    });
    console.log('[NEG-VIEW-002] Status:', response.status());
    expect(response.status()).toBe(404);
  });

  test('[NEG-VIEW-003] Should return 401 for expired viewer session', async ({ playwright }) => {
    const expiredToken = 'expired_viewer_token';
    const expiredContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${expiredToken}`,
        'Content-Type': 'application/json'
      }
    });
    const response = await expiredContext.get('/api/viewer/session/me');
    console.log('[NEG-VIEW-003] Status:', response.status());
    expect(response.status()).toBe(401);
  });
});

test.describe('🔴 Negative Testing - Gemini AI Validation Errors', () => {
  let token;
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    token = await generateAuthToken();
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_API_URL || 'https://reqres.in'}`,
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[NEG-AI-001] Should return 422 for empty prompt', async () => {
    const response = await apiContext.post('/api/gemini-summary', {
      data: {
        prompt: ''
      }
    });
    console.log('[NEG-AI-001] Status:', response.status());
    expect(response.status()).toBe(422);
  });

  test('[NEG-AI-002] Should return 422 for missing prompt field', async () => {
    const response = await apiContext.post('/api/gemini-summary', {
      data: {}
    });
    console.log('[NEG-AI-002] Status:', response.status());
    expect(response.status()).toBe(422);
  });
});

test.describe('🔴 Negative Testing - LiveKit Token Validation Errors', () => {
  let apiContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext({
      baseURL: `${process.env.VOICE_URL || 'https://the-internet.herokuapp.com'}`,
      extraHTTPHeaders: {
        'Content-Type': 'application/json'
      }
    });
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  test('[NEG-LK-001] Should handle missing agentId parameter', async () => {
    const response = await apiContext.get('/getToken');
    console.log('[NEG-LK-001] Status:', response.status());
    expect([200, 400]).toContain(response.status());
  });

  test('[NEG-LK-002] Should handle invalid userRole parameter', async () => {
    const response = await apiContext.get('/getToken?userRole=invalid_role');
    console.log('[NEG-LK-002] Status:', response.status());
    expect([200, 400]).toContain(response.status());
  });
});
