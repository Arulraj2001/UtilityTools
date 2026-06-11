/**
 * generate-homepage-data.js
 *
 * Runs at BUILD TIME (before Vite). Fetches homepage data from Supabase
 * and writes it to public/homepage-data.json so Vite can copy it into dist/.
 *
 * The client reads this file first (zero network RTT from Vercel CDN),
 * then revalidates in the background using the Render API.
 *
 * Usage: node scripts/generate-homepage-data.js
 * Called by: npm run build (via prebuild hook)
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUTPUT_PATH = resolve(ROOT, 'public', 'homepage-data.json');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const RETIRED_TOOL_SLUGS = ['pdf-to-word'];

const excludeRetired = (query) =>
  RETIRED_TOOL_SLUGS.reduce((q, slug) => q.neq('slug', slug), query);

const dataOrEmpty = (result) => result.data || [];

async function generate() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      '[homepage-data] Supabase env vars not found — writing empty snapshot.\n' +
      '  Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for build-time prefetch.'
    );
    writeSnapshot({ categories: [], tools: [], totalUsage: 0, featuredWorkflows: [], featuredJobs: [] });
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });

  console.log('[homepage-data] Fetching from Supabase…');

  const [categoriesResult, toolsResult, usageResult, workflowsResult, jobsResult] =
    await Promise.all([
      supabase
        .from('categories')
        .select('id,name,slug,description,icon,color,status,is_featured,tool_count,sort_order')
        .order('sort_order', { ascending: true })
        .limit(50),

      excludeRetired(
        supabase
          .from('tools')
          .select('id,name,slug,description,icon,category_id,status,is_featured,is_trending,usage_count,sort_order,created_at')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
      ).limit(200),

      excludeRetired(
        supabase.from('tools').select('usage_count').eq('status', 'published')
      ),

      supabase
        .from('workflow_pages')
        .select('id,title,slug,excerpt,status,is_featured,updated_at')
        .eq('status', 'published')
        .eq('is_featured', true)
        .order('updated_at', { ascending: false })
        .limit(6),

      supabase
        .from('jobs')
        .select('id,title,slug,organization,location,short_description,status,featured,last_date')
        .eq('status', 'published')
        .eq('featured', true)
        .order('last_date', { ascending: false })
        .limit(6),
    ]);

  const usageRows = dataOrEmpty(usageResult);
  const totalUsage = usageRows.reduce((sum, t) => sum + (t.usage_count || 0), 0);

  const snapshot = {
    categories: dataOrEmpty(categoriesResult),
    tools: dataOrEmpty(toolsResult),
    totalUsage,
    featuredWorkflows: dataOrEmpty(workflowsResult),
    featuredJobs: dataOrEmpty(jobsResult),
    generatedAt: new Date().toISOString(),
    // TTL: client revalidates after 1 hour even if cached by CDN
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };

  writeSnapshot(snapshot);

  console.log(
    `[homepage-data] ✓ Written to public/homepage-data.json` +
    ` (${snapshot.categories.length} categories, ${snapshot.tools.length} tools)`
  );
}

function writeSnapshot(data) {
  mkdirSync(resolve(ROOT, 'public'), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(data), 'utf-8');
}

generate().catch((err) => {
  console.error('[homepage-data] Failed — writing empty snapshot:', err.message);
  writeSnapshot({ categories: [], tools: [], totalUsage: 0, featuredWorkflows: [], featuredJobs: [] });
  // Do NOT exit(1) — build must continue even if prefetch fails
});
