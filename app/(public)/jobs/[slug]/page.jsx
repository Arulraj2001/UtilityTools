import JobDetailPage from '@/components/pages/jobs/JobDetailPage';
import { supabase } from '@/api/supabaseClient';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const { data } = await supabase
      .from('jobs')
      .select('seo_title, seo_description, title, short_description')
      .eq('slug', slug)
      .maybeSingle();

    if (data) {
      return {
        title: data.seo_title || data.title + ' - QuickUtils',
        description: data.seo_description || data.short_description || '',
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
  return <JobDetailPage />;
}
