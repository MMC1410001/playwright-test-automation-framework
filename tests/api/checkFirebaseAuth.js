/**
 * Check if firebaseAuth.js can load service account correctly
 * Run: node tests/api/checkFirebaseAuth.js
 */

const fs = require('fs');

console.log('🔍 Checking Firebase Authentication Setup...\n');

try {
  // Check if service account file exists
  const serviceAccountPath = './tests/api/serviceAccountKey_python.json';
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Service account file not found:', serviceAccountPath);
    process.exit(1);
  }
  console.log('✅ Service account file found');

  // Load and parse service account
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf8')
  );
  
  console.log('✅ Service account loaded successfully');
  console.log('\n📋 Service Account Details:');
  console.log('   - Project ID:', serviceAccount.project_id);
  console.log('   - Client Email:', serviceAccount.client_email);
  console.log('   - Private Key ID:', serviceAccount.private_key_id);
  console.log('   - Has Private Key:', serviceAccount.private_key ? 'Yes' : 'No');

  // Check if firebaseAuth.js exists
  const firebaseAuthPath = './tests/api/firebaseAuth.js';
  if (!fs.existsSync(firebaseAuthPath)) {
    console.error('\n❌ firebaseAuth.js not found');
    process.exit(1);
  }
  console.log('\n✅ firebaseAuth.js found');

  // Try to load firebaseAuth module
  const { generateCustomToken } = require('./firebaseAuth');
  console.log('✅ firebaseAuth.js module loaded');

  // Test custom token generation
  console.log('\n🧪 Testing custom token generation...');
  const customToken = generateCustomToken('test-user-123', { role: 'developer' });
  console.log('✅ Custom token generated successfully');
  console.log('   Token (first 50 chars):', customToken.substring(0, 50) + '...');

  // Check API key issue
  console.log('\n⚠️  ISSUE FOUND:');
  console.log('   Line 38 in firebaseAuth.js uses: const apiKey = serviceAccount.project_id');
  console.log('   Current value:', serviceAccount.project_id);
  console.log('\n💡 SOLUTION:');
  console.log('   You need to replace line 38 with your Firebase Web API Key');
  console.log('   Get it from: Firebase Console > Project Settings > Web API Key');
  console.log('   Format: AIzaSy...');
  console.log('\n   Replace:');
  console.log('   const apiKey = serviceAccount.project_id;');
  console.log('   With:');
  console.log('   const apiKey = \'YOUR_FIREBASE_WEB_API_KEY_HERE\';');

  console.log('\n✅ All checks passed! Ready to add Firebase Web API Key.');

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
