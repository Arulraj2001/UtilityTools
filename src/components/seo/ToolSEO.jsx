import { useEffect } from 'react';

/**
 * Injects SEO meta tags, OG tags, canonical, and JSON-LD schema for a tool page.
 */
export default function ToolSEO({ tool, canonicalBase = '' }) {
  useEffect(() => {
    if (!tool) return;

    const title = tool.seo_title || `${tool.name} – Free Online Tool`;
    const description = tool.seo_description || tool.description || '';
    const canonical = `${canonicalBase}/tool/${tool.slug}`;

    // Page title
    document.title = title;

    // Helper to upsert meta
    const meta = (name, content, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute('content', content);
    };

    // Basic SEO
    meta('description', description);
    if (tool.seo_keywords) meta('keywords', tool.seo_keywords);
    meta('robots', 'index, follow');

    // Canonical
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = canonical;

    // Open Graph
    meta('og:title', title, 'property');
    meta('og:description', description, 'property');
    meta('og:type', 'website', 'property');
    meta('og:url', canonical, 'property');
    if (tool.featured_image) meta('og:image', tool.featured_image, 'property');

    // Twitter Card
    meta('twitter:card', 'summary_large_image');
    meta('twitter:title', title);
    meta('twitter:description', description);

    // JSON-LD Schema
    const faqSchema = tool.faq?.length > 0 ? {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tool.faq.map(f => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    } : null;

    const webAppSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: tool.name,
      description: description,
      url: canonical,
      applicationCategory: 'UtilitiesApplication',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    };

    const injectSchema = (id, data) => {
      let el = document.getElementById(id);
      if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
      el.textContent = JSON.stringify(data);
    };

    injectSchema('schema-webapp', webAppSchema);
    if (faqSchema) injectSchema('schema-faq', faqSchema);

    return () => {
      document.title = 'ToolHub – Free Online Utility Tools';
    };
  }, [tool]);

  return null;
}