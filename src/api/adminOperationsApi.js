import { buildApiUrl } from './apiBase.js';

const jsonHeaders = { 'Content-Type': 'application/json' };

// ─── Dev-mode detection ───────────────────────────────────────────────────────

export const isDevMode = () =>
  typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

// ─── Core request helper ─────────────────────────────────────────────────────

export const getAdminAccessToken = async () => {
  const { supabase } = await import('./supabaseClient.js');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) {
    const authError = new Error('Admin session is required. Please log in.');
    authError.status = 401;
    throw authError;
  }
  return token;
};

export const adminApiRequest = async (path, {
  method = 'GET',
  body = null,
  tokenProvider = getAdminAccessToken,
  fetchImpl = globalThis.fetch,
} = {}) => {
  if (!fetchImpl) throw new Error('Fetch API is not available.');

  const token = await tokenProvider();

  let response;
  try {
    response = await fetchImpl(buildApiUrl(path), {
      method,
      headers: {
        ...(body ? jsonHeaders : {}),
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    const error = new Error(`Network error calling ${path}: ${networkErr.message}`);
    error.status = 0;
    throw error;
  }

  const text = await response.text().catch(() => '');

  // ── Detect non-JSON responses (e.g. Vite dev-server returning index.html) ──
  const contentType = response.headers?.get?.('content-type') || '';
  const looksLikeHtml = text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html') || contentType.includes('text/html');

  if (looksLikeHtml || (!text && response.status === 404)) {
    const isDevBuild = isDevMode();
    const error = new Error(
      isDevBuild
        ? `Admin API not available in local dev. Deploy to Vercel for this feature to work (${method} ${path}).`
        : `Admin API returned an unexpected response (${response.status}). Check Vercel function logs.`
    );
    error.status = response.status || 404;
    error.isDevModeError = isDevBuild;
    throw error;
  }

  let payload;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    const error = new Error(`Admin API returned invalid JSON from ${path}.`);
    error.status = response.status;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(payload?.error || `Admin API request failed with ${response.status}.`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

// ── Dev-mode aware query wrapper ─────────────────────────────────────────────
// Wraps any admin API function so that in local dev it returns null instead of
// throwing, preventing query error states from polluting the UI.

export const isDevModeError = (err) => Boolean(err?.isDevModeError);

export const devSafeQuery = (fn) => async (...args) => {
  try {
    return await fn(...args);
  } catch (err) {
    if (isDevModeError(err)) return null;
    throw err;
  }
};

const params = (entries = {}) => {
  const search = new URLSearchParams();
  Object.entries(entries).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

// ─── Monitoring ───────────────────────────────────────────────────────────────

export const getMonitoringOverview = ({ days = 30 } = {}, options) => (
  adminApiRequest(`/api/admin/monitoring/overview${params({ days })}`, options)
);

export const getMonitoringAlerts = ({ days = 30, limit = 100 } = {}, options) => (
  adminApiRequest(`/api/admin/monitoring/alerts${params({ days, limit })}`, options)
);

export const getScaleOperations = ({ days = 30, monthlyBudgetUsd = null, strategy = 'balanced' } = {}, options) => (
  adminApiRequest(`/api/admin/monitoring/scale-ops${params({ days, monthlyBudgetUsd, strategy })}`, options)
);

// ─── Review Queue ────────────────────────────────────────────────────────────

export const getReviewQueue = ({ limit = 100, decisionBand = null } = {}, options) => (
  adminApiRequest(`/api/admin/review-queue${params({ limit, decisionBand })}`, options)
);

export const getReviewItem = (id, options) => (
  adminApiRequest(`/api/admin/review-item/${encodeURIComponent(id)}`, options)
);

export const runReview = (id, options) => (
  adminApiRequest(`/api/admin/review-item/${encodeURIComponent(id)}/run-review`, {
    ...options,
    method: 'POST',
  })
);

export const approveReviewItem = (id, body = {}, options) => (
  adminApiRequest(`/api/admin/approve/${encodeURIComponent(id)}`, {
    ...options,
    method: 'POST',
    body,
  })
);

export const rejectReviewItem = (id, body = {}, options) => (
  adminApiRequest(`/api/admin/reject/${encodeURIComponent(id)}`, {
    ...options,
    method: 'POST',
    body,
  })
);

export const markReviewNeedsRevision = (id, body = {}, options) => (
  adminApiRequest(`/api/admin/review-item/${encodeURIComponent(id)}/needs-revision`, {
    ...options,
    method: 'POST',
    body,
  })
);

export const convertReviewItemToJobDraft = (id, body = {}, options) => (
  adminApiRequest(`/api/admin/review-item/${encodeURIComponent(id)}/convert-to-job-draft`, {
    ...options,
    method: 'POST',
    body,
  })
);

// ─── Phase 5D: Fetch Operations ───────────────────────────────────────────────

export const runFetchAll = (body = {}, options) => (
  adminApiRequest('/api/admin/fetch/run', { ...options, method: 'POST', body })
);

export const runFetchSource = (sourceId, options) => (
  adminApiRequest(`/api/admin/fetch/source/${encodeURIComponent(sourceId)}`, {
    ...options,
    method: 'POST',
  })
);

export const getFetchStatus = (options) => (
  adminApiRequest('/api/admin/fetch/status', options)
);

export const getFetchLogs = ({ limit = 50, sourceId = null } = {}, options) => (
  adminApiRequest(`/api/admin/fetch/logs${params({ limit, sourceId })}`, options)
);

// ─── Phase 5D: AI Queue Processing ───────────────────────────────────────────

export const processAiQueue = (body = {}, options) => (
  adminApiRequest('/api/admin/ai/process-queue', { ...options, method: 'POST', body })
);

export const processAiQueueItem = (itemId, body = {}, options) => (
  adminApiRequest(`/api/admin/ai/process-item/${encodeURIComponent(itemId)}`, {
    ...options,
    method: 'POST',
    body,
  })
);

export const getAiQueueStatus = (options) => (
  adminApiRequest('/api/admin/ai/status', options)
);

// ─── Phase 5D: Audited Publish ────────────────────────────────────────────────

export const publishJob = (jobId, body = {}, options) => (
  adminApiRequest(`/api/admin/publish/${encodeURIComponent(jobId)}`, {
    ...options,
    method: 'POST',
    body,
  })
);

// ─── Phase 5D: Bulk Moderation ────────────────────────────────────────────────

export const bulkApproveReviewItems = (body = {}, options) => (
  adminApiRequest('/api/admin/review-queue/bulk-approve', {
    ...options,
    method: 'POST',
    body,
  })
);

export const bulkRejectReviewItems = (body = {}, options) => (
  adminApiRequest('/api/admin/review-queue/bulk-reject', {
    ...options,
    method: 'POST',
    body,
  })
);
