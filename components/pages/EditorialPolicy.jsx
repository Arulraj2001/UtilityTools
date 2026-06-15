'use client';
import React from 'react'
import Link from 'next/link'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const editorialDescription =
  'Read the QuickUtils Editorial Policy for tool explanations, examples, FAQs, review practices, transparency, and error reporting.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Editorial Policy', url: `${SITE_URL}/editorial-policy` },
])

const updatedDate = 'May 26, 2026'

export default function EditorialPolicy() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <StaticPageSEO
        title="Editorial Policy - QuickUtils"
        description={editorialDescription}
        path="/editorial-policy"
        ogTitle="QuickUtils Editorial Policy"
        ogDescription="Learn how QuickUtils writes, reviews, updates, and corrects tool explanations, examples, and FAQs."
        jsonLd={breadcrumbSchema}
      />

      <header className="mb-10">
        <p className="text-sm font-semibold text-primary mb-3">Editorial Policy</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Editorial Policy
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          QuickUtils content is written to help people understand what a tool does, when to use
          it, and how to review the result. This policy explains the standards we aim to follow
          for tool pages, examples, FAQs, and updates.
        </p>
        <p className="text-sm text-muted-foreground mt-4">Last updated: {updatedDate}</p>
      </header>

      <div className="space-y-6">
        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Purpose of our content</h2>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils content is intended to make practical tools easier to understand. Tool
            pages should explain the task, inputs, outputs, examples, limitations, and important
            checks in plain language. The goal is to help users complete tasks with less confusion,
            not to inflate pages with generic filler.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">What tool pages should include</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Where useful and practical, tool pages should include:
          </p>
          <ul className="space-y-2 text-muted-foreground leading-relaxed">
            <li>A clear explanation of what the tool does.</li>
            <li>Simple instructions for using the tool.</li>
            <li>Examples that match real user needs.</li>
            <li>Notes about assumptions, limitations, privacy, or accuracy where relevant.</li>
            <li>FAQs that answer common questions without repeating the same text.</li>
            <li>Internal links to related tools or categories when they genuinely help the user.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Review and update process</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Content should be reviewed when a tool's behavior changes, when new limitations are
              discovered, when user feedback identifies confusion, or when related rules,
              examples, or requirements need clearer wording.
            </p>
            <p>
              For calculators and estimators, page content should make assumptions clear where
              possible and remind users to verify important results. For file tools, content
              should avoid privacy claims that go beyond how the tool actually works.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">No misleading claims</h2>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils content should not claim guaranteed accuracy, official certification,
            professional review, guaranteed approval for forms or ad programs, or audience numbers
            that are not supported. When a tool gives an estimate, the content should say so
            clearly.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Advertising and affiliate transparency</h2>
          <p className="text-muted-foreground leading-relaxed">
            Editorial content should be written to help users, not to pressure ad clicks or hide
            sponsored influence. If sponsored content, affiliate links, or paid recommendations
            are added in the future, they should be disclosed clearly near the relevant content.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-muted/40 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Corrections and user reports</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Users can report errors, outdated information, broken examples, unclear instructions,
            or tool behavior that does not match the page. Reports should include the page URL,
            tool name, input details where safe to share, and the expected result.
          </p>
          <Link href="/contact" className="text-sm font-medium text-primary hover:text-primary/80">
            Report an editorial issue
          </Link>
        </section>
      </div>
    </div>
  )
}
