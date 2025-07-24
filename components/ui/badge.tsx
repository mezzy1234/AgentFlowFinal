import React from 'react'

export function Badge({ 
  children, 
  className = '', 
  variant = 'default' 
}: { 
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
}) {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground shadow hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
    outline: 'text-foreground border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground'
  }
  
  return (
    <div className={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  )
}
