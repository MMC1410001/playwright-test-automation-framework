/**
 * Test script to verify Firebase authentication token generation
 * Run: node tests/api/testFirebaseAuth.js
 */

const { getFirebaseIdToken } = require('./firebaseAuth');

async function testAuth() {
  console.log('🔐 Testing Firebase Authentication...\n');
  
  try {
    // Generate ID token
    const idToken = await getFirebaseIdToken('test-user-123', { role: 'developer' });
    
    console.log('\n✅ Successfully generated Firebase ID Token!');
    console.log('Token (first 50 chars):', idToken.substring(0, 50) + '...');
    console.log('\n📋 Use this token in your tests with:');
    console.log('Authorization: Bearer ' + idToken);
    
    // Test with API
    console.log('\n🧪 Testing token with API...');
    const https = require('https');
    
    const options = {
      hostname: 'https://reqres.in',
      path: '/api/agents',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      console.log('API Response Status:', res.statusCode);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Token works! API returned 200');
        } else {
          console.log('⚠️  API returned:', res.statusCode);
          console.log('Response:', data);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ API request error:', error.message);
    });

    req.end();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n💡 Note: You need a valid Firebase API key.');
    console.log('Get it from: Firebase Console > Project Settings > Web API Key');
  }
}

testAuth();
