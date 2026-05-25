import React, { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { usePageAnalytics } from '@/lib/analytics';

const SearchModal = React.lazy(() => import('../shared/SearchModal'));

export default function PublicLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  usePageAnalytics();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <main className="flex-1 py-2 my-10">
        <Outlet />
      </main>
      <Footer />
      {searchOpen && (
        <Suspense fallback={null}>
          <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
        </Suspense>
      )}
    </div>);

}