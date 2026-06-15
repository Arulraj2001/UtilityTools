import BlogPostPage from '@/components/pages/BlogPostPage';
import { supabase } from '@/api/supabaseClient';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const { data } = await supabase
      .from('blog_posts')
      .select('seo_title, seo_description, title, excerpt')
      .eq('slug', slug)
      .maybeSingle();

    if (data) {
      return {
        title: data.seo_title || data.title + ' - QuickUtils',
        description: data.seo_description || data.excerpt || '',
      };
    }
  } catch (err) {
    // Fallback
  }
  return {
    title: 'QuickUtils',
  };
}

export default function Page() {
  return <BlogPostPage />;
}
