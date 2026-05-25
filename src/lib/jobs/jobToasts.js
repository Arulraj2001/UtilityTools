import { toast } from 'sonner'

export const jobToasts = {
  jobCreated: (title) =>
    toast.success(`Job created: ${title}`),

  jobUpdated: (title) =>
    toast.success(`Job updated: ${title}`),

  jobDeleted: () =>
    toast.success('Job deleted successfully'),

  saveFailed: (message) =>
    toast.error(`Save failed: ${message}`),

  validationError: (message) =>
    toast.error(`Validation error: ${message}`),

  info: (message) =>
    toast(message),
}

export default jobToasts
