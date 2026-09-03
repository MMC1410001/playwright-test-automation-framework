const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');

// Load service account key
const serviceAccount = JSON.parse(
  fs.readFileSync('./tests/api/serviceAccountKey_python.json', 'utf8')
);

/**
 * Generate Firebase Custom Token
 * This token can be exchanged for an ID token
 */
function generateCustomToken(uid = 'test-user', claims = {}) {
  const now = Math.floor(Date.now() / 1000);
  
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid: uid,
    claims: claims
  };

  const token = jwt.sign(payload, serviceAccount.private_key, {
    algorithm: 'RS256'
  });

  return token;
}

/**
 * Exchange Custom Token for ID Token
 * Uses Firebase Auth REST API
 */
async function exchangeCustomTokenForIdToken(customToken) {
  const apiKey = process.env.FIREBASE_API_KEY || 'UPDATE HERE';
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      token: customToken,
      returnSecureToken: true
    });

    const options = {
      hostname: 'identitytoolkit.googleapis.com',
      path: `/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.idToken) {
            resolve(response.idToken);
          } else {
            reject(new Error('No ID token in response: ' + data));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Get Firebase ID Token for testing
 * This is the main function to use in tests
 */
async function getFirebaseIdToken(uid = 'test-user', claims = {}) {
  try {
    const customToken = generateCustomToken(uid, claims);
    console.log('✅ Generated custom token');
    
    const idToken = await exchangeCustomTokenForIdToken(customToken);
    console.log('✅ Exchanged for ID token');
    
    return idToken;
  } catch (error) {
    console.error('❌ Error getting Firebase ID token:', error.message);
    throw error;
  }
}

module.exports = {
  generateCustomToken,
  exchangeCustomTokenForIdToken,
  getFirebaseIdToken
};
