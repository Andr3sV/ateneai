"use client"

import * as React from "react"

type ProgressProps = {
  value: number
  className?: string
}

export const Progress: React.FC<ProgressProps> = ({ value, className }) => {
  const clamped = Math.max(0, Math.min(100, isFinite(value) ? value : 0))
  return (
    <div className={`w-full bg-gray-100 rounded ${className || ''}`.trim()}>
      <div
        className="h-1.5 rounded bg-gray-900 transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}


