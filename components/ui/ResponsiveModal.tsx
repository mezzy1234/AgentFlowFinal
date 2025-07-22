'use client'

import { Fragment, ReactNode } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useResponsive } from '@/lib/mobile-optimization'

interface ResponsiveModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton?: boolean
  preventClose?: boolean
  className?: string
}

export default function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  preventClose = false,
  className = ''
}: ResponsiveModalProps) {
  const { isMobile, isTablet } = useResponsive()

  const getSizeClasses = () => {
    if (isMobile) {
      return 'w-full h-full rounded-none'
    }

    switch (size) {
      case 'sm':
        return 'w-full max-w-sm'
      case 'md':
        return 'w-full max-w-md sm:max-w-lg'
      case 'lg':
        return 'w-full max-w-lg sm:max-w-2xl'
      case 'xl':
        return 'w-full max-w-xl sm:max-w-4xl'
      case 'full':
        return 'w-full max-w-7xl'
      default:
        return 'w-full max-w-md sm:max-w-lg'
    }
  }

  const getPositionClasses = () => {
    if (isMobile) {
      return 'items-end sm:items-center'
    }
    return 'items-center'
  }

  const getPanelClasses = () => {
    const baseClasses = 'relative bg-white dark:bg-gray-800 shadow-xl'
    const sizeClasses = getSizeClasses()
    const roundedClasses = isMobile ? 'rounded-t-lg sm:rounded-lg' : 'rounded-lg'
    const heightClasses = isMobile ? 'max-h-[90vh] sm:max-h-[85vh]' : 'max-h-[85vh]'
    
    return `${baseClasses} ${sizeClasses} ${roundedClasses} ${heightClasses} ${className}`
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={preventClose ? () => {} : onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className={`flex min-h-full justify-center p-0 sm:p-4 text-center ${getPositionClasses()}`}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom={isMobile ? "opacity-0 translate-y-full" : "opacity-0 scale-95"}
              enterTo={isMobile ? "opacity-100 translate-y-0" : "opacity-100 scale-100"}
              leave="ease-in duration-200"
              leaveFrom={isMobile ? "opacity-100 translate-y-0" : "opacity-100 scale-100"}
              leaveTo={isMobile ? "opacity-0 translate-y-full" : "opacity-0 scale-95"}
            >
              <Dialog.Panel className={getPanelClasses()}>
                {/* Header */}
                {(title || showCloseButton) && (
                  <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                    {title && (
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900 dark:text-white"
                      >
                        {title}
                      </Dialog.Title>
                    )}
                    {showCloseButton && !preventClose && (
                      <button
                        type="button"
                        className="ml-4 rounded-md text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 p-2"
                        onClick={onClose}
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

// Mobile-optimized button component
export function MobileButton({
  children,
  size = 'medium',
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  className = '',
  ...props
}: {
  children: ReactNode
  size?: 'small' | 'medium' | 'large'
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  className?: string
  [key: string]: any
}) {
  const { isMobile } = useResponsive()

  const getSizeClasses = () => {
    const mobileMultiplier = isMobile ? 1.2 : 1
    
    switch (size) {
      case 'small':
        return `px-3 py-2 text-sm min-h-[${32 * mobileMultiplier}px]`
      case 'large':
        return `px-6 py-4 text-lg min-h-[${56 * mobileMultiplier}px]`
      default:
        return `px-4 py-3 text-base min-h-[${44 * mobileMultiplier}px]`
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
      case 'outline':
        return 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
      case 'ghost':
        return 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800'
    }
  }

  const baseClasses = 'font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed'
  const sizeClasses = getSizeClasses()
  const variantClasses = getVariantClasses()
  const widthClasses = fullWidth ? 'w-full' : ''
  const touchClasses = 'touch-manipulation' // Improves touch responsiveness

  return (
    <button
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${widthClasses} ${touchClasses} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          Loading...
        </div>
      ) : (
        children
      )}
    </button>
  )
}

// Mobile-optimized input component
export function MobileInput({
  label,
  error,
  className = '',
  fullWidth = true,
  ...props
}: {
  label?: string
  error?: string
  className?: string
  fullWidth?: boolean
  [key: string]: any
}) {
  const { isMobile } = useResponsive()

  const inputClasses = `
    block px-3 py-3 sm:px-4 sm:py-2 
    text-base sm:text-sm 
    border border-gray-300 dark:border-gray-600 
    rounded-md shadow-sm 
    bg-white dark:bg-gray-800 
    text-gray-900 dark:text-white 
    placeholder-gray-500 dark:placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
    disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
    ${isMobile ? 'min-h-[44px]' : 'min-h-[40px]'}
    ${error ? 'border-red-500 focus:ring-red-500' : ''}
    ${className}
  `

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        className={inputClasses}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

// Mobile-optimized card component
export function MobileCard({
  children,
  className = '',
  padding = 'normal',
  clickable = false,
  onClick,
  ...props
}: {
  children: ReactNode
  className?: string
  padding?: 'none' | 'small' | 'normal' | 'large'
  clickable?: boolean
  onClick?: () => void
  [key: string]: any
}) {
  const { isMobile } = useResponsive()

  const getPaddingClasses = () => {
    switch (padding) {
      case 'none':
        return ''
      case 'small':
        return 'p-3 sm:p-4'
      case 'large':
        return 'p-6 sm:p-8'
      default:
        return 'p-4 sm:p-6'
    }
  }

  const baseClasses = 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm'
  const paddingClasses = getPaddingClasses()
  const clickableClasses = clickable ? 'cursor-pointer hover:shadow-md transition-shadow touch-manipulation' : ''
  const mobileClasses = isMobile ? 'active:bg-gray-50 dark:active:bg-gray-700' : ''

  return (
    <div
      className={`${baseClasses} ${paddingClasses} ${clickableClasses} ${mobileClasses} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}
