import 'dotenv/config';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';

const command = process.argv[2] || 'all';

const maskEmail = (value = '') => {
  const email = String(value || '');
  if (!email) return '';
  const at = email.indexOf('@');
  return `${email.slice(0, 2)}***${at >= 0 ? email.slice(at) : ''}`;
};

const createSupabaseClient = (key) => createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  key,
  {
    auth: { persistSession: false, detectSessionInUrl: false },
    realtime: { transport: ws },
  },
);

const isWeakPassword = (password = '') => (
  /^(change-me|changeme|password|admin|test|123456|change-this-admin-password)$/i.test(password.trim()) ||
  password.length < 12
);

const loadAdminState = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const email = (process.env.VITE_ADMIN_USERNAME || '').trim().toLowerCase();
  const password = process.env.VITE_ADMIN_PASSWORD || '';

  const result = {
    configuredAdmin: maskEmail(email),
    supabaseUrlConfigured: Boolean(url),
    serviceRoleConfigured: Boolean(serviceKey),
    anonKeyConfigured: Boolean(anonKey),
    adminEmailConfigured: Boolean(email),
    adminPasswordConfigured: Boolean(password),
    adminPasswordLength: password.length,
    adminPasswordLooksPlaceholder: isWeakPassword(password),
    authUserExists: false,
    userId: null,
    emailConfirmed: false,
    adminUsersRecordExists: false,
    isAdmin: false,
    loginSucceeds: false,
    loginError: null,
    accessTokenGenerated: false,
    providerProxy: null,
  };

  if (!url || !serviceKey || !anonKey || !email || !password) return result;

  const service = createSupabaseClient(serviceKey);
  const anon = createSupabaseClient(anonKey);

  const list = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (list.error) throw list.error;

  const user = (list.data.users || []).find((item) => (
    String(item.email || '').toLowerCase() === email
  ));

  if (user) {
    result.authUserExists = true;
    result.userId = user.id;
    result.emailConfirmed = Boolean(user.email_confirmed_at);

    const role = await service
      .from('admin_users')
      .select('id,is_admin,created_at')
      .eq('id', user.id)
      .maybeSingle();
    if (role.error) throw role.error;

    result.adminUsersRecordExists = Boolean(role.data);
    result.isAdmin = Boolean(role.data?.is_admin);
  }

  const login = await anon.auth.signInWithPassword({ email, password });
  result.loginSucceeds = Boolean(login.data?.session);
  result.loginError = login.error?.message || null;

  const token = login.data?.session?.access_token || process.env.SUPABASE_ADMIN_ACCESS_TOKEN || '';
  result.accessTokenGenerated = Boolean(login.data?.session?.access_token);

  if (token) {
    const response = await fetch(`${url.replace(/\/$/, '')}/functions/v1/ai-provider-proxy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'listProviders' }),
    });
    let body = {};
    try {
      body = await response.json();
    } catch {
      body = {};
    }

    result.providerProxy = {
      listProvidersStatus: response.status,
      listProvidersOk: response.ok,
      providerCount: Array.isArray(body.providers) ? body.providers.length : null,
      providersWithKeys: Array.isArray(body.providers)
        ? body.providers.filter((provider) => provider.has_api_key).length
        : null,
      providerMetadataFields: Array.isArray(body.providers) && body.providers.length > 0
        ? Object.keys(body.providers[0]).sort()
        : [],
      error: body.error || null,
      code: body.code || null,
    };
  }

  return result;
};

const validateCron = async () => {
  const configuredSecret = process.env.JOB_FETCH_CRON_SECRET ||
    process.env.CRON_FETCH_SECRET ||
    process.env.CRON_SECRET ||
    '';

  const result = {
    jobFetchCronSecretConfigured: Boolean(process.env.JOB_FETCH_CRON_SECRET),
    cronFetchSecretConfigured: Boolean(process.env.CRON_FETCH_SECRET),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    anyCronSecretConfigured: Boolean(configuredSecret),
    invalidSecret: null,
    validGet: null,
    duplicateGuard: null,
  };

  const { default: handler } = await import(`../api/cron/fetch-jobs.js?rc=${Date.now()}`);

  const invoke = async ({ method = 'GET', secret = '', body = { maxSources: 0 } } = {}) => {
    const req = {
      method,
      url: '/api/cron/fetch-jobs',
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
      body,
    };
    const res = {
      headers: {},
      statusCode: null,
      body: null,
      setHeader(key, value) {
        this.headers[key] = value;
      },
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    await handler(req, res);
    return {
      status: res.statusCode,
      resultStatus: res.body?.status || null,
      error: res.body?.error || null,
      reason: res.body?.reason || null,
      totals: res.body?.totals || null,
    };
  };

  result.invalidSecret = await invoke({ secret: 'invalid-phase1-7-secret' });
  if (configuredSecret) {
    result.validGet = await invoke({ secret: configuredSecret });

    const service = createSupabaseClient(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const startedAt = new Date().toISOString();
    const inserted = await service
      .from('job_fetch_logs')
      .insert([{
        started_at: startedAt,
        status: 'running',
        items_found: 0,
        items_saved: 0,
        errors: [],
      }])
      .select('id')
      .maybeSingle();

    if (inserted.error) {
      result.duplicateGuard = {
        setupError: inserted.error.message,
      };
    } else {
      result.duplicateGuard = await invoke({ secret: configuredSecret });
      await service
        .from('job_fetch_logs')
        .update({
          status: 'skipped',
          completed_at: new Date().toISOString(),
          errors: [{ message: 'Phase 1.7 duplicate-guard validation sentinel closed.' }],
        })
        .eq('id', inserted.data.id);
    }
  }

  return result;
};

const listRecentRunningLogs = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { serviceRoleConfigured: false, logs: [] };

  const service = createSupabaseClient(serviceKey);
  const startedAfter = new Date(Date.now() - 60 * 60_000).toISOString();
  const { data, error } = await service
    .from('job_fetch_logs')
    .select('id,source_id,started_at,status,items_found,items_saved,errors')
    .eq('status', 'running')
    .gte('started_at', startedAfter)
    .order('started_at', { ascending: false })
    .limit(10);

  if (error) throw error;

  return {
    serviceRoleConfigured: true,
    logs: data || [],
  };
};

const closePhase17Sentinels = async () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { serviceRoleConfigured: false, updated: 0, error: null };

  const service = createSupabaseClient(serviceKey);
  const startedAfter = new Date(Date.now() - 60 * 60_000).toISOString();
  const { data, error } = await service
    .from('job_fetch_logs')
    .update({
      status: 'skipped',
      completed_at: new Date().toISOString(),
      errors: [{ message: 'Phase 1.7 validation sentinel closed after duplicate-guard test.' }],
    })
    .is('source_id', null)
    .eq('status', 'running')
    .eq('items_found', 0)
    .eq('items_saved', 0)
    .gte('started_at', startedAfter)
    .select('id');

  if (error) return { serviceRoleConfigured: true, updated: 0, error: error.message };
  return { serviceRoleConfigured: true, updated: (data || []).length, error: null };
};

if (command === 'admin') {
  console.log(JSON.stringify(await loadAdminState(), null, 2));
} else if (command === 'cron') {
  console.log(JSON.stringify(await validateCron(), null, 2));
} else if (command === 'running-logs') {
  console.log(JSON.stringify(await listRecentRunningLogs(), null, 2));
} else if (command === 'close-sentinels') {
  console.log(JSON.stringify(await closePhase17Sentinels(), null, 2));
} else {
  console.log(JSON.stringify({
    admin: await loadAdminState(),
    cron: await validateCron(),
  }, null, 2));
}
