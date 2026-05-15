import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { 
  LayoutDashboard, Wrench, BookOpen, FolderOpen,
  Settings, LinkIcon, Megaphone, Download,
  ChevronLeft, ChevronRight, Menu, LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/admin/tools', label: 'Tools', icon: Wrench },
  { to: '/admin/seeder', label: 'Tool Seeder', icon: Download },
  { to: '/admin/blog', label: 'Blog Posts', icon: BookOpen },
  { to: '/admin/blog-categories', label: 'Blog Categories', icon: FolderOpen },
  { to: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { to: '/admin/ads', label: 'Ads', icon: Megaphone },
  { to: '/admin/redirects', label: 'Redirects', icon: LinkIcon },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

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
            <Link to="/admin" className="flex items-center gap-2">
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
          {navItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive(item)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <Link to="/" className={`flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ${collapsed ? 'justify-center' : ''}`}>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}