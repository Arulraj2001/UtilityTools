import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { usePageAnalytics } from '@/lib/analytics';
import { BmacFloatingButton } from '@/components/shared/BuyMeCoffee';
import CookieConsent from '@/components/shared/CookieConsent';

const SearchModal = React.lazy(() => import('../shared/SearchModal'));
const Footer = React.lazy(() => import('./Footer'));

/**
 * FooterSkeleton — reserves the exact layout space of the real Footer
 * to prevent CLS (Cumulative Layout Shift) when the lazy Footer chunk loads.
 *
 * Height values measured from the real Footer:
 *   - Desktop (lg): ~380px  (4-column grid + bottom bar)
 *   - Mobile:       ~520px  (stacked columns)
 *
 * Using min-height instead of fixed height so it still collapses cleanly
 * if the Footer renders faster than expected.
 */
function FooterSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="border-t border-border/50 bg-card/60"
      style={{ minHeight: 'clamp(380px, 40vw, 520px)' }}
    />
  );
}

export default function PublicLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  usePageAnalytics();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <main className="flex-1 py-2 my-10">
        <Outlet />
      </main>
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
      {/* Floating Buy Me a Coffee button — shown when enabled in Admin → Support */}
      <BmacFloatingButton />
      {/* GDPR-compliant cookie consent banner */}
      <CookieConsent />
    </div>);

}


