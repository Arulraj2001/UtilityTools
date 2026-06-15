import { useEffect, useRef, useState } from 'react'

/**
 * @typedef {Object} IntersectionLoadOptions
 * @property {string} [rootMargin]
 * @property {number} [threshold]
 * @property {boolean} [once]
 */

/**
 * @param {IntersectionLoadOptions=} options
 * @returns {[import('react').RefObject<HTMLDivElement>, boolean]}
 */
export default function useIntersectionLoad({ rootMargin = '0px', threshold = 0.2, once = true } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    const node = ref.current
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (once) observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin, threshold, once])

  return [ref, isVisible]
}
