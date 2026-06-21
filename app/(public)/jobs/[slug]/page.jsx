import JobDetailPage from '@/components/pages/jobs/JobDetailPage';
import { notFound } from 'next/navigation';
import { buildPageMetadata } from '@/lib/metadata';
import {
  buildJobJsonLd,
  getJobCanonical,
  getJobDescription,
  getServerJobBySlug,
  isStaleExpiredJob,
  isUsefulJob,
} from '@/lib/jobSeoData';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const job = await getServerJobBySlug(slug);

  if (!job || job.status !== 'published') {
    return buildPageMetadata({
      title: 'Job Not Found - QuickUtils',
      description: 'This QuickUtils job listing is unavailable or has been removed.',
      path: `/jobs/${encodeURIComponent(slug || '')}`,
      noindex: true,
      follow: false,
    });
  }

  return buildPageMetadata({
    title: job.seo_title || `${job.title} - QuickUtils Jobs`,
    description: getJobDescription(job),
    path: getJobCanonical(job),
    image: job.og_image,
    noindex: !isUsefulJob(job) || isStaleExpiredJob(job, 60),
    type: 'article',
  });
}

export default async function Page({ params }) {
  const { slug } = await params;
  const job = await getServerJobBySlug(slug);

  if (!job || job.status !== 'published') {
    notFound();
  }

  const schemas = buildJobJsonLd(job);

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={`${schema['@type']}-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <JobDetailPage slug={slug} initialJob={job} />
    </>
  );
}
