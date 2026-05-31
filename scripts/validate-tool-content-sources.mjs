#!/usr/bin/env node

import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';

dotenv.config({ quiet: true });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const details = process.argv.includes('--details');
const json = process.argv.includes('--json');

const siteUrl = (
  process.env.SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  'https://quickutils.page'
).replace(/\/$/, '');

const retiredToolSlugs = new Set(['pdf-to-word']);

const sourceChecks = [
  {
    file: 'src/pages/ToolPage.jsx',
    forbidden: [
      'toolContentProfiles',
      'getToolContentProfile',
      'hasToolContentProfile',
    ],
  },
  {
    file: 'src/components/seo/ToolSEO.jsx',
    forbidden: [
      'toolContentProfiles',
      'profileSeo',
      'profile?.faqs',
    ],
  },
  {
    file: 'src/components/seo/ToolContentSections.jsx',
    forbidden: [
      'getToolContentProfile',
      'PhaseToolContent',
      'Generate rich default content sections',
      'What is {tool.name}',
      'How to Use {tool.name}',
      'Real-World Use Cases',
      'Frequently Asked Questions',
    ],
  },
];

const removedStaticContentFiles = [
  'src/components/seo/toolContentProfiles.js',
];

const readSource = async (relativePath) => {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
};

const checkSources = async () => {
  const errors = [];

  for (const check of sourceChecks) {
    const contents = await readSource(check.file);
    for (const token of check.forbidden) {
      if (contents.includes(token)) {
        errors.push(`${check.file} still contains forbidden static content token: ${token}`);
      }
    }
  }

  for (const relativePath of removedStaticContentFiles) {
    try {
      await fs.access(path.join(repoRoot, relativePath));
      errors.push(`${relativePath} should not exist; static tool profile content must stay out of runtime sources.`);
    } catch {
      // Expected: file is absent.
    }
  }

  return errors;
};

const getSupabaseClient = () => {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SITE_SUPABASE_URL;

  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables.');
  }

  return createClient(url, key, {
    realtime: {
      transport: ws,
    },
  });
};

const fetchTools = async () => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('tools')
    .select([
      'id',
      'name',
      'slug',
      'status',
      'description',
      'long_description',
      'seo_title',
      'seo_description',
      'seo_keywords',
      'primary_keywords',
      'secondary_keywords',
      'seo_content',
      'faq',
      'category_id',
      'featured_image',
      'updated_at',
    ].join(','))
    .order('slug', { ascending: true });

  if (error) {
    throw new Error(`Supabase tools query failed: ${error.message}`);
  }

  return data || [];
};

const sourceForValue = (value, primarySource, fallbackSource) => {
  return value ? primarySource : fallbackSource;
};

