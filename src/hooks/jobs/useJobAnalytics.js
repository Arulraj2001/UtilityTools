import { useQuery } from '@tanstack/react-query'
import {
  getJobAnalytics,
  getMostViewedJobs,
  getMostAppliedJobs,
  getTrendingJobs,
  getFeaturedJobPerformance,
  getJobsAnalyticsSummary,
} from '@/lib/jobs/jobAnalytics'

export const useJobAnalytics = (jobId) => {
  return useQuery({
    queryKey: ['job', jobId, 'analytics'],
    queryFn: () => getJobAnalytics(jobId),
    enabled: !!jobId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export const useMostViewedJobs = ({ limit = 10 } = {}) => {
  return useQuery({
    queryKey: ['jobs', 'analytics', 'mostViewed', limit],
    queryFn: () => getMostViewedJobs({ limit }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export const useMostAppliedJobs = ({ limit = 10 } = {}) => {
  return useQuery({
    queryKey: ['jobs', 'analytics', 'mostApplied', limit],
    queryFn: () => getMostAppliedJobs({ limit }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export const useTrendingJobs = ({ limit = 10, hours = 24 } = {}) => {
  return useQuery({
    queryKey: ['jobs', 'analytics', 'trending', limit, hours],
    queryFn: () => getTrendingJobs({ limit, hours }),
    staleTime: 1000 * 60 * 5, // 5 minutes (more frequent for trending)
  })
}

export const useFeaturedJobPerformance = ({ limit = 10 } = {}) => {
  return useQuery({
    queryKey: ['jobs', 'analytics', 'featuredPerformance', limit],
    queryFn: () => getFeaturedJobPerformance({ limit }),
    staleTime: 1000 * 60 * 10, // 10 minutes
  })
}

export const useJobsAnalyticsSummary = () => {
  return useQuery({
    queryKey: ['jobs', 'analytics', 'summary'],
    queryFn: () => getJobsAnalyticsSummary(),
    staleTime: 1000 * 60 * 15, // 15 minutes
  })
}
