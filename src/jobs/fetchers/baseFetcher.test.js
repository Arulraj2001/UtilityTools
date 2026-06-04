import test from 'node:test';
import assert from 'node:assert/strict';

import BaseFetcher from './baseFetcher.js';

const originalFetch = global.fetch;

const response = (body, init = {}) => new Response(body, {
  status: init.status || 200,
  headers: {
    'content-type': init.contentType || 'text/html; charset=utf-8',
    ...(init.headers || {}),
  },
});

test.afterEach(() => {
  global.fetch = originalFetch;
});

test('fetchPage fetches a safe official HTTPS page', async () => {
  let requestedUrl = '';
  let requestedUserAgent = '';
  global.fetch = async (url, options) => {
    requestedUrl = url;
    requestedUserAgent = options.headers['User-Agent'];
    return response('<html><body>Recruitment notice</body></html>');
  };

  const fetcher = new BaseFetcher({
    allowedDomains: ['example.com'],
    rateLimitMs: 0,
    retries: 0,
    userAgents: ['unit-test-agent'],
  });

  const page = await fetcher.fetchPage('https://example.com/jobs');
  assert.equal(requestedUrl, 'https://example.com/jobs');
  assert.equal(requestedUserAgent, 'unit-test-agent');
  assert.match(page.text, /Recruitment notice/);
});

test('fetchPage retries retryable HTTP failures', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    if (calls === 1) return response('temporary failure', { status: 500 });
    return response('ok');
  };

  const fetcher = new BaseFetcher({
    allowedDomains: ['example.com'],
    rateLimitMs: 0,
    retries: 1,
    retryDelayMs: 1,
  });

  const page = await fetcher.fetchPage('https://example.com/jobs');
  assert.equal(page.text, 'ok');
  assert.equal(calls, 2);
});

test('fetchPage blocks unsafe URLs before network access', async () => {
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return response('should not be called');
  };

  const fetcher = new BaseFetcher({
    allowedDomains: ['example.com'],
    rateLimitMs: 0,
    retries: 0,
  });

  await assert.rejects(() => fetcher.fetchPage('http://example.com/jobs'), /Only HTTPS/);
  await assert.rejects(() => fetcher.fetchPage('https://evil.example.net/jobs'), /allowlist/);
  await assert.rejects(() => fetcher.fetchPage('https://127.0.0.1/jobs'), /allowlist/);
  assert.equal(calls, 0);
});
