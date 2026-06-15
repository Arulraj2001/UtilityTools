'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, Wrench, BookOpen, FolderOpen,
  Settings, LinkIcon, Megaphone, Download, Sparkles,
  ChevronLeft, ChevronRight, Menu, LogOut, FileUp,
  Brain, Search, Shield, Copy, BarChart3, Activity,
  GitCompare, Globe, ChevronDown, ServerCog, Coffee,
  ScanSearch, Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSiteSettings } from '@/api/supabaseApi';

// Existing nav items
const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/tools', label: 'Tools', icon: Wrench },
  { to: '/admin/seeder', label: 'Tool Seeder', icon: Download },
  { to: '/admin/tool-seo-import', label: 'Tool SEO Import', icon: FileUp },
  { to: '/admin/blog', label: 'Blog Posts', icon: BookOpen },
  { to: '/admin/blog-import', label: 'Blog Import', icon: FileUp },
  { to: '/admin/media', label: 'Media Library', icon: Image },
  { to: '/admin/jobs', label: 'Jobs', icon: FolderOpen },
  { to: '/admin/job-categories', label: 'Job Categories', icon: FolderOpen },
  { to: '/admin/blog-categories', label: 'Blog Categories', icon: FolderOpen },
  { to: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { to: '/admin/workflow-pages', label: 'Workflow Pages', icon: Sparkles },
  { to: '/admin/ads', label: 'Ads', icon: Megaphone },
  { to: '/admin/redirects', label: 'Redirects', icon: LinkIcon },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/site-settings', label: 'SEO & Verification', icon: ScanSearch },
  { to: '/admin/support', label: 'Support / BMAC', icon: Coffee },
];

// AI Job Intelligence sub-nav
const aiNavItems = [
  { to: '/admin/ai-intelligence', label: 'Dashboard',          icon: Brain },
  { to: '/admin/ai-research',     label: 'Research Queue',     icon: Search },
  { to: '/admin/ai-moderation',   label: 'AI Moderation',      icon: Shield },
  { to: '/admin/ai-duplicates',   label: 'Duplicate Detection',icon: Copy },
  { to: '/admin/ai-seo-audit',    label: 'SEO Audit',          icon: BarChart3 },
  { to: '/admin/ai-monitoring',   label: 'Vacancy Monitoring', icon: Activity },
  { to: '/admin/ai-updates',      label: 'Job Updates',        icon: GitCompare },
  { to: '/admin/ai-sources',      label: 'Source Management',  icon: Globe },
  { to: '/admin/ai-settings',     label: 'AI Settings',        icon: Settings },
  { to: '/admin/ai-prompts',      label: 'Prompt Management',  icon: BookOpen },
  { to: '/admin/ai-reports',      label: 'Quality Reports',    icon: BarChart3 },
  { to: '/admin/ai-scale-ops',    label: 'Scale Operations',   icon: ServerCog },
];

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const pathname = usePathname();
  const { logout } = useAuth();

  const { data: siteSettings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSiteSettings(),
    staleTime: 1000 * 60 * 5,
  });

  const getSetting = (key, fallback) => {
    const s = siteSettings.find(x => x.key === key);
    if (!s) return fallback;
    if (s.type === 'boolean') return String(s.value) === 'true';
    return s.value || fallback;
  };

  const bmacEnabled = getSetting('bmac_enabled', false);
  const bmacSidebarEnabled = getSetting('bmac_sidebar_enabled', true);
  const bmacUsername = getSetting('bmac_username', '');
  const bmacEmoji = getSetting('bmac_emoji', '☕');
  const bmacText = getSetting('bmac_text', 'Buy me a coffee');
  const bmacColor = getSetting('bmac_color', '#FFDD00');

  const showBmacSidebar = bmacEnabled && bmacSidebarEnabled && bmacUsername;

  const isActive = (item) => {
    if (item.exact) return pathname === item.to;
    return pathname.startsWith(item.to);
  };

  // Auto-expand AI section when on an AI route
  const isOnAiRoute = pathname.startsWith('/admin/ai');
  const aiSectionOpen = aiExpanded || isOnAiRoute;

  const navLinkClass = (active) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      active
        ? 'bg-primary/10 text-primary'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
    } ${collapsed ? 'justify-center' : ''}`;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 h-screen z-50 bg-card border-r border-border transition-all duration-300 flex flex-col
        ${collapsed ? 'w-16' : 'w-60'}
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 flex items-center justify-between border-b border-border">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Wrench className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-sm">Admin</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-7 w-7"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {/* ── Existing nav items (unchanged) ── */}
          {navItems.map(item => (
            <Link
              key={item.to}
              href={item.to}
              onClick={() => setMobileOpen(false)}
              className={navLinkClass(isActive(item))}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}

          {/* ── AI Job Intelligence section ── */}
          <div className="pt-1">
            {/* Section toggle button */}
            <button
              onClick={() => setAiExpanded(!aiSectionOpen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isOnAiRoute
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Brain className="w-4 h-4 shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">AI Intelligence</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${aiSectionOpen ? 'rotate-180' : ''}`} />
                </>
              )}
            </button>

            {/* Sub-items */}
            {aiSectionOpen && !collapsed && (
              <div className="ml-3 mt-0.5 border-l border-border/60 pl-2 space-y-0.5">
                {aiNavItems.map(item => (
                  <Link
                    key={item.to}
                    href={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      pathname === item.to
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Collapsed state: show AI icon only */}
            {aiSectionOpen && collapsed && (
              <div className="space-y-0.5 mt-0.5">
                {aiNavItems.map(item => (
                  <Link
                    key={item.to}
                    href={item.to}
                    onClick={() => setMobileOpen(false)}
                    title={item.label}
                    className={`flex items-center justify-center w-full py-2 rounded-lg transition-all ${
                      pathname === item.to
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          {/* Buy Me a Coffee sidebar button */}
          {showBmacSidebar && (
            <a
              href={`https://www.buymeacoffee.com/${bmacUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              title={bmacText}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 ${collapsed ? 'justify-center' : ''}`}
              style={{ backgroundColor: bmacColor, color: '#000' }}
            >
              <span className="text-base shrink-0">{bmacEmoji}</span>
              {!collapsed && <span className="truncate">{bmacText}</span>}
            </a>
          )}

          <Link
            href="/"
            className={`flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <ChevronLeft className="w-4 h-4" />
            {!collapsed && 'Back to site'}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className={`w-full justify-start gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && 'Logout'}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
        </header>
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
