export const formatDate = (d) => {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString()
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
