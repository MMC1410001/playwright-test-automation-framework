# Environment Configuration Summary

## ✅ Files Created

### 1. Environment Files
- **`.env`** - Your actual tokens (add your tokens here)
- **`.env.example`** - Template file for reference
- **`.gitignore`** - Updated to exclude .env file

### 2. Documentation
- **`ENV_SETUP_GUIDE.md`** - Detailed environment setup guide
- **`QUICK_START.md`** - Quick start guide for running tests

### 3. Code Updates
- **`package.json`** - Added `dotenv` dependency
- **`Pharma PortalApiTest.spec.js`** - Added dotenv import to load .env file

## 🔧 Setup Instructions

### Step 1: Install dotenv package
```bash
npm install
```

### Step 2: Add your tokens to .env file
Open `.env` and add:
```env
ADMIN_TOKEN=your_actual_admin_token
USER_TOKEN=your_actual_user_token
```

### Step 3: Verify setup
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "TC_01"
```

## 📝 How It Works

1. The test file imports `dotenv` package
2. `config()` loads variables from `.env` file
3. `process.env.ADMIN_TOKEN` and `process.env.USER_TOKEN` are now available
4. Tests use these tokens for authentication

## 🔒 Security

- ✅ `.env` is added to `.gitignore` (won't be committed)
- ✅ `.env.example` is safe to commit (no actual tokens)
- ✅ Tokens are loaded at runtime from environment

## 📂 File Locations

```
PlayWrightQAAutomation/
├── .env                          ← Add your tokens here
├── .env.example                  ← Template reference
├── .gitignore                    ← Updated to exclude .env
├── package.json                  ← Added dotenv dependency
├── ENV_SETUP_GUIDE.md           ← Detailed setup guide
├── QUICK_START.md               ← Quick start guide
└── tests/
    └── api/
        ├── Pharma PortalApiTest.spec.js  ← Updated to load .env
        └── Pharma PortalApiTest.md       ← Test documentation
```

## ⚠️ Important Notes

1. **Never commit `.env` file** - It contains sensitive tokens
2. **Keep tokens secure** - Don't share them publicly
3. **Rotate tokens regularly** - Update them periodically
4. **Use correct format** - No spaces, no quotes, no "Bearer " prefix

## ✅ Verification Checklist

- [ ] `npm install` completed successfully
- [ ] `.env` file exists in root directory
- [ ] Tokens added to `.env` file
- [ ] Health check test (TC_01) passes
- [ ] No errors about missing environment variables

## 🆘 Troubleshooting

### Tests skip due to missing tokens?
→ Check `.env` file exists and has correct token values

### "Cannot find module 'dotenv'"?
→ Run `npm install`

### 401 Unauthorized errors?
→ Verify tokens are valid and not expired

### Tokens not loading?
→ Ensure `.env` is in root directory (PlayWrightQAAutomation/)

---

**Ready to run tests?** See [QUICK_START.md](QUICK_START.md)
