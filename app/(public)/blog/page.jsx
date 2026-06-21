import BlogList from '@/components/pages/BlogList';
import { buildPageMetadata } from '@/lib/metadata';
import { getServerBlogShellData } from '@/lib/blogPostSeo';
import { robotsForSearchParams } from '@/lib/indexation';

const blogDescription =
  'Helpful QuickUtils guides for calculators, PDF tools, image tools, text tools, developer utilities, and practical productivity workflows.';

const normalizeSearchParams = async (searchParams) => {
  const resolved = await searchParams;
  return resolved || {};
};

const hasSearchFilters = (params = {}) => Object.keys(params).length > 0;

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

export async function generateMetadata({ searchParams }) {
  const params = await normalizeSearchParams(searchParams);
  const shellData = await getServerBlogShellData();
  const noindex = shellData.posts.length === 0 || robotsForSearchParams(params).includes('noindex');

  return buildPageMetadata({
    title: 'QuickUtils Guides',
    description: blogDescription,
    path: '/blog',
    noindex,
  });
}

export default async function Page({ searchParams }) {
  const params = await normalizeSearchParams(searchParams);
  const shellData = await getServerBlogShellData();
  const initialTags = params.tag
    ? Array.isArray(params.tag)
      ? params.tag
      : [params.tag]
    : [];

  return (
    <BlogList
      initialPosts={shellData.posts}
      initialCategories={shellData.categories}
      initialSearchParams={{
        category: params.category || '',
        tags: initialTags,
        queryString: toQueryString(params),
        hasFilters: hasSearchFilters(params),
      }}
    />
  );
}
