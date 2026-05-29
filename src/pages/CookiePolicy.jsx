import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO from '@/components/seo/StaticPageSEO'

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Cookie Policy — QuickUtils"
        description="Learn how QuickUtils uses cookies and local storage."
        path="/cookie-policy"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold mb-4">Cookie Policy</h1>
        <p className="text-muted-foreground leading-relaxed mb-2">
          Last updated: May 2025
        </p>

        {/* What are cookies */}
        <section className="mt-12 pt-8 border-t border-border/50">
          <h2 className="text-xl font-semibold mb-3">What are cookies?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies are small text files that a website stores on your device via your browser.
            In addition to traditional cookies, websites also use browser storage mechanisms such
            as <strong>localStorage</strong> and <strong>sessionStorage</strong> to save preferences
            and session data directly on your device. localStorage persists across browser sessions
            until explicitly cleared, while sessionStorage is automatically cleared when you close
            the browser tab or window.
          </p>
        </section>

        {/* How QuickUtils uses storage */}
        <section className="mt-12 pt-8 border-t border-border/50">
          <h2 className="text-xl font-semibold mb-3">How QuickUtils uses storage</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            QuickUtils uses only the storage items listed below. We do not set any first-party
            tracking cookies.
          </p>

          <div className="rounded-lg border border-border/60 bg-card/80 p-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left font-semibold pb-3 pr-4">Name / Key</th>
                  <th className="text-left font-semibold pb-3 pr-4">Storage type</th>
                  <th className="text-left font-semibold pb-3 pr-4">Purpose</th>
                  <th className="text-left font-semibold pb-3">Duration</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 font-medium text-foreground">theme</td>
                  <td className="py-3 pr-4">localStorage</td>
                  <td className="py-3 pr-4">Remembers your dark or light mode preference so the site looks the same on your next visit.</td>
                  <td className="py-3">Until you change the setting</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-3 pr-4 font-medium text-foreground">bookmarked_tools</td>
                  <td className="py-3 pr-4">localStorage</td>
                  <td className="py-3 pr-4">Saves the list of tools you have starred or bookmarked so they are available on your next visit.</td>
                  <td className="py-3">Until you clear your bookmarks or browser storage</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4 font-medium text-foreground">analytics_session_id</td>
                  <td className="py-3 pr-4">sessionStorage</td>
                  <td className="py-3 pr-4">An anonymous random string used to group page views within a single browsing session and avoid counting the same visit multiple times.</td>
                  <td className="py-3">Browser session only — cleared when the tab or window is closed</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Third-party cookies */}
        <section className="mt-12 pt-8 border-t border-border/50">
          <h2 className="text-xl font-semibold mb-3">Third-party cookies</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Some third-party services embedded on QuickUtils may set their own cookies on your
            device. These cookies are governed by the respective third party's privacy policy, not
            by this policy.
          </p>

          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-card/80 p-6">
              <h3 className="text-base font-semibold mb-2">Ahrefs Analytics</h3>
              <p className="text-muted-foreground leading-relaxed">
                QuickUtils uses the Ahrefs Analytics script (analytics.ahrefs.com) to help us
                understand which pages are visited, measure traffic trends, and improve the site's
                content and SEO. Ahrefs may set its own tracking cookies. For details on how Ahrefs
                handles data, see the{' '}
                <a
                  href="https://ahrefs.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Ahrefs Privacy Policy
                </a>
                .
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-card/80 p-6">
              <h3 className="text-base font-semibold mb-2">Google AdSense</h3>
              <p className="text-muted-foreground leading-relaxed">
                QuickUtils is configured to display advertisements through Google AdSense
                (account ca-pub-1603942692726452). When ads are displayed, Google uses advertising
                cookies to personalise ads based on your interests and to measure ad performance.
                Google's advertising cookies may persist beyond your browser session. For details,
                see the{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Managing cookies */}
        <section className="mt-12 pt-8 border-t border-border/50">
          <h2 className="text-xl font-semibold mb-3">Managing cookies</h2>

          <div className="space-y-6 text-muted-foreground leading-relaxed">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-2">Browser storage (localStorage and sessionStorage)</h3>
              <p>
                You can clear localStorage and sessionStorage at any time through your browser's
                built-in tools. In most browsers, go to <strong>Settings</strong> &rarr;{' '}
                <strong>Privacy and Security</strong> &rarr; <strong>Clear browsing data</strong>{' '}
                (or <strong>Site Settings</strong> / <strong>Storage</strong>) and select cookies
                and site data. Alternatively, open your browser's Developer Tools (F12), navigate
                to the <strong>Application</strong> tab, and clear localStorage or sessionStorage
                directly for this site. Clearing storage will reset your theme preference and
                remove your bookmarked tools.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground mb-2">Google ad personalisation</h3>
              <p>
                You can review and manage Google's use of your information for ad personalisation
                at{' '}
                <a
                  href="https://google.com/settings/ads"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  google.com/settings/ads
                </a>
                .
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground mb-2">EU users — Your Online Choices</h3>
              <p>
                If you are based in the EU or UK, you can manage behavioural advertising
                preferences for many ad networks through{' '}
                <a
                  href="https://www.youronlinechoices.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Your Online Choices
                </a>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Updates to this policy */}
        <section className="mt-12 pt-8 border-t border-border/50">
          <h2 className="text-xl font-semibold mb-3">Updates to this policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this Cookie Policy from time to time; any changes will be reflected by
            a revised "Last updated" date at the top of this page.
          </p>
        </section>

        {/* Contact */}
        <section className="mt-12 pt-8 border-t border-border/50">
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you have any questions about this Cookie Policy or how QuickUtils uses storage and
            cookies, please reach out via our{' '}
            <Link to="/contact" className="text-primary hover:underline">
              contact page
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
