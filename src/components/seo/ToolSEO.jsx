import React from 'react';

import { Helmet } from 'react-helmet-async';

/**
 * Production-grade SEO component
 * for tool pages.
 */

export default function ToolSEO({
  tool,
  canonicalBase =
    'https://quickutils.page'
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

  const canonical =
    `${canonicalBase}/tool/${encodeURIComponent(tool.slug)}`;

  const image =
    tool.featured_image ||
    `${canonicalBase}/og-image.jpg`;

  const keywords =
    tool.seo_keywords ||
    '';

  /**
   * FAQ Schema
   */

  const faqSchema =
    tool.faq?.length > 0
      ? {
          '@context':
            'https://schema.org',

          '@type':
            'FAQPage',

          mainEntity:
            tool.faq.map(
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
   * SoftwareApplication Schema (upgraded from WebApplication)
   */

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description,
    url: canonical,
    applicationCategory: tool.application_category || 'UtilitiesApplication',
    operatingSystem: tool.operating_system || 'Any',
    browserRequirements: tool.browser_requirements || 'Requires JavaScript',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    aggregateRating: tool.aggregate_rating || {
      '@type': 'AggregateRating',
      ratingValue: tool.aggregate_rating?.ratingValue || 0,
      reviewCount: tool.aggregate_rating?.reviewCount || 0
    },
    featureList: tool.features || []
  };

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
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="QuickUtils" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:url" content={canonical} />

      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify(softwareAppSchema)}</script>

      {faqSchema && (
        <script type="
          application/ld+json
        ">
          {JSON.stringify(
            faqSchema
          )}
        </script>
      )}

      <script type="
        application/ld+json
      ">
        {JSON.stringify(
          breadcrumbSchema
        )}
      </script>

    </Helmet>
  );
}