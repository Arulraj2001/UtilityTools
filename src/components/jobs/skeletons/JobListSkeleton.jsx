import React from 'react'
import JobCardSkeleton from './JobCardSkeleton'

export default function JobListSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  )
}
