# firebaseAuth.js - Helper Module Documentation

## Overview
This helper module provides Firebase authentication functionality for API testing. It generates Firebase custom tokens and exchanges them for ID tokens that can be used for authenticated API requests.

## File Location
`tests/api/firebaseAuth.js`

## Dependencies
- **jsonwebtoken**: JWT token generation and signing
- **fs**: File system operations to read service account key
- **https**: HTTPS requests to Firebase Auth REST API

## Required Configuration File
**File**: `tests/api/serviceAccountKey_python.json`  
**Type**: Firebase Service Account Key (JSON)  
**Required Fields**:
- `client_email`: Service account email
- `private_key`: RSA private key for signing tokens

---

## Functions

### 1. generateCustomToken(uid, claims)

**Purpose**: Generate Firebase Custom Token for authentication

**Parameters**:
- `uid` (string, optional): User identifier
  - Default: `'test-user'`
  - Used to identify the user in Firebase
- `claims` (object, optional): Additional JWT claims
  - Default: `{}`
  - Can include custom user properties like role, permissions, etc.

**Returns**: String - JWT custom token

**Token Payload Structure**:
```javascript
{
  iss: "service-account-email@project.iam.gserviceaccount.com",
  sub: "service-account-email@project.iam.gserviceaccount.com",
  aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
  iat: 1234567890,  // Current timestamp
  exp: 1234571490,  // Expiry (1 hour from iat)
  uid: "test-user",
  claims: {}
}
```

**Algorithm**: RS256 (RSA Signature with SHA-256)

**Token Expiry**: 1 hour (3600 seconds)

**Example Usage**:
```javascript
const customToken = generateCustomToken('user-123', { role: 'admin' });
```

---

### 2. exchangeCustomTokenForIdToken(customToken)

**Purpose**: Exchange Firebase Custom Token for ID Token using Firebase Auth REST API

**Parameters**:
- `customToken` (string, required): Firebase custom token from generateCustomToken()

**Returns**: Promise<string> - Firebase ID token

**API Endpoint**: 
```
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}
```

**Request Body**:
```json
{
  "token": "custom_token_string",
  "returnSecureToken": true
}
```

**Response Structure**:
```json
{
  "idToken": "firebase_id_token_string",
  "refreshToken": "refresh_token_string",
  "expiresIn": "3600"
}
```

**Error Handling**:
- Rejects promise if no idToken in response
- Rejects promise on network errors
- Rejects promise on JSON parse errors

**Example Usage**:
```javascript
const idToken = await exchangeCustomTokenForIdToken(customToken);
```

---

### 3. getFirebaseIdToken(uid, claims) ⭐ MAIN FUNCTION

**Purpose**: Complete authentication flow - generates custom token and exchanges for ID token

**Parameters**:
- `uid` (string, optional): User identifier
  - Default: `'test-user'`
- `claims` (object, optional): Additional JWT claims
  - Default: `{}`

**Returns**: Promise<string> - Firebase ID token ready for API authentication

**Process Flow**:
1. Generate custom token using service account credentials
2. Log success: "✅ Generated custom token"
3. Exchange custom token for ID token via Firebase API
4. Log success: "✅ Exchanged for ID token"
5. Return ID token

**Error Handling**:
- Logs error with "❌ Error getting Firebase ID token: {message}"
- Throws error to caller for handling

