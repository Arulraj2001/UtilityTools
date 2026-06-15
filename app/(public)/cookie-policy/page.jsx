import React, { Suspense } from 'react';
import CookiePolicy from '@/components/pages/CookiePolicy';

export const metadata = {
  title: 'Cookie Policy - QuickUtils',
  description: 'Understand how we use cookies and tracking technologies to improve your experience.',
};

export default function Page() {
  return (
    
      <CookiePolicy />
    
  );
}
