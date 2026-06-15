import { useQuery } from '@tanstack/react-query'
import { getJobs, getJobBySlug, getFeaturedJobs, searchJobs } from '@/api/supabaseApi'

export const useJobs = ({ page = 0, pageSize = 20, category = null, search = null, enabled = true } = {}) => {
  return useQuery({
    queryKey: ['jobs', { page, pageSize, category, search }],
    queryFn: () => getJobs({ limit: pageSize, page, pageSize, category, search }),
    enabled,
    keepPreviousData: true,
  })
}

export const useJob = (slug) => {
  return useQuery({
    queryKey: ['job', slug],
    queryFn: () => getJobBySlug(slug),
    enabled: !!slug,
  })
}

export const useFeaturedJobs = () => {
  return useQuery({
    queryKey: ['jobs', 'featured'],
    queryFn: () => getFeaturedJobs(),
    staleTime: 1000 * 60 * 5,
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
