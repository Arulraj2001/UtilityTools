import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const disclaimerDescription =
  'Read the QuickUtils Disclaimer about general informational tools, calculator estimates, result verification, and no professional advice.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Disclaimer', url: `${SITE_URL}/disclaimer` },
])

const updatedDate = 'May 26, 2026'

export default function Disclaimer() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <StaticPageSEO
        title="Disclaimer - QuickUtils"
        description={disclaimerDescription}
        path="/disclaimer"
        ogTitle="QuickUtils Disclaimer"
        ogDescription="QuickUtils tools are for general productivity and informational use. Verify important results before relying on them."
        jsonLd={breadcrumbSchema}
      />

      <header className="mb-10">
        <p className="text-sm font-semibold text-primary mb-3">Disclaimer</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Disclaimer
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          QuickUtils provides online tools and explanatory content for general productivity,
          convenience, and informational purposes. This page explains important limits to keep in
          mind when using the website.
        </p>
        <p className="text-sm text-muted-foreground mt-4">Last updated: {updatedDate}</p>
      </header>

      <div className="space-y-6">
        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">General informational use</h2>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils tools are intended to help with everyday tasks such as file preparation,
            image editing, PDF handling, text formatting, data conversion, calculations, SEO
            checks, and workflow planning. They are not a substitute for professional review when
            accuracy, compliance, or safety is important.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Calculator and estimator results</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Calculators and estimators on QuickUtils may use formulas, assumptions, rounding,
              user-provided values, or simplified models. Outputs should be treated as estimates
              unless a page clearly explains otherwise.
            </p>
            <p>
              Examples include finance calculators, health calculators, shipping estimators,
              business calculators, date tools, percentage tools, and academic calculators.
              Results can vary based on local rules, provider formulas, input accuracy, or
              changing external conditions.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Verify important results</h2>
          <p className="text-muted-foreground leading-relaxed">
            Before submitting forms, uploading official documents, making purchases, publishing
            files, sending invoices, relying on calculations, or using results in a professional
            context, review the output carefully and compare it with official instructions or a
            trusted source.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">No professional advice</h2>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils does not provide legal, financial, tax, medical, academic, employment,
            insurance, engineering, compliance, or other professional advice. If your situation
            requires expert judgment, consult a qualified professional or official authority.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">File and upload responsibility</h2>
          <p className="text-muted-foreground leading-relaxed">
            You are responsible for the files and information you process through QuickUtils.
            Avoid uploading sensitive documents if you are unsure how a specific tool handles
            files. Keep backup copies of important documents before compressing, converting,
            editing, or downloading outputs.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-muted/40 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Report unclear or incorrect content</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            If you notice a confusing explanation, outdated instruction, broken tool, or result
            that seems wrong, please report it so the page can be reviewed.
          </p>
          <Link to="/contact" className="text-sm font-medium text-primary hover:text-primary/80">
            Report an issue
          </Link>
        </section>
      </div>
    </div>
  )
}
