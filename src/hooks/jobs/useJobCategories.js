import { useQuery } from '@tanstack/react-query'
import { getJobCategories } from '@/api/supabaseApi'

export const useJobCategories = ({ orderBy = 'sort_order', ascending = true, limit = 200 } = {}) => {
  return useQuery({
    queryKey: ['job-categories'],
    queryFn: () => getJobCategories({ orderBy, ascending, limit }),
    staleTime: 1000 * 60 * 5,
  })
}

export default useJobCategories
