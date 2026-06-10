import React from 'react';

import { Helmet } from 'react-helmet-async';
import { DEFAULT_IMAGE, SITE_NAME, SITE_URL } from '@/config/site';
import { buildHowToSchema, buildWebApplicationSchema } from '@/lib/pageSchemas';

/**
 * Production-grade SEO component
 * for tool pages.
 */

export default function ToolSEO({
  tool,
  canonicalBase = SITE_URL
}) {

  if (!tool) return null;

  // SEO values
  const title =
    tool.seo_title ||
    `${tool.name} – Free Online Tool`;

  const description =
    tool.seo_description ||
    tool.description ||
    '';

  const ogTitle =
    title;

  const ogDescription =
    description;

  const twitterTitle =
    ogTitle;

  const twitterDescription =
    ogDescription;

  const canonical =
    `${canonicalBase}/tool/${encodeURIComponent(tool.slug)}`;

  const image =
    tool.featured_image ||
    DEFAULT_IMAGE;

  // Build keywords: primary + secondary + legacy seo_keywords
  const primaryKeywords = (tool.primary_keywords || '').trim()
  const secondaryKeywords = (tool.secondary_keywords || '').trim()
  const legacyKeywords = (tool.seo_keywords || '').trim()
  
  const allKeywords = [
    primaryKeywords,
    secondaryKeywords,
    legacyKeywords
  ]
    .filter(Boolean)
    .join(', ')

  const keywords = allKeywords || ''

  const faqItems =
    Array.isArray(tool.faq) ? tool.faq : [];

  /**
   * FAQ Schema
   */

  const faqSchema =
    faqItems?.length > 0
      ? {
          '@context':
            'https://schema.org',

          '@type':
            'FAQPage',

          mainEntity:
            faqItems.map(
              (f) => ({

                '@type':
                  'Question',

                name:
                  f.question,

                acceptedAnswer: {

                  '@type':
                    'Answer',

                  text:
                    f.answer
                }
              })
            )
        }
      : null;

  /**
   * Primary WebApplication / SoftwareApplication Schema (stronger for utility tools)
   */
  const webAppSchema = buildWebApplicationSchema({
    name: tool.name,
    description,
    url: canonical,
    applicationCategory: tool.application_category || 'UtilitiesApplication',
    features: tool.features || [],
    aggregateRating: tool.aggregate_rating || null,
  });

  /**
   * Optional HowTo Schema (if tool provides howto_steps array or we can derive from content later)
   * Example in DB: tool.howto_steps = [{name: "Step 1", text: "..."}, ...]
   */
  const howtoSteps = Array.isArray(tool.howto_steps) ? tool.howto_steps : null;
  const howToSchema = howtoSteps
    ? buildHowToSchema({
        name: `${tool.name} - Step by Step Guide`,
        description,
        url: canonical,
        steps: howtoSteps,
      })
    : null;

  /**
   * Breadcrumb Schema
   */

  const breadcrumbSchema = {

    '@context':
      'https://schema.org',

    '@type':
      'BreadcrumbList',

    itemListElement: [

      {
        '@type':
          'ListItem',

        position: 1,

        name: 'Home',

        item:
          canonicalBase
      },

      {
        '@type':
          'ListItem',

        position: 2,

        name: 'Tools',

        item:
          `${canonicalBase}/tools`
      },

      {
        '@type':
          'ListItem',

        position: 3,

        name:
          tool.name,

        item:
          canonical
      }
    ]
  };

  return (
    <Helmet>

      {/* Primary SEO */}
      <title>
        {title}
      </title>

      <meta
        name="description"
        content={description}
      />

      {keywords && (
        <meta
          name="keywords"
          content={keywords}
        />
      )}

      <meta
        name="robots"
        content="index, follow, max-image-preview:large"
      />

      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={twitterDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:url" content={canonical} />

      {/* JSON-LD - Primary schemas for E-E-A-T and rich results */}
      <script type="application/ld+json">{JSON.stringify(webAppSchema)}</script>

      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      )}

      {howToSchema && (
        <script type="application/ld+json">
          {JSON.stringify(howToSchema)}
        </script>
      )}

      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>

    </Helmet>
  );
}
