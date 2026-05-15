import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/components/ProtectedRoute';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/admin/AdminLayout';

// Public pages
import Home from './pages/Home';
import ToolsList from './pages/ToolsList';
import ToolPage from './pages/ToolPage';
import CategoriesList from './pages/CategoriesList';
import CategoryPage from './pages/CategoryPage';
import BlogList from './pages/BlogList';
import BlogPostPage from './pages/BlogPostPage';
import About from './pages/About';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Login from './pages/Login';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTools from './pages/admin/AdminTools';
import AdminBlog from './pages/admin/AdminBlog';
import AdminCategories from './pages/admin/AdminCategories';
import AdminBlogCategories from './pages/admin/AdminBlogCategories';
import AdminAds from './pages/admin/AdminAds';
import AdminRedirects from './pages/admin/AdminRedirects';
import AdminSettings from './pages/admin/AdminSettings';
import AdminToolSeeder from './pages/admin/AdminToolSeeder';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

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

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/tools" element={<ToolsList />} />
        <Route path="/tool/:slug" element={<ToolPage />} />
        <Route path="/categories" element={<CategoriesList />} />
        <Route path="/category/:slug" element={<CategoryPage />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="tools" element={<AdminTools />} />
          <Route path="blog" element={<AdminBlog />} />
          <Route path="blog-categories" element={<AdminBlogCategories />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="ads" element={<AdminAds />} />
          <Route path="redirects" element={<AdminRedirects />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="seeder" element={<AdminToolSeeder />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
        <SonnerToaster position="top-right" richColors />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App