import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';


const isBrowser = typeof window !== 'undefined';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: isBrowser,
      detectSessionInUrl: isBrowser,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
console.log('[supabaseClient] initialized. supabase defined:', typeof supabase !== 'undefined', 'supabase.auth defined:', supabase ? typeof supabase.auth !== 'undefined' : false);


