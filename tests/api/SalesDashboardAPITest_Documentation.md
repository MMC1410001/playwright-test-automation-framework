# SalesDashboardAPITest.spec.js - Test Documentation

## Overview
This test suite provides comprehensive API testing for the Sales Dashboard application using Playwright Test framework. It covers authentication, configuration management, knowledge base operations, agent management, product catalog, user management, viewer sessions, analytics, AI integration, and extensive negative testing scenarios.

## Test File Location
`tests/api/SalesDahsboardAPITest.spec.js`

## Dependencies
- **@playwright/test**: Playwright testing framework
- **firebaseAuth.js**: Helper module for Firebase authentication token generation

## Test Environments
The test suite interacts with two main API endpoints:
1. **https://reqres.in** - Configuration & Token Management
2. **https://reqres.in** - Main API Services

---

## Authentication Setup

### generateAuthToken Function
```javascript
async function generateAuthToken(userId = 'test-user', claims = {})
```
**Purpose**: Generates Firebase ID token for API authentication  
**Parameters**:
- `userId` (optional): User identifier, defaults to 'test-user'
- `claims` (optional): Additional JWT claims object

**Returns**: Firebase ID token string

---

## Test Suites

### 1. API 1: Configuration & Token Management
**Base URL**: `https://the-internet.herokuapp.com`  
**Authentication**: Required (Bearer token)

#### Test Cases

| Test ID | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| API1-TC001 | /config | GET | Retrieve configuration settings |
| API1-TC002 | /config | POST | Update configuration settings |
| API1-TC003 | /getToken | GET | Generate LiveKit token for developer role |
| API1-TC004 | /getToken | GET | Generate LiveKit token for viewer role |

#### API1-TC001: GET /config
**Purpose**: Verify configuration retrieval  
**Expected Response**: Configuration data object  
**Validation**: Response data is defined

#### API1-TC002: POST /config
**Purpose**: Update system configuration  
**Request Body**:
```json
{
  "setting": "test-value",
  "timestamp": "ISO-8601 timestamp"
}
```

#### API1-TC003: GET /getToken (Developer)
**Purpose**: Generate LiveKit token for developer role  
**Query Parameters**:
- `identity`: test-identity-123
- `name`: Test User
- `room`: test-room
- `agentId`: agent-123
- `userRole`: developer

**Expected Response**:
```json
{
  "token": "livekit_token_string",
  "room": "room_name"
}
```

#### API1-TC004: GET /getToken (Viewer)
**Purpose**: Generate LiveKit token for viewer role  
**Query Parameters**:
- `identity`: viewer-456
- `name`: Viewer User
- `userRole`: viewer

---

### 2. Health Check & Root Endpoints
**Base URL**: `https://reqres.in`  
**Authentication**: Required (Bearer token)

#### Test Cases

| Test ID | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| API2-TC001 | / | GET | Root endpoint health check |
| API2-TC002 | /api/health | GET | Health check endpoint |

**Purpose**: Verify API availability and health status  
**Expected**: HTTP 200 OK responses

---

### 3. Knowledge Base - Qdrant Vector Database
**Base URL**: `https://reqres.in`  
**Authentication**: Required (Bearer token)

#### Test Cases

| Test ID | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| KB-TC001 | /api/qdrant/documents | POST | Create new document |
| KB-TC002 | /api/qdrant/documents | GET | List documents (paginated) |
| KB-TC003 | /api/qdrant/documents/all | GET | Fetch all documents |
| KB-TC004 | /api/qdrant/documents/{id} | GET | Get document by ID |
| KB-TC005 | /api/qdrant/documents/{id} | PUT | Update document |
| KB-TC006 | /api/qdrant/search | POST | Semantic search |
| KB-TC007 | /api/qdrant/documents/{id} | DELETE | Delete document |

#### KB-TC001: Create Document
**Request Body**:
```json
{
  "title": "Test Document",
  "description": "This is a test document for knowledge base",
  "agentId": "test-agent-{timestamp}"
}
```
**Response**: Document object with `id` or `document_id`

