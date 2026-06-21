import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/api/supabaseClient';
import { getLocalToolBySlug, getLocalTools, getLocalCategories } from '@/lib/localCatalogFallback';
import { getDefaultToolFeaturedImage } from '@/lib/toolFeaturedImages';
import { isToolIndexable } from '@/lib/toolSeoCompleteness';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { countWords, getToolHowToSteps, getToolUseCases, buildToolFaqItems, shouldAddToolFallbackContent } from '@/lib/toolContentFallbacks';
import { rankTools } from '@/lib/relevance';
import { ShieldCheck, Calendar } from 'lucide-react';
import ToolPageClient from './ToolPageClient';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  'https://www.quickutils.page'
).replace(/\/$/, '');

const RETIRED_TOOL_SLUGS = ['pdf-to-word'];

const TOOL_PAGE_FIELDS = [
  'id', 'name', 'slug', 'description', 'long_description',
  'category_id', 'icon', 'status', 'is_featured', 'is_trending',
  'usage_count', 'input_fields', 'formula_type', 'formula_config',
  'output_type', 'seo_title', 'seo_description', 'seo_keywords',
  'primary_keywords', 'secondary_keywords', 'featured_image',
  'faq', 'seo_content', 'created_at', 'updated_at',
].join(',');

async function fetchTool(slug) {
  if (RETIRED_TOOL_SLUGS.includes(slug)) return null;

  try {
    const { data, error } = await supabase
      .from('tools')
      .select(TOOL_PAGE_FIELDS)
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      const featuredImage = getDefaultToolFeaturedImage(data);
      return featuredImage ? { ...data, featured_image: featuredImage } : data;
    }
  } catch (err) {
    console.error('[ToolPage] Supabase fetch error:', err);
  }

  // Fallback to local catalog
  const local = await getLocalToolBySlug(slug, { published: true });
  return local || null;
}

async function fetchRelatedTools(categoryId, currentSlug) {
  try {
    const { data } = await supabase
      .from('tools')
      .select('id,name,slug,description,icon,category_id,featured_image,is_featured,is_trending,usage_count')
      .eq('status', 'published')
      .neq('slug', currentSlug)
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: true })
      .limit(20);

    if (data && data.length > 0) {
      return data.map(t => {
        const img = getDefaultToolFeaturedImage(t);
        return img ? { ...t, featured_image: img } : t;
      });
    }
  } catch (err) {
    console.error('[ToolPage] Related tools fetch error:', err);
  }

  // Fallback
  const all = await getLocalTools({ published: true, limit: 50 });
  const filtered = all.filter(t => t.slug !== currentSlug && (t.category_id === categoryId || t.category_slug === categoryId));
  return filtered.length > 0 ? filtered : all.filter(t => t.slug !== currentSlug).slice(0, 10);
}

async function fetchCategories() {
  try {
    const { data } = await supabase
      .from('categories')
      .select('id,name,slug')
      .order('sort_order', { ascending: true })
      .limit(200);
    if (data && data.length > 0) return data;
  } catch {}
  return getLocalCategories({ limit: 200 });
}

async function fetchBlogPosts() {
  try {
    const { data } = await supabase
      .from('blog_posts')
      .select('id,title,slug,excerpt,featured_image,created_at,seo_keywords,tags,category_id')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) return data;
  } catch {}
  return [];
}

async function fetchWorkflows() {
  try {
    const { data } = await supabase
      .from('workflow_pages')
      .select('id,title,slug,excerpt,updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(12);
    if (data) return data;
  } catch {}
  return [];
}

function buildJsonLdWebApp(tool, description, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description,
    url: canonical,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Works in modern Chrome, Firefox, Edge, Safari.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };
}

function buildJsonLdBreadcrumb(tool, canonical) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Tools', item: `${SITE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: tool.name, item: canonical },
    ],
  };
}

