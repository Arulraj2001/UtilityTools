export const getSiteSetting = (settings = [], key) => {
  return settings.find((item) => item.key === key) || null
}

export const parseSiteSettingValue = (setting, fallback) => {
  if (!setting || setting.value === undefined || setting.value === null) {
    return fallback
  }

  if (setting.type === 'boolean') {
    return String(setting.value) === 'true'
  }

  if (setting.type === 'number') {
    const parsed = Number(setting.value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return setting.value
}

export const getSiteBooleanSetting = (settings = [], key, fallback = true) => {
  return parseSiteSettingValue(getSiteSetting(settings, key), fallback)
}
