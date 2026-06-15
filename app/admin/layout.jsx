'use client';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminLayoutComponent from '@/components/admin/AdminLayout';

function RedirectToLogin() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);
  return null;
}

export default function Layout({ children }) {
  return (
    <ProtectedRoute unauthenticatedElement={<RedirectToLogin />}>
      <AdminLayoutComponent>{children}</AdminLayoutComponent>
    </ProtectedRoute>
  );
}
