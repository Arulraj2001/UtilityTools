import { numericLimit, queryParams } from '../lib/request.js';
import { sendJson } from '../lib/response.js';
import { servicesFor } from '../lib/services.js';
import { safeNumber } from '../../src/lib/phase5cScaleOps.js';

const monitoringDays = (req, fallback = 30, max = 365) => {
  const params = queryParams(req);
  return numericLimit(params.get('days'), fallback, max);
};

const monitoringLimit = (req, fallback = 100, max = 500) => {
  const params = queryParams(req);
  return numericLimit(params.get('limit'), fallback, max);
};

export const getProviderHealth = async (req, res) => {
  const result = await servicesFor(req.supabase).providers.getProviderHealth({
    days: monitoringDays(req),
  });
  sendJson(res, 200, result);
};

export const getQueueHealth = async (req, res) => {
  const result = await servicesFor(req.supabase).queue.getQueueHealth({
    days: monitoringDays(req, 7, 90),
  });
  sendJson(res, 200, result);
};

export const getQualityMetrics = async (req, res) => {
  const result = await servicesFor(req.supabase).quality.getQualityMetrics();
  sendJson(res, 200, result);
};

export const getModerationMetrics = async (req, res) => {
  const result = await servicesFor(req.supabase).moderation.getModerationMetrics({
    days: monitoringDays(req),
  });
  sendJson(res, 200, result);
};

export const getCostAnalytics = async (req, res) => {
  const result = await servicesFor(req.supabase).costs.getCostAnalytics({
    days: monitoringDays(req),
  });
  sendJson(res, 200, result);
};

export const getAlerts = async (req, res) => {
  const services = servicesFor(req.supabase);
  const overview = await services.metrics.getMetrics({
    days: monitoringDays(req),
    persistAlerts: true,
  });
  const active = await services.alerts.getActiveAlerts({
    limit: monitoringLimit(req),
  });
  sendJson(res, 200, {
    generatedAt: new Date().toISOString(),
    computed: overview.alerts,
    active,
  });
};

export const getOverview = async (req, res) => {
  const result = await servicesFor(req.supabase).dashboard.getOverview({
    days: monitoringDays(req),
    persistAlerts: true,
  });
  sendJson(res, 200, result);
};

export const getScaleOperations = async (req, res) => {
  const params = queryParams(req);
  const budgetParam = params.get('monthlyBudgetUsd');
  const result = await servicesFor(req.supabase).scaleOps.getScaleOperations({
    days: monitoringDays(req),
    monthlyBudgetUsd: budgetParam === null ? undefined : safeNumber(budgetParam, undefined),
    strategy: params.get('strategy') || 'balanced',
  });
  sendJson(res, 200, result);
};
