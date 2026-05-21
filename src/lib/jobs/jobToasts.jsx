import { toast } from 'sonner'
import { Check, AlertCircle, Info, AlertTriangle } from 'lucide-react'

const toastConfig = {
  duration: 4000,
}

export const jobToasts = {
  // Success toasts
  jobCreated: (title) => 
    toast.success(`Job created: "${title}"`, {
      ...toastConfig,
      duration: 3000,
      icon: <Check className="w-4 h-4" />,
    }),

  jobUpdated: (title) => 
    toast.success(`Job updated: "${title}"`, {
      ...toastConfig,
      duration: 3000,
      icon: <Check className="w-4 h-4" />,
    }),

  jobPublished: (title) => 
    toast.success(`Job published: "${title}"`, {
      ...toastConfig,
      duration: 3000,
      icon: <Check className="w-4 h-4" />,
    }),

  jobDeleted: () => 
    toast.success('Job deleted successfully', {
      ...toastConfig,
      duration: 3000,
      icon: <Check className="w-4 h-4" />,
    }),

  jobFeatured: (title) => 
    toast.success(`"${title}" featured`, {
      ...toastConfig,
      duration: 2500,
      icon: <Check className="w-4 h-4" />,
    }),

  // Error toasts
  saveFailed: (error) => 
    toast.error(`Save failed: ${error || 'Please try again'}`, {
      ...toastConfig,
      duration: 5000,
      icon: <AlertCircle className="w-4 h-4" />,
    }),

  deleteFailed: (error) => 
    toast.error(`Delete failed: ${error || 'Please try again'}`, {
      ...toastConfig,
      duration: 5000,
      icon: <AlertCircle className="w-4 h-4" />,
    }),

  validationError: (message) => 
    toast.error(`Validation error: ${message}`, {
      ...toastConfig,
      duration: 4000,
      icon: <AlertTriangle className="w-4 h-4" />,
    }),

  requiredFieldMissing: (field) => 
    toast.error(`${field} is required`, {
      ...toastConfig,
      duration: 3500,
      icon: <AlertTriangle className="w-4 h-4" />,
    }),

  // Info toasts
  saving: () => 
    toast.loading('Saving...', {
      ...toastConfig,
      icon: <Info className="w-4 h-4" />,
    }),

  loading: (message = 'Loading...') => 
    toast.loading(message, {
      ...toastConfig,
      icon: <Info className="w-4 h-4" />,
    }),

  info: (message) => 
    toast.info(message, {
      ...toastConfig,
      duration: 3000,
      icon: <Info className="w-4 h-4" />,
    }),

  // Generic
  dismiss: () => toast.dismiss(),
  dismissAll: () => toast.dismiss(),
}

export default jobToasts
