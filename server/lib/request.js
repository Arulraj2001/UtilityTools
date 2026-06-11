export const readJsonBody = async (req) => {
  if (req.body === null || req.body === undefined) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    if (!req.body.trim()) return {};
    return JSON.parse(req.body);
  }

  if (typeof req[Symbol.asyncIterator] !== 'function') return {};

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw.trim() ? JSON.parse(raw) : {};
};

export const queryParams = (req) => {
  const host = req.get?.('host') || req.headers?.host || 'quickutils.local';
  const protocol = req.protocol || 'https';
  return new URL(req.originalUrl || req.url || '/', `${protocol}://${host}`).searchParams;
};

export const numericLimit = (value, fallback = 50, max = 200) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.floor(parsed));
};
