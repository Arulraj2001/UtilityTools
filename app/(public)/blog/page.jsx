import React, { Suspense } from 'react';
import BlogList from '@/components/pages/BlogList';

export const metadata = {
  title: 'Guides & Articles - QuickUtils',
  description: 'Read guides, how-tos, and explanations for PDF, image, developer, SEO, and business tasks.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <BlogList />
    </Suspense>
  );
}
