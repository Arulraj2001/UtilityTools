import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

const serviceUrl = () => process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = () => process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const authHeader = (req) => req.headers?.authorization || req.headers?.Authorization || '';

export const bearerToken = (value = '') => String(value || '').replace(/^Bearer\s+/i, '').trim();

export const createServiceClient = () => {
  if (!serviceUrl() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error('Supabase service environment is not configured.');
    error.status = 500;
    throw error;
  }

  return createClient(serviceUrl(), process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
    realtime: {
      transport: ws,
    },
  });
};

export const createAnonClient = () => {
  if (!serviceUrl() || !anonKey()) {
    const error = new Error('Supabase environment is not configured');
    error.status = 500;
    throw error;
  }

  return createClient(serviceUrl(), anonKey(), {
    auth: {
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
};

export const verifyAdminSession = async (req, supabase) => {
  const token = bearerToken(authHeader(req));
  if (!token) {
    const error = new Error('Authorization required.');
    error.status = 401;
    throw error;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    const error = new Error('Invalid or expired admin session.');
    error.status = 401;
    throw error;
  }

  if (!user.email_confirmed_at && !user.confirmed_at) {
    const error = new Error('Email not confirmed.');
    error.status = 401;
    throw error;
  }

  if (user.aud && user.aud !== 'authenticated') {
    const error = new Error('Invalid token audience.');
    error.status = 401;
    throw error;
  }

  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (adminError || !admin?.is_admin) {
    const error = new Error('Admin role required.');
    error.status = 403;
    throw error;
  }

  return user;
};
