import JobsListPage from '@/components/pages/jobs/JobsListPage';
import { buildPageMetadata } from '@/lib/metadata';
import { getServerJobsShellData } from '@/lib/jobSeoData';
import { robotsForSearchParams } from '@/lib/indexation';

const jobsDescription =
  'Browse curated QuickUtils job listings, internships, fresher opportunities, and government openings with application-support tools and source review standards.';

const normalizeSearchParams = async (searchParams) => {
  const resolved = await searchParams;
  return resolved || {};
};

const toQueryString = (params = {}) => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value !== undefined && value !== null && value !== '') {
      query.set(key, value);
    }
  });
  return query.toString();
};

const hasSearchFilters = (params = {}) => Object.keys(params).length > 0;

export async function generateMetadata({ searchParams }) {
  const params = await normalizeSearchParams(searchParams);
  const shellData = await getServerJobsShellData();
  const noindex = shellData.jobs.length === 0 || robotsForSearchParams(params).includes('noindex');

  return buildPageMetadata({
    title: 'Jobs, Internships and Government Openings - QuickUtils',
    description: jobsDescription,
    path: '/jobs',
    noindex,
  });
}

export default async function Page({ searchParams }) {
  const params = await normalizeSearchParams(searchParams);
  const shellData = await getServerJobsShellData();

  return (
    <JobsListPage
      initialJobs={shellData.jobs}
      initialFeatured={shellData.featured}
      initialCategories={shellData.categories}
      initialSearchParams={{
        category: params.category || '',
        queryString: toQueryString(params),
        hasFilters: hasSearchFilters(params),
      }}
    />
  );
}