#### KB-TC002: List Documents
**Query Parameters**:
- `limit`: 20
- `agentId`: test-agent-{timestamp}

**Expected Response**: Object with `points` array

#### KB-TC006: Semantic Search
**Request Body**:
```json
{
  "query": "test document",
  "limit": 5,
  "agentId": "test-agent-{timestamp}"
}
```
**Expected Response**: Array of matching documents

---

### 4. Agent Management
**Base URL**: `https://reqres.in`  
**Authentication**: Required (Bearer token)

#### Test Cases

| Test ID | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| AGENT-TC001 | /api/agents | POST | Create new AI agent |
| AGENT-TC002 | /api/agents | GET | List all agents |
| AGENT-TC003 | /api/agents/{agentId} | GET | Get agent by ID |
| AGENT-TC004 | /api/agents/{agentId} | PUT | Update agent |
| AGENT-TC005 | /api/agents/{agentId} | DELETE | Delete agent |

#### AGENT-TC001: Create Agent
**Request Body**:
```json
{
  "name": "Test Agent",
  "description": "AI agent for testing",
  "language": "en-AU",
  "voice": "en-AU-Chirp3-HD-Despina",
  "speed": 1.0,
  "temperature": 0.7,
  "basePrompt": "You are a helpful AI assistant",
  "greeting": "Hello! How can I help you today?",
  "guardrails": "Be polite and professional",
  "companyName": "Test Company",
  "companyProfile": "A testing company",
  "viewerEnabled": true
}
```
**Response**: Object with `agentId`

#### AGENT-TC004: Update Agent
**Request Body** (partial update):
```json
{
  "name": "Updated Test Agent",
  "temperature": 0.8,
  "speed": 1.2
}
```

---

### 5. Product Catalog
**Base URL**: `https://reqres.in`  
**Authentication**: Required (Bearer token)

#### Test Cases

| Test ID | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| CAT-TC001 | /api/product-catalog | POST | Create catalog file |
| CAT-TC002 | /api/product-catalog/{agentId} | GET | Get catalog files |
| CAT-TC003 | /api/product-catalog/search | POST | Search catalog |
| CAT-TC004 | /api/product-catalog/{agentId}/{fileId} | PUT | Update catalog file |
| CAT-TC005 | /api/product-catalog/{agentId}/{fileId} | DELETE | Delete catalog file |

#### CAT-TC001: Create Catalog File
**Request Body**:
```json
{
  "agentId": "catalog-agent-{timestamp}",
  "name": "product-catalog.txt",
  "originalName": "product-catalog.txt",
  "type": "text/plain",
  "size": 1024,
  "content": "Product 1: Description\nProduct 2: Description"
}
```

#### CAT-TC003: Search Catalog
**Query Parameters**: `agentId`  
**Request Body**:
```json
{
  "query": "product",
  "limit": 5,
  "agentId": "catalog-agent-{timestamp}"
}
```

---

### 6. User & Role Management
**Base URL**: `https://reqres.in`  
**Authentication**: Required (Bearer token)

#### Test Cases

| Test ID | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| USER-TC001 | /api/roles/auth/google | POST | Google authentication |
| USER-TC002 | /api/roles/users/me | GET | Get current user |
| USER-TC003 | /api/roles/users | POST | Create user |
| USER-TC004 | /api/roles/users | GET | List all users |
| USER-TC005 | /api/roles/users/{identifier} | PUT | Update user |
| USER-TC006 | /api/roles/users/{identifier} | DELETE | Delete user |

#### USER-TC003: Create User
**Request Body**:
```json
{
  "email": "test-{timestamp}@example.com",
  "name": "Test User",
  "role": "user",
  "assignedAgents": []
}
```
**Response**: Object with `userId`

#### USER-TC005: Update User
**Request Body**:
```json
{
  "role": "sales",
  "name": "Updated Test User"
}
```

---

### 7. Viewer Sessions
**Base URL**: `https://reqres.in`  
**Authentication**: Required (Bearer token)

