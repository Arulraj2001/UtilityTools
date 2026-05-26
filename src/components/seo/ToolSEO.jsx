import React from 'react';

import { Helmet } from 'react-helmet-async';
import { getToolContentProfile } from './toolContentProfiles';

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

  const profile = getToolContentProfile(tool.slug);
  const profileSeo = profile?.seo || {};

  // SEO values
  const title =
    profileSeo.title ||
    tool.seo_title ||
    `${tool.name} – Free Online Tool`;

  const description =
    profileSeo.description ||
    tool.seo_description ||
    tool.description ||
    '';

  const ogTitle =
    profileSeo.ogTitle ||
    title;

  const ogDescription =
    profileSeo.ogDescription ||
    description;

  const twitterTitle =
    profileSeo.twitterTitle ||
    ogTitle;

  const twitterDescription =
    profileSeo.twitterDescription ||
    ogDescription;

  const canonical =
    `${canonicalBase}/tool/${encodeURIComponent(tool.slug)}`;

  const image =
    tool.featured_image ||
    `${canonicalBase}/preview.png`;

  const keywords =
    tool.seo_keywords ||
    '';

  const faqItems =
    profile?.faqs ||
    tool.faq ||
    [];

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
    ...(tool.aggregate_rating && { aggregateRating: tool.aggregate_rating }),
    ...(tool.features?.length > 0 && { featureList: tool.features })
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
      <meta property="og:title" content={ogTitle} />
      <meta property="og:description" content={ogDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="QuickUtils" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={twitterDescription} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:url" content={canonical} />

      {/* JSON-LD */}
      <script type="application/ld+json">{JSON.stringify(softwareAppSchema)}</script>

      {faqSchema && (
        <script type="application/ld+json">
          {JSON.stringify(
            faqSchema
          )}
        </script>
      )}

      <script type="application/ld+json">
        {JSON.stringify(
          breadcrumbSchema
        )}
      </script>

    </Helmet>
  );
}
