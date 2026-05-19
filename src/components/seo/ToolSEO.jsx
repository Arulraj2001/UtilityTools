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
    `${canonicalBase}/tool/${tool.slug}`;

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
   * Web App Schema
   */

  const webAppSchema = {

    '@context':
      'https://schema.org',

    '@type':
      'WebApplication',

    name:
      tool.name,

    description,

    url:
      canonical,

    applicationCategory:
      'UtilitiesApplication',

    operatingSystem:
      'Any',

    browserRequirements:
      'Requires JavaScript',

    offers: {

      '@type':
        'Offer',

      price: '0',

      priceCurrency:
        'USD'
    }
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

      <meta
        name="keywords"
        content={keywords}
      />

      <meta
        name="robots"
        content="
          index, follow,
          max-image-preview:large
        "
      />

      <link
        rel="canonical"
        href={canonical}
      />

      {/* Open Graph */}
      <meta
        property="og:type"
        content="website"
      />

      <meta
        property="og:title"
        content={title}
      />

      <meta
        property="og:description"
        content={description}
      />

      <meta
        property="og:url"
        content={canonical}
      />

      <meta
        property="og:image"
        content={image}
      />

      <meta
        property="og:site_name"
        content="QuickUtils"
      />

      {/* Twitter */}
      <meta
        name="twitter:card"
        content="
          summary_large_image
        "
      />

      <meta
        name="twitter:title"
        content={title}
      />

      <meta
        name="twitter:description"
        content={description}
      />

      <meta
        name="twitter:image"
        content={image}
      />

      {/* Mobile */}
      <meta
        name="viewport"
        content="
          width=device-width,
          initial-scale=1
        "
      />

      <meta
        name="theme-color"
        content="#7c3aed"
      />

      {/* JSON-LD */}
      <script type="
        application/ld+json
      ">
        {JSON.stringify(
          webAppSchema
        )}
      </script>

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