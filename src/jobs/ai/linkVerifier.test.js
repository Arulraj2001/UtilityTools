import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyUrl, verifyUrls } from './linkVerifier.js';

test('linkVerifier handles empty or invalid URLs', async () => {
  const skipResult = await verifyUrl('not specified');
  assert.equal(skipResult.ok, true);
  assert.equal(skipResult.skipped, true);

  const emptyResult = await verifyUrl('');
  assert.equal(emptyResult.ok, true);
  assert.equal(emptyResult.skipped, true);

  const invalidProto = await verifyUrl('ftp://example.com');
  assert.equal(invalidProto.ok, false);
  assert.equal(invalidProto.error, 'Invalid protocol');
});

test('linkVerifier handles successful fetch responses', async () => {
  const originalFetch = globalThis.fetch;
  
  // Mock fetch to succeed on HEAD
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, 'HEAD');
    return { ok: true, status: 200 };
  };

  try {
    const result = await verifyUrl('https://ssc.nic.in/notice.pdf');
    assert.equal(result.ok, true);
    assert.equal(result.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('linkVerifier falls back to GET when HEAD fails', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, options) => {
    calls.push(options.method);
    if (options.method === 'HEAD') {
      throw new Error('HEAD not allowed');
    }
    assert.equal(options.method, 'GET');
    assert.equal(options.headers.Range, 'bytes=0-100');
    return { ok: true, status: 206 };
  };

  try {
    const result = await verifyUrl('https://upsc.gov.in/job-apply');
    assert.equal(result.ok, true);
    assert.equal(result.status, 206);
    assert.deepEqual(calls, ['HEAD', 'GET']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('linkVerifier returns failure if both HEAD and GET fail', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    if (options.method === 'HEAD') {
      throw new Error('HEAD failed');
    }
    return { ok: false, status: 404 };
  };

  try {
    const result = await verifyUrl('https://non-existent-site.gov.in');
    assert.equal(result.ok, false);
    assert.equal(result.status, 404);
    assert.equal(result.error, 'HTTP 404');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('verifyUrls runs multiple URL checks concurrently', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    if (url.includes('good')) {
      return { ok: true, status: 200 };
    }
    return { ok: false, status: 404 };
  };

  try {
    const results = await verifyUrls({
      pdf: 'https://ssc.nic.in/good.pdf',
      website: 'https://upsc.gov.in/bad-url',
      skipped: 'not specified',
    });

    assert.equal(results.pdf.ok, true);
    assert.equal(results.website.ok, false);
    assert.equal(results.website.status, 404);
    assert.equal(results.skipped.ok, true);
    assert.equal(results.skipped.skipped, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
