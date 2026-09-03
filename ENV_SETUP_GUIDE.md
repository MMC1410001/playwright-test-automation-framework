# Environment Setup Guide

## Quick Setup

### 1. Install Dependencies
```bash
npm install
```

This will install `dotenv` package which is required to load environment variables from `.env` file.

### 2. Configure Environment Variables

Open the `.env` file in the root directory and add your authentication tokens:

```env
ADMIN_TOKEN=your_actual_admin_token_here
USER_TOKEN=your_actual_user_token_here
```

### 3. How to Get Tokens

#### Option 1: From Browser DevTools
1. Login to https://httpbin.org (or your Pharma Portal Pharma app)
2. Open Browser DevTools (F12)
3. Go to Network tab
4. Make any API request
5. Look for the `Authorization` header in the request
6. Copy the token (without "Bearer " prefix)

#### Option 2: From API Response
If your API provides a login endpoint:
1. Call the login endpoint with your credentials
2. Extract the token from the response
3. Use that token in the `.env` file

### 4. Verify Setup

Run a simple test to verify tokens are loaded:

```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "TC_01"
```

If the health check passes, your setup is correct!

## File Structure

```
PlayWrightQAAutomation/
├── .env                    ← Your actual tokens (DO NOT COMMIT)
├── .env.example            ← Template file (safe to commit)
├── .gitignore              ← Should include .env
└── tests/
    └── api/
        └── Pharma PortalApiTest.spec.js
```

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit `.env` file to version control
- Keep your tokens secure and private
- Rotate tokens regularly
- Use different tokens for different environments (dev/staging/prod)

## Troubleshooting

### Issue: Tests skip due to missing tokens
**Solution**: Ensure `.env` file exists and contains valid tokens

### Issue: "Cannot find module 'dotenv'"
**Solution**: Run `npm install` to install dependencies

### Issue: Tokens not loading
**Solution**: 
- Verify `.env` file is in the root directory (PlayWrightQAAutomation/)
- Check there are no spaces around the `=` sign
- Ensure no quotes around token values (unless they're part of the token)

### Issue: 401 Unauthorized errors
**Solution**: 
- Verify tokens are valid and not expired
- Check token format (should not include "Bearer " prefix in .env)
- Ensure you're using the correct token for the environment

## Example .env File

```env
# Correct format
ADMIN_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
USER_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ Wrong - includes Bearer prefix
ADMIN_TOKEN=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ Wrong - has spaces
ADMIN_TOKEN = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ❌ Wrong - has quotes (unless part of token)
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Running Tests

Once setup is complete, run tests:

```bash
# Run all tests
npx playwright test tests/api/Pharma PortalApiTest.spec.js

# Run specific test
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "TC_01"

# Run with UI
npx playwright test tests/api/Pharma PortalApiTest.spec.js --ui

# View report
npx playwright show-report
```

---

**Need Help?** Check the main documentation in `tests/api/Pharma PortalApiTest.md`
