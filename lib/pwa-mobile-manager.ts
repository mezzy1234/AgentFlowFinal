// PWA configuration and mobile optimization utilities for AgentFlow.AI
// Enables offline functionality, push notifications, and mobile-first experience

export interface PWAConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation: 'portrait' | 'landscape' | 'any';
  startUrl: string;
  scope: string;
  icons: Array<{
    src: string;
    sizes: string;
    type: string;
    purpose?: string;
  }>;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

export interface TouchGesture {
  type: 'tap' | 'swipe' | 'pinch' | 'long-press';
  direction?: 'left' | 'right' | 'up' | 'down';
  target: EventTarget | null;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  duration: number;
}

export class PWAMobileManager {
  private static instance: PWAMobileManager;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private touchStartTime = 0;
  private touchStartPoint = { x: 0, y: 0 };
  private gestureListeners = new Map<string, Array<(gesture: TouchGesture) => void>>();

  static getInstance(): PWAMobileManager {
    if (!PWAMobileManager.instance) {
      PWAMobileManager.instance = new PWAMobileManager();
    }
    return PWAMobileManager.instance;
  }

  /**
   * Initialize PWA functionality
   */
  async initializePWA(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
        
        // Handle service worker updates
        this.swRegistration.addEventListener('updatefound', () => {
          const installingWorker = this.swRegistration?.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content available
                  this.showUpdateAvailableNotification();
                }
              }
            });
          }
        });

        // Initialize push notifications
        await this.initializePushNotifications();
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Initialize touch gestures
    this.initializeTouchGestures();
    
    // Setup viewport optimizations
    this.setupViewportOptimizations();
    
    // Handle app installation
    this.handleAppInstallation();
  }

  /**
   * Initialize push notifications
   */
  async initializePushNotifications(): Promise<void> {
    if (!('Notification' in window) || !this.swRegistration) {
      console.warn('Push notifications not supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        const subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '')
        });

        // Send subscription to server
        await this.sendSubscriptionToServer(subscription);
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Send push notification subscription to server
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send subscription to server');
      }
    } catch (error) {
      console.error('Error sending subscription to server:', error);
    }
  }

  /**
   * Show local notification
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      if (this.swRegistration) {
        // Use service worker for better control
        await this.swRegistration.showNotification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png',
          badge: payload.badge || '/icons/badge-72x72.png',
          tag: payload.tag,
          data: payload.data,
          actions: payload.actions,
          requireInteraction: true,
          silent: false
        } as any);
      } else {
        // Fallback to basic notification
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.png'
        });
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Initialize touch gesture recognition
   */
  private initializeTouchGestures(): void {
    let touchStartTime = 0;
    let touchStartPoint = { x: 0, y: 0 };
    let touchEndPoint = { x: 0, y: 0 };

    document.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      const touch = e.touches[0];
      touchStartPoint = { x: touch.clientX, y: touch.clientY };
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      const touchEndTime = Date.now();
      const duration = touchEndTime - touchStartTime;
      const touch = e.changedTouches[0];
      touchEndPoint = { x: touch.clientX, y: touch.clientY };

      const deltaX = touchEndPoint.x - touchStartPoint.x;
      const deltaY = touchEndPoint.y - touchStartPoint.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      let gesture: TouchGesture;

      if (duration > 500 && distance < 10) {
        // Long press
        gesture = {
          type: 'long-press',
          target: e.target,
          startPoint: touchStartPoint,
          endPoint: touchEndPoint,
          duration
        };
      } else if (distance > 50) {
        // Swipe
        const direction = Math.abs(deltaX) > Math.abs(deltaY)
          ? (deltaX > 0 ? 'right' : 'left')
          : (deltaY > 0 ? 'down' : 'up');
        
        gesture = {
          type: 'swipe',
          direction,
          target: e.target,
          startPoint: touchStartPoint,
          endPoint: touchEndPoint,
          duration
        };
      } else {
        // Tap
        gesture = {
          type: 'tap',
          target: e.target,
          startPoint: touchStartPoint,
          endPoint: touchEndPoint,
          duration
        };
      }

      this.notifyGestureListeners(gesture);
    }, { passive: true });
  }

  /**
   * Add gesture listener
   */
  addGestureListener(type: TouchGesture['type'], callback: (gesture: TouchGesture) => void): void {
    if (!this.gestureListeners.has(type)) {
      this.gestureListeners.set(type, []);
    }
    this.gestureListeners.get(type)!.push(callback);
  }

  /**
   * Remove gesture listener
   */
  removeGestureListener(type: TouchGesture['type'], callback: (gesture: TouchGesture) => void): void {
    const listeners = this.gestureListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Notify gesture listeners
   */
  private notifyGestureListeners(gesture: TouchGesture): void {
    const listeners = this.gestureListeners.get(gesture.type);
    if (listeners) {
      listeners.forEach(callback => callback(gesture));
    }
  }

  /**
   * Setup viewport optimizations
   */
  private setupViewportOptimizations(): void {
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, false);

    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        // Force repaint to handle orientation change bugs
        document.body.style.height = '100vh';
        requestAnimationFrame(() => {
          document.body.style.height = '';
        });
      }, 100);
    });

    // Handle safe area insets
    if (CSS.supports('env(safe-area-inset-top)')) {
      document.documentElement.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
      document.documentElement.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
      document.documentElement.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
      document.documentElement.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
    }
  }

  /**
   * Handle app installation prompt
   */
  private handleAppInstallation(): void {
    let deferredPrompt: any;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show custom install prompt
      this.showInstallPrompt(() => {
        deferredPrompt?.prompt();
        deferredPrompt?.userChoice.then((choiceResult: any) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
          deferredPrompt = null;
        });
      });
    });

    // Handle successful installation
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      // Hide install prompt
      this.hideInstallPrompt();
    });
  }

  /**
   * Show app install prompt
   */
  private showInstallPrompt(onInstall: () => void): void {
    // Create install prompt UI
    const prompt = document.createElement('div');
    prompt.id = 'install-prompt';
    prompt.className = 'install-prompt';
    prompt.innerHTML = `
      <div class="install-prompt-content">
        <div class="install-prompt-icon">📱</div>
        <div class="install-prompt-text">
          <h3>Install AgentFlow</h3>
          <p>Get quick access to your AI agents</p>
        </div>
        <div class="install-prompt-actions">
          <button id="install-app" class="install-btn">Install</button>
          <button id="install-dismiss" class="dismiss-btn">Not now</button>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .install-prompt {
        position: fixed;
        bottom: 20px;
        left: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.15);
        padding: 16px;
        z-index: 1000;
        animation: slideUp 0.3s ease-out;
      }
      
      .install-prompt-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .install-prompt-icon {
        font-size: 24px;
      }
      
      .install-prompt-text h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      .install-prompt-text p {
        margin: 0;
        font-size: 14px;
        color: #666;
      }
      
      .install-prompt-actions {
        display: flex;
        gap: 8px;
      }
      
      .install-btn {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
      }
      
      .dismiss-btn {
        background: transparent;
        color: #666;
        border: 1px solid #ddd;
        padding: 8px 16px;
        border-radius: 8px;
        font-size: 14px;
        cursor: pointer;
      }
      
      @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      @media (min-width: 768px) {
        .install-prompt {
          max-width: 400px;
          left: auto;
          right: 20px;
        }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(prompt);

    // Handle actions
    document.getElementById('install-app')?.addEventListener('click', () => {
      onInstall();
      this.hideInstallPrompt();
    });

    document.getElementById('install-dismiss')?.addEventListener('click', () => {
      this.hideInstallPrompt();
    });
  }

  /**
   * Hide install prompt
   */
  private hideInstallPrompt(): void {
    const prompt = document.getElementById('install-prompt');
    if (prompt) {
      prompt.style.animation = 'slideDown 0.3s ease-in forwards';
      setTimeout(() => prompt.remove(), 300);
    }
  }

  /**
   * Show update available notification
   */
  private showUpdateAvailableNotification(): void {
    this.showNotification({
      title: 'Update Available',
      body: 'A new version of AgentFlow is ready to install',
      tag: 'app-update',
      actions: [
        { action: 'update', title: 'Update Now' },
        { action: 'dismiss', title: 'Later' }
      ]
    });
  }

  /**
   * Check if app is installed
   */
  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true ||
           document.referrer.includes('android-app://');
  }

  /**
   * Check if device is mobile
   */
  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Get device type
   */
  getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width <= 768) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }

  /**
   * Handle offline functionality
   */
  setupOfflineHandling(): void {
    window.addEventListener('online', () => {
      this.showNotification({
        title: 'Back Online',
        body: 'Internet connection restored',
        tag: 'connectivity'
      });
      
      // Sync any pending data
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.showNotification({
        title: 'Offline Mode',
        body: 'Some features may be limited',
        tag: 'connectivity'
      });
    });
  }

  /**
   * Sync pending data when back online
   */
  private async syncPendingData(): Promise<void> {
    if ('serviceWorker' in navigator && this.swRegistration) {
      // Send message to service worker to sync data
      const channel = new MessageChannel();
      this.swRegistration.active?.postMessage({ type: 'SYNC_DATA' }, [channel.port1]);
    }
  }

  /**
   * Utility to convert VAPID key
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }
}

// Export singleton instance
export const pwaManager = PWAMobileManager.getInstance();
