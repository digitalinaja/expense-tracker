/**
 * PWA Service
 * Handles PWA installation prompts and service worker registration
 */

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

class PwaService {
  private deferredPrompt: InstallPromptEvent | null = null;
  private isInstallable: boolean = false;
  private isInstalled: boolean = false;

  constructor() {
    this.init();
  }

  /**
   * Initialize PWA service
   */
  private init(): void {
    // Check if app is already installed
    this.checkInstalled();

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e as InstallPromptEvent;
      this.isInstallable = true;
      console.log('PWA: Install prompt available');
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.isInstallable = false;
      this.deferredPrompt = null;
      console.log('PWA: App installed successfully');
    });

    // Register service worker
    this.registerServiceWorker();
  }

  /**
   * Check if app is already installed
   */
  private checkInstalled(): void {
    // Check if running in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('PWA: Running in standalone mode (installed)');
    }

    // Check iOS standalone mode
    if (('standalone' in window.navigator) && (window.navigator as any).standalone) {
      this.isInstalled = true;
      console.log('PWA: Running in iOS standalone mode');
    }
  }

  /**
   * Register service worker
   */
  private async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        console.log('PWA: Service Worker registered successfully', registration);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content available
                console.log('PWA: New content available, refresh to update');
                // You could show a notification here
                this.showUpdateAvailableNotification();
              }
            });
          }
        });

      } catch (error) {
        console.error('PWA: Service Worker registration failed', error);
      }
    } else {
      console.warn('PWA: Service Worker not supported in this browser');
    }
  }

  /**
   * Show update available notification
   */
  private showUpdateAvailableNotification(): void {
    // Create a simple notification element
    const notification = document.createElement('div');
    notification.className = 'pwa-update-notification';
    notification.innerHTML = `
      <div class="update-notification-content">
        <span>Update tersedia! Refresh untuk mendapatkan versi terbaru.</span>
        <button class="btn-refresh" onclick="location.reload()">Refresh</button>
        <button class="btn-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      </div>
    `;
    document.body.appendChild(notification);
  }

  /**
   * Check if app can be installed
   */
  canInstall(): boolean {
    return this.isInstallable && !this.isInstalled;
  }

  /**
   * Check if app is already installed
   */
  isAppInstalled(): boolean {
    return this.isInstalled;
  }

  /**
   * Prompt user to install the app
   */
  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.warn('PWA: No install prompt available');
      return false;
    }

    try {
      // Show the install prompt
      await this.deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await this.deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
        this.isInstallable = false;
        return true;
      } else {
        console.log('PWA: User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('PWA: Install prompt error', error);
      return false;
    } finally {
      // Clear the deferredPrompt
      this.deferredPrompt = null;
    }
  }

  /**
   * Get platform-specific install instructions
   */
  getInstallInstructions(): string {
    const userAgent = navigator.userAgent;

    // iOS Safari
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      return 'Untuk menginstal: Buka menu Share (📤) dan pilih "Add to Home Screen"';
    }

    // Android Chrome
    if (/Android/.test(userAgent)) {
      return 'Untuk menginstal: Buka menu (⋮) dan pilih "Install App" atau "Tambahkan ke Layar Utama"';
    }

    // Desktop
    return 'Untuk menginstal: Klik tombol Install di browser (biasanya di address bar)';
  }

  /**
   * Get device info
   */
  getDeviceInfo(): { platform: string; isMobile: boolean; isIOS: boolean; isAndroid: boolean } {
    const userAgent = navigator.userAgent;

    return {
      platform: this.getPlatform(),
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
      isIOS: /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream,
      isAndroid: /Android/.test(userAgent)
    };
  }

  /**
   * Get platform name
   */
  private getPlatform(): string {
    const userAgent = navigator.userAgent;

    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      return 'iOS';
    }
    if (/Android/.test(userAgent)) {
      return 'Android';
    }
    if (/Windows/.test(userAgent)) {
      return 'Windows';
    }
    if (/Mac|Mac OS/.test(userAgent)) {
      return 'macOS';
    }
    if (/Linux/.test(userAgent)) {
      return 'Linux';
    }
    return 'Unknown';
  }

  /**
   * Show install instructions modal
   */
  showInstallInstructions(): void {
    const modal = document.createElement('div');
    modal.className = 'modal pwa-install-modal';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Instal Aplikasi</h2>
          <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="install-icon">💰</div>
          <h3>Instal Catat Uang</h3>
          <p>Instal aplikasi untuk pengalaman yang lebih baik:</p>
          <ul class="install-benefits">
            <li>✓ Akses cepat dari home screen</li>
            <li>✓ Tampilan fullscreen tanpa browser</li>
            <li>✓ Notifikasi pengingat</li>
            <li>✓ Bisa digunakan offline</li>
          </ul>
          ${this.isInstallable && !this.isInstalled ? `
            <button class="btn-primary btn-large" id="installButton">Instal Sekarang</button>
          ` : ''}
          <div class="install-instructions">
            <p><strong>${this.getInstallInstructions()}</strong></p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add click handler for install button
    if (this.isInstallable && !this.isInstalled) {
      const installButton = modal.querySelector('#installButton');
      if (installButton) {
        installButton.addEventListener('click', async () => {
          const installed = await this.promptInstall();
          if (installed) {
            modal.remove();
          }
        });
      }
    }

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }
}

// Export singleton instance
export const pwaService = new PwaService();
