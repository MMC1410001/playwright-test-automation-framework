# Pharma Portal Pharma API Test Suite - Quick Reference

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set environment variables
export ADMIN_TOKEN="your_admin_token"
export USER_TOKEN="your_user_token"

# Run all tests
npx playwright test tests/api/Pharma PortalApiTest.spec.js

# Run with UI
npx playwright test tests/api/Pharma PortalApiTest.spec.js --ui

# View report
npx playwright show-report
```

## 📊 Test Suite Overview

| Category | Tests | Priority | Description |
|----------|-------|----------|-------------|
| Health | 1 | P0 | API health check |
| Transcription | 7 | P0-P2 | Audio upload & processing |
| E2E | 1 | P0 | Complete transcription flow |
| Transcripts | 4 | P1 | Transcript retrieval & access control |
| Rate Limiting | 2 | P2 | Burst request handling |
| Concurrency | 1 | P2 | Parallel upload stress test |
| Webhooks & Signals | 2 | P1 | Signal retrieval |
| User Management | 8 | P1 | User CRUD & roles |
| Minutes & Feedback | 4 | P2 | Minutes & feedback management |
| Image Management | 5 | P1-P2 | Image upload & deletion |
| Email | 3 | P1-P2 | Email sending |
| Security | 3 | P0-P1 | Auth & RBAC |
| Validation | 4 | P2 | Input validation |

**Total: 42 tests (1 skipped)**

## 🎯 Test by Priority

### P0 - Critical (4 tests)
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "TC_01|TC_05|TC_34|TC_35"
```
- TC_01: Health check
- TC_05: E2E transcription
- TC_34: Auth enforcement
- TC_35: RBAC enforcement

### P1 - High (24 tests)
Core functionality tests covering all major features

### P2 - Medium (14 tests)
Edge cases, validation, and performance tests

## 📁 Required Test Data

```
tests/api/test-data/
├── audio/
│   ├── pharma_portal_audio.mp3  ← Required
│   └── pharma_portal_audio.wav  ← Required
└── images/
    ├── test_image.jpg   ← Required
    └── test_image.png   ← Required
```

## 🔑 Environment Variables

| Variable | Role | Required For |
|----------|------|--------------|
| `ADMIN_TOKEN` | Admin | User management, admin operations |
| `USER_TOKEN` | User | User-level operations |

## 🧪 Common Test Commands

### Run Specific Test
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "TC_01"
```

### Run Test Category
```bash
# Security tests
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "Security"

# User management
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "User"

# Image tests
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "Image"
```

### Debug Mode
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js --debug
```

### Headed Mode
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js --headed
```

### Generate Report
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js --reporter=html
```

## 🔍 Test ID Reference

### Health & Basic (TC_01-TC_04)
- TC_01: Health check ✓
- TC_02: Upload MP3 ✓
- TC_03: Missing audio file ✗
- TC_04: Invalid file type ✗

### E2E (TC_05)
- TC_05: Upload and wait for completion ✓ (5 min timeout)

### Transcripts (TC_06-TC_09)
- TC_06: Admin view all ✓
- TC_07: User access control ✓
- TC_08: Fetch by ID ✓
- TC_09: Non-existent ID ✗

### Rate Limiting (TC_10-TC_11)
- TC_10: Burst GET requests ⚡
- TC_11: Burst POST transcribe ⚡

### Concurrency (TC_12)
- TC_12: Parallel uploads with polling ⚡

### Signals (TC_13-TC_14)
- TC_13: Get all signals ✓
- TC_14: Get signals v4 ✓

### User Management (TC_15-TC_24)
- TC_15: Create user (admin) ✓
- TC_16: Update role (admin) ✓
- TC_17: Get current user ✓
- TC_18: Add minutes ✓
- TC_19: Submit & fetch feedback ✓
- TC_20: Get all users (admin) ✓
- TC_21: Delete user (admin) ✓
- TC_22: Initialize user ✓
- TC_23: Test user role endpoint ✓
- TC_24: Verify users endpoint ✓

