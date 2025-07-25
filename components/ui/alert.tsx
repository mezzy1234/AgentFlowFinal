import React from 'react'

export function Alert({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`relative w-full rounded-lg border p-4 ${className}`}>{children}</div>
}

export function AlertDescription({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`text-sm ${className}`}>{children}</div>
}
