import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const disclaimerDescription =
  'QuickUtils Disclaimer — understand the limits of our calculators, PDF tools, image tools, and exam document tools before relying on results.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Disclaimer', url: `${SITE_URL}/disclaimer` },
])

const updatedDate = 'May 2025'

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Disclaimer - QuickUtils"
        description={disclaimerDescription}
        path="/disclaimer"
        ogTitle="QuickUtils Disclaimer"
        ogDescription="Understand the limits of QuickUtils tools — calculators, PDF tools, image tools, and exam document tools — before relying on results."
        jsonLd={breadcrumbSchema}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Legal</p>
          <h1 className="text-3xl font-bold mb-4">Disclaimer</h1>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils (www.quickutils.page) offers 150+ free browser-based tools including PDF
            utilities, image editors, calculators, developer tools, SEO tools, and document
            preparation aids for government and competitive exam applications. This page sets out
            important limitations you should be aware of before relying on any output from this
            website.
          </p>
          <p className="text-sm text-muted-foreground mt-4">Last updated: {updatedDate}</p>
        </header>

        <div className="space-y-6">

          {/* General */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">General disclaimer</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                All tools on QuickUtils are provided for general convenience and informational
                purposes only. Outputs are produced from user-supplied inputs using client-side
                logic; they are not reviewed by a professional before being displayed to you.
              </p>
              <p>
                Nothing on this website constitutes legal, financial, tax, medical, regulatory,
                employment, or any other form of professional advice. Where a decision has
                meaningful consequences — financial, health-related, legal, or official — you
                should consult a qualified professional or the relevant authority before acting.
              </p>
            </div>
          </section>

          {/* Financial calculators */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">Financial calculators and estimators</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                This includes: <span className="text-foreground font-medium">EMI Calculator,
                SIP Calculator, Volumetric Weight Calculator, Amazon Fee Calculator, Shipping
                Cost Estimators</span>, and related tools.
              </p>
              <p>
                Results produced by these tools are mathematical estimates based on the values
                you enter. They use simplified formulas or publicly known rate structures and
                should be treated as indicative figures, not final amounts.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Actual loan EMIs may differ based on your lender's processing fees, insurance
                  add-ons, compounding method, or GST charges.
                </li>
                <li>
                  SIP projections are based on a constant assumed rate of return. Mutual fund
                  returns are not guaranteed and vary with market conditions.
                </li>
                <li>
                  Volumetric weight and shipping estimates depend on current carrier rate cards,
                  fuel surcharges, and zone classifications, which change regularly.
                </li>
                <li>
                  Amazon and marketplace fee estimates are based on publicly available fee
                  structures and may not reflect your seller category, account tier, or current
                  platform pricing.
                </li>
              </ul>
              <p>
                These tools do not constitute financial, investment, or tax advice. Always verify
                important figures with your bank, a certified financial advisor, or the relevant
                platform before making financial decisions.
              </p>
            </div>
          </section>

          {/* Health calculators */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">Health and fitness calculators</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                This includes: <span className="text-foreground font-medium">BMI Calculator</span>
                {' '}and similar tools that take body measurements or health-related inputs.
              </p>
              <p>
                Results are informational only. BMI and similar metrics are population-level
                screening indicators and do not account for muscle mass, bone density, age,
                ethnicity, or individual health history. A result from these tools does not
                constitute a health assessment, diagnosis, or medical recommendation.
              </p>
              <p>
                Consult a qualified healthcare professional before making any decisions about
                diet, exercise, medication, or treatment based on results from this website.
              </p>
            </div>
          </section>

          {/* Exam and government documents */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">
              Exam and government document tools
            </h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                This includes: <span className="text-foreground font-medium">Photo Resizer for
                Exam Forms, Signature Resizer/Maker, PDF Compressor for Exam Applications</span>
                {' '}— tools commonly used when preparing documents for SSC, Railway (RRB), IBPS,
                SBI, UPSC, NTA, state board exams, passport applications, and other government
                or recruitment portals.
              </p>
              <p className="font-medium text-foreground">
                You must verify all output against the official instructions for your specific
                exam or application before submitting.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Dimension, file-size, DPI, color mode, and format requirements are set by the
                  exam board or portal — not by QuickUtils. These requirements change between
                  exam cycles and differ across recruitment bodies.
                </li>
                <li>
                  QuickUtils cannot guarantee that a resized photo, compressed PDF, or cropped
                  signature will pass the automated validation of any particular portal.
                </li>
                <li>
                  Always cross-check the output dimensions and file size using a local tool or
                  the portal's preview before final submission.
                </li>
              </ul>
              <p>
                QuickUtils is <span className="font-medium text-foreground">not affiliated with,
                endorsed by, or in any way connected to</span> any exam board, government
                authority, recruitment body, or official portal. Tool names that reference exam
                boards are descriptive only and indicate the common use case for which the tool
                is helpful.
              </p>
            </div>
          </section>

          {/* PDF and file tools */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">PDF and file processing tools</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                This includes: <span className="text-foreground font-medium">PDF Compressor,
                PDF Merger, PDF Splitter, PDF to Word, Image to PDF, PDF to Image</span>, image
                compression, image cropping, watermark tools, and all other tools that process
                uploaded files.
              </p>
              <p>
                Most file processing on QuickUtils happens entirely in your browser using
                client-side libraries (such as PDF.js and pdf-lib). Files are not routinely
                stored on our servers. However, some conversion tools use a backend server to
                complete the conversion; in those cases, your file may be temporarily handled
                server-side and deleted after the operation.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <span className="font-medium text-foreground">Always keep a backup of your
                  original file</span> before compressing, converting, editing, merging, or
                  splitting. File processing is irreversible once you overwrite or discard the
                  original.
                </li>
                <li>
                  QuickUtils is not liable for file corruption, data loss, failed conversions,
                  or any damage resulting from the use of file processing tools.
                </li>
                <li>
                  Do not upload files containing sensitive personal, financial, or confidential
                  information unless you are comfortable with the processing method described on
                  that tool's page.
                </li>
              </ul>
            </div>
          </section>

          {/* External links */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">External links</h2>
            <p className="text-muted-foreground leading-relaxed">
              Some pages on QuickUtils may link to external websites for reference — for example,
              official exam portals, documentation, or third-party services. We do not control
              external websites and are not responsible for their content, availability, accuracy,
              or privacy practices. Linking to an external site does not constitute an endorsement.
            </p>
          </section>

          {/* Accuracy and availability */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">Accuracy and availability</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                We make reasonable efforts to keep tool logic accurate, content up to date, and
                the website available. However, we cannot guarantee 100% accuracy, uninterrupted
                availability, or that every tool will behave identically across all browsers and
                devices.
              </p>
              <p>
                Fee structures, formula parameters, government requirements, and platform policies
                referenced by QuickUtils tools can change without notice. If you notice a result
                that appears incorrect or outdated, please report it using the contact page.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="rounded-lg border border-border/60 bg-muted/40 p-6">
            <h2 className="text-xl font-semibold mb-3">Questions or concerns</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have a question about this disclaimer, notice an inaccurate result, or want
              to report a broken tool, please get in touch through the contact page.
            </p>
            <Link to="/contact" className="text-primary hover:underline text-sm font-medium">
              Contact us
            </Link>
          </section>

        </div>
      </div>
    </div>
  )
}
