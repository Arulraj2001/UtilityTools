export const formatDate = (d) => {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}


export const isExpired = (job) => {
  if (!job || !job.last_date) return false
  const last = new Date(job.last_date)
  return last < new Date()
}

export const makeSlug = (text) => {
  return (text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default { formatDate, isExpired, makeSlug }
