import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'

const aboutDescription =
  'Learn what QuickUtils is, who it helps, what tools are available, and how users can report errors or suggest improvements.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'About', url: `${SITE_URL}/about` },
])

const toolGroups = [
  'PDF tools for compression, merging, splitting, conversion, and document cleanup.',
  'Image tools for resizing, compression, cropping, conversion, metadata checks, and upload preparation.',
  'Calculators for finance, health, study, dates, percentages, logistics, and everyday estimates.',
  'Developer and SEO tools for formatting data, generating metadata, encoding URLs, and checking website details.',
  'Government exam and job application tools for photos, signatures, PDFs, and document requirements.',
  'Seller and shipping tools for pricing, fees, parcel dimensions, labels, and chargeable weight estimates.',
]

export default function About() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <StaticPageSEO
        title="About QuickUtils - Free Online Utility Tools"
        description={aboutDescription}
        path="/about"
        ogTitle="About QuickUtils"
        ogDescription="QuickUtils provides practical online tools for PDFs, images, calculators, text, developer tasks, exam documents, sellers, and shipping work."
        jsonLd={breadcrumbSchema}
      />

      <header className="mb-10">
        <p className="text-sm font-semibold text-primary mb-3">About QuickUtils</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
          Practical online tools for everyday work
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          QuickUtils is a free online tools website built to help people finish common digital
          tasks without installing separate software. The site brings together utility tools for
          files, images, documents, calculations, text, SEO, development, exam uploads, seller
          work, and logistics.
        </p>
      </header>

      <div className="space-y-8">
        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">What QuickUtils is</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              QuickUtils is designed as a simple utility hub. Each tool focuses on a specific
              task, such as compressing a PDF, resizing an image, formatting JSON, estimating a
              loan payment, preparing an exam photo, or calculating shipping weight.
            </p>
            <p>
              The goal is to make common tasks easier to complete from a browser while keeping
              instructions clear enough for users who may not be technical.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Who QuickUtils helps</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            The tools are useful for students, job applicants, creators, office workers,
            developers, freelancers, small business owners, online sellers, logistics teams, and
            anyone who needs a quick browser-based utility.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              'Students preparing assignments, marks, study plans, and file uploads.',
              'Exam applicants resizing photos, signatures, and PDFs for portals.',
              'Creators optimizing images, checking files, and preparing web assets.',
              'Developers and SEO users working with data, URLs, metadata, and snippets.',
              'Sellers estimating pricing, margins, fees, invoices, and shipping costs.',
              'Everyday users converting, cleaning, counting, calculating, and comparing information.',
            ].map((item) => (
              <div key={item} className="rounded-lg border border-border/60 bg-background p-4 text-sm text-muted-foreground leading-relaxed">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Types of tools available</h2>
          <ul className="space-y-3 text-muted-foreground leading-relaxed">
            {toolGroups.map((group) => (
              <li key={group}>{group}</li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/tools" className="text-sm font-medium text-primary hover:text-primary/80">
              Browse all tools
            </Link>
            <Link to="/categories" className="text-sm font-medium text-primary hover:text-primary/80">
              View categories
            </Link>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Mission and maintenance</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              The mission of QuickUtils is to make practical web tools easier to access, easier
              to understand, and easier to use on both desktop and mobile devices.
            </p>
            <p>
              Tool explanations are maintained alongside the tools themselves. When a tool
              changes, its instructions, examples, limitations, and FAQ content should be
              reviewed so users understand what the tool does and how to check the output.
            </p>
            <p>
              QuickUtils does not claim that every calculator or file output is perfect for every
              situation. Important results should be reviewed before they are submitted, shared,
              or used for decisions.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-muted/40 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Report errors or suggest improvements</h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            If a tool gives an unexpected result, a page has unclear instructions, or you want to
            suggest a new utility, please contact the QuickUtils team with the tool name, page URL,
            device or browser details, and a short description of the issue.
          </p>
          <Link to="/contact" className="inline-flex text-sm font-medium text-primary hover:text-primary/80">
            Contact QuickUtils
          </Link>
        </section>
      </div>
    </div>
  )
}
