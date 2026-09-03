# Alternative Method: Manual Cookie Extraction

If the `auth.setup.js` script continues to be blocked by Google, you can use this **manual workaround** to extract authentication cookies from your regular Chrome browser.

## Method: Extract Cookies from Real Chrome Browser

### Step 1: Login Manually in Regular Chrome

1. Open your **regular Chrome browser** (not Playwright)
2. Navigate to: `https://httpbin.org/`
3. Login with Google using:
   - Email: `qa-tester@example.com`
   - Password: `QATester@#123`
4. Wait for the dashboard to load successfully

### Step 2: Extract Cookies Using DevTools

1. Press `F12` to open Chrome DevTools
2. Go to the **Application** tab
3. In the left sidebar, expand **Cookies**
4. Click on `https://httpbin.org`
5. You'll see all cookies - we need to extract them

### Step 3: Run This Script in Console

1. In DevTools, go to the **Console** tab
2. Copy and paste this code:

```javascript
copy(JSON.stringify({
  cookies: document.cookie.split('; ').map(c => {
    const [name, ...v] = c.split('=');
    return {
      name,
      value: v.join('='),
      domain: window.location.hostname,
      path: '/',
      expires: -1,
      httpOnly: false,
      secure: true,
      sameSite: 'Lax'
    };
  }),
  origins: []
}, null, 2));
```

3. Press `Enter` - the auth state JSON is now copied to your clipboard

### Step 4: Create the Auth File Manually

1. Create the file: `tests/e2e/Pharma Voice/.auth/pharma_voice-auth.json`
2. Paste the clipboard content into this file
3. Save the file

### Step 5: Run Your Tests

Now your tests should work:

```bash
npx playwright test tests/e2e/Pharma Voice/homepage.spec.js
```

---

## Why This Works

✅ **Regular Chrome** - Not detected as automation  
✅ **Real login** - Google accepts it normally  
✅ **Same cookies** - Tests use the exact same session  
✅ **Simple** - Just copy-paste, no scripting needed

---

## When to Refresh

When your session expires (usually after a few days):

1. Repeat Steps 1-4 above
2. Overwrite the existing `pharma_voice-auth.json` file
3. Run tests again

---

## Note

This is a **workaround** if the automated `auth.setup.js` script continues to fail. Try the updated `auth.setup.js` first, and use this method only if needed!
