import { handleApiError, queryParams, requireMethod, sendJson } from '../../_lib/fetchApi.js';
import { createMonitoringContext, monitoringDays, servicesFor } from '../../_lib/monitoringApi.js';
import { safeNumber } from '../../../src/lib/phase5cScaleOps.js';

export default async function handler(req, res) {
  if (!requireMethod(req, res, 'GET')) return;
  try {
    const { supabase } = await createMonitoringContext(req);
    const params = queryParams(req);
    const budgetParam = params.get('monthlyBudgetUsd');
    const result = await servicesFor(supabase).scaleOps.getScaleOperations({
      days: monitoringDays(req),
      monthlyBudgetUsd: budgetParam === null ? undefined : safeNumber(budgetParam, undefined),
      strategy: params.get('strategy') || 'balanced',
    });
    sendJson(res, 200, result);
  } catch (error) {
    handleApiError(res, error);
  }
}