#### Test Cases

| Test ID | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| VIEW-TC001 | /api/viewer/session | POST | Create viewer session |
| VIEW-TC002 | /api/viewer/session/me | GET | Get session info |
| VIEW-TC003 | /api/viewer/session/{sessionId}/extend | POST | Extend session |
| VIEW-TC004 | /api/viewer/sessions | GET | List all sessions |

#### VIEW-TC001: Create Viewer Session
**Purpose**: Create anonymous session with 30-minute TTL  
**Request Body**:
```json
{
  "source": "site",
  "agentId": "test-agent-123",
  "utm_campaign": "test-campaign",
  "deviceInfo": { "userAgent": "Test Browser" },
  "geoInfo": { "country": "US" }
}
```
**Response**:
```json
{
  "sessionId": "session_id_string",
  "token": "viewer_token_string"
}
```

#### VIEW-TC003: Extend Session
**Request Body**:
```json
{
  "minutes": 15
}
```

---

### 8. Data & Analytics
**Base URL**: `https://reqres.in`  
**Authentication**: Required (Bearer token)

#### Test Cases

| Test ID | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| DATA-TC001 | /api/data | GET | Get all analytics data |
| DATA-TC002 | /api/callData | GET | Get all call logs |

**Purpose**: Retrieve analytics and call log data from MongoDB  
**Expected Response**: Array of data records

---

### 9. Gemini AI Integration
**Base URL**: `https://reqres.in`  
**Authentication**: Required (Bearer token)

#### Test Cases

| Test ID | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| AI-TC001 | /api/gemini-summary | POST | Generate AI summary |
| AI-TC002 | /api/gemini-summary-debug | POST | Debug Gemini API |

#### AI-TC001: Generate Summary
**Request Body**:
```json
{
  "prompt": "Summarize the following conversation: Customer called about product inquiry. Agent provided detailed information. Customer satisfied with response."
}
```

---

## Negative Testing Suites

### 10. Authentication & Authorization Failures

| Test ID | Scenario | Expected Status |
|---------|----------|-----------------|
| NEG-AUTH-001 | Missing authorization token | 401 |
| NEG-AUTH-002 | Invalid authorization token | 401 |
| NEG-AUTH-003 | Viewer accessing knowledge base | 403 |

### 11. Agent API Validation Errors

| Test ID | Scenario | Expected Status |
|---------|----------|-----------------|
| NEG-AGENT-001 | Missing required fields | 422 |
| NEG-AGENT-002 | Invalid temperature value (>1.0) | 422 |
| NEG-AGENT-003 | Non-existent agent ID | 404 |
| NEG-AGENT-004 | Negative speed value | 422 |

### 12. Knowledge Base Validation Errors

| Test ID | Scenario | Expected Status |
|---------|----------|-----------------|
| NEG-KB-001 | Missing required fields | 422 |
| NEG-KB-002 | Non-existent document ID | 404 |
| NEG-KB-003 | Invalid limit (>100) | 422 |
| NEG-KB-004 | Wrong agentId for deletion | 403/404 |
| NEG-KB-005 | Empty search query | 422 |

### 13. Product Catalog Validation Errors

| Test ID | Scenario | Expected Status |
|---------|----------|-----------------|
| NEG-CAT-001 | Missing required fields | 422 |
| NEG-CAT-002 | Non-existent catalog file | 200/404 |
| NEG-CAT-003 | Wrong agentId for update | 403/404 |

### 14. User Management Validation Errors

| Test ID | Scenario | Expected Status |
|---------|----------|-----------------|
| NEG-USER-001 | Missing required fields | 422 |
| NEG-USER-002 | Invalid email format | 422 |
| NEG-USER-003 | Non-existent user ID | 404 |
| NEG-USER-004 | Duplicate email | 400/409 |

### 15. Viewer Session Validation Errors

| Test ID | Scenario | Expected Status |
|---------|----------|-----------------|
| NEG-VIEW-001 | Invalid extend minutes (>30) | 422 |
| NEG-VIEW-002 | Non-existent session ID | 404 |
| NEG-VIEW-003 | Expired viewer session | 401 |

