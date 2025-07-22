import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'AgentFlow.AI - AI Automation Marketplace',
  description: 'Buy, sell, and automate with AI-powered workflow agents',
  keywords: 'AI, automation, workflows, agents, n8n, integrations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
