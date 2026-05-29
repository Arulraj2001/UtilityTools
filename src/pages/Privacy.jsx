import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const privacyDescription =
  'Read the QuickUtils Privacy Policy covering data collection, cookies, analytics, advertising, file handling, and your privacy rights.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Privacy Policy', url: `${SITE_URL}/privacy` },
])

const updatedDate = 'May 2025'
const contactEmail = 'support@quickutils.page'

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Privacy Policy - QuickUtils"
        description={privacyDescription}
        path="/privacy"
        ogTitle="QuickUtils Privacy Policy"
        ogDescription="Learn how QuickUtils handles analytics, cookies, advertising, files, and user information."
        jsonLd={breadcrumbSchema}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Legal</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
            Privacy Policy
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            QuickUtils (https://quickutils.page) is a free online utility website offering 150+
            tools including PDF tools, image editors, calculators, developer tools, SEO tools,
            and government exam helpers. This Privacy Policy describes what information we
            collect, how we use it, and your choices regarding your data.
          </p>
          <p className="text-sm text-muted-foreground mt-4">Last updated: {updatedDate}</p>
        </header>

        <div className="space-y-6">

          {/* 1. Introduction */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                This Privacy Policy applies to all pages and tools available at quickutils.page.
                By using QuickUtils you agree to the practices described in this policy. If you
                do not agree, please discontinue use of the site.
              </p>
              <p>
                QuickUtils is a free-to-use toolset. Most tools require no account or
                registration. We aim to collect as little personal data as possible and to be
                transparent about what we do collect.
              </p>
            </div>
          </section>

          {/* 2. Information We Collect */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">2. Information we collect</h2>
            <div className="space-y-5 text-muted-foreground leading-relaxed">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Analytics events (no PII)</h3>
                <p>
                  When you visit pages or use tools, QuickUtils logs anonymous analytics events
                  to a Supabase database. Each event record contains: the page path visited, the
                  tool slug (if a tool was used), the event type (e.g., page view or tool use),
                  an anonymous session ID, and general browser and device type. No names, email
                  addresses, IP addresses in identifying form, or other personally identifiable
                  information are stored in these analytics events.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Local and session storage</h3>
                <p>
                  QuickUtils stores small items in your browser's local storage and session
                  storage to support site functionality. Details are listed in the Cookies and
                  Local Storage section below.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Admin authentication (admins only)</h3>
                <p>
                  Regular visitors do not create accounts and no authentication tokens are stored
                  for them. Administrators who sign in to QuickUtils receive a Supabase JSON Web
                  Token (JWT), which is stored in localStorage for the duration of their session.
                  This applies only to authorised admin users, not to general site visitors.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Contact messages</h3>
                <p>
                  If you contact us via the contact form or by email, we may receive your name,
                  email address, and the contents of your message. Please do not include
                  sensitive personal data, passwords, government ID numbers, or confidential
                  financial records in contact messages.
                </p>
              </div>
            </div>
          </section>

          {/* 3. File Processing */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">3. File processing and privacy</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Many QuickUtils tools — including most image tools (resize, compress, crop,
                watermark) and PDF tools (compress, merge, split) — run entirely in your browser
                using PDF.js and pdf-lib. Files processed by browser-side tools never leave your
                device; they are not uploaded to any server.
              </p>
              <p>
                Some tools use a backend conversion server for tasks that cannot be completed
                in the browser. When a tool sends your file to our server, the file is used
                only to complete the requested operation and is not permanently stored on
                QuickUtils servers. Files processed server-side are handled transiently and
                discarded after the conversion is complete.
              </p>
              <p>
                If you are unsure whether a specific tool processes files in the browser or on
                the server, err on the side of caution and avoid uploading sensitive files such
                as identity documents, medical records, private financial records, confidential
                business documents, or any file you would not want handled by an online service.
              </p>
            </div>
          </section>

          {/* 4. Cookies and Local Storage */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">4. Cookies and local storage</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              QuickUtils uses browser local storage and session storage rather than first-party
              cookies for site functionality. Third-party services (analytics, advertising) may
              set their own cookies as described below.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">First-party storage items</h3>
                <div className="space-y-4">
                  <div className="rounded-lg border border-border/50 p-4">
                    <p className="font-medium text-foreground mb-1">
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">theme</code>
                      {' '}— localStorage
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Stores your dark or light mode preference. Persists until you change your
                      theme or clear your browser storage. To delete: clear site data in your
                      browser settings or toggle the theme to reset.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-4">
                    <p className="font-medium text-foreground mb-1">
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">bookmarked_tools</code>
                      {' '}— localStorage
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Stores a JSON array of tool IDs you have bookmarked so your bookmarks
                      persist between visits. Persists until you clear your bookmarks or clear
                      browser storage. To delete: remove bookmarks in the site UI or clear site
                      data in your browser settings.
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-4">
                    <p className="font-medium text-foreground mb-1">
                      <code className="text-sm bg-muted px-1.5 py-0.5 rounded">analytics_session_id</code>
                      {' '}— sessionStorage
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      An anonymous randomly generated string used to deduplicate analytics
                      events within a single browsing session. Contains no personal information.
                      Automatically cleared when you close your browser tab or window. Cannot be
                      linked back to you.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">Managing browser storage and cookies</h3>
                <p className="text-muted-foreground leading-relaxed">
                  You can clear localStorage and sessionStorage at any time through your
                  browser's developer tools (Application tab) or by clearing site data in your
                  browser privacy settings. Clearing storage will reset your theme preference
                  and remove saved bookmarks. Third-party cookies set by analytics or advertising
                  partners can be managed or blocked through your browser's cookie controls.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Third-Party Services */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">5. Third-party services</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              QuickUtils relies on the following third-party services. Each operates under its
              own privacy policy.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Supabase</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Supabase (supabase.com) provides the backend database used to store anonymous
                  analytics events and to handle admin authentication. Data stored in Supabase
                  includes the anonymous analytics event records described above. Supabase
                  processes data according to its own{' '}
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Ahrefs Analytics</h3>
                <p className="text-muted-foreground leading-relaxed">
                  QuickUtils loads the Ahrefs Analytics script (analytics.ahrefs.com) on all
                  pages. This script collects page-level SEO and traffic analytics data on
                  behalf of QuickUtils. Ahrefs processes this data in accordance with its own{' '}
                  <a
                    href="https://ahrefs.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>
                  . QuickUtils does not use Google Analytics.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">Google AdSense</h3>
                <p className="text-muted-foreground leading-relaxed">
                  QuickUtils uses Google AdSense (publisher ID: ca-pub-1603942692726452) to
                  display advertisements. When ads are active, Google may use advertising
                  cookies to serve personalised ads based on your prior visits to this and other
                  websites. See the Google Advertising section below for full details and
                  opt-out instructions.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Google Advertising */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">6. Google advertising (AdSense)</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                QuickUtils participates in the Google AdSense programme. Google, as a
                third-party vendor, uses cookies (including the DoubleClick cookie) to serve
                ads on QuickUtils based on a user's prior visits to this website or other
                websites on the internet. Advertising cookies allow Google and its partners to
                serve ads to you based on your visit to our site and/or other sites on the
                internet.
              </p>
              <p>
                QuickUtils does not control the cookies placed by Google for advertising
                purposes. Google's use of advertising cookies enables it and its partners to
                serve ads based on your visit to our site and/or other sites. You may opt out
                of personalised advertising by visiting{' '}
                <a
                  href="https://www.google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  google.com/settings/ads
                </a>
                .
              </p>
              <p>
                EU and UK visitors may also opt out of interest-based advertising from
                participating networks through the{' '}
                <a
                  href="https://www.youronlinechoices.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Your Online Choices
                </a>{' '}
                platform (youronlinechoices.com). US visitors may use the{' '}
                <a
                  href="https://optout.aboutads.info/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Digital Advertising Alliance opt-out tool
                </a>
                .
              </p>
              <p>
                For more information on how Google uses data when you use partner sites or
                apps, visit{' '}
                <a
                  href="https://policies.google.com/technologies/partner-sites"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  policies.google.com/technologies/partner-sites
                </a>
                .
              </p>
            </div>
          </section>

          {/* 7. Data Retention */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">7. Data retention</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Anonymous analytics events stored in Supabase are retained for site analytics
                and performance monitoring purposes. Because these records contain no personally
                identifiable information, they are kept for as long as they are useful for
                understanding site usage and improving tools.
              </p>
              <p>
                Uploaded files are not permanently stored on QuickUtils servers. Files
                processed server-side are handled transiently to complete the requested
                conversion and are discarded afterwards. Browser-side tool processing never
                involves server storage at all.
              </p>
              <p>
                Contact messages may be retained for as long as necessary to respond to your
                enquiry, address follow-up questions, or meet any applicable legal obligations.
              </p>
              <p>
                Browser local storage items (theme preference, bookmarks) persist on your own
                device until you delete them. The session storage analytics ID is automatically
                cleared when you close your browser.
              </p>
            </div>
          </section>

          {/* 8. Children's Privacy */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">8. Children's privacy</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                QuickUtils is not directed at children under the age of 13. We do not
                knowingly collect personal information from children under 13. If you believe
                a child under 13 has provided personal information to us, please contact us at{' '}
                <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                  {contactEmail}
                </a>{' '}
                and we will take steps to delete such information.
              </p>
            </div>
          </section>

          {/* 9. Changes to This Policy */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">9. Changes to this policy</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                We may update this Privacy Policy from time to time to reflect changes in our
                practices, tools, or applicable law. When we make changes, we will update the
                "Last updated" date at the top of this page. We encourage you to review this
                page periodically.
              </p>
              <p>
                Continued use of QuickUtils after any changes to this policy constitutes
                acceptance of the updated policy.
              </p>
            </div>
          </section>

          {/* 10. Contact */}
          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">10. Contact us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have questions, concerns, or requests regarding this Privacy Policy or how
              QuickUtils handles your data, please contact us at{' '}
              <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                {contactEmail}
              </a>{' '}
              or use the contact page.
            </p>
            <Link to="/contact" className="text-sm font-medium text-primary hover:underline">
              Go to Contact page
            </Link>
          </section>

        </div>
      </div>
    </div>
  )
}
