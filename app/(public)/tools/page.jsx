import React, { Suspense } from 'react';
import ToolsList from '@/components/pages/ToolsList';

export const metadata = {
  title: 'All Tools - QuickUtils',
  description: 'Browse all free online tools organized by practical categories like PDF, image, calculator, developer, and business.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ToolsList />
    </Suspense>
  );
}
