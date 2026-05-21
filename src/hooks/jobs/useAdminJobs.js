import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getJobs, createJob, updateJob, deleteJob, getJobBySlug } from '@/api/supabaseApi'

export const useAdminJobs = ({ filter = {} } = {}) => {
  return useQuery({
    queryKey: ['admin', 'jobs', filter],
    queryFn: () => getJobs({ published: false, ...filter }),
    staleTime: 1000 * 30,
  })
}

export const useAdminJob = (slug) => {
  return useQuery({
    queryKey: ['admin', 'job', slug],
    queryFn: () => getJobBySlug(slug),
    enabled: !!slug,
  })
}

export const useCreateJob = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: createJob, onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'jobs'] }) })
}

export const useUpdateJob = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, data }) => updateJob(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'jobs'] }) })
}

export const useDeleteJob = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => deleteJob(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'jobs'] }) })
}

export default useAdminJobs