**Example Usage in Tests**:
```javascript
const { getFirebaseIdToken } = require('./firebaseAuth');

// Basic usage
const token = await getFirebaseIdToken();

// With custom user ID
const token = await getFirebaseIdToken('user-123');

// With custom claims
const token = await getFirebaseIdToken('admin-user', { 
  role: 'admin', 
  permissions: ['read', 'write'] 
});

// Use in API request
const apiContext = await playwright.request.newContext({
  baseURL: 'https://api.example.com',
  extraHTTPHeaders: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Module Exports

```javascript
module.exports = {
  generateCustomToken,           // Generate custom token
  exchangeCustomTokenForIdToken, // Exchange for ID token
  getFirebaseIdToken            // Complete flow (recommended)
}
```

---

## Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Load Service Account Key (serviceAccountKey_python.json) │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Generate Custom Token (JWT with RS256)                   │
│    - Sign with private key                                   │
│    - Include uid and custom claims                           │
│    - Set expiry to 1 hour                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Exchange Custom Token for ID Token                       │
│    - POST to Firebase Auth REST API                         │
│    - Send custom token in request body                      │
│    - Receive ID token in response                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Use ID Token for API Authentication                      │
│    - Add to Authorization header: Bearer {idToken}          │
│    - Make authenticated API requests                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Firebase API Key
**Location**: Hardcoded in `exchangeCustomTokenForIdToken` function  
**Value**: `UPDATE_HERE_FIREBASE_WEB_API_KEY`  
**Purpose**: Authenticate requests to Firebase Auth REST API

**Security Note**: Consider moving to environment variable for production

### Service Account Key File
**Path**: `./tests/api/serviceAccountKey_python.json`  
**Format**: JSON  
**Required Fields**:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "<PASTE YOUR SERVICE ACCOUNT PRIVATE KEY HERE>",
  "client_email": "service-account@project.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

---

## Token Specifications

### Custom Token
- **Type**: JWT (JSON Web Token)
- **Algorithm**: RS256
- **Expiry**: 1 hour from generation
- **Audience**: Firebase Identity Toolkit
- **Issuer**: Service account email
- **Subject**: Service account email

### ID Token
- **Type**: Firebase ID Token
- **Expiry**: 1 hour (3600 seconds)
- **Usage**: Bearer token in Authorization header
- **Format**: `Authorization: Bearer {idToken}`

---

## Error Scenarios

### 1. Missing Service Account Key
**Error**: `ENOENT: no such file or directory`  
**Solution**: Ensure `serviceAccountKey_python.json` exists in correct path

### 2. Invalid Private Key
**Error**: `error:0909006C:PEM routines:get_name:no start line`  
**Solution**: Verify private_key format in service account JSON

### 3. Invalid Custom Token
**Error**: `No ID token in response`  
**Solution**: Check custom token generation and service account permissions

### 4. Network Errors
**Error**: `ECONNREFUSED` or `ETIMEDOUT`  
**Solution**: Check internet connectivity and Firebase API availability

### 5. Invalid API Key
**Error**: `API key not valid`  
**Solution**: Verify Firebase API key is correct and enabled

---

## Testing Different User Roles

### Admin User
```javascript
const adminToken = await getFirebaseIdToken('admin-001', { 
  role: 'admin',
  permissions: ['read', 'write', 'delete']
});
```

### Regular User
```javascript
const userToken = await getFirebaseIdToken('user-123', { 
  role: 'user',
  permissions: ['read']
});
```

### Viewer
```javascript
const viewerToken = await getFirebaseIdToken('viewer-456', { 
  role: 'viewer',
  permissions: ['read']
});
```

### Developer
```javascript
const devToken = await getFirebaseIdToken('dev-789', { 
  role: 'developer',
  permissions: ['read', 'write', 'debug']
});
```

---

## Integration with Test Suite

### In SalesDashboardAPITest.spec.js

```javascript
const { getFirebaseIdToken } = require('./firebaseAuth');

// Helper function wrapper
async function generateAuthToken(userId = 'test-user', claims = {}) {
  return await getFirebaseIdToken(userId, claims);
}

// Usage in test setup
test.beforeAll(async ({ playwright }) => {
  // Generate token for authenticated user
  token = await generateAuthToken();
  
  // Create API context with token
  apiContext = await playwright.request.newContext({
    baseURL: 'https://reqres.in',
    extraHTTPHeaders: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
});

// Usage for role-based testing
test('Should test viewer permissions', async ({ playwright }) => {
  const viewerToken = await generateAuthToken('viewer-user', { role: 'viewer' });
  
  const viewerContext = await playwright.request.newContext({
    baseURL: 'https://reqres.in',
    extraHTTPHeaders: {
      'Authorization': `Bearer ${viewerToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  const response = await viewerContext.get('/api/restricted-endpoint');
  expect(response.status()).toBe(403); // Forbidden
});
```

---

## Best Practices

### 1. Token Reuse
- Generate token once in `beforeAll` hook
- Reuse same token across multiple tests in suite
- Reduces API calls and improves test performance

### 2. Token Expiry
- Tokens expire after 1 hour
- For long test runs, regenerate tokens periodically
- Monitor for 401 Unauthorized responses

### 3. Security
- Never commit `serviceAccountKey_python.json` to version control
- Add to `.gitignore`
- Use environment variables for sensitive data in CI/CD

### 4. Error Handling
- Always wrap token generation in try-catch
- Log errors for debugging
- Provide meaningful error messages

### 5. Testing Different Scenarios
- Test with valid tokens (positive tests)
- Test with invalid tokens (negative tests)
- Test with expired tokens
- Test with missing tokens
- Test with different user roles

---

## Troubleshooting Guide

### Issue: "Cannot find module './firebaseAuth'"
**Solution**: Verify file path is correct relative to test file

### Issue: Token generation takes too long
**Solution**: 
- Check network connectivity
- Verify Firebase API is accessible
- Consider caching tokens for test suite

### Issue: 401 Unauthorized in tests
**Solution**:
- Verify token is being generated successfully
- Check token is added to Authorization header
- Ensure token hasn't expired
- Verify service account has correct permissions

### Issue: "No ID token in response"
**Solution**:
- Check custom token is valid
- Verify API key is correct
- Ensure service account has signInWithCustomToken permission

---

## Console Output Examples

### Successful Token Generation
```
✅ Generated custom token
✅ Exchanged for ID token
```

### Failed Token Generation
```
❌ Error getting Firebase ID token: Invalid service account key
```

---

## Related Documentation
- [Firebase Custom Token Documentation](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth)
- [JWT.io - Token Debugger](https://jwt.io/)
- [Playwright API Testing](https://playwright.dev/docs/api-testing)

---

## Summary

The `firebaseAuth.js` module provides a simple, reusable authentication solution for API testing:

✅ **Easy to use**: Single function call to get ID token  
✅ **Flexible**: Support for custom user IDs and claims  
✅ **Secure**: Uses Firebase service account authentication  
✅ **Reliable**: Proper error handling and logging  
✅ **Reusable**: Can be imported in any test file  
✅ **Role-based**: Support for testing different user permissions  

**Recommended Usage**: Always use `getFirebaseIdToken()` function for complete authentication flow in tests.
