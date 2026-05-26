import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const termsDescription =
  'Read the QuickUtils Terms of Use covering free tool access, acceptable use, user responsibility, no warranty, and limitation of liability.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Terms of Use', url: `${SITE_URL}/terms` },
])

const updatedDate = 'May 26, 2026'

export default function Terms() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <StaticPageSEO
        title="Terms of Use - QuickUtils"
        description={termsDescription}
        path="/terms"
        ogTitle="QuickUtils Terms of Use"
        ogDescription="Understand the terms for using QuickUtils tools, including acceptable use, user responsibility, no warranty, and liability limits."
        jsonLd={breadcrumbSchema}
      />

      <header className="mb-10">
        <p className="text-sm font-semibold text-primary mb-3">Terms of Use</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Terms of Use
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          These terms explain how you may use QuickUtils and what responsibilities apply when
          using the website, tools, pages, files, outputs, and related content.
        </p>
        <p className="text-sm text-muted-foreground mt-4">Last updated: {updatedDate}</p>
      </header>

      <div className="space-y-6">
        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Free use of tools</h2>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils provides public online tools for general productivity and informational
            purposes. The public tools are intended to be free for everyday use. We may update,
            add, remove, limit, or change tools and features as the website evolves.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">User responsibility</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              You are responsible for the files, data, text, images, documents, and information
              you upload, enter, process, copy, download, or use through QuickUtils.
            </p>
            <p>
              You should review important results before relying on them, especially when the
              output will be used for official forms, financial decisions, health-related
              decisions, legal matters, business records, exams, job applications, or public
              submissions.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Acceptable use</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            You agree to use QuickUtils responsibly and legally. You must not:
          </p>
          <ul className="space-y-2 text-muted-foreground leading-relaxed">
            <li>Use the website for unlawful, harmful, fraudulent, or abusive activity.</li>
            <li>Upload malicious files, scripts, or content intended to damage systems.</li>
            <li>Attempt to bypass security, overload the service, scrape aggressively, or disrupt availability.</li>
            <li>Use tools to violate another person's rights, privacy, intellectual property, or applicable law.</li>
            <li>Misrepresent QuickUtils outputs as official, certified, or professionally reviewed documents.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">No warranty</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              QuickUtils is provided on an "as is" and "as available" basis. We work to keep the
              website useful, but we do not guarantee that every tool will be uninterrupted,
              error-free, secure, available at all times, or suitable for every specific use case.
            </p>
            <p>
              Calculators, converters, compressors, formatters, generators, and other tools may
              produce results affected by input quality, browser behavior, file type, third-party
              libraries, device limitations, rounding, assumptions, or user settings.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Limitation of liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the maximum extent permitted by law, QuickUtils and its operators are not liable
            for indirect, incidental, special, consequential, or similar damages arising from use
            of the website, tools, outputs, files, data, or third-party services. This includes
            losses related to damaged files, incorrect results, data loss, business interruption,
            failed submissions, or reliance on tool outputs.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Third-party services and links</h2>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils may use or link to third-party services, libraries, websites, analytics,
            ads, hosting providers, databases, and contact form tools. Third-party services have
            their own terms and policies, and QuickUtils is not responsible for every third-party
            action or external website.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Changes to these terms</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We may update these Terms of Use as QuickUtils changes. The latest version will be
            shown on this page with the updated date above.
          </p>
          <Link to="/contact" className="text-sm font-medium text-primary hover:text-primary/80">
            Contact us about these terms
          </Link>
        </section>
      </div>
    </div>
  )
}
