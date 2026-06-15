import React, { Suspense } from 'react';
import CategoriesList from '@/components/pages/CategoriesList';

export const metadata = {
  title: 'Categories - QuickUtils',
  description: 'Browse all categories of online tools: PDF, image, calculation, logistics, development, and more.',
};

export default function Page() {
  return (
    
      <CategoriesList />
    
  );
}
