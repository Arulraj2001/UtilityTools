import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { CONTACT_EMAIL, organizationSchema } from '@/config/site'

const pageDescription =
  'QuickUtils accessibility statement covering accessibility goals, keyboard navigation, screen reader support, feedback, and continuous improvement.'

const accessibilitySchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'QuickUtils Accessibility Statement',
  url: `${SITE_URL}/accessibility`,
  description: pageDescription,
  publisher: organizationSchema,
}

const commitments = [
  {
    title: 'Accessibility goals',
    text:
      'QuickUtils aims to make tools, guides, forms, buttons, navigation, and policies usable by as many people as possible, including people using assistive technologies.',
  },
  {
    title: 'Keyboard navigation',
    text:
      'The site is designed so core navigation, forms, buttons, links, and tool controls can be reached through the keyboard where the browser and component support allow it.',
  },
  {
    title: 'Screen reader support',
    text:
      'Pages use headings, labels, link text, and interface structure intended to support screen reader use. Where a tool depends on visual output, QuickUtils works to provide descriptive labels or supporting text where practical.',
  },
  {
    title: 'Continuous improvement',
    text:
      'Accessibility issues are reviewed as part of user feedback, tool updates, and content changes. Improvements may be made when a barrier is found or when a better implementation becomes practical.',
  },
]

export default function Accessibility() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Accessibility Statement - QuickUtils"
        description={pageDescription}
        path="/accessibility"
        ogTitle="QuickUtils Accessibility Statement"
        ogDescription="Read QuickUtils accessibility goals, keyboard navigation support, screen reader support, and feedback process."
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
            readable, and understandable. This statement explains the accessibility goals and
            how users can report barriers.
          </p>
        </header>

        <div className="space-y-6">
          {commitments.map((item) => (
            <section key={item.title} className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-4">{item.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{item.text}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Contact Method</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you find an accessibility problem, email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>{' '}
            or use the contact page. Include the page URL, the barrier you experienced, your
            browser or assistive technology if relevant, and what you were trying to do.
          </p>
        </section>

        <section className="mt-8 rounded-lg border border-border/60 bg-muted/40 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Related Pages</h2>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link to="/contact" className="text-primary hover:underline">Contact</Link>
            <Link to="/corrections-policy" className="text-primary hover:underline">Corrections Policy</Link>
            <Link to="/methodology" className="text-primary hover:underline">Methodology</Link>
            <Link to="/team" className="text-primary hover:underline">Team</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
