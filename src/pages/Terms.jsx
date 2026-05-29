import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const termsDescription =
  'Terms of Service for QuickUtils — covering acceptable use, no-warranty disclaimer, liability limits, and specific disclaimers for financial calculators, health tools, exam document tools, and file processing tools.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Terms of Service', url: `${SITE_URL}/terms` },
])

const updatedDate = 'May 2025'

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Terms of Service - QuickUtils"
        description={termsDescription}
        path="/terms"
        ogTitle="QuickUtils Terms of Service"
        ogDescription="Read the QuickUtils Terms of Service covering acceptable use, warranties, liability, and tool-specific disclaimers for calculators, health tools, exam forms, and file processing."
        jsonLd={breadcrumbSchema}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Legal</p>
          <h1 className="text-3xl font-bold mb-4">Terms of Service</h1>
          <p className="text-muted-foreground leading-relaxed">
            These terms govern your use of QuickUtils (quickutils.page) and all tools, pages, and
            content available on the website. By using QuickUtils, you agree to these terms.
          </p>
          <p className="text-sm text-muted-foreground mt-4">Last updated: {updatedDate}</p>
        </header>

        <div className="space-y-6">

          {/* 1. Acceptance */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                By accessing or using QuickUtils, you confirm that you have read, understood, and
                agree to be bound by these Terms of Service. If you do not agree, please do not
                use the website.
              </p>
              <p>
                These terms apply to all visitors and users, whether or not you have an account.
                Most QuickUtils tools are available without registration.
              </p>
            </div>
          </section>

          {/* 2. What We Provide */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">2. What QuickUtils Provides</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                QuickUtils is a free online utility platform with 150+ browser-based tools,
                including:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>PDF tools: compress, merge, split, and convert PDF files</li>
                <li>Image tools: resize, compress, crop, and watermark images</li>
                <li>Calculators: EMI, SIP, BMI, volumetric weight, Amazon seller fees, shipping costs</li>
                <li>Developer and SEO tools: JSON formatter, URL encoder, meta tag generator</li>
                <li>Government exam tools: photo resizer, signature resizer, PDF compressor for exam forms</li>
                <li>Seller and logistics tools</li>
              </ul>
              <p>
                Most file processing happens directly in your browser. No files are stored on our
                servers after processing completes. We may add, update, limit, or remove tools
                and features at any time without prior notice.
              </p>
            </div>
          </section>

          {/* 3. Acceptable Use */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">3. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You agree to use QuickUtils only for lawful purposes and in a manner that does not
              harm others or the service. You must not:
            </p>
            <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc list-inside ml-2">
              <li>Use QuickUtils for any unlawful, fraudulent, or harmful purpose</li>
              <li>Upload files that contain malware, viruses, ransomware, or illegal content</li>
              <li>
                Attempt to reverse-engineer, decompile, or extract source code from the website
                or its backend services
              </li>
              <li>
                Scrape the website aggressively, send automated bulk requests, or attempt to
                overload or disrupt service availability
              </li>
              <li>
                Attempt to bypass security controls, access systems you are not authorized to
                access, or probe for vulnerabilities without permission
              </li>
              <li>
                Use the tools to process content that infringes another person's copyright,
                trademark, privacy, or other legal rights
              </li>
              <li>
                Misrepresent QuickUtils outputs as officially certified, professionally reviewed,
                or endorsed by any government authority, exam board, or financial institution
              </li>
            </ul>
          </section>

          {/* 4. No Warranties */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">4. No Warranties</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                QuickUtils is provided on an <strong className="text-foreground">"as is"</strong>{' '}
                and <strong className="text-foreground">"as available"</strong> basis. We make no
                warranties, express or implied, including but not limited to warranties of
                merchantability, fitness for a particular purpose, or uninterrupted availability.
              </p>
              <p>
                We do not guarantee that any tool will be error-free, produce accurate results in
                every situation, or be available at all times. Results may be affected by input
                quality, file type, browser behavior, device limitations, rounding differences,
                third-party library behavior, or user settings.
              </p>
              <p>
                You are responsible for verifying any output before relying on it, especially for
                official submissions, financial decisions, health matters, or legal documents.
              </p>
            </div>
          </section>

          {/* 5. Limitation of Liability */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">5. Limitation of Liability</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                To the maximum extent permitted by applicable law, QuickUtils and its operators
                are not liable for any direct, indirect, incidental, special, consequential, or
                similar damages arising from your use of — or inability to use — the website,
                tools, outputs, or any linked service.
              </p>
              <p>
                This includes but is not limited to: data loss or file corruption, incorrect
                calculator results, failed form submissions, missed exam deadlines, business
                losses, or any action taken in reliance on tool outputs.
              </p>
            </div>
          </section>

          {/* 6. Tool-Specific Disclaimers */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">6. Tool-Specific Disclaimers</h2>
            <div className="space-y-6">

              <div>
                <h3 className="text-base font-semibold mb-2">Financial Calculators</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The EMI calculator, SIP calculator, Amazon seller fee calculator, shipping cost
                  calculator, and similar tools produce <strong className="text-foreground">estimates only</strong>.
                  Results are based on the values you enter and standard formulas. They do not
                  account for all real-world variables such as bank policies, tax rules, platform
                  fee changes, or exchange rates. Nothing on QuickUtils constitutes financial,
                  investment, or tax advice. Always verify important figures with a qualified
                  financial professional before making decisions.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-2">Health Tools</h3>
                <p className="text-muted-foreground leading-relaxed">
                  The BMI calculator and any other health-related tools are for{' '}
                  <strong className="text-foreground">informational purposes only</strong> and do
                  not constitute medical advice, diagnosis, or treatment recommendations. BMI is a
                  general population metric and may not accurately reflect individual health. Consult
                  a qualified healthcare professional for personal health guidance.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-2">Exam and Government Document Tools</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Tools such as the exam photo resizer, signature resizer, and PDF compressor for
                  government exam forms are provided as convenience utilities. Official requirements
                  for file size, dimensions, format, and quality change over time and vary by exam
                  board or government authority.{' '}
                  <strong className="text-foreground">
                    Always verify that your output meets the official specifications published by
                    the relevant authority before submitting.
                  </strong>{' '}
                  QuickUtils is not affiliated with any exam board, government authority, or
                  recruitment body. We are not responsible for rejections caused by non-compliant
                  files.
                </p>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-2">File Processing Tools (PDF and Image)</h3>
                <p className="text-muted-foreground leading-relaxed">
                  PDF and image processing tools (compress, merge, split, convert, resize, crop,
                  watermark, and similar) modify your files in the browser. While we take care to
                  process files correctly,{' '}
                  <strong className="text-foreground">
                    always keep a backup of your original files before processing.
                  </strong>{' '}
                  QuickUtils is not liable for data loss, file corruption, quality degradation, or
                  any other damage to your files resulting from use of these tools.
                </p>
              </div>

            </div>
          </section>

          {/* 7. Intellectual Property */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">7. Intellectual Property</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                Files, images, documents, and content you upload to QuickUtils remain yours. We
                do not claim ownership over content you process through the tools. As stated
                above, most processing happens in your browser and files are not retained on our
                servers.
              </p>
              <p>
                The QuickUtils website, its design, code, text, logos, and original content are
                owned by QuickUtils and protected by applicable intellectual property laws. You
                may not copy, reproduce, or redistribute QuickUtils content without permission.
              </p>
              <p>
                You agree not to use QuickUtils tools to infringe the copyright, trademark, or
                other intellectual property rights of third parties. Do not process or distribute
                content you do not have the right to use.
              </p>
            </div>
          </section>

          {/* 8. Third-Party Services */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">8. Third-Party Services</h2>
            <div className="space-y-3 text-muted-foreground leading-relaxed">
              <p>
                QuickUtils uses the following third-party services to operate the website. Each
                service has its own terms and privacy policy that apply to your use:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong className="text-foreground">Supabase</strong> — database and
                  authentication backend (
                  <a
                    href="https://supabase.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    supabase.com/terms
                  </a>
                  )
                </li>
                <li>
                  <strong className="text-foreground">Google AdSense</strong> — advertising
                  network (
                  <a
                    href="https://policies.google.com/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    policies.google.com/terms
                  </a>
                  )
                </li>
                <li>
                  <strong className="text-foreground">Ahrefs Analytics</strong> — privacy-focused
                  website analytics (
                  <a
                    href="https://ahrefs.com/terms-of-service"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    ahrefs.com/terms-of-service
                  </a>
                  )
                </li>
              </ul>
              <p>
                QuickUtils is not responsible for the actions, availability, or content of these
                third-party services. Links to external websites are provided for convenience and
                do not imply endorsement.
              </p>
            </div>
          </section>

          {/* 9. Changes to Terms */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">9. Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms of Service as QuickUtils evolves. When we make material
              changes, we will update the "Last updated" date at the top of this page. Continued
              use of QuickUtils after changes are posted means you accept the updated terms. We
              recommend checking this page periodically.
            </p>
          </section>

          {/* 10. Contact */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6">
            <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions about these Terms of Service or want to report a concern about
              how QuickUtils is being used, please get in touch.
            </p>
            <Link to="/contact" className="text-primary hover:underline text-sm font-medium">
              Contact QuickUtils
            </Link>
          </section>

        </div>
      </div>
    </div>
  )
}
