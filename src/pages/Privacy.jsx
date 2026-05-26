import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const privacyDescription =
  'Read the QuickUtils Privacy Policy covering data collection, cookies, analytics, advertising, file handling, and contact information.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Privacy Policy', url: `${SITE_URL}/privacy` },
])

const updatedDate = 'May 26, 2026'
const contactEmail = 'support@quickutils.page'

export default function Privacy() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <StaticPageSEO
        title="Privacy Policy - QuickUtils"
        description={privacyDescription}
        path="/privacy"
        ogTitle="QuickUtils Privacy Policy"
        ogDescription="Learn how QuickUtils handles analytics, cookies, advertising, files, and user information."
        jsonLd={breadcrumbSchema}
      />

      <header className="mb-10">
        <p className="text-sm font-semibold text-primary mb-3">Privacy Policy</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Privacy Policy
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          This Privacy Policy explains what information QuickUtils may collect, how cookies and
          third-party services may be used, and how file-based tools are generally handled.
        </p>
        <p className="text-sm text-muted-foreground mt-4">Last updated: {updatedDate}</p>
      </header>

      <div className="space-y-6">
        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Information we may collect</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              QuickUtils may collect limited information needed to operate, secure, and improve
              the website. This may include browser type, device information, pages visited,
              tools used, approximate usage activity, error logs, performance information, and
              information you submit through a contact form.
            </p>
            <p>
              If you contact us, we may receive your name, email address, message, and any details
              you choose to include. Please avoid sending private documents, passwords, financial
              records, government ID numbers, or other sensitive information in contact messages.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Cookies, analytics, and similar technologies</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              QuickUtils may use cookies, local storage, analytics scripts, or similar
              technologies to remember preferences, understand page usage, measure performance,
              detect errors, and improve the site.
            </p>
            <p>
              Third-party analytics providers may process information according to their own
              privacy policies. You can manage or block cookies through your browser settings,
              although some site features may work differently if cookies or local storage are
              disabled.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Advertising disclosure</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              QuickUtils may display advertising or use advertising services such as Google
              AdSense. Advertising partners may use cookies or similar technologies to show,
              measure, and improve ads.
            </p>
            <p>
              Ad providers may collect or receive information from your browser and use that
              information according to their own policies. QuickUtils does not control every data
              practice of third-party advertising networks.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">File and tool privacy</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Many QuickUtils tools are designed to process files in your browser when the task
              and browser support it. Browser-side processing can help keep simple file work on
              your device and reduce unnecessary uploads.
            </p>
            <p>
              Some tools or future features may require temporary server-side processing,
              external libraries, or third-party services to complete a task. File handling can
              vary by tool, file type, browser, and feature.
            </p>
            <p>
              If server-side handling is unclear for a specific tool, avoid uploading sensitive
              files such as identity documents, passwords, private financial records, medical
              files, confidential business documents, or anything you would not want processed by
              an online service.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Third-party services</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            QuickUtils may use third-party services for hosting, analytics, contact forms,
            databases, advertising, performance monitoring, or tool functionality. These services
            may collect information according to their own terms and privacy policies.
          </p>
          <ul className="space-y-2 text-muted-foreground leading-relaxed">
            <li>Hosting and infrastructure providers.</li>
            <li>Analytics and performance measurement tools.</li>
            <li>Advertising providers such as Google AdSense.</li>
            <li>Database, storage, or application services used to run website features.</li>
            <li>Contact form delivery services used when you send a message.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Data security and retention</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              We use reasonable technical measures to operate the website securely, including
              HTTPS for encrypted connections. No online service can guarantee complete security.
            </p>
            <p>
              Contact messages, logs, and analytics data may be kept for as long as needed to
              respond to users, troubleshoot issues, improve tools, meet legal requirements, or
              protect the website from abuse.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            For privacy questions or requests, contact QuickUtils at{' '}
            <a href={`mailto:${contactEmail}`} className="text-primary hover:text-primary/80">
              {contactEmail}
            </a>
            {' '}or use the contact page.
          </p>
          <Link to="/contact" className="text-sm font-medium text-primary hover:text-primary/80">
            Go to Contact
          </Link>
        </section>
      </div>
    </div>
  )
}
