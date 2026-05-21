import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSiteSettings } from '@/api/supabaseApi'

const DEFAULTS = {
  enabled: true,
  colorLight: '#d6283d',
  colorDark: '#ffffff',
  blur: 38,
  opacity: 0.88,
  intensity: 1,
  hoverStrength: 1.1,
}

const normalizeColor = (value, alpha = 1) => {
  if (!value) return `rgba(214, 40, 61, ${alpha})`
  const trimmed = String(value).trim()
  if (trimmed.startsWith('rgb(') || trimmed.startsWith('rgba(')) {
    return trimmed
  }
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1)
    const shorthand = hex.length === 3
    const fullHex = shorthand
      ? hex.split('').map((char) => char + char).join('')
      : hex
    const bigint = parseInt(fullHex, 16)
    const r = (bigint >> 16) & 255
    const g = (bigint >> 8) & 255
    const b = bigint & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return trimmed
}

const parseSettingValue = (setting, fallback) => {
  if (!setting || setting.value === undefined || setting.value === null) return fallback
  const value = setting.value
  if (setting.type === 'boolean') {
    return String(value) === 'true'
  }
  if (setting.type === 'number') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return value
}

const buildSpotlightConfig = (settings = []) => {
  const lookup = settings.reduce((acc, item) => {
    acc[item.key] = item
    return acc
  }, {})

  const enabled = parseSettingValue(lookup.spotlight_enabled, DEFAULTS.enabled)
  const colorLight = normalizeColor(parseSettingValue(lookup.spotlight_color_light, DEFAULTS.colorLight), parseSettingValue(lookup.spotlight_opacity, DEFAULTS.opacity))
  const colorDark = normalizeColor(parseSettingValue(lookup.spotlight_color_dark, DEFAULTS.colorDark), parseSettingValue(lookup.spotlight_opacity, DEFAULTS.opacity))
  const blurValue = parseSettingValue(lookup.spotlight_blur, DEFAULTS.blur)
  const opacity = parseSettingValue(lookup.spotlight_opacity, DEFAULTS.opacity)
  const intensity = parseSettingValue(lookup.spotlight_intensity, DEFAULTS.intensity)
  const hoverStrength = parseSettingValue(lookup.spotlight_hover_strength, DEFAULTS.hoverStrength)

  return {
    enabled,
    colorLight,
    colorDark,
    blur: typeof blurValue === 'number' ? `${blurValue}px` : String(blurValue),
    opacity: Number.isFinite(Number(opacity)) ? opacity : DEFAULTS.opacity,
    intensity: Number.isFinite(Number(intensity)) ? intensity : DEFAULTS.intensity,
    hoverStrength: Number.isFinite(Number(hoverStrength)) ? hoverStrength : DEFAULTS.hoverStrength,
  }
}

const applySpotlightCss = ({ enabled, colorLight, colorDark, blur, opacity, intensity, hoverStrength }) => {
  const root = document.documentElement.style
  root.setProperty('--spotlight-enabled', enabled ? '1' : '0')
  root.setProperty('--spotlight-color-light', colorLight)
  root.setProperty('--spotlight-color-dark', colorDark)
  root.setProperty('--spotlight-blur', blur)
  root.setProperty('--spotlight-opacity', String(opacity))
  root.setProperty('--spotlight-intensity', String(intensity))
  root.setProperty('--spotlight-hover-strength', String(hoverStrength))
}

export function SiteThemeSettings() {
  const { data: settings = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => getSiteSettings(),
    staleTime: 1000 * 60 * 5,
  })

  useEffect(() => {
    applySpotlightCss(buildSpotlightConfig(settings))
  }, [settings])

  return null
}
