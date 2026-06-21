import { notFound } from 'next/navigation';
import BlogPostPage from '@/components/pages/BlogPostPage';
import { DEFAULT_IMAGE, SITE_NAME, SITE_URL } from '@/config/site';
import {
  getBlogJsonLd,
  getBlogPostCanonical,
  getBlogPostDescription,
  getBlogPostRobots,
  getServerBlogPostBySlug,
  getServerBlogShellData,
  getServerBlogStaticParams,
  shouldNoIndexBlogPost,
} from '@/lib/blogPostSeo';

export const dynamicParams = true;
export const revalidate = 3600;

const getSlug = async (params) => {
  const resolvedParams = await params;
  return String(resolvedParams?.slug || '');
};

export async function generateStaticParams() {
  return getServerBlogStaticParams();
}

export async function generateMetadata({ params }) {
  const slug = await getSlug(params);
  const post = await getServerBlogPostBySlug(slug);

  if (!post) {
    return {
      title: 'Article not found - QuickUtils',
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const title = post.seo_title || `${post.title} - QuickUtils`;
  const description = getBlogPostDescription(post);
  const canonical = getBlogPostCanonical(post);
  const noindex = shouldNoIndexBlogPost(post);
  const robots = getBlogPostRobots(post);
  const image = post.featured_image || post.og_image || DEFAULT_IMAGE;
  const authorName = post.author_name || 'Arulraj S';

  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    keywords: post.seo_keywords || undefined,
    alternates: {
      canonical,
    },
    robots: {
      index: !noindex,
      follow: !robots.includes('nofollow'),
    },
    openGraph: {
      type: 'article',
      title: post.og_title || title,
      description: post.og_description || description,
      url: canonical,
      siteName: SITE_NAME,
      images: [image],
      publishedTime: post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      authors: [authorName],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.twitter_title || post.og_title || title,
      description: post.twitter_description || post.og_description || description,
      images: [image],
    },
  };
}

export default async function Page({ params }) {
  const slug = await getSlug(params);
  const post = await getServerBlogPostBySlug(slug);

  if (!post) notFound();

  const shellData = await getServerBlogShellData();
  const jsonLd = getBlogJsonLd(post);

  return (
    <>
      <script
        id="article-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.article) }}
      />
      <script
        id="breadcrumb-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.breadcrumb) }}
      />
      {jsonLd.faq && (
        <script
          id="faq-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd.faq) }}
        />
      )}
      <BlogPostPage
        slug={slug}
        initialPost={post}
        initialPosts={shellData.posts}
        initialCategories={shellData.categories}
        initialTools={shellData.tools}
        initialToolCategories={shellData.toolCategories}
      />
    </>
  );
}
