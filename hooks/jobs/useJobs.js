import { useQuery } from '@tanstack/react-query'
import { getJobs, getJobBySlug, getFeaturedJobs, searchJobs } from '@/api/supabaseApi'

export const useJobs = ({ page = 0, pageSize = 20, category = null, search = null, enabled = true, initialData } = {}) => {
  return useQuery({
    queryKey: ['jobs', { page, pageSize, category, search }],
    queryFn: () => getJobs({ limit: pageSize, page, pageSize, category, search }),
    enabled,
    keepPreviousData: true,
    initialData,
  })
}

export const useJob = (slug, { initialData } = {}) => {
  return useQuery({
    queryKey: ['job', slug],
    queryFn: () => getJobBySlug(slug),
    enabled: !!slug,
    initialData,
  })
}

export const useFeaturedJobs = ({ initialData } = {}) => {
  return useQuery({
    queryKey: ['jobs', 'featured'],
    queryFn: () => getFeaturedJobs(),
    staleTime: 1000 * 60 * 5,
    initialData,
  })
}

export const useJobSearch = (term) => {
  return useQuery({
    queryKey: ['jobs', 'search', term],
    queryFn: () => searchJobs(term),
    enabled: !!term && term.length > 1,
  })
}

export default useJobs
