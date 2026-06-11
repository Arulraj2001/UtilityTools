import AdminReviewService from '../../src/jobs/review/adminReviewService.js';
import { createServiceClient, requireAdmin } from './fetchApi.js';

const terminalRouteSegments = new Set([
  'run-review',
  'needs-revision',
  'convert-to-job-draft',
  'bulk-approve',
  'bulk-reject',
]);

export const idFromRequest = (req) => {
  if (req.query?.id) return Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const url = new URL(req.url || '/', 'https://quickutils.local');
  const parts = url.pathname.split('/').filter(Boolean);
  if (!parts.length) return '';
  const last = parts[parts.length - 1];
  return terminalRouteSegments.has(last) ? (parts[parts.length - 2] || '') : last;
};

export const createAdminReviewContext = async (req) => {
  const supabase = createServiceClient();
  const admin = await requireAdmin(req, supabase);
  return {
    supabase,
    admin,
    service: new AdminReviewService(supabase),
  };
};
