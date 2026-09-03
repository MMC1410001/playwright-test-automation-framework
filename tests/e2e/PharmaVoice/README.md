# Pharma Voice Pharma - Google OAuth Authentication Setup

This directory contains the authentication setup for Pharma Voice Pharma tests using Google OAuth.

## Files

- **`auth.setup.js`** - One-time authentication setup script
- **`homepage.spec.js`** - Test suite for Pharma Voice Pharma dashboard
- **`.auth/pharma_voice-auth.json`** - Saved authentication state (auto-generated)

## Setup Instructions

### First Time Setup

1. **Run the authentication setup script:**
   ```bash
   node tests/e2e/Pharma Voice/auth.setup.js
   ```

2. **Complete the manual login:**
   - A browser window will open
   - Click "Continue with Google"
   - Enter email: `qa-tester@example.com`
   - Enter password: `QATester@#123`
   - Wait for the dashboard to load

3. **Authentication state is saved:**
   - The script will automatically save your login to `.auth/pharma_voice-auth.json`
   - This file will be used by all tests

### Running Tests

After setup is complete, run tests normally:

```bash
# Run all Pharma Voice tests
npx playwright test tests/e2e/Pharma Voice/homepage.spec.js

# Run specific test
npx playwright test tests/e2e/Pharma Voice/homepage.spec.js -g "TC001"

# Run with UI mode
npx playwright test tests/e2e/Pharma Voice/homepage.spec.js --ui
```

### When Authentication Expires

If your authentication session expires (typically after a few days):

1. Delete the old auth file:
   ```bash
   Remove-Item tests\e2e\Pharma Voice\.auth\pharma_voice-auth.json
   ```

2. Re-run the setup script:
   ```bash
   node tests/e2e/Pharma Voice/auth.setup.js
   ```

## Test Cases

- **TC001** - Dashboard access with saved authentication
- **TC002** - Dashboard metrics verification
- **TC003** - Filter options verification
- **TC004** - Logout button verification
- **TC005** - User greeting verification

## Benefits of Storage State Method

✅ **No Google OAuth blocking** - Avoids "browser not secure" errors  
✅ **Fast test execution** - No repeated logins  
✅ **Reliable** - Consistent authentication across all tests  
✅ **Easy maintenance** - Simple to refresh when needed