const buildValidation = async () => {
  const errors = await checkSources();
  const warnings = [];
  const tools = await fetchTools();
  const publishedTools = tools.filter((tool) => (
    tool.status === 'published' && !retiredToolSlugs.has(tool.slug)
  ));

  const slugs = new Map();
  for (const tool of tools) {
    if (!tool.slug) {
      errors.push(`Tool ${tool.id} is missing slug.`);
      continue;
    }

    if (slugs.has(tool.slug)) {
      errors.push(`Duplicate tools.slug detected: ${tool.slug}`);
    }
    slugs.set(tool.slug, tool.id);
  }

  const rows = publishedTools.map((tool) => {
    const route = `/tool/${tool.slug}`;
    const canonical = `${siteUrl}/tool/${encodeURIComponent(tool.slug)}`;
    const faqItems = Array.isArray(tool.faq) ? tool.faq : [];

    if (!tool.name) {
      errors.push(`Published tool ${tool.slug} is missing name.`);
    }

    if (!tool.seo_title) {
      warnings.push(`${tool.slug}: missing tools.seo_title; page falls back to DB tool.name.`);
    }

    if (!tool.seo_description) {
      warnings.push(`${tool.slug}: missing tools.seo_description; page falls back to DB tool.description.`);
    }

    if (!tool.seo_content) {
      warnings.push(`${tool.slug}: missing tools.seo_content; no static SEO body will be rendered.`);
    }

    if (tool.faq && !Array.isArray(tool.faq)) {
      errors.push(`${tool.slug}: tools.faq must be a JSON array when present.`);
    }

    return {
      toolName: tool.name,
      route,
      databaseSource: `tools.id=${tool.id}; lookup tools.slug='${tool.slug}' and status='published'`,
      seoSource: 'tools.seo_title, tools.seo_description, tools.seo_keywords, tools.primary_keywords, tools.secondary_keywords',
      descriptionSource: 'tools.description',
      longDescriptionSource: tool.long_description ? 'tools.long_description' : 'none',
      faqSource: `tools.faq (${faqItems.length} items)`,
      structuredDataSource: 'ToolSEO JSON-LD derived from the same tools row',
      metaTitleSource: sourceForValue(tool.seo_title, 'tools.seo_title', 'tools.name fallback from same DB row'),
      metaDescriptionSource: sourceForValue(tool.seo_description, 'tools.seo_description', 'tools.description fallback from same DB row'),
      canonicalSource: canonical,
      visibleSeoContentSource: tool.seo_content ? 'tools.seo_content' : 'none',
      fallbackSource: [
        tool.seo_title ? null : 'meta title DB-derived fallback',
        tool.seo_description ? null : 'meta description DB-derived fallback',
        tool.seo_content ? null : 'no visible SEO fallback',
      ].filter(Boolean).join('; ') || 'none',
    };
  });

  return {
    checkedAt: new Date().toISOString(),
    siteUrl,
    counts: {
      totalTools: tools.length,
      publishedTools: publishedTools.length,
      errors: errors.length,
      warnings: warnings.length,
      missingSeoTitle: rows.filter((row) => row.metaTitleSource !== 'tools.seo_title').length,
      missingSeoDescription: rows.filter((row) => row.metaDescriptionSource !== 'tools.seo_description').length,
      missingSeoContent: rows.filter((row) => row.visibleSeoContentSource !== 'tools.seo_content').length,
    },
    sourcePolicy: {
      activeToolLookup: "tools.slug + status='published'",
      adminSeoFields: 'tools.seo_title, tools.seo_description, tools.seo_content, tools.faq',
      hardcodedProfileContent: 'blocked in active public tool page files',
      staticGeneratedSeoBodyFallback: 'blocked',
    },
    errors,
    warnings,
    rows,
  };
};

const formatList = (items, max = 25) => {
  if (items.length <= max) return items.join('\n');
  return `${items.slice(0, max).join('\n')}\n...and ${items.length - max} more`;
};

try {
  const result = await buildValidation();

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('Tool content source validation');
    console.log(`Checked at: ${result.checkedAt}`);
    console.log(`Published tools checked: ${result.counts.publishedTools}`);
    console.log(`Errors: ${result.counts.errors}`);
    console.log(`Warnings: ${result.counts.warnings}`);
    console.log(`Missing SEO titles: ${result.counts.missingSeoTitle}`);
    console.log(`Missing SEO descriptions: ${result.counts.missingSeoDescription}`);
    console.log(`Missing SEO content: ${result.counts.missingSeoContent}`);

    if (result.errors.length > 0) {
      console.log('\nErrors');
      console.log(formatList(result.errors));
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings');
      console.log(formatList(result.warnings));
    }

    if (details) {
      console.log('\nPer-tool source map');
      for (const row of result.rows) {
        console.log([
          row.toolName,
          row.route,
          row.databaseSource,
          row.metaTitleSource,
          row.metaDescriptionSource,
          row.visibleSeoContentSource,
          row.faqSource,
          row.canonicalSource,
          row.fallbackSource,
        ].join(' | '));
      }
    }
  }

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
