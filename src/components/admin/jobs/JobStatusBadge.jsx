import React from 'react'
import {
  CheckCircle2,
  Clock3,
  AlertTriangle,
} from 'lucide-react'

export default function JobStatusBadge({ status }) {
  const normalized = (status || 'draft').toLowerCase()

  const config = {
    published: {
      label: 'Published',
      icon: CheckCircle2,
      className:
        'bg-green-500/10 text-green-600 border-green-500/20',
    },

    expired: {
      label: 'Expired',
      icon: AlertTriangle,
      className:
        'bg-red-500/10 text-red-500 border-red-500/20',
    },

    draft: {
      label: 'Draft',
      icon: Clock3,
      className:
        'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    },
  }

  const current =
    config[normalized] || config.draft

  const Icon = current.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold tracking-wide ${current.className}`}
    >
      <Icon className="w-3 h-3" />

      {current.label}
    </span>
  )
}