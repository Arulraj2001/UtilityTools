import { sendJson } from '../lib/response.js';

export const requireMethod = (methods) => (req, res) => {
  const allowed = Array.isArray(methods) ? methods : [methods];
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: 'Method not allowed' });
};
