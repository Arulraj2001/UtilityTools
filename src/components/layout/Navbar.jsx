import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useDarkMode } from '@/lib/useDarkMode';

export default function Navbar({ onSearchOpen }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { isDark, toggle } = useDarkMode();
  const location = useLocation();

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
  }, [location.pathname]);

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
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'glass shadow-lg py-2'
            : 'bg-background/80 backdrop-blur-md py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:shadow-primary/30 transition-shadow">
                <Wrench className="w-5 h-5 text-white" />
              </div>

              <span className="font-bold text-xl tracking-tight">
                <span className="gradient-text">Tool</span>
                <span className="text-foreground">Hub</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    location.pathname.startsWith(link.to)
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right Side Buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Search */}
              <Button
                variant="ghost"
                size="icon"
                onClick={onSearchOpen}
                className="rounded-xl h-11 w-11 flex items-center justify-center"
              >
                <Search className="w-5 h-5" />
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggle}
                className="rounded-xl h-11 w-11 flex items-center justify-center"
              >
                {isDark ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </Button>

              {/* Home */}
              <Link to="/">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl h-11 w-11 flex items-center justify-center"
                >
                  <Home className="w-5 h-5" />
                </Button>
              </Link>

              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-xl h-11 w-11 flex items-center justify-center"
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
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  location.pathname.startsWith(link.to)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}