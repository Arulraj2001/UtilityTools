import React, { Suspense } from 'react';
import Home from '@/components/pages/Home';

export const metadata = {
  title: 'QuickUtils - Free Online Tools for PDFs, Images, Calculators',
  description: 'QuickUtils is a free online tools website for everyday PDF, image, calculator, text, developer, SEO, student, and business tasks.',
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export default function Page() {
  return (
    
      <Home />
    
  );
}
