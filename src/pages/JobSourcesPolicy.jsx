import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { CONTACT_EMAIL, organizationSchema } from '@/config/site'

const pageDescription =
  'Learn how QuickUtils sources job listings, verifies information, uses AI assistance, applies human review, and handles user reports.'

const faqItems = [
  {
    question: 'Does QuickUtils guarantee a job listing is official?',
    answer:
      'No. QuickUtils provides job information for user convenience and asks users to verify eligibility, dates, and application details with official sources before applying.',
  },
  {
    question: 'Can AI assist job content creation?',
    answer:
      'AI may assist with drafting or organizing job information, but public job content should be reviewed by a human before publication and should not replace official notices.',
  },
  {
    question: 'How do users report job listing issues?',
    answer:
      `Users can email ${CONTACT_EMAIL} or use the contact page with the job URL, source URL if available, and the correction needed.`,
  },
]

const jobPolicySchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'QuickUtils Job Sources Policy',
  url: `${SITE_URL}/job-sources-policy`,
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

export default function JobSourcesPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Job Sources Policy - QuickUtils"
        description={pageDescription}
        path="/job-sources-policy"
        ogTitle="QuickUtils Job Sources Policy"
        ogDescription="Understand how QuickUtils sources, reviews, updates, and corrects job listing information."
        jsonLd={[
          jobPolicySchema,
          faqSchema,
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Job Sources Policy', url: `${SITE_URL}/job-sources-policy` },
          ]),
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Jobs</p>
          <h1 className="text-3xl font-bold mb-4">Job Sources Policy</h1>
          <p className="text-muted-foreground leading-relaxed text-lg">
            QuickUtils job pages are meant to help users discover openings and prepare application
            documents. They are not a replacement for official notifications, application portals,
            or employer instructions.
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Job Sourcing Process</h2>
            <p className="text-muted-foreground leading-relaxed">
              Job information should be sourced from official employer pages, recruitment boards,
              government portals, public notices, or other clearly identifiable source material.
              Each job page should help users find and verify the original source whenever possible.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Verification Process</h2>
            <p className="text-muted-foreground leading-relaxed">
              Before job information is published or updated, key details should be checked:
              organization name, role title, eligibility, application dates, application link,
              location, fees, and source URL. Users should still verify all final details on the
              official site before applying.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">AI Assistance Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              AI tools may be used to summarize, structure, or draft job content from source
              material. AI-generated drafts are not treated as final. They require human review
              before publication, and source details should be checked against original notices.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Human Review Process</h2>
            <p className="text-muted-foreground leading-relaxed">
              Human review focuses on accuracy, duplicate listings, missing source links,
              misleading wording, outdated deadlines, and whether the page clearly tells users
              to verify official instructions before applying.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">User Reporting Process</h2>
            <p className="text-muted-foreground leading-relaxed">
              If a job page is outdated, incomplete, duplicated, or inaccurate, contact{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{' '}
              with the job URL, source URL if available, and the correction needed.
            </p>
          </section>
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
          <h2 className="text-2xl font-semibold mb-4">Related Pages</h2>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link to="/jobs" className="text-primary hover:underline">Browse Jobs</Link>
            <Link to="/methodology" className="text-primary hover:underline">Methodology</Link>
            <Link to="/corrections-policy" className="text-primary hover:underline">Corrections Policy</Link>
            <Link to="/contact" className="text-primary hover:underline">Contact</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
