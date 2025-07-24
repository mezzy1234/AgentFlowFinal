import React from 'react'

export function Tabs({ children, defaultValue, className = '' }: { 
  children: React.ReactNode
  defaultValue?: string
  className?: string
}) {
  return <div className={className}>{children}</div>
}

export function TabsList({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground ${className}`}>{children}</div>
}

export function TabsTrigger({ children, value, className = '' }: { 
  children: React.ReactNode
  value: string
  className?: string
}) {
  return <button className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow ${className}`}>{children}</button>
}

export function TabsContent({ children, value, className = '' }: { 
  children: React.ReactNode
  value: string
  className?: string
}) {
  return <div className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}>{children}</div>
}
