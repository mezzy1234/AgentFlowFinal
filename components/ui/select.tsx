import React from 'react'

export function Select({ children, ...props }: { children: React.ReactNode }) {
  return <div {...props}>{children}</div>
}

export function SelectContent({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={className}>{children}</div>
}

export function SelectItem({ children, value, ...props }: { children: React.ReactNode, value: string }) {
  return <option value={value} {...props}>{children}</option>
}

export function SelectTrigger({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props}>{children}</div>
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  return <span className="text-muted-foreground">{placeholder}</span>
}
