import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { CONTACT_EMAIL, organizationSchema } from '@/config/site'

const pageDescription =
  'Learn how QuickUtils reviews calculator formulas, tests tools, validates data, updates content, and handles user feedback.'

const faqItems = [
  {
    question: 'Are QuickUtils calculator results official?',
    answer:
      'No. Calculator results are practical estimates based on the values entered and the formulas described on the page. Users should verify important results with official sources or qualified professionals.',
  },
  {
    question: 'How are tools tested?',
    answer:
      'Tools are checked with representative examples, edge cases, invalid inputs, and browser behavior where possible. File tools are also reviewed for output usability and privacy expectations.',
  },
  {
    question: 'How can I report an issue?',
    answer:
      `Use the contact page or email ${CONTACT_EMAIL} with the page URL, expected result, actual result, and safe-to-share details.`,
  },
]

const methodologySchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'QuickUtils Methodology',
  url: `${SITE_URL}/methodology`,
  description: pageDescription,
  publisher: organizationSchema,
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
}

const sections = [
  {
    title: 'Calculator formulas',
    text:
      'QuickUtils calculators use standard formulas wherever practical and keep inputs visible so users can review the assumptions. Financial, health, education, shipping, and seller calculators are treated as estimates unless an official source explicitly defines the formula. Important results should always be verified before financial, medical, legal, academic, or official use.',
  },
  {
    title: 'Tool testing',
    text:
      'Tools are tested with common inputs, edge cases, blank or invalid values, and realistic user workflows. File tools are checked for output readability, file-size behavior, and basic compatibility. Browser-based tools are also reviewed across modern browser behavior where possible.',
  },
  {
    title: 'Data validation',
    text:
      'Input fields, limits, file types, and result labels are reviewed so users know what the tool expects. When a tool cannot validate an official requirement, the page should tell users what they still need to check manually.',
  },
  {
    title: 'Content review process',
    text:
      'Content is reviewed for clarity, originality, internal linking, disclaimers, and alignment with actual tool behavior. Pages should explain what the tool does, when it helps, what assumptions it uses, and when the output needs independent verification.',
  },
  {
    title: 'Update procedures',
    text:
      'Pages are updated when a tool changes, when users report confusing behavior, when a source requirement changes, or when examples need better explanation. Corrections are handled through the corrections policy and user reports are reviewed with page-specific context.',
  },
]

export default function Methodology() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Methodology - How QuickUtils Tests Tools and Reviews Content"
        description={pageDescription}
        path="/methodology"
        ogTitle="QuickUtils Methodology"
        ogDescription="See how QuickUtils reviews formulas, tests tools, validates data, updates content, and handles feedback."
        jsonLd={[
          methodologySchema,
          faqSchema,
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Methodology', url: `${SITE_URL}/methodology` },
          ]),
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Methodology</p>
          <h1 className="text-3xl font-bold mb-4">How QuickUtils Reviews Tools and Content</h1>
          <p className="text-muted-foreground leading-relaxed text-lg">
            QuickUtils is built for practical utility work. This page explains how formulas,
            testing, validation, content review, and updates are handled so users can understand
            the limits of each result.
          </p>
        </header>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-4">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{section.text}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-5">
            {faqItems.map((item) => (
              <div key={item.question}>
                <h3 className="font-semibold mb-2">{item.question}</h3>
                <p className="text-muted-foreground leading-relaxed">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-border/60 bg-muted/40 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Related Policies</h2>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link to="/team" className="text-primary hover:underline">Team</Link>
            <Link to="/editorial-policy" className="text-primary hover:underline">Editorial Policy</Link>
            <Link to="/corrections-policy" className="text-primary hover:underline">Corrections Policy</Link>
            <Link to="/job-sources-policy" className="text-primary hover:underline">Job Sources Policy</Link>
            <Link to="/contact" className="text-primary hover:underline">Contact</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
