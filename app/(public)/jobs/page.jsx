import React, { Suspense } from 'react';
import JobsListPage from '@/components/pages/jobs/JobsListPage';

export const metadata = {
  title: 'Government Jobs Board - QuickUtils',
  description: 'Find latest government exam notifications, job listings, and qualifications details.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <JobsListPage />
    </Suspense>
  );
}
