import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';

const subscribers = [
  { table: 'tools', queries: ['tools-published', 'tools-all', 'all-tools', 'categories', 'blog-published'] },
  { table: 'categories', queries: ['categories', 'tools-published', 'tools-all', 'all-tools'] },
  { table: 'blog_posts', queries: ['blog-published', 'all-posts'] },
  { table: 'workflow_pages', queries: ['workflow-pages', 'workflow-pages-public'] },
  { table: 'redirects', queries: ['redirects'] },
  { table: 'ad_placements', queries: ['ads'] },
  { table: 'site_settings', queries: ['settings'] },
];

export function useSupabaseRealtime(enabled = false) {
  const queryClient = useQueryClient();
  const channelRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    if (channelRef.current) return;

    const channel = supabase
      .channel('realtime-all-tables')
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

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [queryClient, enabled]);
}
