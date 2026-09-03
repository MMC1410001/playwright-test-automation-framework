# Pharma PortalApiTest - Test Case Documentation

**Test Suite**: Pharma Portal Pharma API Test Automation  
**Framework**: Playwright  
**Test File**: `Pharma PortalApiTest.spec.js`  
**Base URL**: `https://httpbin.org`  

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Test Configuration](#test-configuration)
3. [Test Cases by Category](#test-cases-by-category)
   - [Health Check Tests](#1-health-check-tests)
   - [Transcribe API Tests](#2-transcribe-api-tests)
   - [End-to-End (E2E) Tests](#3-end-to-end-e2e-tests)
   - [Transcripts List & Single Tests](#4-transcripts-list--single-tests)
   - [Rate Limit & Abuse Tests](#5-rate-limit--abuse-tests)
   - [Concurrency Stress Tests](#6-concurrency-stress-tests)
   - [Webhooks & Signals Tests](#7-webhooks--signals-tests)
   - [Users & Roles Tests](#8-users--roles-tests)
   - [Minutes & Feedback Tests](#9-minutes--feedback-tests)
4. [Helper Functions](#helper-functions)
5. [Test Data Requirements](#test-data-requirements)

---

## Overview

This test suite validates the Pharma Portal Pharma API endpoints for audio transcription services. The tests cover functional validation, authentication, rate limiting, concurrency handling, and user management features.

**Total Test Cases**: 42 active tests (1 skipped)

---

## Test Configuration

### Environment Variables Required

The following environment variables must be set for authentication tests:

| Variable | Description | Used In |
|----------|-------------|---------|
| `ADMIN_TOKEN` | Admin role authentication token | User management, admin-only operations |
| `USER_TOKEN` | Regular user authentication token | User-level access control |

### Audio Test Files

The following audio files are required in the `tests/api/test-data/audio/` directory:

- `pharma_portal_audio.mp3` - Sample MP3 audio file
- `pharma_portal_audio.wav` - Sample WAV audio file (used for E2E and stress tests)

---

## Test Cases by Category

### 1. Health Check Tests

#### **TC_01: Health check**

**Test ID**: `TC_01`  
**Category**: Health  
**Priority**: P0 (Critical)

**Description**: Validates that the API health check endpoint is responding correctly.

**Test Steps**:
1. Send GET request to `/health` endpoint
2. Verify response status code is 200

**Expected Result**: API returns 200 OK status

**Actual Endpoint**: `GET /health`

---

### 2. Transcribe API Tests

#### **TC_02: Upload valid audio (MP3)**

**Test ID**: `TC_02`  
**Category**: Transcription  
**Priority**: P1 (High)

**Description**: Validates successful upload of a valid MP3 audio file for transcription.

**Test Steps**:
1. Prepare MP3 audio file from test data directory
2. Send POST request to `/transcribe` with multipart form data containing:
   - `audio_file`: MP3 file
   - `title`: "Pharma Portal Pharma Call"
   - `organisation_name`: "Pharma Portal Pharma"
   - `geography`: "India"
   - `participants`: ["rep@pharma_portal.com"]
3. Verify response status code is 200 or 201
4. Verify response body is present and valid

**Expected Result**: 
- Status code: 200 or 201
- Response contains valid JSON payload

**Actual Endpoint**: `POST /transcribe`

---

#### **TC_03: Missing audio file**

**Test ID**: `TC_03`  
**Category**: Transcription - Negative Testing  
**Priority**: P1 (High)

**Description**: Validates that API correctly rejects requests without an audio file.

**Test Steps**:
1. Send POST request to `/transcribe` with only metadata (no audio file):
   - `title`: "Invalid"
   - `organisation_name`: "Pharma Portal"
   - `geography`: "IN"
   - `participants`: ["x@test.com"]
2. Verify response status code indicates error

**Expected Result**: 
- Status code: 400 (Bad Request) or 422 (Unprocessable Entity)

**Actual Endpoint**: `POST /transcribe`

---

#### **TC_04: Invalid file type**

**Test ID**: `TC_04`  
**Category**: Transcription - Negative Testing  
**Priority**: P1 (High)

**Description**: Validates that API rejects non-audio file formats.

**Test Steps**:
1. Create a text file buffer with invalid content
2. Send POST request to `/transcribe` with:
   - `audio_file`: Text file (bad.txt) with mime type `text/plain`
   - Valid metadata fields
3. Verify response status code indicates error

**Expected Result**: 
- Status code: 400 (Bad Request) or 422 (Unprocessable Entity)

**Actual Endpoint**: `POST /transcribe`

---

### 3. End-to-End (E2E) Tests

#### **TC_05: Upload and wait for completion**

**Test ID**: `TC_05`  
**Category**: E2E Transcription  
**Priority**: P0 (Critical)  
**Timeout**: 5 minutes

**Description**: Complete end-to-end test that uploads audio, polls for completion, and validates the final transcript.

**Test Steps**:
1. Upload WAV audio file to `/transcribe` with metadata:
   - `title`: "E2E Pharma Portal"
   - `organisation_name`: "Pharma Portal Pharma"
   - `geography`: "India"
   - `participants`: ["qa@pharma_portal.com"]
2. Extract transcript ID from upload response
3. Poll `/transcript/{id}` endpoint every 5 seconds
4. Wait until status becomes "Completed" or timeout (4 minutes)
5. Validate final transcript data structure
6. Verify status is "Completed"

**Expected Result**: 
- Initial upload: 200 or 201
- Transcript ID is present in response
- Final status: "Completed"
- Response contains required fields: `_id`, `status`, `full_transcript` (optional), `summary` (optional)

**Actual Endpoints**: 
- `POST /transcribe`
- `GET /transcript/{id}` (polling)

---

### 4. Transcripts List & Single Tests

#### **TC_06: Admin can view all transcripts**

**Test ID**: `TC_06`  
**Category**: Transcripts - Access Control  
**Priority**: P1 (High)

**Description**: Validates that admin users can access all transcripts.

**Test Steps**:
1. Send GET request to `/transcripts/all` with admin authentication token
2. Verify response status
3. If 200, validate response is an array

**Expected Result**: 
- Status code: 200, 401, or 403 (depends on server configuration)
- If 200, response body is an array

**Actual Endpoint**: `GET /transcripts/all`

**Authentication**: Admin token required

---

#### **TC_07: User access control**

**Test ID**: `TC_07`  
**Category**: Transcripts - Access Control  
**Priority**: P1 (High)

**Description**: Validates access control for regular users accessing all transcripts.

**Test Steps**:
1. Send GET request to `/transcripts/all` with regular user authentication token
2. Verify appropriate access control response

**Expected Result**: 
- Status code: 200, 401, or 403 (based on permissions)

**Actual Endpoint**: `GET /transcripts/all`

**Authentication**: User token required

---

#### **TC_08: Fetch transcript by ID (if exists)**

**Test ID**: `TC_08`  
**Category**: Transcripts - Retrieval  
**Priority**: P1 (High)

**Description**: Validates fetching a specific transcript by its ID.

**Test Steps**:
1. Fetch all transcripts from `/transcripts/all`
2. Extract first transcript's ID
3. Send GET request to `/transcript/{id}`
4. If successful, validate transcript data structure

**Expected Result**: 
- Status code: 200, 404, or 422
- If 200, response contains valid transcript contract with required fields

**Actual Endpoint**: `GET /transcript/{id}`

**Note**: Test is skipped if no transcripts exist

---

#### **TC_09: Fetch non-existent transcript id**

**Test ID**: `TC_09`  
**Category**: Transcripts - Negative Testing  
**Priority**: P2 (Medium)

**Description**: Validates API behavior when requesting a non-existent transcript ID.

**Test Steps**:
1. Generate fake transcript ID: "000000000000000000000000"
2. Send GET request to `/transcript/{fakeId}`
3. Verify appropriate error response

**Expected Result**: 
- Status code: 200, 404, or 422

**Actual Endpoint**: `GET /transcript/{id}`

---

### 5. Rate Limit & Abuse Tests

#### **TC_10: Burst GET requests**

**Test ID**: `TC_10`  
**Category**: Rate Limiting  
**Priority**: P2 (Medium)

**Description**: Validates API rate limiting behavior under burst GET requests.

**Test Steps**:
1. Send 20 concurrent GET requests to `/transcripts/all`
2. Wait for all responses
3. Verify each response status code

**Expected Result**: 
- Status codes: 200, 401, 403, or 429 (Too Many Requests)
- At least some requests should succeed or be rate-limited appropriately

**Actual Endpoint**: `GET /transcripts/all`

**Concurrency**: 20 parallel requests

---

#### **TC_11: Burst POST /transcribe**

**Test ID**: `TC_11`  
**Category**: Rate Limiting  
**Priority**: P2 (Medium)

**Description**: Validates API rate limiting on transcription uploads.

**Test Steps**:
1. Send 8 concurrent POST requests to `/transcribe` with same audio file
2. Each request includes valid metadata
3. Verify response status codes

**Expected Result**: 
- Status codes: 200, 201, 409 (Conflict), 422, or 429 (Rate Limited)

**Actual Endpoint**: `POST /transcribe`

**Concurrency**: 8 parallel uploads

---

### 6. Concurrency Stress Tests

#### **TC_12: Parallel uploads with polling**

**Test ID**: `TC_12`  
**Category**: Concurrency & Stress  
**Priority**: P2 (Medium)

**Description**: Validates system behavior under concurrent transcription jobs with polling.

**Test Steps**:
1. Upload 3 unique audio files concurrently with unique timestamps in filename
2. Extract transcript IDs from all responses
3. Poll all transcripts concurrently until completion
4. Validate at least one completes successfully

**Expected Result**: 
- All uploads return 200 or 201
- All responses contain valid transcript IDs
- At least one transcript completes successfully
- Results array contains completed transcripts

**Actual Endpoints**: 
- `POST /transcribe` (3 parallel)
- `GET /transcript/{id}` (polling for each)

---

### 7. Webhooks & Signals Tests

#### **TC_WH_01: Fireflies webhook accepts payload** ⚠️ SKIPPED

**Test ID**: `TC_WH_01`  
**Category**: Webhooks  
**Priority**: N/A  
**Status**: **SKIPPED**

**Description**: This test is intentionally skipped as Fireflies posts to this webhook in production. Webhook processing is tested via integration jobs and not in this API suite to avoid external side effects.

**Reason for Skip**: External dependency, tested in integration environment

---

#### **TC_13: Get all signals**

**Test ID**: `TC_13`  
**Category**: Signals  
**Priority**: P1 (High)

**Description**: Validates retrieval of all signals from the API.

**Test Steps**:
1. Send GET request to `/signals/all`
2. Verify success response

**Expected Result**: 
- Status code: 200

**Actual Endpoint**: `GET /signals/all`

---

#### **TC_14: Get signals v4**

**Test ID**: `TC_14`  
**Category**: Signals  
**Priority**: P1 (High)

**Description**: Validates retrieval of signals using v4 API.

**Test Steps**:
1. Send GET request to `/signals/v4`
2. Verify success response

**Expected Result**: 
- Status code: 200

**Actual Endpoint**: `GET /signals/v4`

---

### 8. Users & Roles Tests

#### **TC_15: Create user (admin)**

**Test ID**: `TC_15`  
**Category**: User Management  
**Priority**: P1 (High)

**Description**: Validates admin ability to create new users.

**Test Steps**:
1. Generate unique email: `qa_{timestamp}@example.com`
2. Send POST request to `/users/create` with admin token
3. Include user data: email and role ("user")
4. Verify response

**Expected Result**: 
- Status code: 200, 201, or 422

**Actual Endpoint**: `POST /users/create`

**Authentication**: Admin token required  
**Note**: Test is skipped if admin token is not available

---

#### **TC_16: Update user role (admin)**

**Test ID**: `TC_16`  
**Category**: User Management  
**Priority**: P1 (High)

**Description**: Validates admin ability to update user roles.

**Test Steps**:
1. Send PUT request to `/users/{email}/role` with admin token
2. Update role to "admin" (or "user")
3. Verify response

**Expected Result**: 
- Status code: 200 or 422

**Actual Endpoint**: `PUT /users/{email}/role`

**Authentication**: Admin token required  
**Note**: Test is skipped if admin token is not available

---

#### **TC_17: Get current user (any token)**

**Test ID**: `TC_17`  
**Category**: User Management  
**Priority**: P1 (High)

**Description**: Validates authenticated users can retrieve their own information.

**Test Steps**:
1. Send GET request to `/users/me` with any valid authentication token
2. Verify response contains user data

**Expected Result**: 
- Status code: 200, 401, or 422
- If 200, response contains `email` and `role` fields

**Actual Endpoint**: `GET /users/me`

**Authentication**: Any valid token (user or admin)  
**Note**: Test is skipped if no authentication token is available

---

### 9. Minutes & Feedback Tests

#### **TC_18: Add minutes (auth optional)**

**Test ID**: `TC_18`  
**Category**: Minutes  
**Priority**: P2 (Medium)

**Description**: Validates adding meeting minutes to the system.

**Test Steps**:
1. Send POST request to `/minutes/add` with payload:
   - `minutes`: 60
   - `description`: "Test minutes"
2. Verify response

**Expected Result**: 
- Status code: 200 or 422

**Actual Endpoint**: `POST /minutes/add`

**Authentication**: Optional

---

#### **TC_19: Submit and fetch meeting feedback**

**Test ID**: `TC_19`  
**Category**: Feedback  
**Priority**: P2 (Medium)

**Description**: Validates submitting and retrieving meeting feedback.

**Test Steps**:
1. Generate unique meeting ID: `meeting_{timestamp}`
2. Send POST request to `/meetings/{meetingId}/feedback` with payload:
   - `component`: "summary"
   - `vote`: "upvote"
   - `feedback`: "Looks good"
3. Verify submission response
4. Send GET request to `/meetings/{meetingId}/feedback/my`
5. Verify retrieval response

**Expected Result**: 
- POST status code: 200 or 422
- GET status code: 200 or 422

**Actual Endpoints**: 
- `POST /meetings/{meetingId}/feedback`
- `GET /meetings/{meetingId}/feedback/my`

---

## Helper Functions

The test suite includes several helper functions for cleaner and more maintainable tests:

### `getAuthHeaders(role)`

**Purpose**: Returns authorization headers for specified role  
**Parameters**: 
- `role` (string): "admin" or "user"

**Returns**: Object with Authorization header or empty object

---

### `safeJson(res)`

**Purpose**: Safely parses JSON response, catching errors  
**Parameters**: 
- `res`: Response object

**Returns**: Parsed JSON or null if parsing fails

---

### `pickTranscriptId(uploadData)`

**Purpose**: Extracts transcript ID from upload response (handles various field names)  
**Parameters**: 
- `uploadData`: Upload response data

**Returns**: Transcript ID string or null

**Note**: Checks for `transcript_id`, `document_id`, `id`, or `_id` fields

---

### `waitForTranscriptCompletion(request, transcriptId, options)`

**Purpose**: Polls transcript endpoint until completion or timeout  
**Parameters**: 
- `request`: Playwright request context
- `transcriptId`: ID to poll
- `options`: 
  - `timeoutMs`: Maximum wait time (default: 180000 = 3 minutes)
  - `pollIntervalMs`: Polling interval (default: 5000 = 5 seconds)

**Returns**: Completed transcript data

**Throws**: Error if polling times out or transcription fails

**Behavior**:
- Polls every 5 seconds
- Throws error if status starts with "Failed"
- Returns data when status is "Completed"

---

### `validateTranscriptContract(data)`

**Purpose**: Validates transcript response structure  
**Parameters**: 
- `data`: Transcript response object

**Validates**:
- Presence of `_id` field
- Presence of `status` field
- If completed: validates `full_transcript` and `summary` are strings (if present)
- If failed: validates `error` field is present

---

## Test Data Requirements

### Directory Structure

```
tests/api/
├── Pharma PortalApiTest.spec.js
├── Pharma PortalApiTest.md (this file)
└── test-data/
    └── audio/
        ├── pharma_portal_audio.mp3
        └── pharma_portal_audio.wav
```

### Audio Files

| File | Format | Used In | Required |
|------|--------|---------|----------|
| `pharma_portal_audio.mp3` | MP3 | TC_T_01 | Yes |
| `pharma_portal_audio.wav` | WAV | TC_E2E_01, TC_RL_02, TC_CON_01 | Yes |

---

## Test Execution Notes

### Test Priorities

- **P0 (Critical)**: 2 tests - Must pass for release
- **P1 (High)**: 12 tests - Core functionality
- **P2 (Medium)**: 4 tests - Performance and edge cases

### Conditional Tests

Some tests are conditionally skipped based on:
- Missing audio test files
- Missing authentication tokens
- Empty transcript list
- Server configuration

### Timeouts

- Default Playwright timeout applies to most tests
- **TC_E2E_01**: Extended timeout of 5 minutes due to long-running transcription job

---

## Best Practices for QA

1. **Environment Setup**: Ensure all environment variables are set before running tests
2. **Test Data**: Verify audio files exist in the correct directory
3. **Sequential vs Parallel**: Most tests can run in parallel except E2E tests
4. **Rate Limiting**: Tests TC_RL_01 and TC_RL_02 may trigger rate limiting - this is expected
5. **Failed Assertions**: Check server logs for detailed error messages
6. **Polling Tests**: E2E and concurrency tests take longer due to transcription processing time

#### **TC_20: Get all users (admin)**

**Test ID**: `TC_20`  
**Category**: User Management  
**Priority**: P1 (High)

**Description**: Validates admin can retrieve all users in the system.

**Test Steps**:
1. Send GET request to `/users/all` with admin token
2. Verify response status and structure

**Expected Result**: 
- Status code: 200 or 403
- If 200, response is an array of users

**Actual Endpoint**: `GET /users/all`

**Authentication**: Admin token required

---

#### **TC_21: Delete user (admin)**

**Test ID**: `TC_21`  
**Category**: User Management  
**Priority**: P1 (High)

**Description**: Validates admin can delete users.

**Test Steps**:
1. Send DELETE request to `/users/{email}` with admin token
2. Verify deletion response

**Expected Result**: 
- Status code: 200, 404, or 422

**Actual Endpoint**: `DELETE /users/{email}`

**Authentication**: Admin token required

---

#### **TC_22: Initialize user on first login**

**Test ID**: `TC_22`  
**Category**: User Management  
**Priority**: P1 (High)

**Description**: Validates user initialization endpoint.

**Test Steps**:
1. Send POST request to `/users/initialize` with valid token
2. Verify initialization response

**Expected Result**: 
- Status code: 200 or 422

**Actual Endpoint**: `POST /users/initialize`

**Authentication**: Any valid token

---

#### **TC_23: Test user role endpoint**

**Test ID**: `TC_23`  
**Category**: User Management - Testing  
**Priority**: P2 (Medium)

**Description**: Validates test endpoint for retrieving user role by email.

**Test Steps**:
1. Send GET request to `/test/user-role/{email}`
2. Verify response contains role information

**Expected Result**: 
- Status code: 200 or 404

**Actual Endpoint**: `GET /test/user-role/{email}`

**Authentication**: None required (test endpoint)

---

#### **TC_24: Verify all users endpoint**

**Test ID**: `TC_24`  
**Category**: User Management - Testing  
**Priority**: P2 (Medium)

**Description**: Validates verification endpoint for all users.

**Test Steps**:
1. Send GET request to `/verify/users`
2. Verify response contains users list

**Expected Result**: 
- Status code: 200
- Response is an array

**Actual Endpoint**: `GET /verify/users`

**Authentication**: None required (verification endpoint)

---

### 10. Image Upload & Management Tests

#### **TC_25: Upload single image to recording**

**Test ID**: `TC_25`  
**Category**: Image Management  
**Priority**: P1 (High)

**Description**: Validates uploading images to a meeting recording.

**Test Steps**:
1. Create a valid meeting ID
2. Send POST request to `/recording/{meeting_id}/upload-images` with image file
3. Verify upload response

**Expected Result**: 
- Status code: 200 or 422

**Actual Endpoint**: `POST /recording/{meeting_id}/upload-images`

**Authentication**: Required

---

#### **TC_26: Upload multiple images**

**Test ID**: `TC_26`  
**Category**: Image Management  
**Priority**: P1 (High)

**Description**: Validates uploading multiple images simultaneously.

**Test Steps**:
1. Prepare multiple image files
2. Send POST request with multiple images
3. Verify all images are uploaded

**Expected Result**: 
- Status code: 200 or 422

**Actual Endpoint**: `POST /recording/{meeting_id}/upload-images`

---

#### **TC_27: Upload invalid image format**

**Test ID**: `TC_27`  
**Category**: Image Management - Negative  
**Priority**: P2 (Medium)

**Description**: Validates rejection of non-image files.

**Test Steps**:
1. Attempt to upload non-image file (e.g., text file)
2. Verify appropriate error response

**Expected Result**: 
- Status code: 400 or 422

**Actual Endpoint**: `POST /recording/{meeting_id}/upload-images`

---

#### **TC_28: Delete recording image**

**Test ID**: `TC_28`  
**Category**: Image Management  
**Priority**: P1 (High)

**Description**: Validates deletion of uploaded images.

**Test Steps**:
1. Upload an image first
2. Send DELETE request to `/recording/{meeting_id}/image` with image_url
3. Verify deletion response

**Expected Result**: 
- Status code: 200, 404, or 422

**Actual Endpoint**: `DELETE /recording/{meeting_id}/image`

**Authentication**: Required (admin or owner)

---

#### **TC_29: Delete non-existent image**

**Test ID**: `TC_29`  
**Category**: Image Management - Negative  
**Priority**: P2 (Medium)

**Description**: Validates error handling for deleting non-existent images.

**Test Steps**:
1. Send DELETE request with fake image URL
2. Verify appropriate error response

**Expected Result**: 
- Status code: 404 or 422

**Actual Endpoint**: `DELETE /recording/{meeting_id}/image`

---

### 11. Email Tests

#### **TC_30: Send email with valid payload**

**Test ID**: `TC_30`  
**Category**: Email  
**Priority**: P1 (High)

**Description**: Validates email sending functionality.

**Test Steps**:
1. Send POST request to `/send-email` with:
   - `mongo_id`: Valid meeting ID
   - `recipients`: Array of email addresses
   - `subject`: Email subject
   - `html_content`: HTML email body
2. Verify response

**Expected Result**: 
- Status code: 200 or 422

**Actual Endpoint**: `POST /send-email`

---

#### **TC_31: Send email with invalid recipients**

**Test ID**: `TC_31`  
**Category**: Email - Negative  
**Priority**: P2 (Medium)

**Description**: Validates email validation for invalid email formats.

**Test Steps**:
1. Send POST request with invalid email addresses
2. Verify validation error

**Expected Result**: 
- Status code: 422

**Actual Endpoint**: `POST /send-email`

---

#### **TC_32: Send email with missing required fields**

**Test ID**: `TC_32`  
**Category**: Email - Negative  
**Priority**: P2 (Medium)

**Description**: Validates required field validation.

**Test Steps**:
1. Send POST request with missing fields
2. Verify validation error

**Expected Result**: 
- Status code: 422

**Actual Endpoint**: `POST /send-email`

---

### 12. Minutes Tests (Extended)

#### **TC_33: Get all minutes**

**Test ID**: `TC_33`  
**Category**: Minutes  
**Priority**: P2 (Medium)

**Description**: Validates retrieval of all minutes.

**Test Steps**:
1. Send GET request to `/minutes/all` with auth token
2. Verify response structure

**Expected Result**: 
- Status code: 200 or 422
- If 200, response is an array

**Actual Endpoint**: `GET /minutes/all`

**Authentication**: Required

---

### 13. Authorization & Security Tests

#### **TC_34: Access protected endpoint without token**

**Test ID**: `TC_34`  
**Category**: Security  
**Priority**: P0 (Critical)

**Description**: Validates authentication enforcement.

**Test Steps**:
1. Send GET request to `/transcripts/all` without Authorization header
2. Verify unauthorized response

**Expected Result**: 
- Status code: 401 or 403

**Actual Endpoint**: `GET /transcripts/all`

---

#### **TC_35: Access admin endpoint with user token**

**Test ID**: `TC_35`  
**Category**: Security - RBAC  
**Priority**: P0 (Critical)

**Description**: Validates role-based access control.

**Test Steps**:
1. Send POST request to `/users/create` with user token
2. Verify forbidden response

**Expected Result**: 
- Status code: 403

**Actual Endpoint**: `POST /users/create`

**Authentication**: User token (insufficient privileges)

---

#### **TC_36: Invalid authorization token format**

**Test ID**: `TC_36`  
**Category**: Security  
**Priority**: P1 (High)

**Description**: Validates handling of malformed tokens.

**Test Steps**:
1. Send request with invalid token format
2. Verify appropriate error response

**Expected Result**: 
- Status code: 401

**Actual Endpoint**: `GET /users/me`

---

### 14. Edge Cases & Validation Tests

#### **TC_37: Transcribe with empty participants array**

**Test ID**: `TC_37`  
**Category**: Transcription - Validation  
**Priority**: P2 (Medium)

**Description**: Validates participants field validation.

**Test Steps**:
1. Send POST request to `/transcribe` with empty participants array
2. Verify validation error

**Expected Result**: 
- Status code: 422

**Actual Endpoint**: `POST /transcribe`

---

#### **TC_38: Create user with invalid email format**

**Test ID**: `TC_38`  
**Category**: User Management - Validation  
**Priority**: P2 (Medium)

**Description**: Validates email format validation.

**Test Steps**:
1. Send POST request to `/users/create` with invalid email
2. Verify validation error

**Expected Result**: 
- Status code: 422

**Actual Endpoint**: `POST /users/create`

**Authentication**: Admin token

---

#### **TC_39: Feedback with invalid component type**

**Test ID**: `TC_39`  
**Category**: Feedback - Validation  
**Priority**: P2 (Medium)

**Description**: Validates component enum validation.

**Test Steps**:
1. Send POST request with invalid component value
2. Verify validation error

**Expected Result**: 
- Status code: 422

**Actual Endpoint**: `POST /meetings/{meeting_id}/feedback`

---

#### **TC_40: Transcribe with missing required fields**

**Test ID**: `TC_40`  
**Category**: Transcription - Validation  
**Priority**: P2 (Medium)

**Description**: Validates required field enforcement for transcription.

**Test Steps**:
1. Send POST request with audio file but missing organisation_name, geography, and participants
2. Verify validation error

**Expected Result**: 
- Status code: 422

**Actual Endpoint**: `POST /transcribe`

---

#### **TC_41: Update user role with invalid role**

**Test ID**: `TC_41`  
**Category**: User Management - Validation  
**Priority**: P2 (Medium)

**Description**: Validates role enum validation.

**Test Steps**:
1. Send PUT request with invalid role value
2. Verify validation error

**Expected Result**: 
- Status code: 422

**Actual Endpoint**: `PUT /users/{email}/role`

**Authentication**: Admin token

---

#### **TC_42: Feedback with invalid vote type**

**Test ID**: `TC_42`  
**Category**: Feedback - Validation  
**Priority**: P2 (Medium)

**Description**: Validates vote enum validation.

**Test Steps**:
1. Send POST request with invalid vote value (not 'upvote' or 'downvote')
2. Verify validation error

**Expected Result**: 
- Status code: 422

**Actual Endpoint**: `POST /meetings/{meeting_id}/feedback`

---

## Test Data Requirements

### Directory Structure

```
tests/api/
├── Pharma PortalApiTest.spec.js
├── Pharma PortalApiTest.md (this file)
└── test-data/
    ├── audio/
    │   ├── pharma_portal_audio.mp3
    │   └── pharma_portal_audio.wav
    └── images/
        ├── test_image.jpg
        └── test_image.png
```

### Audio Files

| File | Format | Used In | Required |
|------|--------|---------|----------|
| `pharma_portal_audio.mp3` | MP3 | TC_02 | Yes |
| `pharma_portal_audio.wav` | WAV | TC_05, TC_11, TC_12 | Yes |

### Image Files

| File | Format | Used In | Required |
|------|--------|---------|----------|
| `test_image.jpg` | JPEG | TC_25, TC_26, TC_28 | Yes |
| `test_image.png` | PNG | TC_26 | Yes |

---

## Test Execution Notes

### Test Priorities

- **P0 (Critical)**: 4 tests - Must pass for release
- **P1 (High)**: 24 tests - Core functionality
- **P2 (Medium)**: 14 tests - Performance and edge cases

### Conditional Tests

Some tests are conditionally skipped based on:
- Missing audio test files
- Missing image test files
- Missing authentication tokens
- Empty transcript list
- Server configuration

### Timeouts

- Default Playwright timeout applies to most tests
- **TC_05**: Extended timeout of 5 minutes due to long-running transcription job
- **TC_12**: Extended timeout for concurrent uploads

---

## Best Practices for QA

1. **Environment Setup**: Ensure all environment variables are set before running tests
2. **Test Data**: Verify audio and image files exist in the correct directory
3. **Sequential vs Parallel**: Most tests can run in parallel except E2E tests
4. **Rate Limiting**: Tests TC_10 and TC_11 may trigger rate limiting - this is expected
5. **Failed Assertions**: Check server logs for detailed error messages
6. **Polling Tests**: E2E and concurrency tests take longer due to transcription processing time
7. **RBAC Testing**: Ensure different role tokens are available for comprehensive access control testing
8. **Automatic Cleanup**: Test suite automatically cleans up test users from previous runs

---

## Automatic Cleanup

The test suite includes automatic cleanup mechanisms:

### Before All Tests (Global Cleanup)
- Deletes test users created in previous runs
- Looks for users with email patterns: `qa_*`, `test_*`, `delete_test_*`
- Runs only if admin token is available
- Failures are silently ignored (best effort)

### After Test Suite (Local Cleanup)
- User management tests clean up their created test users
- Ensures no data persistence between test runs

### Manual Cleanup
If needed, you can manually delete test data:
```bash
# View all users
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://httpbin.org/users/all

# Delete specific user
curl -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" https://httpbin.org/users/test@example.com
```

---

**End of Documentation**