### 16. Gemini AI Validation Errors

| Test ID | Scenario | Expected Status |
|---------|----------|-----------------|
| NEG-AI-001 | Empty prompt | 422 |
| NEG-AI-002 | Missing prompt field | 422 |

### 17. LiveKit Token Validation Errors

| Test ID | Scenario | Expected Status |
|---------|----------|-----------------|
| NEG-LK-001 | Missing agentId parameter | 200/400 |
| NEG-LK-002 | Invalid userRole parameter | 200/400 |

---

## Test Execution Flow

### Setup (beforeAll)
1. Generate Firebase authentication token
2. Create API context with base URL
3. Set authorization headers (Bearer token)
4. Set content-type to application/json

### Teardown (afterAll)
1. Dispose API context to clean up resources

### Test Execution Pattern
1. Make API request with appropriate method and data
2. Log response status with emoji indicator
3. Validate response if successful (status 2xx)
4. Extract and store IDs for dependent tests
5. Skip dependent tests if prerequisite data unavailable

---

## Running the Tests

### Execute All Tests
```bash
npx playwright test tests/api/SalesDahsboardAPITest.spec.js
```

### Execute Specific Test Suite
```bash
npx playwright test tests/api/SalesDahsboardAPITest.spec.js -g "Knowledge Base"
```

### Execute with Headed Browser
```bash
npx playwright test tests/api/SalesDahsboardAPITest.spec.js --headed
```

### Generate HTML Report
```bash
npx playwright test tests/api/SalesDahsboardAPITest.spec.js --reporter=html
```

---

## Test Data Management

### Dynamic Test Data
- **Agent IDs**: Generated using `Date.now()` timestamp
- **User Emails**: Generated using `test-{timestamp}@example.com`
- **Document IDs**: Captured from creation responses
- **Session IDs**: Captured from session creation

### Test Data Cleanup
Tests create temporary data that should be cleaned up:
- Documents in Qdrant vector database
- AI agents
- Product catalog files
- User accounts
- Viewer sessions

**Note**: Delete operations are included in test suites for cleanup

---

## Common Response Patterns

### Success Response (2xx)
```json
{
  "id": "resource_id",
  "status": "success",
  "data": { ... }
}
```

### Error Response (4xx/5xx)
```json
{
  "error": "Error message",
  "statusCode": 400,
  "details": { ... }
}
```

---

## Troubleshooting

### Authentication Failures
- Verify `serviceAccountKey_python.json` exists
- Check Firebase API key is valid
- Ensure token hasn't expired

### Test Skips
- Tests skip when dependent data unavailable
- Check prerequisite tests passed successfully
- Verify IDs captured correctly from responses

### Network Issues
- Verify API endpoints are accessible
- Check firewall/proxy settings
- Ensure SSL certificates are valid

---

## Best Practices for QA

1. **Run tests in sequence**: Some tests depend on data from previous tests
2. **Check console logs**: Emoji indicators show test progress
3. **Verify cleanup**: Ensure delete operations execute successfully
4. **Monitor rate limits**: API may have rate limiting
5. **Use unique identifiers**: Timestamps prevent data conflicts
6. **Validate responses**: Check both status codes and response bodies
7. **Test isolation**: Each test suite creates its own test data
8. **Error handling**: Tests handle both success and failure gracefully

---

## Test Coverage Summary

- ✅ Configuration Management
- ✅ Token Generation (LiveKit)
- ✅ Health Checks
- ✅ Knowledge Base CRUD
- ✅ Vector Search
- ✅ Agent Management
- ✅ Product Catalog
- ✅ User Management
- ✅ Role-Based Access
- ✅ Viewer Sessions
- ✅ Analytics Data
- ✅ AI Integration (Gemini)
- ✅ Comprehensive Negative Testing
- ✅ Authentication & Authorization
- ✅ Input Validation
- ✅ Error Handling

**Total Test Cases**: 80+ (including positive and negative scenarios)
