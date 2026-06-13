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
import 'dotenv/config';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { PREBUILT_TOOLS } from '../src/lib/toolsData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUTPUT_PATH = resolve(ROOT, 'public', 'homepage-data.json');

if (!globalThis.WebSocket) {
  globalThis.WebSocket = WebSocket;
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const RETIRED_TOOL_SLUGS = ['pdf-to-word'];

const LOCAL_CATEGORY_META = {
  finance: { name: 'Finance', description: 'Finance tools for calculations and money management.', icon: 'IndianRupee', color: '#0f766e', sort_order: 10 },
  education: { name: 'Education', description: 'Education and learning tools for students and teachers.', icon: 'GraduationCap', color: '#2563eb', sort_order: 20 },
  'text-tools': { name: 'Text Tools', description: 'Text processing tools for formatting, counting, and converting text.', icon: 'TextCursorInput', color: '#9333ea', sort_order: 30 },
  'developer-tools': { name: 'Developer Tools', description: 'Developer utilities for code and web development.', icon: 'Terminal', color: '#047857', sort_order: 40 },
  'daily-life': { name: 'Daily Life', description: 'Everyday tools for schedules, utilities, and small tasks.', icon: 'Sparkles', color: '#ea580c', sort_order: 50 },
  'image-tools': { name: 'Image Tools', description: 'Tools for resizing, converting, analyzing and optimizing images.', icon: 'Image', color: '#2563eb', sort_order: 55 },
  'pdf-tools': { name: 'PDF Tools', description: 'PDF manipulation tools for merging, splitting, converting, and editing PDFs.', icon: 'FileText', color: '#dc2626', sort_order: 60 },
  'government-exam-tools': { name: 'Government Exam Tools', description: 'Tools for government exam photo, document, and PDF preparation.', icon: 'FileBadge', color: '#0f766e', sort_order: 65 },
  'health-fitness': { name: 'Health & Fitness Tools', description: 'Free online health and fitness calculators for body measurements, calories, sleep, pregnancy tracking and wellness planning.', icon: 'HeartPulse', color: '#ef4444', sort_order: 70 },
  'relationship-tools': { name: 'Relationship & Lifestyle Tools', description: 'Fun relationship, compatibility, and lifestyle calculators for shareable everyday use.', icon: 'Heart', color: '#ec4899', sort_order: 75 },
  'creator-tools': { name: 'Creator & Social Media Tools', description: 'Creator tools for YouTube, Instagram, TikTok, social media analytics, and content planning.', icon: 'Youtube', color: '#ff0000', sort_order: 76 },
  'ecommerce-seller-tools': { name: 'E-commerce Seller Tools', description: 'Seller-focused e-commerce calculators and operational tools for pricing, inventory, invoices, ROI, and profit estimation.', icon: 'ShoppingBag', color: '#0ea5e9', sort_order: 79 },
  'date-time-tools': { name: 'Date & Time Tools', description: 'Date and time calculators, converters, and productivity tools for schedules, timestamps, and timezone calculations.', icon: 'Clock3', color: '#0d9488', sort_order: 80 },
  'seo-tools': { name: 'SEO Tools', description: 'SEO tools for meta tags, structured data, sitemaps, minification, keyword analysis, and technical optimization.', icon: 'SearchCode', color: '#059669', sort_order: 90 },
  'logistics-shipping': { name: 'Logistics & Shipping Tools', description: 'Logistics calculators for parcel dimensions, volumetric weight, CBM, and chargeable shipping weight.', icon: 'Package', color: '#0f766e', sort_order: 95 },
  'math-tools': { name: 'Math Tools', description: 'Math calculators for percentages, ratios, averages, fractions, and everyday numerical checks.', icon: 'Calculator', color: '#0ea5e9', sort_order: 100 },
  'seller-tools': { name: 'Seller Tools', description: 'Seller tools for pricing, profit, invoices, GST, marketplace fees, stock, and business operations.', icon: 'ShoppingBag', color: '#0ea5e9', sort_order: 105 },
};

const excludeRetired = (query) =>
  RETIRED_TOOL_SLUGS.reduce((q, slug) => q.neq('slug', slug), query);

const dataOrEmpty = (result) => result.data || [];

async function generate() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      '[homepage-data] Supabase env vars not found - using local fallback snapshot.\n' +
      '  Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for build-time prefetch.'
    );
    preserveExistingOrWriteLocalFallback('missing-env');
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

  let snapshot = {
    categories: dataOrEmpty(categoriesResult),
    tools: dataOrEmpty(toolsResult),
    totalUsage,
    featuredWorkflows: dataOrEmpty(workflowsResult),
    featuredJobs: dataOrEmpty(jobsResult),
    generatedAt: new Date().toISOString(),
    // TTL: client revalidates after 1 hour even if cached by CDN
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };

  if (!hasContent(snapshot)) {
    console.warn('[homepage-data] Supabase returned no published categories/tools - using local fallback snapshot.');
    snapshot = buildLocalFallbackSnapshot('empty-supabase');
  }

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

