# 🚀 Quick Start - Pharma Portal Pharma API Tests

## Setup (First Time Only)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Tokens
Edit the `.env` file and add your tokens:
```env
ADMIN_TOKEN=your_admin_token_here
USER_TOKEN=your_user_token_here
```

📖 **Need help getting tokens?** See [ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md)

### 3. Add Test Data Files
Place audio and image files in:
- `tests/api/test-data/audio/pharma_portal_audio.mp3`
- `tests/api/test-data/audio/pharma_portal_audio.wav`
- `tests/api/test-data/images/test_image.jpg`
- `tests/api/test-data/images/test_image.png`

## Run Tests

```bash
# Run all API tests
npx playwright test tests/api/Pharma PortalApiTest.spec.js

# Run specific test
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "TC_01"

# View report
npx playwright show-report
```

## 📚 Documentation

- **[ENV_SETUP_GUIDE.md](ENV_SETUP_GUIDE.md)** - Environment setup guide
- **[tests/api/Pharma PortalApiTest.md](tests/api/Pharma PortalApiTest.md)** - Complete test documentation
- **[tests/api/QUICK_REFERENCE.md](tests/api/QUICK_REFERENCE.md)** - Quick reference guide
- **[tests/api/QA_EXECUTION_CHECKLIST.md](tests/api/QA_EXECUTION_CHECKLIST.md)** - Execution checklist

## ✅ Verify Setup

Run health check test:
```bash
npx playwright test tests/api/Pharma PortalApiTest.spec.js -g "TC_01"
```

If it passes, you're all set! 🎉
