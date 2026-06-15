import React, { Suspense } from 'react';
import WorkflowListPage from '@/components/pages/WorkflowListPage';

export const metadata = {
  title: 'Workflows - QuickUtils',
  description: 'Follow step-by-step guides to complete complex tasks using multiple connected tools.',
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <WorkflowListPage />
    </Suspense>
  );
}
