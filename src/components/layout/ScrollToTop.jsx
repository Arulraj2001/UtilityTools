import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop({ behavior = 'smooth' }) {
  const { pathname } = useLocation()

  useEffect(() => {
    // small timeout to allow route content to settle and avoid layout jump
    const id = window.setTimeout(() => {
      try {
        window.scrollTo({ top: 0, behavior })
      } catch (e) {
        window.scrollTo(0, 0)
      }
    }, 40)

    return () => window.clearTimeout(id)
  }, [pathname, behavior])

  return null
}
