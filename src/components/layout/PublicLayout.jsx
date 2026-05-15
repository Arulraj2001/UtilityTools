import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import SearchModal from '../shared/SearchModal';

export default function PublicLayout() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />
      <main className="flex-1 py-2 my-10">
        <Outlet />
      </main>
      <Footer />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>);

}