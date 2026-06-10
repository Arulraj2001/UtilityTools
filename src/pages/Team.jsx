import React from 'react'
import { Link } from 'react-router-dom'
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { CONTACT_EMAIL, FOUNDER_NAME, ORGANIZATION_NAME, organizationSchema } from '@/config/site'
import { DEFAULT_AUTHOR } from '@/lib/authors'

const pageDescription =
  'Meet the Learnithm team behind QuickUtils and learn how tools, guides, reviews, and corrections are handled.'

const breadcrumbSchema = buildBreadcrumbSchema([
  { name: 'Home', url: `${SITE_URL}/` },
  { name: 'Team', url: `${SITE_URL}/team` },
])

const teamPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'QuickUtils Team',
  url: `${SITE_URL}/team`,
  description: pageDescription,
  publisher: organizationSchema,
  mainEntity: {
    '@type': 'Person',
    name: FOUNDER_NAME,
    url: DEFAULT_AUTHOR.url,
    jobTitle: 'Founder',
    worksFor: {
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
    },
  },
}

const standards = [
  'Write tool explanations in plain language and avoid unsupported claims.',
  'Explain limitations for calculators, file tools, exam document tools, seller tools, and job content.',
  'Review pages when tool behavior changes, when user feedback identifies confusion, or when important rules change.',
  'Link users to methodology, editorial policy, corrections, privacy, and contact pages where those details matter.',
]

const teamMembers = [
  {
    name: 'Sanjay Krishnan',
    role: 'Content dev, SEO engineer',
  },
  {
    name: 'Vigneshwaran',
    role: 'Junior Software Developer',
  },
  {
    name: 'Gayatri',
    role: 'Junior Software Developer',
  },
  {
    name: 'Abiesh S',
    role: 'Design and content support',
  }
]

export default function Team() {
  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title="Team - QuickUtils by Learnithm"
        description={pageDescription}
        path="/team"
        ogTitle="QuickUtils Team"
      ogDescription="Learn about Arulraj S, Learnithm, and the editorial and development standards behind QuickUtils."
      />

      {/* HERO */}
      <div className="bg-gradient-to-b from-primary/10 via-background to-background border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="text-sm font-semibold text-primary mb-3 tracking-wide">OUR TEAM</p>
          <h1 className="text-4xl font-bold mb-4">QuickUtils Team</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Built by a small focused team at {ORGANIZATION_NAME}, led by {FOUNDER_NAME},
            focused on tools that are simple, fast, and reliable.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14 space-y-10">

        {/* FOUNDER */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-7 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">Founder</h2>

          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p className="text-foreground font-semibold text-lg">{FOUNDER_NAME}</p>

            <p>
              {FOUNDER_NAME} is the founder of {ORGANIZATION_NAME} and leads QuickUtils. He created the platform after observing thousands of Indian competitive exam aspirants lose time and face rejections because of incorrect photo sizes, signature dimensions, and oversized certificate PDFs for portals like SSC, IBPS, RRB, TNPSC, and state PSCs.
            </p>

            <p>
              The focus is on two things: (1) accurate, private, browser-based tools that match official specifications exactly, and (2) educational content that explains the requirements, the math behind calculators, limitations, and verification steps so users understand results instead of blindly trusting them.
            </p>

            <p className="text-sm">
              <strong className="text-foreground">Key focus areas:</strong> Government exam document tools (photo resizers, PDF compressors with exact KB targets), India-specific financial calculators (EMI, PF, Gratuity, In-Hand Salary, GST), education calculators (CGPA, SGPA, attendance, percentage), and seller/logistics utilities.
            </p>

            <Link
              to="/author/arulraj-s"
              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              View author profile and full bio →
            </Link>
          </div>
        </section>

        {/* TEAM MEMBERS */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-7 shadow-sm">
          <h2 className="text-2xl font-semibold mb-6">Team Members</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="group rounded-xl border border-border/50 bg-background/50 p-5 hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <p className="font-semibold text-foreground group-hover:text-primary transition">
                  {member.name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {member.role}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ABOUT */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-7 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">About the Team</h2>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils is built around small, focused utilities and supporting educational content. The team prioritizes:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
            <li>• Clear, human-written explanations and real exam / real-life examples (especially for SSC, IBPS, RRB, TNPSC, UPSC aspirants)</li>
            <li>• Privacy-first browser processing for sensitive documents (photos, signatures, certificates, mark sheets)</li>
            <li>• Accurate formulas with visible assumptions and "verify with official source" reminders</li>
            <li>• Visible trust pages (Methodology, Editorial Policy, Corrections, full legal set)</li>
          </ul>
          <p className="mt-3 text-muted-foreground leading-relaxed text-sm">
            Every major tool page aims for 400–800+ words of original, useful content beyond the widget itself.
          </p>
        </section>

        {/* EDITORIAL */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-7 shadow-sm">
          <h2 className="text-2xl font-semibold mb-5">Editorial Standards</h2>

          <ul className="space-y-3 text-muted-foreground">
            {standards.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Link
              to="/editorial-policy"
              className="text-sm font-medium text-primary hover:underline"
            >
              Read Editorial Policy →
            </Link>
          </div>
        </section>

        {/* REVIEW PROCESS */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-7 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Content Review Process</h2>
          <p className="text-muted-foreground leading-relaxed">
            New and updated pages are reviewed for usefulness, clarity, internal links, disclaimers,
            and alignment with how the tool actually behaves. When a page covers calculations,
            exam requirements, job listings, or file processing, the review ensures users know what
            to verify and where uncertainty exists.
          </p>
        </section>

        {/* TOOL DEV */}
        <section className="rounded-2xl border border-border/60 bg-card/80 p-7 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Tool Development Process</h2>
          <p className="text-muted-foreground leading-relaxed">
            QuickUtils tools are designed around simple workflows: input, process, output.
            Each tool is tested with real-world examples, edge cases, and privacy expectations.
            The methodology explains formulas, validations, and update practices.
          </p>

          <div className="mt-6">
            <Link
              to="/methodology"
              className="text-sm font-medium text-primary hover:underline"
            >
              Read Methodology →
            </Link>
          </div>
        </section>

        {/* CONTACT */}
        <section className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/40 to-background p-7 shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Contact</h2>

          <p className="text-muted-foreground leading-relaxed mb-5">
            For corrections, tool issues, privacy concerns, accessibility feedback, or updates,
            reach out at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>

          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link to="/contact" className="text-primary hover:underline">
              Contact
            </Link>
            <Link to="/corrections-policy" className="text-primary hover:underline">
              Corrections
            </Link>
            <Link to="/accessibility" className="text-primary hover:underline">
              Accessibility
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
