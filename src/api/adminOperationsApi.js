const jsonHeaders = { 'Content-Type': 'application/json' };

export const getAdminAccessToken = async () => {
  const { supabase } = await import('./supabaseClient.js');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) {
    const authError = new Error('Admin session is required.');
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
  const response = await fetchImpl(path, {
    method,
    headers: {
      ...(body ? jsonHeaders : {}),
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(payload?.error || `Admin API request failed with ${response.status}.`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};

const params = (entries = {}) => {
  const search = new URLSearchParams();
  Object.entries(entries).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const getMonitoringOverview = ({ days = 30 } = {}, options) => (
  adminApiRequest(`/api/admin/monitoring/overview${params({ days })}`, options)
);

export const getMonitoringAlerts = ({ days = 30, limit = 100 } = {}, options) => (
  adminApiRequest(`/api/admin/monitoring/alerts${params({ days, limit })}`, options)
);

export const getScaleOperations = ({ days = 30, monthlyBudgetUsd = null, strategy = 'balanced' } = {}, options) => (
  adminApiRequest(`/api/admin/monitoring/scale-ops${params({ days, monthlyBudgetUsd, strategy })}`, options)
);

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
