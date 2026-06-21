import CategoriesList from '@/components/pages/CategoriesList';
import { fetchSupabaseRows } from '@/lib/serverSupabaseData';
import { getLocalCategories, getLocalTools } from '@/lib/localCatalogFallback';

async function getCategoriesPageData() {
  const [remoteTools, remoteCategories] = await Promise.all([
    fetchSupabaseRows('tools', {
      select: 'id,name,slug,description,category_id,category_slug,status',
      status: 'eq.published',
      order: 'created_at.desc',
      limit: 500,
    }),
    fetchSupabaseRows('categories', {
      select: '*',
      order: 'sort_order.asc',
      limit: 50,
    }),
  ]);

  const [localTools, localCategories] = await Promise.all([
    remoteTools.length ? Promise.resolve([]) : getLocalTools({ limit: 500 }),
    remoteCategories.length ? Promise.resolve([]) : getLocalCategories({ limit: 50 }),
  ]);

  return {
    tools: remoteTools.length ? remoteTools : localTools,
    categories: remoteCategories.length ? remoteCategories : localCategories,
  };
}

export default async function Page() {
  const { tools, categories } = await getCategoriesPageData();

  return (
    <CategoriesList
      initialTools={tools}
      initialCategories={categories}
    />
  );
}
