'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  Menu,
  X,
  Moon,
  Sun,
  Home,
  LayoutGrid,
  Wrench,
  BookOpen,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useDarkMode } from '@/lib/useDarkMode';

export default function Navbar({ onSearchOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isDark, toggle } = useDarkMode();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navLinks = [
    {
      to: '/tools',
      label: 'Tools',
      icon: Wrench,
    },
    {
      to: '/categories',
      label: 'Categories',
      icon: LayoutGrid,
    },
    {
      to: '/blog',
      label: 'Blog',
      icon: BookOpen,
    },
    {
      to: '/jobs',
      label: 'Jobs',
      icon: LayoutGrid,
    },
    {
      to: '/about',
      label: 'About',
      icon: Info,
    },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'glass shadow-lg py-2 border-b border-border/30'
            : 'bg-background/80 backdrop-blur-md py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" aria-label="QuickUtils home" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:shadow-primary/30 transition-shadow">
                <Wrench className="w-5 h-5 text-white" />
              </div>

              <span className="font-bold text-xl tracking-tight transition-opacity group-hover:opacity-90">
                <span className="gradient-text">Quick</span>
                <span className="text-foreground">Utils</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    href={link.to}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                      isActive
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {/* Right Side Buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onSearchOpen}
                aria-label="Search tools"
                title="Search tools (Ctrl+K)"
                className="rounded-xl h-11 w-11 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <Search className="w-5 h-5" />
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Currently dark mode — switch to light' : 'Currently light mode — switch to dark'}
                className="rounded-xl h-11 w-11 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              {/* Home — use asChild to avoid invalid a>button nesting */}
              <Button
                asChild
                variant="ghost"
                size="icon"
                aria-label="Go to homepage"
                className="rounded-xl h-11 w-11 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <Link href="/"><Home className="w-5 h-5" /></Link>
              </Button>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                className="md:hidden rounded-xl h-11 w-11 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary/50"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="fixed top-20 left-0 right-0 z-40 px-4 md:hidden transition-opacity duration-200 opacity-100">
          <div className="bg-background/95 backdrop-blur-xl border rounded-2xl shadow-2xl p-4 flex flex-col gap-2">
            <p className="px-4 pb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground select-none">
              Menu
            </p>
            {navLinks.map((link, index) => {
              const isActive = pathname.startsWith(link.to);
              const isLast = index === navLinks.length - 1;
              return (
                <React.Fragment key={link.to}>
                  <Link
                    href={link.to}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:outline-none ${
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                  {!isLast && (
                    <div className="border-b border-border/30 mx-2" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
