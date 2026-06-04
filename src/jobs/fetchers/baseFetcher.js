import net from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { load } from 'cheerio';

export class FetcherError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'FetcherError';
    this.details = details;
  }
}

export const DEFAULT_USER_AGENTS = [
  'QuickUtilsJobBot/1.0 (+https://quickutils.app/job-sources-policy)',
  'Mozilla/5.0 (compatible; QuickUtilsJobBot/1.0; +https://quickutils.app/job-sources-policy)',
  'QuickUtilsOfficialSourceMonitor/1.0',
];

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 2_000_000;
const DEFAULT_RETRIES = 2;
const DEFAULT_RATE_LIMIT_MS = 1_200;
const DEFAULT_MAX_REDIRECTS = 3;

const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

export const normalizeHostname = (hostname = '') => (
  String(hostname || '')
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
);

const isPrivateIPv4 = (hostname) => {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254) ||
    a === 0
  );
};

const isPrivateHostname = (hostname) => {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (net.isIP(normalized) === 4) return isPrivateIPv4(normalized);
  if (net.isIP(normalized) === 6) {
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80');
  }
  return false;
};

const isRedirectStatus = (status) => [301, 302, 303, 307, 308].includes(status);

const shouldRetryStatus = (status) => status === 408 || status === 425 || status === 429 || status >= 500;

const mergeHeaders = (baseHeaders, nextHeaders) => ({
  ...baseHeaders,
  ...(nextHeaders || {}),
});

export default class BaseFetcher {
  constructor(options = {}) {
    this.sourceKey = options.sourceKey || 'generic';
    this.organization = options.organization || '';
    this.allowedDomains = (options.allowedDomains || []).map(normalizeHostname).filter(Boolean);
    this.timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.maxBytes = options.maxBytes || DEFAULT_MAX_BYTES;
    this.retries = Number.isInteger(options.retries) ? options.retries : DEFAULT_RETRIES;
    this.retryDelayMs = options.retryDelayMs || 650;
    this.rateLimitMs = options.rateLimitMs || DEFAULT_RATE_LIMIT_MS;
    this.maxRedirects = options.maxRedirects || DEFAULT_MAX_REDIRECTS;
    this.userAgents = options.userAgents?.length ? options.userAgents : DEFAULT_USER_AGENTS;
    this.logger = options.logger || noopLogger;
    this.lastRequestAt = 0;
    this.userAgentIndex = 0;
    this.errors = [];
  }

  resetErrors() {
    this.errors = [];
  }

  recordError(error, context = {}) {
    const entry = {
      message: error?.message || String(error || 'Unknown fetcher error'),
      context,
    };
    this.errors.push(entry);
    this.logger.warn?.(`[${this.sourceKey}] ${entry.message}`, context);
    return entry;
  }

  nextUserAgent() {
    const selected = this.userAgents[this.userAgentIndex % this.userAgents.length];
    this.userAgentIndex += 1;
    return selected;
  }

  isAllowedHostname(hostname) {
    const normalized = normalizeHostname(hostname);
    if (!normalized || isPrivateHostname(normalized)) return false;

    return this.allowedDomains.some((allowedDomain) => (
      normalized === allowedDomain || normalized.endsWith(`.${allowedDomain}`)
    ));
  }

  assertSafeUrl(url) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (_error) {
      throw new FetcherError('Invalid URL.', { url });
    }

    if (parsed.protocol !== 'https:') {
      throw new FetcherError('Only HTTPS URLs are allowed.', { url });
    }

    if (parsed.username || parsed.password) {
      throw new FetcherError('URLs with embedded credentials are not allowed.', { url });
    }

    if (!this.isAllowedHostname(parsed.hostname)) {
      throw new FetcherError('URL host is not in the source allowlist.', {
        url,
        hostname: parsed.hostname,
        allowedDomains: this.allowedDomains,
      });
    }

