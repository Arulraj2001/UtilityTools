import AuthorPage from '@/components/pages/AuthorPage';
import { supabase } from '@/api/supabaseClient';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const { data } = await supabase
      .from('authors')
      .select('seo_title, seo_description, name, bio')
      .eq('slug', slug)
      .maybeSingle();

    if (data) {
      return {
        title: data.seo_title || data.name + ' - QuickUtils',
        description: data.seo_description || data.bio || '',
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
  return <AuthorPage />;
}
