import React from 'react'

export function Dialog({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function DialogContent({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 ${className}`}>{children}</div>
}

export function DialogHeader({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>{children}</div>
}

export function DialogTitle({ children, className = '' }: { children: React.ReactNode, className?: string }) {
  return <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>{children}</h2>
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}