function buildJsonLdFaq(faqItems) {
  if (!faqItems || faqItems.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

// ─── Metadata generator ─────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tool = await fetchTool(slug);
  if (!tool) return { title: 'Tool Not Found - QuickUtils' };

  const indexable = isToolIndexable(tool);
  const title = tool.seo_title || `${tool.name} - Free Online Tool - QuickUtils`;
  const description = tool.seo_description || tool.description || `${tool.name} — free online tool. Enter your values, get instant results.`;

  const canonical = `${SITE_URL}/tool/${encodeURIComponent(tool.slug)}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: 'QuickUtils',
      type: 'website',
      images: tool.featured_image ? [{ url: `${SITE_URL}${tool.featured_image}`, width: 1200, height: 630 }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// ─── Main Server Component ──────────────────────────────────────────
export default async function ToolPage({ params }) {
  const { slug } = await params;
  const tool = await fetchTool(slug);
  if (!tool) notFound();

  const indexable = isToolIndexable(tool);
  const canonical = `${SITE_URL}/tool/${encodeURIComponent(tool.slug)}`;

  // Server-side data fetching for SEO content
  const [categories, allTools, blogPosts, workflows] = await Promise.all([
    fetchCategories(),
    fetchRelatedTools(tool.category_id, slug),
    fetchBlogPosts(),
    fetchWorkflows(),
  ]);

  const category = categories.find(c =>
    c.id === tool.category_id || c.slug === tool.category_id || c.slug === tool.category_slug
  );

  const relatedTools = rankTools(tool, allTools, 4);
  const relatedArticles = blogPosts
    .filter(p => p.slug !== slug)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 6);

  // SEO content sections
  const shouldAddFallback = shouldAddToolFallbackContent(tool);
  const useCases = getToolUseCases(category?.name);
  const steps = getToolHowToSteps(tool);
  const inputLabels = (tool.input_fields || []).map(f => f?.label || f?.name).filter(Boolean).slice(0, 6);

  // FAQ
  const storedFaq = Array.isArray(tool.faq) ? tool.faq : [];
  const fallbackFaq = storedFaq.length >= 2 ? [] : buildToolFaqItems(tool, category?.name);
  const faqItems = [...storedFaq, ...fallbackFaq].slice(0, 6);

  // JSON-LD schemas
  const description = tool.seo_description || tool.description || `${tool.name} — free online tool.`;
  const webAppJsonLd = buildJsonLdWebApp(tool, description, canonical);
  const breadcrumbJsonLd = buildJsonLdBreadcrumb(tool, canonical);
  const faqJsonLd = buildJsonLdFaq(faqItems);

  // Last updated / reviewer
  const lastUpdated = tool.updated_at || tool.created_at || null;
  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <>
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Server-rendered SEO content (visible without JS) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb nav */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/tools" className="hover:text-foreground">Tools</Link>
          {category && (
            <>
              <span>/</span>
              <Link href={`/category/${encodeURIComponent(category.slug)}`} className="hover:text-foreground">
                {category.name}
              </Link>
            </>
          )}
          <span>/</span>
          <span className="text-foreground font-medium">{tool.name}</span>
        </nav>

        {/* H1 + Description */}
        <h1 className="text-2xl sm:text-3xl font-bold mb-3">
          {tool.name} — Free Online Tool
        </h1>
        <p className="text-muted-foreground mb-6 text-lg">
          {tool.description}
        </p>

        {/* Tool usage count / badge */}
        {tool.usage_count > 0 && (
          <p className="text-xs text-muted-foreground mb-4">
            Used {tool.usage_count.toLocaleString()} times · Free Forever
          </p>
        )}

        {/* Tool UI Container — client-rendered interactive component */}
        <div className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 mb-8">
          <ToolPageClient tool={tool} categoryName={category?.name || ''} />
        </div>

        {/* SEO Content Sections (server-rendered) */}
        <div className="space-y-8">
          {/* How-to section */}
          <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">How to use {tool.name}</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>

          {/* seo_content or fallback */}
          {tool.seo_content ? (
            <section
              className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(tool.seo_content) }}
            />
          ) : (
            <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 prose prose-sm max-w-none dark:prose-invert">
              <h2>How {tool.name} helps</h2>
              <p>
                {tool.name} is designed for focused {category?.name || 'utility'} work where
                the result needs to be quick, readable, and easy to check. Use it when you
                want to avoid manual calculations or switching between multiple apps for a
                simple task.
              </p>

              <h3>Best use cases</h3>
              <ul>
                {useCases.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              <h3>Inputs and output</h3>
              <p>
                The tool uses the information you provide on the page and returns a result
                in the same browser session. Keep your source values available so you can
                compare the output before copying or submitting it.
              </p>
              {inputLabels.length > 0 && (
                <ul>
                  {inputLabels.map((label, i) => (
                    <li key={i}>{label}</li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Privacy note */}
          <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 text-sm text-muted-foreground">
            <h2 className="text-lg font-semibold text-foreground mb-2">Privacy and accuracy notes</h2>
            <p>
              QuickUtils tools are built for practical everyday use, but important outputs
              should still be reviewed against official instructions, source documents, bank
              or institution rules, current fees, or application portal requirements. For
              file-based tasks, avoid processing highly sensitive documents unless you have
              reviewed the tool flow and are comfortable using an online utility.
            </p>
          </section>

          {/* Example section */}
          <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6 text-sm">
            <h2 className="text-lg font-semibold mb-3">Example use case</h2>
            <p className="text-muted-foreground">
              Enter your values in the {tool.name} form above, review the result, 
              and adjust inputs as needed. Each calculation is done in your browser 
              session so you can experiment with different scenarios instantly.
            </p>
          </section>

          {/* FAQs */}
          {faqItems.length > 0 && (
            <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Frequently asked questions</h2>
              <div className="space-y-4">
                {faqItems.map((faq, i) => (
                  <div key={i}>
                    <h3 className="font-medium text-sm mb-1">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related tools */}
          {relatedTools.length > 0 && (
            <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Related tools</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedTools.map(rt => (
                  <a
                    key={rt.id}
                    href={`/tool/${encodeURIComponent(rt.slug)}`}
                    className="flex items-start gap-3.5 rounded-xl border border-border/50 p-3.5 hover:border-primary/40 hover:shadow-md transition-all duration-300 bg-card hover:-translate-y-0.5"
                  >
                    {rt.featured_image && (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                        <img
                          src={rt.featured_image}
                          alt={rt.name}
                          width="40"
                          height="40"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{rt.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{rt.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Related guides (blog posts) */}
          {relatedArticles.length > 0 && (
            <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Related guides</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {relatedArticles.slice(0, 4).map(article => (
                  <a
                    key={article.id}
                    href={`/blog/${encodeURIComponent(article.slug)}`}
                    className="block rounded-lg border border-border/50 p-3 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <p className="font-medium text-sm">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {article.excerpt || 'Read more...'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {article.created_at
                        ? new Date(article.created_at).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })
                        : ''}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Related workflows */}
          {workflows.length > 0 && (
            <section className="rounded-2xl border border-border/50 bg-card p-5 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Popular workflows</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {workflows.slice(0, 4).map(w => (
                  <a
                    key={w.id}
                    href={`/workflow/${encodeURIComponent(w.slug)}`}
                    className="block rounded-lg border border-border/50 p-3 hover:border-accent/40 hover:shadow-sm transition-all"
                  >
                    <p className="font-medium text-sm">{w.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {w.excerpt || 'Step-by-step workflow guide...'}
                    </p>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Last updated + reviewer */}
          <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-border/50 pt-6 mt-10 text-sm text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/20">
                <ShieldCheck className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-xs leading-none mb-1">Reviewed &amp; Verified</p>
                <p className="text-[11px] leading-tight">By QuickUtils Editorial Team</p>
              </div>
            </div>
            <div className="flex flex-col sm:items-end gap-1.5 text-xs">
              {formattedDate && (
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground/75" />
                  <span>Last updated: {formattedDate}</span>
                </span>
              )}
              <div className="flex items-center gap-2 mt-0.5 text-muted-foreground">
                <a href="/methodology" className="hover:text-primary transition-colors hover:underline">How tools are tested</a>
                <span>•</span>
                <a href="/corrections-policy" className="hover:text-primary transition-colors hover:underline">Report a correction</a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
