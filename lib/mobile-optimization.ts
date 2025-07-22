/**
 * Mobile Optimization Configuration
 * Handles responsive design, touch interactions, and mobile-specific features
 */

export const MOBILE_CONFIG = {
  // Breakpoints (matching Tailwind CSS)
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  },

  // Mobile-specific settings
  mobile: {
    maxTouchTargetSize: 44, // iOS HIG minimum
    minTouchTargetSize: 32, // Android minimum
    swipeThreshold: 50, // pixels
    tapDelay: 300, // ms for double-tap detection
  },

  // Responsive modal sizes
  modal: {
    mobile: 'w-full h-full',
    tablet: 'w-11/12 max-w-2xl',
    desktop: 'w-full max-w-4xl',
  },

  // Grid layouts for different screen sizes
  grid: {
    agents: {
      mobile: 'grid-cols-1',
      tablet: 'grid-cols-2',
      desktop: 'grid-cols-3',
      large: 'grid-cols-4',
    },
    integrations: {
      mobile: 'grid-cols-1',
      tablet: 'grid-cols-2',
      desktop: 'grid-cols-3',
      large: 'grid-cols-4',
    },
  },

  // Navigation patterns
  navigation: {
    mobile: 'bottom-tab', // or 'hamburger'
    tablet: 'top-nav',
    desktop: 'top-nav',
  },
}

/**
 * Hook for detecting mobile devices and screen sizes
 */
import { useState, useEffect } from 'react'

export function useResponsive() {
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      
      setScreenSize({ width, height })
      setIsMobile(width < MOBILE_CONFIG.breakpoints.md)
      setIsTablet(width >= MOBILE_CONFIG.breakpoints.md && width < MOBILE_CONFIG.breakpoints.lg)
      setIsDesktop(width >= MOBILE_CONFIG.breakpoints.lg)
    }

    // Initial check
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    isSmallScreen: screenSize.width < MOBILE_CONFIG.breakpoints.lg,
  }
}

/**
 * Hook for handling touch gestures
 */
export function useTouchGestures() {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setTouchEnd(null)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchEnd({ x: touch.clientX, y: touch.clientY })
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const deltaX = touchStart.x - touchEnd.x
    const deltaY = touchStart.y - touchEnd.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Determine swipe direction
    const isHorizontalSwipe = absDeltaX > absDeltaY && absDeltaX > MOBILE_CONFIG.mobile.swipeThreshold
    const isVerticalSwipe = absDeltaY > absDeltaX && absDeltaY > MOBILE_CONFIG.mobile.swipeThreshold

    let direction = null
    if (isHorizontalSwipe) {
      direction = deltaX > 0 ? 'left' : 'right'
    } else if (isVerticalSwipe) {
      direction = deltaY > 0 ? 'up' : 'down'
    }

    return direction
  }

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    getSwipeDirection: handleTouchEnd,
  }
}

/**
 * Utility functions for mobile optimization
 */
export const MobileUtils = {
  // Check if device is mobile based on user agent
  isMobileDevice: () => {
    if (typeof navigator === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  },

  // Check if device supports touch
  isTouchDevice: () => {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  },

  // Get safe area insets for devices with notches
  getSafeAreaInsets: () => {
    if (typeof window === 'undefined') return { top: 0, bottom: 0, left: 0, right: 0 }
    
    const computedStyle = getComputedStyle(document.documentElement)
    return {
      top: parseInt(computedStyle.getPropertyValue('--sat') || '0'),
      bottom: parseInt(computedStyle.getPropertyValue('--sab') || '0'),
      left: parseInt(computedStyle.getPropertyValue('--sal') || '0'),
      right: parseInt(computedStyle.getPropertyValue('--sar') || '0'),
    }
  },

  // Prevent zoom on iOS double tap
  preventZoom: (element: HTMLElement) => {
    let lastTouchEnd = 0
    element.addEventListener('touchend', (e) => {
      const now = new Date().getTime()
      if (now - lastTouchEnd <= 300) {
        e.preventDefault()
      }
      lastTouchEnd = now
    }, { passive: false })
  },

  // Handle viewport meta tag for PWA
  setViewportMeta: (content: string = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no') => {
    if (typeof document === 'undefined') return
    
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement
    if (!viewport) {
      viewport = document.createElement('meta')
      viewport.name = 'viewport'
      document.head.appendChild(viewport)
    }
    viewport.content = content
  },

  // Scroll utilities
  scrollToTop: (smooth = true) => {
    if (typeof window === 'undefined') return
    window.scrollTo({
      top: 0,
      behavior: smooth ? 'smooth' : 'auto'
    })
  },

  scrollToElement: (elementId: string, offset = 0, smooth = true) => {
    if (typeof document === 'undefined') return
    const element = document.getElementById(elementId)
    if (!element) return

    const top = element.offsetTop - offset
    window.scrollTo({
      top,
      behavior: smooth ? 'smooth' : 'auto'
    })
  },

  // Vibration feedback (if supported)
  vibrate: (pattern: number | number[] = 100) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  },
}

/**
 * CSS classes for mobile optimization
 */
export const MobileClasses = {
  // Touch-friendly button sizes
  touchButton: {
    small: 'min-h-[32px] min-w-[32px] p-2',
    medium: 'min-h-[44px] min-w-[44px] p-3',
    large: 'min-h-[56px] min-w-[56px] p-4',
  },

  // Responsive text sizes
  text: {
    responsive: 'text-sm sm:text-base lg:text-lg',
    heading: 'text-lg sm:text-xl lg:text-2xl xl:text-3xl',
    subheading: 'text-base sm:text-lg lg:text-xl',
  },

  // Responsive spacing
  spacing: {
    section: 'py-8 sm:py-12 lg:py-16',
    container: 'px-4 sm:px-6 lg:px-8',
    gap: 'gap-4 sm:gap-6 lg:gap-8',
  },

  // Responsive containers
  container: {
    full: 'w-full',
    responsive: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    centered: 'w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
  },

  // Modal classes
  modal: {
    overlay: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
    content: 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto',
    mobile: 'sm:max-w-lg md:max-w-2xl lg:max-w-4xl',
  },

  // Form elements
  form: {
    input: 'w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-md focus:ring-2 focus:ring-blue-500',
    button: 'w-full px-4 py-2 sm:px-6 sm:py-3 text-sm sm:text-base font-medium rounded-md',
    select: 'w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-md',
  },
}

export default MOBILE_CONFIG
