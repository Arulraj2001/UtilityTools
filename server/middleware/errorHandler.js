import { sendJson } from '../lib/response.js';

export const notFound = (req, res) => {
  sendJson(res, 404, { error: 'Not found' });
};

export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = error?.status || error?.statusCode || error?.cause?.status || 500;
  sendJson(res, status, {
    error: error?.message || 'Request failed.',
  });
};
