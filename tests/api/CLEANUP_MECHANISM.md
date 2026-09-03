# Test Data Cleanup Mechanism

## Overview

The Pharma Portal Pharma API test suite includes automatic cleanup to prevent data persistence issues between test runs.

## Automatic Cleanup Features

### 1. Global Cleanup (Before All Tests)

**When**: Runs once before any tests execute  
**What**: Deletes test users from previous runs  
**How**: 
- Fetches all users via `/users/all` endpoint
- Identifies test users by email patterns
- Deletes matching users

**Test User Patterns**:
- `qa_*` - Users created by QA tests
- `test_*` - Generic test users
- `delete_test_*` - Users created for deletion tests

**Requirements**:
- Admin token must be available
- User must have delete permissions

**Code Location**: `test.beforeAll()` hook in test file

### 2. Local Cleanup (After Test Suites)

**When**: Runs after specific test suites complete  
**What**: Cleans up data created by that suite  
**Example**: User management tests delete their created test user

**Code Location**: `test.afterAll()` hooks in test suites

## How It Works

```javascript
// Global cleanup before all tests
test.beforeAll(async ({ request }) => {
  const adminHeaders = getAuthHeaders('admin');
  if (!adminHeaders.Authorization) return;

  // Fetch all users
  const usersRes = await request.get(`${BASE_URL}/users/all`, { headers: adminHeaders });
  
  if (usersRes.ok()) {
    const users = await safeJson(usersRes);
    
    // Delete test users
    for (const user of users) {
      const email = user.email || user.user_email || '';
      if (email.includes('qa_') || email.includes('test_') || email.includes('delete_test_')) {
        await request.delete(`${BASE_URL}/users/${encodeURIComponent(email)}`, { headers: adminHeaders });
      }
    }
  }
});

// Local cleanup after specific suite
test.afterAll(async ({ request }) => {
  await request.delete(`${BASE_URL}/users/${testEmail}`, { headers: adminHeaders });
});
```

## Benefits

✅ **No Data Persistence**: Each test run starts with clean state  
✅ **Prevents Conflicts**: Avoids duplicate user errors  
✅ **Automatic**: No manual intervention needed  
✅ **Safe**: Failures are silently ignored (best effort)  
✅ **Targeted**: Only deletes test data, not production data

## What Gets Cleaned Up

### Currently Cleaned
- ✅ Test users (with specific email patterns)

### Not Cleaned (By Design)
- ❌ Transcripts - May be needed for verification
- ❌ Uploaded images - Tied to transcripts
- ❌ Meeting feedback - Historical data
- ❌ Minutes - Historical data

## Manual Cleanup

If automatic cleanup fails or you need to clean specific data:

### Delete All Test Users
```bash
# Get admin token
export ADMIN_TOKEN="your_admin_token"

# List all users
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://httpbin.org/users/all

# Delete specific user
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://httpbin.org/users/qa_test@example.com
```

### Delete Test Transcripts (if needed)
```bash
# List all transcripts
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://httpbin.org/transcripts/all

# Note: No delete endpoint available in current API
# Contact admin if cleanup needed
```

## Troubleshooting

### Issue: Cleanup not running
**Cause**: Admin token not available  
**Solution**: Ensure `ADMIN_TOKEN` is set in `.env` file

### Issue: Users not being deleted
**Cause**: Insufficient permissions  
**Solution**: Verify admin token has delete permissions

### Issue: Cleanup takes too long
**Cause**: Many test users from previous runs  
**Solution**: This is normal, cleanup will complete

### Issue: Tests fail due to existing users
**Cause**: Cleanup failed or was skipped  
**Solution**: 
1. Check admin token is valid
2. Run manual cleanup
3. Re-run tests

## Best Practices

### For Test Development
1. **Use consistent naming**: Always prefix test users with `qa_`, `test_`, or `delete_test_`
2. **Add local cleanup**: Include `afterAll` hooks for data created in your tests
3. **Make cleanup optional**: Use `.catch(() => {})` to ignore cleanup failures
4. **Document cleanup**: Note what data your tests create and clean up

### For Test Execution
1. **Run with admin token**: Ensures cleanup works properly
2. **Check logs**: Review cleanup results if tests fail
3. **Manual cleanup**: Periodically clean up manually if needed
4. **Monitor data**: Keep an eye on test data accumulation

## Future Enhancements

Potential improvements to cleanup mechanism:

1. **Transcript Cleanup**: Delete test transcripts older than X days
2. **Image Cleanup**: Remove orphaned images
3. **Feedback Cleanup**: Delete test feedback data
4. **Configurable Patterns**: Allow custom cleanup patterns
5. **Cleanup Report**: Log what was cleaned up
6. **Dry Run Mode**: Preview what would be cleaned without deleting

## Configuration

Currently, cleanup is automatic and requires no configuration. Future versions may include:

```javascript
// Potential configuration options
const CLEANUP_CONFIG = {
  enabled: true,
  patterns: ['qa_', 'test_', 'delete_test_'],
  cleanupTranscripts: false,
  cleanupImages: false,
  maxAge: 7 // days
};
```

## Summary

The automatic cleanup mechanism ensures:
- ✅ Clean state for each test run
- ✅ No manual intervention required
- ✅ Safe and targeted cleanup
- ✅ Prevents data persistence issues

**Note**: Cleanup is best effort and failures are silently ignored to prevent test execution from being blocked.
