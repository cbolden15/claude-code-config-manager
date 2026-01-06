// Simple test to verify encryption functionality
const { encrypt, decrypt, testEncryption } = require('./packages/server/src/lib/encryption.ts');

// Set environment variable for testing
process.env.CCM_ENCRYPTION_KEY = 'test-encryption-key-for-verification';

async function runTest() {
  try {
    console.log('Testing encryption utility...');

    // Test 1: Basic encryption/decryption
    const testData = 'Hello, World! This is a test encryption string.';
    console.log('Original text:', testData);

    const encrypted = await encrypt(testData);
    console.log('Encrypted (base64):', encrypted.substring(0, 50) + '...');

    const decrypted = await decrypt(encrypted);
    console.log('Decrypted text:', decrypted);

    const isMatch = testData === decrypted;
    console.log('Encryption/decryption successful:', isMatch);

    // Test 2: Built-in test function
    const builtInTestResult = await testEncryption();
    console.log('Built-in test passed:', builtInTestResult);

    if (isMatch && builtInTestResult) {
      console.log('✅ All encryption tests passed!');
      process.exit(0);
    } else {
      console.log('❌ Encryption tests failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

runTest();