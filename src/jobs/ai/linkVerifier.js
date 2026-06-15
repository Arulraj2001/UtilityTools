const noopLogger = {
  warn: () => {},
  error: () => {},
};

export const verifyUrl = async (urlText, timeoutMs = 5000) => {
  if (!urlText || !urlText.trim() || /^not specified$/i.test(urlText.trim())) {
    return { ok: true, skipped: true };
  }
  try {
    const url = new URL(urlText.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, error: 'Invalid protocol' };
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Try HEAD request first as it is lightweight
      const headRes = await fetch(url.toString(), {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      clearTimeout(id);

      if (headRes.ok) {
        return { ok: true, status: headRes.status };
      }
    } catch (_headErr) {
      // Fall through to GET on error
    }

    // Try GET request with range or short timeout if HEAD fails
    const getController = new AbortController();
    const getId = setTimeout(() => getController.abort(), timeoutMs);

    const getRes = await fetch(url.toString(), {
      method: 'GET',
      signal: getController.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Range': 'bytes=0-100', // Only fetch first 100 bytes
      },
    });
    clearTimeout(getId);

    return {
      ok: getRes.status < 400,
      status: getRes.status,
      error: getRes.status >= 400 ? `HTTP ${getRes.status}` : null,
    };
  } catch (err) {
    let errMsg = err.message || String(err);
    if (err.name === 'AbortError') errMsg = 'Timeout';
    return { ok: false, error: errMsg };
  }
};

export const verifyUrls = async (urlsObj = {}, timeoutMs = 5000) => {
  const keys = Object.keys(urlsObj);
  const promises = keys.map((key) => verifyUrl(urlsObj[key], timeoutMs));
  const results = await Promise.all(promises);
  const verification = {};
  keys.forEach((key, index) => {
    verification[key] = results[index];
  });
  return verification;
};
