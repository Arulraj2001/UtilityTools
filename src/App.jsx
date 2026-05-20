import React, { lazy, Suspense, useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { useSupabaseRealtime } from '@/lib/useSupabaseRealtime'
import UserNotRegisteredError from '@/components/UserNotRegisteredError'
import ProtectedRoute from '@/components/ProtectedRoute'
import SplashScreen from '@/components/SplashScreen'
import { initializePdfWorker } from '@/lib/pdfWorkerSetup'

// Initialize PDF.js worker for all PDF operations
initializePdfWorker()

// Layouts
import PublicLayout from './components/layout/PublicLayout'
import BackgroundLighting from './components/layout/BackgroundLighting'
import ScrollToTop from './components/layout/ScrollToTop'

// Public pages
import Home from './pages/Home'
const ToolsList = lazy(() => import('./pages/ToolsList'))
const ToolPage = lazy(() => import('./pages/ToolPage'))
const CategoriesList = lazy(() => import('./pages/CategoriesList'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const BlogList = lazy(() => import('./pages/BlogList'))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Login = lazy(() => import('./pages/Login'))

// Admin pages
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminTools = lazy(() => import('./pages/admin/AdminTools'))
const AdminBlog = lazy(() => import('./pages/admin/AdminBlog'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'))
const AdminBlogCategories = lazy(() => import('./pages/admin/AdminBlogCategories'))
const AdminAds = lazy(() => import('./pages/admin/AdminAds'))
const AdminRedirects = lazy(() => import('./pages/admin/AdminRedirects'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminToolSeeder = lazy(() => import('./pages/admin/AdminToolSeeder'))
const AdminWorkflowPages = lazy(() => import('./pages/admin/AdminWorkflowPages'))
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'))
const WorkflowListPage = lazy(() => import('./pages/WorkflowListPage'))
const PageNotFound = lazy(() => import('./lib/PageNotFound'))

const RouteFallback = () => (
  <div className="min-h-[55vh] flex items-center justify-center bg-background">
    <p className="text-sm text-muted-foreground">Loading page…</p>
  </div>
)

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  useSupabaseRealtime(isAdminRoute);

  const wrap = (element) => <Suspense fallback={<RouteFallback />}>{element}</Suspense>;

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/tools" element={wrap(<ToolsList />)} />
        <Route path="/tool/:slug" element={wrap(<ToolPage />)} />
        <Route path="/categories" element={wrap(<CategoriesList />)} />
        <Route path="/category/:slug" element={wrap(<CategoryPage />)} />
        <Route path="/blog" element={wrap(<BlogList />)} />
        <Route path="/blog/:slug" element={wrap(<BlogPostPage />)} />
        <Route path="/workflow" element={wrap(<WorkflowListPage />)} />
        <Route path="/workflow/:slug" element={wrap(<WorkflowPage />)} />
        <Route path="/about" element={wrap(<About />)} />
        <Route path="/contact" element={wrap(<Contact />)} />
        <Route path="/privacy" element={wrap(<Privacy />)} />
        <Route path="/terms" element={wrap(<Terms />)} />
        <Route path="/login" element={wrap(<Login />)} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={wrap(<AdminLayout />)}>
          <Route index element={wrap(<AdminDashboard />)} />
          <Route path="tools" element={wrap(<AdminTools />)} />
          <Route path="blog" element={wrap(<AdminBlog />)} />
          <Route path="blog-categories" element={wrap(<AdminBlogCategories />)} />
          <Route path="categories" element={wrap(<AdminCategories />)} />
          <Route path="workflow-pages" element={wrap(<AdminWorkflowPages />)} />
          <Route path="ads" element={wrap(<AdminAds />)} />
          <Route path="redirects" element={wrap(<AdminRedirects />)} />
          <Route path="settings" element={wrap(<AdminSettings />)} />
          <Route path="seeder" element={wrap(<AdminToolSeeder />)} />
        </Route>
      </Route>

      <Route path="*" element={wrap(<PageNotFound />)} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <SplashScreen duration={800} />
        <Router>
          <BackgroundLighting />
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App