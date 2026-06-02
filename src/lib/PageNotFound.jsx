import { Link } from 'react-router-dom'
import StaticPageSEO from '@/components/seo/StaticPageSEO'

export default function PageNotFound({
  title = 'Page not found',
  message = 'The page you are looking for does not exist or has been moved.',
  primaryHref = '/tools',
  primaryLabel = 'All Tools',
}) {
  return (
    <>
      <StaticPageSEO
        title="404 Not Found - QuickUtils"
        description="This QuickUtils page does not exist or has been removed."
        path="/404"
        robots="noindex, nofollow"
      />
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <p className="text-7xl font-light text-muted-foreground/30 mb-4">404</p>
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <p className="text-muted-foreground leading-relaxed max-w-md mb-8">
          {message}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link
            to="/"
            className="text-primary hover:underline font-medium"
          >
            Homepage
          </Link>
          <span className="hidden sm:inline text-muted-foreground/40">|</span>
          <Link
            to={primaryHref}
            className="text-primary hover:underline font-medium"
          >
            {primaryLabel}
          </Link>
          <span className="hidden sm:inline text-muted-foreground/40">|</span>
          <Link
            to="/categories"
            className="text-primary hover:underline font-medium"
          >
            Browse by Category
          </Link>
        </div>
      </div>
    </>
  )
}