function hasContent(snapshot) {
  return Boolean(snapshot?.categories?.length && snapshot?.tools?.length);
}

function hasUsableExistingSnapshot() {
  if (!existsSync(OUTPUT_PATH)) return false;

  try {
    return hasContent(JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8')));
  } catch {
    return false;
  }
}

function preserveExistingOrWriteLocalFallback(reason) {
  if (hasUsableExistingSnapshot()) return;
  writeSnapshot(buildLocalFallbackSnapshot(reason));
}

function titleFromSlug(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildLocalFallbackSnapshot(reason) {
  const now = new Date();
  const publishedTools = PREBUILT_TOOLS.filter((tool) => (
    tool?.status === 'published' && !RETIRED_TOOL_SLUGS.includes(tool.slug)
  ));
  const categoryCounts = new Map();

  for (const tool of publishedTools) {
    const slug = tool.category_slug || 'tools';
    categoryCounts.set(slug, (categoryCounts.get(slug) || 0) + 1);
  }

  const categories = [...categoryCounts.entries()]
    .map(([slug, toolCount], index) => {
      const meta = LOCAL_CATEGORY_META[slug] || {};
      const name = meta.name || titleFromSlug(slug);

      return {
        id: slug,
        name,
        slug,
        description: meta.description || `Useful ${name.toLowerCase()} on QuickUtils.`,
        icon: meta.icon || 'Folder',
        color: meta.color || '#64748b',
        status: 'published',
        is_featured: true,
        tool_count: toolCount,
        sort_order: meta.sort_order || (index + 1) * 10,
      };
    })
    .sort((a, b) => a.sort_order - b.sort_order);

  const tools = publishedTools.map((tool, index) => ({
    id: tool.id || tool.slug,
    name: tool.name,
    slug: tool.slug,
    description: tool.description,
    icon: tool.icon,
    category_id: tool.category_id || tool.category_slug,
    category_slug: tool.category_slug,
    status: tool.status,
    is_featured: Boolean(tool.is_featured),
    is_trending: Boolean(tool.is_trending),
    usage_count: tool.usage_count || 0,
    sort_order: tool.sort_order || index + 1,
    created_at: tool.created_at || tool.created_date || now.toISOString(),
  }));

  return {
    categories,
    tools,
    totalUsage: tools.reduce((sum, tool) => sum + (tool.usage_count || 0), 0),
    featuredWorkflows: [],
    featuredJobs: [],
    generatedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    source: `local-prebuilt-fallback:${reason}`,
  };
}

generate().catch((err) => {
  console.error('[homepage-data] Failed - using existing or local fallback snapshot:', err.message);
  preserveExistingOrWriteLocalFallback('fetch-error');
  // Do NOT exit(1) — build must continue even if prefetch fails
});
