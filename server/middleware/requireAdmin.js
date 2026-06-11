import { createServiceClient, verifyAdminSession } from '../lib/supabase.js';

export const requireAdmin = async (req, res, next) => {
  try {
    const supabase = req.supabase || createServiceClient();
    const admin = await verifyAdminSession(req, supabase);
    req.supabase = supabase;
    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};
