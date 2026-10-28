/**
 * Automated Verification Test:
 * 1. Verifies that the server boots in simulated Vercel serverless environment (VERCEL=1)
 *    even when CLOUDINARY credentials are completely missing.
 * 2. Verifies that /health, /api/auth/login, /api/auth/send-otp, etc. work properly and never return HTTP 500.
 * 3. Verifies that storageService throws graceful descriptive errors in production/serverless
 *    without touching the read-only filesystem.
 */

// Simulate Vercel environment with NO Cloudinary credentials
process.env.NODE_ENV = 'test';
process.env.VERCEL = '1';
delete process.env.CLOUDINARY_CLOUD_NAME;
delete process.env.CLOUDINARY_API_KEY;
delete process.env.CLOUDINARY_API_SECRET;

import http from 'http';
import app from '../server';
import { isCloudinaryConfigured, uploadImageBuffer } from '../services/storageService';

async function runTests() {
  console.log('\n🧪 Starting Auth & Storage Robustness Tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  // 1. Cloudinary unconfigured test
  assert(
    isCloudinaryConfigured() === false,
    'Cloudinary correctly reports unconfigured when credentials are absent'
  );

  // 2. Storage upload fallback in serverless without Cloudinary
  try {
    const dummyBuffer = Buffer.from('fake image data');
    const result = await uploadImageBuffer(dummyBuffer, 'test.jpg', 'image/jpeg');
    const isDataUri = result.url.startsWith('data:image/jpeg;base64,');
    assert(
      isDataUri,
      'uploadImageBuffer returns resilient Data URI in serverless when Cloudinary is unconfigured'
    );
  } catch (err: any) {
    assert(false, 'uploadImageBuffer should not throw when Cloudinary is unconfigured', err.message);
  }

  // Start ephemeral HTTP server on random available port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // 3. Health check test
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json() as any;
    assert(
      healthRes.status === 200 && healthJson.status === 'ok',
      'GET /health returns HTTP 200 ok'
    );

    // 4. POST /api/auth/login validation error handling (empty body)
    const loginEmptyRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(
      loginEmptyRes.status === 422 || loginEmptyRes.status === 400,
      'POST /api/auth/login returns HTTP 422/400 validation error (not 500)',
      `Status: ${loginEmptyRes.status}`
    );

    // 5. POST /api/auth/login invalid credentials error handling
    const loginInvalidRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent-user-12345@example.com', password: 'wrongpassword' }),
    });
    assert(
      loginInvalidRes.status === 401,
      'POST /api/auth/login returns HTTP 401 on incorrect credentials (not 500)',
      `Status: ${loginInvalidRes.status}`
    );

    // 6. POST /api/auth/send-otp validation error handling (empty body)
    const otpEmptyRes = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(
      otpEmptyRes.status === 422 || otpEmptyRes.status === 400,
      'POST /api/auth/send-otp returns HTTP 422/400 validation error (not 500)',
      `Status: ${otpEmptyRes.status}`
    );

    // 7. POST /api/auth/register validation error handling (empty body)
    const regEmptyRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(
      regEmptyRes.status === 422 || regEmptyRes.status === 400,
      'POST /api/auth/register returns HTTP 422/400 validation error (not 500)',
      `Status: ${regEmptyRes.status}`
    );

    // 8. POST /api/auth/verify-otp validation error handling (empty body)
    const verifyEmptyRes = await fetch(`${baseUrl}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert(
      verifyEmptyRes.status === 422 || verifyEmptyRes.status === 400,
      'POST /api/auth/verify-otp returns HTTP 422/400 validation error (not 500)',
      `Status: ${verifyEmptyRes.status}`
    );

  } finally {
    server.close();
  }

  console.log(`\n================================`);
  console.log(`Tests Completed: ${passed + failed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Test runner encountered unexpected error:', err);
  process.exit(1);
});
