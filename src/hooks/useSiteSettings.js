import { useQuery } from '@tanstack/react-query'
import { getSiteSettings } from '@/api/supabaseApi'
import { getSiteSetting, parseSiteSettingValue } from '@/lib/siteSettings'

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => getSiteSettings(),
    staleTime: 1000 * 60 * 5,
  })
}

export const useSiteBooleanSetting = (key, fallback = true) => {
  const { data: settings = [], ...queryState } = useSiteSettings()
  return {
    ...queryState,
    data: settings,
    value: parseSiteSettingValue(getSiteSetting(settings, key), fallback),
  }
}
