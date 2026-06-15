import React, { Suspense } from 'react';
import Disclaimer from '@/components/pages/Disclaimer';

export const metadata = {
  title: 'Disclaimer - QuickUtils',
  description: 'Read the disclaimer regarding the accuracy and validation of our tool outputs.',
};

export default function Page() {
  return (
    
      <Disclaimer />
    
  );
}
