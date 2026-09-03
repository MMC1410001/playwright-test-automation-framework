# Pharma Portal Pharma API Test Execution Checklist

## Pre-Execution Setup

### ✅ Environment Variables
- [ ] `ADMIN_TOKEN` is set and valid
- [ ] `USER_TOKEN` is set and valid
- [ ] Tokens have not expired
- [ ] Tokens have appropriate permissions

### ✅ Test Data Files
- [ ] `tests/api/test-data/audio/pharma_portal_audio.mp3` exists
- [ ] `tests/api/test-data/audio/pharma_portal_audio.wav` exists
- [ ] `tests/api/test-data/images/test_image.jpg` exists
- [ ] `tests/api/test-data/images/test_image.png` exists
- [ ] All files are valid and not corrupted

### ✅ Dependencies
- [ ] Node.js is installed (v16+)
- [ ] Playwright is installed (`npm install`)
- [ ] All npm dependencies are up to date
- [ ] Network access to `https://httpbin.org`

### ✅ API Availability
- [ ] API endpoint is accessible
- [ ] Health check endpoint returns 200
- [ ] No planned maintenance windows

## Test Execution

### Quick Smoke Test (P0 Tests Only)
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "TC_01|TC_05|TC_34|TC_35"
```
- [ ] All P0 tests pass
- [ ] No critical failures

### Full Test Suite
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js
```
- [ ] Test execution completes
- [ ] Review test report
- [ ] Document any failures

### Category-Specific Testing

#### Health & Basic Functionality
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "Health|POST /transcribe"
```
- [ ] Health check passes
- [ ] Basic transcription works

#### User Management
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "Users & Roles|Extended User Management"
```
- [ ] User CRUD operations work
- [ ] Role-based access control enforced

#### Security & Authorization
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "Authorization & Security"
```
- [ ] Authentication is enforced
- [ ] RBAC is working correctly
- [ ] Invalid tokens are rejected

#### Image Management
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "Image Upload & Management"
```
- [ ] Image upload works
- [ ] Image deletion works
- [ ] Invalid formats rejected

#### Email & Communication
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "Email"
```
- [ ] Email sending works
- [ ] Validation is enforced

#### Edge Cases & Validation
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "Edge Cases & Validation"
```
- [ ] All validation tests pass
- [ ] Error handling is correct

## Post-Execution Review

### Test Results Analysis
- [ ] Total tests executed: _____ / 42
- [ ] Tests passed: _____
- [ ] Tests failed: _____
- [ ] Tests skipped: _____
- [ ] Pass rate: _____%

### Failure Investigation
For each failed test:
- [ ] Test ID: _____
- [ ] Failure reason: _____
- [ ] Is it a test issue or API issue?
- [ ] Action required: _____

### Performance Metrics
- [ ] Total execution time: _____
- [ ] Average test duration: _____
- [ ] Slowest test: _____ (duration: _____)
- [ ] Any timeouts occurred?

### Known Issues
- [ ] Document any known issues
- [ ] Create tickets for API bugs
- [ ] Update test documentation if needed

## Cleanup (Optional)

### Test Data Cleanup
- [ ] Review created test users
- [ ] Delete temporary test users (if needed)
- [ ] Review uploaded files
- [ ] Clean up test recordings (if needed)

### Environment Cleanup
- [ ] Clear any cached data
- [ ] Reset test environment (if needed)

## Reporting

### Test Report Generation
```bash
npx playwright show-report
```
- [ ] HTML report generated
- [ ] Report reviewed
- [ ] Screenshots captured for failures

### Documentation
- [ ] Update test execution log
- [ ] Document any new issues found
- [ ] Update known issues list
- [ ] Share results with team

## Sign-Off

**Executed By**: _____________________  
**Date**: _____________________  
**Environment**: [ ] Dev [ ] Staging [ ] Production  
**Overall Status**: [ ] Pass [ ] Pass with Issues [ ] Fail  

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________

## Troubleshooting Guide

### Common Issues

#### Issue: Tests skip due to missing tokens
**Solution**: Set environment variables
```bash
export ADMIN_TOKEN="your_token"
export USER_TOKEN="your_token"
```

#### Issue: Tests skip due to missing audio files
**Solution**: Add audio files to `tests/api/test-data/audio/`

#### Issue: Tests skip due to missing image files
**Solution**: Add image files to `tests/api/test-data/images/`

#### Issue: Connection timeout
**Solution**: 
- Check network connectivity
- Verify API endpoint is accessible
- Check firewall/proxy settings

#### Issue: Authentication failures
**Solution**:
- Verify tokens are valid and not expired
- Check token format (should be Bearer token)
- Verify user has correct permissions

#### Issue: Rate limiting (429 errors)
**Solution**:
- This is expected for TC_10 and TC_11
- Wait a few minutes before re-running
- Consider running tests sequentially

#### Issue: Transcription timeout (TC_05)
**Solution**:
- This test has 5-minute timeout
- Transcription time varies based on audio length
- Check Fireflies service status

## CI/CD Integration Checklist

### Pipeline Configuration
- [ ] Test command added to pipeline
- [ ] Environment variables configured in CI
- [ ] Test data files available in CI environment
- [ ] Playwright installed in CI environment
- [ ] Test reports published as artifacts

### Execution Strategy
- [ ] P0 tests run on every commit
- [ ] P1 tests run on every PR
- [ ] P2 tests run nightly
- [ ] Full suite runs before release

### Failure Handling
- [ ] Pipeline fails on P0 test failures
- [ ] Notifications configured for failures
- [ ] Test reports accessible to team
- [ ] Retry logic configured (if needed)

