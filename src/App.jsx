import React, { lazy, Suspense, useEffect, useState } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { useSupabaseRealtime } from '@/lib/useSupabaseRealtime'
import UserNotRegisteredError from '@/components/UserNotRegisteredError'
import ProtectedRoute from '@/components/ProtectedRoute'

// Layouts (structural — must stay eager)
import PublicLayout from './components/layout/PublicLayout'
import ScrollToTop from './components/layout/ScrollToTop'
import { SiteThemeSettings } from '@/lib/useSiteThemeSettings'

// SplashScreen: only shows on first visit — lazy is safe
const SplashScreen = lazy(() => import('@/components/SplashScreen'))
// Home: largest page — lazy to remove lucide-react icons from critical chunk
const Home = lazy(() => import('./pages/Home'))
const ToolsList = lazy(() => import('./pages/ToolsList'))
const ToolPage = lazy(() => import('./pages/ToolPage'))
const CategoriesList = lazy(() => import('./pages/CategoriesList'))
const CategoryPage = lazy(() => import('./pages/CategoryPage'))
const BlogList = lazy(() => import('./pages/BlogList'))
const BlogPostPage = lazy(() => import('./pages/BlogPostPage'))
const JobsListPage = lazy(() => import('./pages/jobs/JobsListPage'))
const JobDetailPage = lazy(() => import('./pages/jobs/JobDetailPage'))
const JobsCategoryPage = lazy(() => import('./pages/jobs/JobsCategoryPage'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Disclaimer = lazy(() => import('./pages/Disclaimer'))
const EditorialPolicy = lazy(() => import('./pages/EditorialPolicy'))
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'))
const Team = lazy(() => import('./pages/Team'))
const AuthorPage = lazy(() => import('./pages/AuthorPage'))
const Methodology = lazy(() => import('./pages/Methodology'))
const CorrectionsPolicy = lazy(() => import('./pages/CorrectionsPolicy'))
const Accessibility = lazy(() => import('./pages/Accessibility'))
const JobSourcesPolicy = lazy(() => import('./pages/JobSourcesPolicy'))
const Login = lazy(() => import('./pages/Login'))

// Admin pages
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminTools = lazy(() => import('./pages/admin/AdminTools'))
const AdminToolSeoImport = lazy(() => import('./pages/admin/AdminToolSeoImport'))
const AdminBlog = lazy(() => import('./pages/admin/AdminBlog'))
const AdminBlogImport = lazy(() => import('./pages/admin/AdminBlogImport'))
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'))
const AdminBlogCategories = lazy(() => import('./pages/admin/AdminBlogCategories'))
const AdminJobCategories = lazy(() => import('./pages/admin/AdminJobCategories'))
const AdminAds = lazy(() => import('./pages/admin/AdminAds'))
const AdminRedirects = lazy(() => import('./pages/admin/AdminRedirects'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))
const AdminToolSeeder = lazy(() => import('./pages/admin/AdminToolSeeder'))
const AdminWorkflowPages = lazy(() => import('./pages/admin/AdminWorkflowPages'))
const AdminSupport = lazy(() => import('./pages/admin/AdminSupport'))
const AdminJobs = lazy(() => import('./pages/admin/jobs/AdminJobs'))
// AI Job Intelligence
const AiDashboard  = lazy(() => import('./pages/admin/ai/AiDashboard'))
const AiResearch   = lazy(() => import('./pages/admin/ai/AiResearchQueue'))
const AiModeration = lazy(() => import('./pages/admin/ai/AiModeration'))
const AiDuplicates = lazy(() => import('./pages/admin/ai/AiDuplicates'))
const AiSeoAudit   = lazy(() => import('./pages/admin/ai/AiSeoAudit'))
const AiMonitoring = lazy(() => import('./pages/admin/ai/AiMonitoring'))
const AiJobUpdates = lazy(() => import('./pages/admin/ai/AiJobUpdates'))
const AiSources    = lazy(() => import('./pages/admin/ai/AiSources'))
const AiSettings   = lazy(() => import('./pages/admin/ai/AiSettings'))
const AiPrompts    = lazy(() => import('./pages/admin/ai/AiPrompts'))
const AiReports    = lazy(() => import('./pages/admin/ai/AiReports'))
const AiScaleOps   = lazy(() => import('./pages/admin/ai/AiScaleOps'))
const WorkflowPage = lazy(() => import('./pages/WorkflowPage'))
const WorkflowListPage = lazy(() => import('./pages/WorkflowListPage'))
const PageNotFound = lazy(() => import('./lib/PageNotFound'))
const BackgroundLighting = lazy(() => import('./components/layout/BackgroundLighting'))

const RouteFallback = () => (
  <div className="min-h-[55vh] flex items-center justify-center bg-background">
    <p className="text-sm text-muted-foreground">Loading page…</p>
  </div>
)

const AuthenticatedApp = () => {
  const location = useLocation();
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const shouldEnableRealtime = !isLoadingAuth && !isLoadingPublicSettings && !authError && isAdminRoute;

  useSupabaseRealtime(shouldEnableRealtime);

  // Only block rendering for admin routes while auth is loading.
  // Public routes render immediately; auth resolves in the background.
  if (isAdminRoute && isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (authError && isAdminRoute) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (isAdminRoute && authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

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
        <Route path="/jobs" element={wrap(<JobsListPage />)} />
        <Route path="/jobs/category/:slug" element={wrap(<JobsCategoryPage />)} />
        <Route path="/jobs/:slug" element={wrap(<JobDetailPage />)} />
        <Route path="/workflow" element={wrap(<WorkflowListPage />)} />
        <Route path="/workflow/:slug" element={wrap(<WorkflowPage />)} />
        <Route path="/about" element={wrap(<About />)} />
        <Route path="/contact" element={wrap(<Contact />)} />
        <Route path="/privacy" element={wrap(<Privacy />)} />
        <Route path="/terms" element={wrap(<Terms />)} />
        <Route path="/disclaimer" element={wrap(<Disclaimer />)} />
        <Route path="/cookie-policy" element={wrap(<CookiePolicy />)} />
        <Route path="/editorial-policy" element={wrap(<EditorialPolicy />)} />
        <Route path="/team" element={wrap(<Team />)} />
        <Route path="/author/:slug" element={wrap(<AuthorPage />)} />
        <Route path="/methodology" element={wrap(<Methodology />)} />
        <Route path="/corrections-policy" element={wrap(<CorrectionsPolicy />)} />
        <Route path="/accessibility" element={wrap(<Accessibility />)} />
        <Route path="/job-sources-policy" element={wrap(<JobSourcesPolicy />)} />
        <Route path="/login" element={wrap(<Login />)} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={wrap(<AdminLayout />)}>
          <Route index element={wrap(<AdminDashboard />)} />
          <Route path="tools" element={wrap(<AdminTools />)} />
          <Route path="tool-seo-import" element={wrap(<AdminToolSeoImport />)} />
          <Route path="jobs" element={wrap(<AdminJobs />)} />
          <Route path="job-categories" element={wrap(<AdminJobCategories />)} />
          <Route path="blog" element={wrap(<AdminBlog />)} />
          <Route path="blog-import" element={wrap(<AdminBlogImport />)} />
          <Route path="blog-categories" element={wrap(<AdminBlogCategories />)} />
          <Route path="categories" element={wrap(<AdminCategories />)} />
          <Route path="workflow-pages" element={wrap(<AdminWorkflowPages />)} />
          <Route path="ads" element={wrap(<AdminAds />)} />
          <Route path="redirects" element={wrap(<AdminRedirects />)} />
          {/* AI Job Intelligence */}
          <Route path="ai-intelligence" element={wrap(<AiDashboard />)} />
          <Route path="ai-research"     element={wrap(<AiResearch />)} />
          <Route path="ai-moderation"   element={wrap(<AiModeration />)} />
          <Route path="ai-duplicates"   element={wrap(<AiDuplicates />)} />
          <Route path="ai-seo-audit"    element={wrap(<AiSeoAudit />)} />
          <Route path="ai-monitoring"   element={wrap(<AiMonitoring />)} />
          <Route path="ai-updates"      element={wrap(<AiJobUpdates />)} />
          <Route path="ai-sources"      element={wrap(<AiSources />)} />
          <Route path="ai-settings"     element={wrap(<AiSettings />)} />
          <Route path="ai-prompts"      element={wrap(<AiPrompts />)} />
          <Route path="ai-reports"      element={wrap(<AiReports />)} />
          <Route path="ai-scale-ops"    element={wrap(<AiScaleOps />)} />
          <Route path="settings" element={wrap(<AdminSettings />)} />
          <Route path="seeder" element={wrap(<AdminToolSeeder />)} />
          <Route path="support" element={wrap(<AdminSupport />)} />
        </Route>
      </Route>

      <Route path="*" element={wrap(<PageNotFound />)} />
    </Routes>
  );
};

function App() {
  const [showBackgroundLighting, setShowBackgroundLighting] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setShowBackgroundLighting(true), { timeout: 2200 })
      return () => window.cancelIdleCallback?.(id)
    }
    const timer = window.setTimeout(() => setShowBackgroundLighting(true), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Suspense fallback={null}>
          <SplashScreen duration={300} />
        </Suspense>
        <SiteThemeSettings />
        <Router>
          {showBackgroundLighting && (
            <Suspense fallback={null}>
              <BackgroundLighting />
            </Suspense>
          )}
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
