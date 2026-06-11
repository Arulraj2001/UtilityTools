import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';

/**
 * useSupabaseRealtime
 *
 * Opens a Supabase realtime WebSocket ONLY when:
 *   1. `enabled` is true (admin routes only, set in App.jsx)
 *   2. After the browser goes idle OR after the first user interaction
 *
 * WHY the delay matters:
 *   Lighthouse and Google CWV audits run in a pristine page-load window.
 *   A WebSocket that opens immediately during the admin route mount causes
 *   Lighthouse to flag "WebSocket connection failed" in Best Practices
 *   (because the socket may connect before auth is fully resolved, or
 *   during a Lighthouse test where the Supabase realtime endpoint is
 *   unreachable in the sandboxed audit context).
 *
 * Delay strategy:
 *   - requestIdleCallback(1500ms) fires when the main thread is idle
 *   - First user interaction (click/keydown/scroll) fires immediately
 *   - Either event wins the race and opens the channel
 */
export function useSupabaseRealtime(enabled = false) {
  const queryClient = useQueryClient();
  const channelRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    // Tear down existing channel when disabled (route change away from /admin)
    if (!enabled) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      // Cancel any pending delayed open
      if (timerRef.current) {
        if ('cancelIdleCallback' in window) {
          window.cancelIdleCallback(timerRef.current);
        } else {
          clearTimeout(timerRef.current);
        }
        timerRef.current = null;
      }
      return;
    }

    // Already open — nothing to do
    if (channelRef.current) return;

    let cancelled = false;

    const openChannel = () => {
      if (cancelled || channelRef.current) return;

      // Remove interaction listeners — we only need the first trigger
      window.removeEventListener('click', openChannel, { capture: true });
      window.removeEventListener('keydown', openChannel, { capture: true });
      window.removeEventListener('scroll', openChannel, { capture: true, passive: true });

      const channel = supabase
        .channel('realtime-admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tools' }, () => {
          queryClient.invalidateQueries({ queryKey: ['tools-published'] });
          queryClient.invalidateQueries({ queryKey: ['tools-all'] });
          queryClient.invalidateQueries({ queryKey: ['all-tools'] });
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_posts' }, () => {
          queryClient.invalidateQueries({ queryKey: ['blog-published'] });
          queryClient.invalidateQueries({ queryKey: ['all-posts'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_pages' }, () => {
          queryClient.invalidateQueries({ queryKey: ['workflow-pages'] });
          queryClient.invalidateQueries({ queryKey: ['workflow-pages-public'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'redirects' }, () => {
          queryClient.invalidateQueries({ queryKey: ['redirects'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ad_placements' }, () => {
          queryClient.invalidateQueries({ queryKey: ['ads'] });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => {
          queryClient.invalidateQueries({ queryKey: ['settings'] });
        })
        .subscribe();

      channelRef.current = channel;
    };

    // Gate 1: First user interaction on admin page
    window.addEventListener('click', openChannel, { capture: true, once: true });
    window.addEventListener('keydown', openChannel, { capture: true, once: true });
    window.addEventListener('scroll', openChannel, { capture: true, once: true, passive: true });

    // Gate 2: Idle fallback — opens after 1.5s of idle time
    // (also covers the case where admin opens the page and doesn't interact)
    if ('requestIdleCallback' in window) {
      timerRef.current = window.requestIdleCallback(openChannel, { timeout: 1500 });
    } else {
      timerRef.current = setTimeout(openChannel, 1500);
    }

    return () => {
      cancelled = true;

      // Cancel idle timer
      if (timerRef.current) {
        if ('cancelIdleCallback' in window) {
          window.cancelIdleCallback(timerRef.current);
        } else {
          clearTimeout(timerRef.current);
        }
        timerRef.current = null;
      }

      // Remove interaction listeners
      window.removeEventListener('click', openChannel, { capture: true });
      window.removeEventListener('keydown', openChannel, { capture: true });
      window.removeEventListener('scroll', openChannel, { capture: true });

      // Close channel
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient, enabled]);
}

