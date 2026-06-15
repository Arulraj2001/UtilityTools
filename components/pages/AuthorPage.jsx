'use client';
import React from 'react'
import Link from 'next/link';
import { useParams } from 'next/navigation';
import StaticPageSEO, { SITE_URL, buildBreadcrumbSchema } from '@/components/seo/StaticPageSEO'
import { getAuthorBySlug } from '@/lib/authors'
import { ORGANIZATION_NAME, organizationSchema } from '@/config/site'
import PageNotFound from '@/lib/PageNotFound'

const expertise = [
  {
    title: 'Educational Tools',
    text: 'Designing calculators and document helpers that students and applicants can use with clear assumptions and verification notes.',
  },
  {
    title: 'Software Development',
    text: 'Building browser-based utilities, validation flows, and practical web interfaces for repeatable digital tasks.',
  },
  {
    title: 'AI Tools',
    text: 'Using AI-assisted workflows carefully, with human review and source checks before content is published.',
  },
  {
    title: 'Web Applications',
    text: 'Creating lightweight web applications focused on speed, clarity, privacy-aware processing, and accessible use.',
  },
]

export default function AuthorPage() {
  const { slug } = useParams()
  const author = getAuthorBySlug(slug)

  if (!author) return (
    <PageNotFound
      title="Author not found"
      message="The requested author profile is unavailable."
      primaryHref="/team"
      primaryLabel="View the QuickUtils team"
    />
  )

  const pageUrl = `${SITE_URL}/author/${author.slug}`
  const description =
    `${author.name} is ${author.title} and works on educational tools, software development, AI tools, and web applications for QuickUtils.`

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    url: pageUrl,
    jobTitle: author.title,
    worksFor: {
      '@type': 'Organization',
      name: ORGANIZATION_NAME,
      url: SITE_URL,
    },
    knowsAbout: author.expertise,
  }

  const profilePageSchema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${author.name} - Author Profile`,
    url: pageUrl,
    description,
    publisher: organizationSchema,
    mainEntity: personSchema,
  }

  return (
    <div className="min-h-screen bg-background">
      <StaticPageSEO
        title={`${author.name} - Author Profile | QuickUtils`}
        description={description}
        path={`/author/${author.slug}`}
        ogTitle={`${author.name} - QuickUtils Author`}
        ogDescription={description}
        jsonLd={[
          personSchema,
          profilePageSchema,
          buildBreadcrumbSchema([
            { name: 'Home', url: `${SITE_URL}/` },
            { name: 'Team', url: `${SITE_URL}/team` },
            { name: author.name, url: pageUrl },
          ]),
        ]}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <header className="mb-10">
          <p className="text-sm font-semibold text-primary mb-3">Author</p>
          <h1 className="text-3xl font-bold mb-3">{author.name}</h1>
          <p className="text-primary font-medium mb-4">{author.title}</p>
          <p className="text-muted-foreground leading-relaxed text-lg">{author.bio}</p>
        </header>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Biography</h2>
          <p className="text-muted-foreground leading-relaxed">
            {author.name} leads QuickUtils under {ORGANIZATION_NAME}. His role covers tool
            planning, content quality, review standards, and practical user workflows. The goal
            is to make online utilities easier to understand, easier to verify, and safer to use
            for everyday tasks.
          </p>
        </section>

        <section className="rounded-lg border border-border/60 bg-card/80 p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-5">Expertise</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {expertise.map((item) => (
              <div key={item.title} className="rounded-lg border border-border/60 bg-background p-4">
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border/60 bg-muted/40 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold mb-4">Related Standards</h2>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link href="/team" className="text-primary hover:underline">Team</Link>
            <Link href="/methodology" className="text-primary hover:underline">Methodology</Link>
            <Link href="/editorial-policy" className="text-primary hover:underline">Editorial Policy</Link>
            <Link href="/corrections-policy" className="text-primary hover:underline">Corrections Policy</Link>
          </div>
        </section>
      </div>
    </div>
  )
}
