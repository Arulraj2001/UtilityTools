import JobsCategoryPage from '@/components/pages/jobs/JobsCategoryPage';
import { supabase } from '@/api/supabaseClient';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const { data } = await supabase
      .from('job_categories')
      .select('seo_title, seo_description, name, description')
      .eq('slug', slug)
      .maybeSingle();

    if (data) {
      return {
        title: data.seo_title || data.name + ' - QuickUtils',
        description: data.seo_description || data.description || '',
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
  return <JobsCategoryPage />;
}
