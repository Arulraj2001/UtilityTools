import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { CONTACT_EMAIL, organizationSchema } from '@/config/site'

const pageDescription =
  'QuickUtils accessibility statement covering WCAG 2.1 goals, keyboard navigation, screen reader support, colour contrast, known limitations, and how to report barriers.'

const accessibilitySchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'QuickUtils Accessibility Statement',
  url: `${SITE_URL}/accessibility`,
  description: pageDescription,
  publisher: organizationSchema,
  dateModified: '2026-06-01',
}

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Accessibility Statement - QuickUtils"
        description={pageDescription}
        path="/accessibility"
        ogTitle="QuickUtils Accessibility Statement"
        ogDescription="Read QuickUtils accessibility goals, keyboard navigation, screen reader support, colour contrast, known limitations, and how to report barriers."
        jsonLd={[
          accessibilitySchema,
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Accessibility Statement', url: `${SITE_URL}/accessibility` },
          ]),
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Accessibility</p>
          <h1 className="text-3xl font-bold mb-4">Accessibility Statement</h1>
          <p className="text-muted-foreground leading-relaxed text-lg">
            QuickUtils is a practical tools website, and practical tools should be reachable,
            readable, and understandable by as many people as possible. This statement explains
            how we approach accessibility, what we currently support, where gaps exist, and how
            users can report barriers they encounter.
          </p>
          <p className="text-sm text-muted-foreground mt-3">Last updated: June 2026</p>
        </header>

        <div className="space-y-6">

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Our accessibility goals</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              QuickUtils aims to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at
              Level AA where practical. Our goal is to ensure that the core functionality of
              every tool — including the input form, file upload zone, output display, and
              navigation — is usable without a mouse where the browser and component allow it.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              This includes people who use screen readers, keyboard-only navigation, voice input,
              browser zoom, high-contrast modes, or other assistive technologies. Where we have
              not yet reached this goal for a specific tool or component, we list known limitations
              further below.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Keyboard navigation</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              All primary navigation items, tool input fields, buttons, links, dropdown menus,
              and file upload zones are reachable via keyboard Tab and Shift+Tab. Interactive
              elements such as buttons and form controls receive a visible focus ring when focused
              using a keyboard. The site does not trap focus outside of modal dialogs, and all
              modals can be dismissed with the Escape key.
            </p>
            <div className="rounded-lg bg-muted/40 p-4 mt-4">
              <p className="text-sm font-semibold text-foreground mb-2">Common keyboard shortcuts</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs font-mono">Tab</kbd> — Move to the next interactive element</li>
                <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs font-mono">Shift + Tab</kbd> — Move to the previous interactive element</li>
                <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs font-mono">Enter / Space</kbd> — Activate buttons and links</li>
                <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs font-mono">Escape</kbd> — Close open modals and search overlays</li>
                <li><kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-xs font-mono">Arrow keys</kbd> — Navigate dropdown menus and select inputs</li>
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Screen reader support</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Pages use semantic HTML5 elements — headings, landmarks, lists, labels, and buttons
              — to support screen reader navigation. All interactive controls have accessible names
              provided through labels, aria-label attributes, or visible text. Image-based outputs
              and icon-only buttons include descriptive aria-label text.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              File tool output areas (such as compressed image previews and PDF download buttons)
              include descriptive text alternatives where the visual result alone would not
              communicate the outcome to a screen reader user. Tool result sections use live
              regions where appropriate to announce output changes without requiring a page reload.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Colour contrast and visual design</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              QuickUtils uses a colour system designed to meet WCAG 2.1 AA contrast ratios for
              body text, labels, buttons, and interactive elements in both light and dark modes.
              The site supports system-level dark mode preference automatically, and users who
              have set their OS or browser to prefer reduced motion will see fewer or slower
              animations and transitions.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Information is not conveyed through colour alone. Status indicators, validation
              messages, and badges also use text labels, icons, or patterns to ensure the meaning
              is accessible to users with colour vision deficiency.
            </p>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Known limitations</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Some tool interactions have accessibility constraints that we are working to improve:
            </p>
            <ul className="space-y-3 text-muted-foreground leading-relaxed">
              <li className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                <span>
                  <strong className="text-foreground">File drag-and-drop zones:</strong> These
                  can also be activated by pressing Enter or Space when focused, but the
                  file-picker experience may vary across assistive technology and OS combinations.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                <span>
                  <strong className="text-foreground">Canvas-based image outputs:</strong> Some
                  image tools render results on an HTML canvas element. Screen readers cannot read
                  canvas content directly; download buttons and file size summaries are provided
                  as text alternatives.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                <span>
                  <strong className="text-foreground">Complex data tables in results:</strong>
                  Some logistics and seller calculator outputs include multi-column result tables.
                  We are adding table header associations to improve screen reader readability.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                <span>
                  <strong className="text-foreground">Third-party ad content:</strong> Ads
                  displayed on the site are served by external networks and may not fully comply
                  with accessibility standards. We encourage users to report specific ad
                  accessibility issues so we can escalate to the ad provider.
                </span>
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Continuous improvement</h2>
            <p className="text-muted-foreground leading-relaxed">
              Accessibility issues are reviewed as part of tool updates, user feedback, and
              content changes. We treat reported barriers with the same priority as functional
              bugs — if a feature cannot be used because of an accessibility issue, we aim to
              address it. Improvements may be made when a barrier is identified, when a component
              is updated, or when a better implementation approach becomes practical. We do not
              conduct third-party audits on a fixed schedule, but user-reported issues are reviewed
              on an ongoing basis.
            </p>
          </section>

          <section className="mt-8 rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">How to report an accessibility barrier</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you encounter an accessibility problem on any QuickUtils page or tool, please
              report it by emailing{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
                {CONTACT_EMAIL}
              </a>{' '}
              or using the contact page. To help us investigate and reproduce the issue quickly,
              please include:
            </p>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary">•</span> The URL of the page or tool where you encountered the barrier</li>
              <li className="flex gap-2"><span className="text-primary">•</span> A brief description of what you were trying to do</li>
              <li className="flex gap-2"><span className="text-primary">•</span> The assistive technology or browser you are using (e.g. NVDA, VoiceOver, JAWS, TalkBack)</li>
              <li className="flex gap-2"><span className="text-primary">•</span> Your operating system and browser version if relevant</li>
              <li className="flex gap-2"><span className="text-primary">•</span> What happened and what you expected to happen instead</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              We aim to acknowledge accessibility reports within a few business days and will
              provide an update on our planned response.
            </p>
          </section>

          <section className="mt-8 rounded-lg border border-border/60 bg-muted/40 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold mb-4">Related pages</h2>
            <div className="flex flex-wrap gap-4 text-sm font-medium">
              <Link to="/contact" className="text-primary hover:underline">Contact</Link>
              <Link to="/corrections-policy" className="text-primary hover:underline">Corrections Policy</Link>
              <Link to="/methodology" className="text-primary hover:underline">Methodology</Link>
              <Link to="/editorial-policy" className="text-primary hover:underline">Editorial Policy</Link>
              <Link to="/team" className="text-primary hover:underline">Team</Link>
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
