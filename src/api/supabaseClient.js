import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
    },
    // Realtime WebSocket is NOT opened here.
    // It is opened lazily in useSupabaseRealtime.js (admin-only, after user interaction).
    // The supabase-js v2 client only opens the WebSocket transport on the first
    // channel.subscribe() call — not at createClient time.
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);