    return parsed;
  }

  absolutizeUrl(href, baseUrl) {
    if (!href || typeof href !== 'string') return null;
    try {
      const parsed = new URL(href.trim(), baseUrl);
      parsed.hash = '';
      return parsed.toString();
    } catch (_error) {
      return null;
    }
  }

  async waitForRateLimit() {
    const elapsed = Date.now() - this.lastRequestAt;
    const waitMs = Math.max(0, this.rateLimitMs - elapsed);
    if (waitMs > 0) await sleep(waitMs);
    this.lastRequestAt = Date.now();
  }

  async fetchPage(url, options = {}) {
    const parsed = this.assertSafeUrl(url);
    let lastError = null;

    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        if (attempt > 0) {
          await sleep(this.retryDelayMs * attempt);
        }
        return await this.fetchWithRedirects(parsed.toString(), options, 0);
      } catch (error) {
        lastError = error;
        const status = error?.details?.status;
        if (attempt >= this.retries || (status && !shouldRetryStatus(status))) {
          throw error;
        }
      }
    }

    throw lastError || new FetcherError('Fetch failed.', { url });
  }

  async fetchWithRedirects(url, options = {}, redirectCount = 0) {
    this.assertSafeUrl(url);
    await this.waitForRateLimit();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || this.timeoutMs);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: mergeHeaders({
          Accept: 'text/html,application/xhtml+xml,text/plain,application/xml;q=0.9,*/*;q=0.2',
          'Accept-Language': 'en-IN,en;q=0.9',
          'User-Agent': this.nextUserAgent(),
        }, options.headers),
      });

      if (isRedirectStatus(response.status)) {
        if (redirectCount >= this.maxRedirects) {
          throw new FetcherError('Too many redirects.', { url, status: response.status });
        }

        const location = response.headers.get('location');
        if (!location) {
          throw new FetcherError('Redirect response did not include a location header.', {
            url,
            status: response.status,
          });
        }

        const redirectedUrl = this.absolutizeUrl(location, url);
        this.assertSafeUrl(redirectedUrl);
        return this.fetchWithRedirects(redirectedUrl, options, redirectCount + 1);
      }

      if (!response.ok) {
        throw new FetcherError(`Fetch failed with HTTP ${response.status}.`, {
          url,
          status: response.status,
        });
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > this.maxBytes) {
        throw new FetcherError('Response is larger than the configured maximum size.', {
          url,
          contentLength,
          maxBytes: this.maxBytes,
        });
      }

      const contentType = response.headers.get('content-type') || '';
      if (/application\/pdf/i.test(contentType) && !options.allowPdfBody) {
        throw new FetcherError('PDF response bodies are not fetched by the HTML fetcher.', {
          url,
          contentType,
        });
      }

      const text = await this.readResponseText(response);
      return {
        url,
        status: response.status,
        contentType,
        headers: response.headers,
        text,
        durationMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new FetcherError('Fetch timed out.', { url, timeoutMs: options.timeoutMs || this.timeoutMs });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async readResponseText(response) {
    if (!response.body) {
      const text = await response.text();
      if (Buffer.byteLength(text, 'utf8') > this.maxBytes) {
        throw new FetcherError('Response body exceeded the configured maximum size.', {
          maxBytes: this.maxBytes,
        });
      }
      return text;
    }

    const reader = response.body.getReader?.();
    if (reader) {
      const decoder = new TextDecoder();
      let received = 0;
      let text = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > this.maxBytes) {
          throw new FetcherError('Response body exceeded the configured maximum size.', {
            received,
            maxBytes: this.maxBytes,
          });
        }
        text += decoder.decode(value, { stream: true });
      }

      text += decoder.decode();
      return text;
    }

    const chunks = [];
    let received = 0;
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      received += buffer.byteLength;
      if (received > this.maxBytes) {
        throw new FetcherError('Response body exceeded the configured maximum size.', {
          received,
          maxBytes: this.maxBytes,
        });
      }
      chunks.push(buffer);
    }

    return Buffer.concat(chunks).toString('utf8');
  }

  sanitizeHtml(rawHtml = '') {
    const $ = load(String(rawHtml || ''));
    $('script,style,noscript,iframe,object,embed,form,input,button,svg,canvas').remove();
    $('[onload],[onclick],[onerror],[onmouseover],[style]').each((_, element) => {
      const attribs = element.attribs || {};
      Object.keys(attribs).forEach((name) => {
        if (/^on/i.test(name) || name === 'style') $(element).removeAttr(name);
      });
    });
    return $.html();
  }

  htmlToText(html = '') {
    const $ = load(String(html || ''));
    $('script,style,noscript,iframe,object,embed,form,input,button,svg,canvas').remove();
    return $.root()
      .text()
      .replace(/\s+/g, ' ')
      .trim();
  }

  async fetch(_source) {
    throw new FetcherError('Source fetcher must implement fetch(source).');
  }
}
