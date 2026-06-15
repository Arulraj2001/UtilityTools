'use client';
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { AuthProvider } from '@/lib/AuthContext';
import { SiteThemeSettings } from '@/lib/useSiteThemeSettings';
import { SiteSettingsProvider } from '@/lib/SiteSettingsProvider';

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <SiteThemeSettings />
        <SiteSettingsProvider />
        {children}
      </QueryClientProvider>
    </AuthProvider>
  );
}
