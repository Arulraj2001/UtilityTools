/**
 * useHomepageData.js
 *
 * Stale-while-revalidate homepage data hook.
 *
 * Priority chain (fastest first):
 *   1. /homepage-data.json  — built at deploy time, served from Vercel CDN edge (~5ms)
 *   2. Render API           — fresh data, revalidates in background if static is stale
 *
 * Result: zero-latency first render, fresh data after ~2s background fetch.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

const STATIC_DATA_URL = '/homepage-data.json';
const QUERY_KEY = ['homepage-summary'];
// Revalidate if static data is older than 1 hour
const STATIC_MAX_AGE_MS = 60 * 60 * 1000;
// React Query stale time: treat data as fresh for 5 minutes after fetch
const STALE_TIME_MS = 5 * 60 * 1000;

/** Fetch the static JSON snapshot (CDN-cached, near-instant) */
const fetchStaticSnapshot = async () => {
  try {
    const res = await fetch(STATIC_DATA_URL, {
      // Force CDN cache hit — no conditional request
      cache: 'force-cache',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return res.json();
  } catch {
    return null;
  }
};

/** Fetch fresh data from the Render API via the Vercel rewrite proxy */
const fetchLiveData = async () => {
  const { getHomepageSummary } = await import('@/api/homepageApi');
  return getHomepageSummary();
};

/** True if the static snapshot is too old to trust */
const isStale = (snapshot) => {
  if (!snapshot?.generatedAt) return true;
  const age = Date.now() - new Date(snapshot.generatedAt).getTime();
  return age > STATIC_MAX_AGE_MS;
};

/**
 * Returns homepage data with instant first render from static snapshot.
 * Automatically revalidates in the background if the snapshot is stale.
 */
export function useHomepageData() {
  const queryClient = useQueryClient();
  const revalidated = useRef(false);

  // Phase 1: Load static snapshot immediately (no defer, no idle callback)
  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchStaticSnapshot,
    // Show cached data immediately — no loading state on first render
    placeholderData: (prev) => prev,
    staleTime: STALE_TIME_MS,
    gcTime: 30 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Phase 2: Background revalidation if snapshot is stale or empty
  useEffect(() => {
    if (revalidated.current) return;

    const shouldRevalidate = !data
      || !data.categories?.length
      || isStale(data);

    if (!shouldRevalidate) return;

    revalidated.current = true;

    // Use requestIdleCallback so this never delays LCP
    const run = () => {
      queryClient.prefetchQuery({
        queryKey: QUERY_KEY,
        queryFn: fetchLiveData,
        staleTime: 0,
      }).catch(() => {
        // Silently ignore Render cold-start failures — static data is already shown
      });
    };

    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(run, { timeout: 2000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const timer = setTimeout(run, 800);
    return () => clearTimeout(timer);
  }, [data, queryClient]);

  return {
    data: data ?? {},
    isLoading: isLoading && !data,
    // isReady: true as soon as we have ANY data (even empty static snapshot)
    isReady: !isLoading || Boolean(data),
  };
}