### Image Management (TC_25-TC_29)
- TC_25: Upload single image ✓
- TC_26: Upload multiple images ✓
- TC_27: Invalid image format ✗
- TC_28: Delete image ✓
- TC_29: Delete non-existent image ✗

### Email (TC_30-TC_32)
- TC_30: Send valid email ✓
- TC_31: Invalid recipients ✗
- TC_32: Missing fields ✗

### Extended Minutes (TC_33)
- TC_33: Get all minutes ✓

### Security (TC_34-TC_36)
- TC_34: No token 🔒
- TC_35: Wrong role 🔒
- TC_36: Invalid token 🔒

### Validation (TC_37-TC_42)
- TC_37: Empty participants ✗
- TC_38: Invalid email format ✗
- TC_39: Invalid component ✗
- TC_40: Missing required fields ✗
- TC_41: Invalid role ✗
- TC_42: Invalid vote ✗

**Legend**: ✓ Positive | ✗ Negative | ⚡ Performance | 🔒 Security

## 🐛 Troubleshooting

### Tests Skipped?
- Check environment variables are set
- Verify test data files exist
- Ensure tokens are valid

### Connection Errors?
- Verify API endpoint is accessible
- Check network/firewall settings
- Confirm API is running

### Authentication Failures?
- Verify token format (Bearer token)
- Check token expiration
- Confirm user permissions

### Rate Limiting (429)?
- Expected for TC_10, TC_11
- Wait before retrying
- Consider sequential execution

## 📚 Documentation Files

- **Pharma PortalApiTest.md** - Detailed test case documentation
- **Pharma PortalApiTest.spec.js** - Test implementation
- **TEST_ENHANCEMENT_SUMMARY.md** - Enhancement overview
- **QA_EXECUTION_CHECKLIST.md** - Execution checklist
- **QUICK_REFERENCE.md** - This file
- **test-data/README.md** - Test data guide

## 🔗 API Endpoints Tested

| Endpoint | Method | Tests |
|----------|--------|-------|
| /health | GET | TC_01 |
| /transcribe | POST | TC_02-04, TC_37, TC_40 |
| /transcript/{id} | GET | TC_05, TC_08-09 |
| /transcripts/all | GET | TC_06-07, TC_10, TC_34 |
| /recording/{id}/upload-images | POST | TC_25-27 |
| /recording/{id}/image | DELETE | TC_28-29 |
| /users/create | POST | TC_15, TC_35, TC_38 |
| /users/{email}/role | PUT | TC_16, TC_41 |
| /users/{email} | DELETE | TC_21 |
| /users/me | GET | TC_17, TC_36 |
| /users/all | GET | TC_20 |
| /users/initialize | POST | TC_22 |
| /test/user-role/{email} | GET | TC_23 |
| /verify/users | GET | TC_24 |
| /send-email | POST | TC_30-32 |
| /minutes/add | POST | TC_18 |
| /minutes/all | GET | TC_33 |
| /meetings/{id}/feedback | POST | TC_19, TC_39, TC_42 |
| /meetings/{id}/feedback/my | GET | TC_19 |
| /signals/all | GET | TC_13 |
| /signals/v4 | GET | TC_14 |

## 💡 Tips

1. **Run P0 tests first** - Quick smoke test
2. **Use --ui mode** - Better debugging experience
3. **Check test reports** - HTML reports are detailed
4. **Monitor rate limits** - Some tests intentionally trigger them
5. **Keep tokens fresh** - Update expired tokens
6. **Review logs** - Check API logs for failures
7. **Sequential for debugging** - Use `--workers=1` for debugging
8. **Parallel for speed** - Default parallel execution is faster

## 📞 Support

- Review detailed documentation in `Pharma PortalApiTest.md`
- Check execution checklist in `QA_EXECUTION_CHECKLIST.md`
- Refer to enhancement summary in `TEST_ENHANCEMENT_SUMMARY.md`

---