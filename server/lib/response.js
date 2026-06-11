export const sendJson = (res, status, body, headers = {}) => {
  Object.entries({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...headers,
  }).forEach(([key, value]) => res.setHeader(key, value));

  res.status(status).json(body);
};

export const handleApiError = (res, error) => {
  const status = error?.status || error?.statusCode || error?.cause?.status || 500;
  sendJson(res, status, {
    error: error?.message || 'Request failed.',
  });
};
