import { supabase } from '@/api/supabaseClient';
import { STATIC_BLOG_POSTS } from '@/lib/staticBlogPosts';
import { PREBUILT_TOOLS } from '@/lib/toolsData';
import { isToolIndexable } from '@/lib/toolSeoCompleteness';

const POLICY_LASTMOD = '2026-06-01T00:00:00Z';
const RETIRED_TOOL_SLUGS = new Set(['pdf-to-word']);

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://www.quickutils.page'
).replace(/\/$/, '');

function buildUrl(loc) {
  return `${SITE_URL}${loc.startsWith('/') ? '' : '/'}${loc}`;
}

async function fetchTable(table, cols = '*', filter = null) {
  try {
    let q = supabase.from(table).select(cols);
    if (filter && typeof filter === 'function') {
      q = filter(q);
    }
    const res = await q;
    if (res.error) {
      console.warn(`[Sitemap] Skipping table ${table}:`, res.error.message || res.error);
      return [];
    }
    return res.data || [];
  } catch (err) {
    console.warn(`[Sitemap] Error fetching ${table}:`, err.message || err);
    return [];
  }
}

export default async function sitemap() {
  let tools = [];
  let categories = [];
  let posts = [];
  let workflows = [];
  let jobs = [];

  try {
    const [toolsData, categoriesData, postsData, workflowsData, jobsData] = await Promise.all([
      fetchTable('tools', 'slug, updated_at, is_featured, status, seo_content, seo_title, seo_description, description, faq', (q) => q.eq('status', 'published')),
      fetchTable('categories', 'slug, updated_at'),
      fetchTable('blog_posts', 'slug, updated_at, status', (q) => q.eq('status', 'published')),
      fetchTable('workflow_pages', 'slug, updated_at', (q) => q.eq('status', 'published')),
      fetchTable('jobs', 'slug, updated_at, status, last_date, featured', (q) => q.eq('status', 'published'))
    ]);

    tools = toolsData;
    categories = categoriesData;
    posts = postsData;
    workflows = workflowsData;
    jobs = jobsData;
  } catch (err) {
    console.error('[Sitemap] Failed to fetch live data, using fallbacks:', err);
  }

  // Fallbacks if Supabase was not accessible during build
  if (!tools.length) {
    tools = PREBUILT_TOOLS
      .filter((tool) => tool?.status === 'published' && !RETIRED_TOOL_SLUGS.has(tool.slug))
      .map((tool) => ({
        slug: tool.slug,
        updated_at: tool.updated_at || tool.created_at || null,
        is_featured: Boolean(tool.is_featured),
        status: tool.status,
        seo_content: tool.seo_content,
        seo_title: tool.seo_title,
        seo_description: tool.seo_description,
        description: tool.description,
        faq: tool.faq,
      }));
  }

  if (!categories.length) {
    const categorySlugs = [...new Set(tools.map((t) => t.category_slug || t.category_id).filter(Boolean))];
    categories = categorySlugs.map((slug) => ({ slug, updated_at: null }));
  }

  const sitemapEntries = [];

  // 1. Static Pages
  const staticPages = [
    { loc: '/', changefreq: 'daily', priority: 1.0 },
    { loc: '/tools', changefreq: 'daily', priority: 0.9 },
    { loc: '/categories', changefreq: 'weekly', priority: 0.8 },
    { loc: '/blog', changefreq: 'daily', priority: 0.7 },
    { loc: '/jobs', changefreq: 'daily', priority: 0.8 },
    { loc: '/about', changefreq: 'monthly', priority: 0.6, lastmod: POLICY_LASTMOD },
    { loc: '/contact', changefreq: 'monthly', priority: 0.6, lastmod: POLICY_LASTMOD },
    { loc: '/privacy', changefreq: 'yearly', priority: 0.4, lastmod: POLICY_LASTMOD },
    { loc: '/terms', changefreq: 'yearly', priority: 0.4, lastmod: POLICY_LASTMOD },
    { loc: '/disclaimer', changefreq: 'yearly', priority: 0.4, lastmod: POLICY_LASTMOD },
    { loc: '/editorial-policy', changefreq: 'yearly', priority: 0.5, lastmod: POLICY_LASTMOD },
    { loc: '/cookie-policy', changefreq: 'yearly', priority: 0.4, lastmod: POLICY_LASTMOD },
    { loc: '/team', changefreq: 'monthly', priority: 0.6, lastmod: POLICY_LASTMOD },
    { loc: '/author/arulraj-s', changefreq: 'monthly', priority: 0.6, lastmod: POLICY_LASTMOD },
    { loc: '/methodology', changefreq: 'monthly', priority: 0.6, lastmod: POLICY_LASTMOD },
    { loc: '/corrections-policy', changefreq: 'yearly', priority: 0.4, lastmod: POLICY_LASTMOD },
    { loc: '/accessibility', changefreq: 'yearly', priority: 0.4, lastmod: POLICY_LASTMOD },
    { loc: '/job-sources-policy', changefreq: 'yearly', priority: 0.5, lastmod: POLICY_LASTMOD },
    { loc: '/workflow', changefreq: 'weekly', priority: 0.75 }
  ];

  for (const page of staticPages) {
    sitemapEntries.push({
      url: buildUrl(page.loc === '/' ? '' : page.loc),
      lastModified: page.lastmod ? new Date(page.lastmod) : new Date(),
      changeFrequency: page.changefreq,
      priority: page.priority
    });
  }

  // 2. Tools — only include indexable tools with sufficient SEO content
  for (const t of tools) {
    if (!t?.slug) continue;
    if (RETIRED_TOOL_SLUGS.has(t.slug)) continue;

    // Skip tools with missing SEO content (noindex)
    if (!isToolIndexable(t)) continue;

    sitemapEntries.push({
      url: buildUrl(`/tool/${encodeURIComponent(t.slug)}`),
      lastModified: t.updated_at ? new Date(t.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: t.is_featured ? 0.9 : 0.85
    });
  }

  // 3. Categories
  for (const c of categories) {
    if (!c?.slug) continue;

    sitemapEntries.push({
      url: buildUrl(`/category/${encodeURIComponent(c.slug)}`),
      lastModified: c.updated_at ? new Date(c.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.8
    });
  }

  // 4. Static Blog Posts (from staticBlogPosts.js)
  for (const p of STATIC_BLOG_POSTS) {
    if (!p?.slug) continue;

    sitemapEntries.push({
      url: buildUrl(`/blog/${encodeURIComponent(p.slug)}`),
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'monthly',
      priority: 0.75
    });
  }

  // 5. Supabase Blog Posts
  for (const p of posts) {
    if (!p?.slug) continue;

    sitemapEntries.push({
      url: buildUrl(`/blog/${encodeURIComponent(p.slug)}`),
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.7
    });
  }

  // 6. Workflow Pages
  for (const w of workflows) {
    if (!w?.slug) continue;

    sitemapEntries.push({
      url: buildUrl(`/workflow/${encodeURIComponent(w.slug)}`),
      lastModified: w.updated_at ? new Date(w.updated_at) : undefined,
      changeFrequency: 'weekly',
      priority: 0.75
    });
  }

  // 7. Jobs
  for (const j of jobs) {
    if (!j?.slug) continue;

    // Skip expired jobs older than 90 days
    if (j.last_date) {
      const deadline = new Date(j.last_date);
      if (!isNaN(deadline.getTime())) {
        const daysSinceExpiry = (Date.now() - deadline.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceExpiry > 90) continue;
      }
    }

    const lastMod = j.updated_at || j.last_date;
    let priority = 0.65;
    if (j.featured) {
      priority = 0.85;
    } else if (lastMod) {
      const daysSinceUpdate = (Date.now() - new Date(lastMod).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 7) {
        priority = 0.75;
      } else if (daysSinceUpdate < 14) {
        priority = 0.70;
      }
    }

    let changefreq = 'weekly';
    if (j.featured) {
      changefreq = 'daily';
    } else if (lastMod) {
      const daysSinceUpdate = (Date.now() - new Date(lastMod).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 3) {
        changefreq = 'daily';
      } else if (daysSinceUpdate < 14) {
        changefreq = 'weekly';
      }
    }

    sitemapEntries.push({
      url: buildUrl(`/jobs/${encodeURIComponent(j.slug)}`),
      lastModified: lastMod ? new Date(lastMod) : undefined,
      changeFrequency: changefreq,
      priority: priority
    });
  }

  return sitemapEntries;
}
