'use client';
import React from 'react'
import Link from 'next/link'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { CONTACT_EMAIL, organizationSchema } from '@/config/site'

const pageDescription =
  'Read the QuickUtils corrections policy for reporting errors, reviewing issues, updating content, and maintaining transparency.'

const policySchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'QuickUtils Corrections Policy',
  url: `${SITE_URL}/corrections-policy`,
  description: pageDescription,
  publisher: organizationSchema,
}

export default function CorrectionsPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Corrections Policy - QuickUtils"
        description={pageDescription}
        path="/corrections-policy"
        ogTitle="QuickUtils Corrections Policy"
        ogDescription="Learn how QuickUtils reviews reported errors, updates pages, and keeps corrections transparent."
        jsonLd={[
          policySchema,
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Corrections Policy', url: `${SITE_URL}/corrections-policy` },
          ]),
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Corrections</p>
          <h1 className="text-3xl font-bold mb-4">Corrections Policy</h1>
          <p className="text-muted-foreground leading-relaxed text-lg">
            QuickUtils aims to keep tools, examples, guides, and job information clear and useful.
            When something is wrong or unclear, users can report it and the team will review it.
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Error Reporting Process</h2>
            <p className="text-muted-foreground leading-relaxed">
              Report errors through the contact page or by emailing{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>
              . Include the page URL, tool name, expected result, actual result, device or browser
              if relevant, and any safe-to-share inputs that help reproduce the issue.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Review Process</h2>
            <p className="text-muted-foreground leading-relaxed">
              Reports are reviewed against the page content, tool behavior, formulas, source
              requirements, and user impact. High-risk issues involving official documents,
              job deadlines, privacy, financial estimates, or health-related results are treated
              with extra care.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Update Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              If a correction is needed, QuickUtils may update the tool, revise page copy, add a
              clearer limitation, correct an example, update a job listing, or add a note that
              tells users what changed. Pages may also be updated when requirements or supported
              behavior change.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Transparency Standards</h2>
            <p className="text-muted-foreground leading-relaxed">
              QuickUtils does not claim that calculator outputs, exam document outputs, job
              information, or file conversions are official. When uncertainty matters, pages
              should explain what users must verify with official sources or qualified experts.
            </p>
          </section>
        </div>

        <section className="mt-8 rounded-lg border border-border/60 bg-muted/40 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Helpful Links</h2>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/contact" className="text-primary hover:underline">Report an issue</Link>
            <Link href="/methodology" className="text-primary hover:underline">Methodology</Link>
            <Link href="/editorial-policy" className="text-primary hover:underline">Editorial Policy</Link>
            <Link href="/team" className="text-primary hover:underline">Team</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
