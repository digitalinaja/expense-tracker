import { pwaService } from '../services/PwaService'
import { authStore } from '../stores/AuthStore'
import { APP_VERSION } from '../config/version'

/**
 * SettingsModal Component
 * Modal for app settings including PWA installation
 */
export class SettingsModal {
  private modal: HTMLElement | null = null

  constructor() {
    this.createModal()
  }

  /**
   * Get install button HTML based on installation status
   */
  private getInstallButton(): string {
    const isInstalled = pwaService.isAppInstalled()
    const canInstall = pwaService.canInstall()
    const deviceInfo = pwaService.getDeviceInfo()

    if (isInstalled) {
      return `
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-title">Status Instalasi</div>
                <div class="setting-description">Aplikasi sudah terinstal di ${deviceInfo.platform}</div>
              </div>
              <div class="setting-badge">
                <span class="badge badge-success">Terinstal</span>
              </div>
            </div>
      `
    }

    if (canInstall) {
      return `
            <div class="setting-item setting-item-action" onclick="settingsModal.handleInstall()">
              <div class="setting-info">
                <div class="setting-title">Instal Aplikasi</div>
                <div class="setting-description">Pasang aplikasi di perangkat Anda</div>
              </div>
              <div class="setting-action">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
            </div>
      `
    }

    return `
            <div class="setting-item setting-item-action" onclick="settingsModal.handleInstall()">
              <div class="setting-info">
                <div class="setting-title">Cara Instalasi</div>
                <div class="setting-description">Lihat panduan instalasi untuk ${deviceInfo.platform}</div>
              </div>
              <div class="setting-action">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
            </div>
    `
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Estimate cache size
   */
  private async estimateCacheSize(): Promise<string> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        if (estimate.usage !== undefined) {
          return this.formatBytes(estimate.usage)
        }
      } catch (error) {
        console.error('Error estimating cache size:', error)
      }
    }
    return 'Tidak diketahui'
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        )
        this.showNotification('Cache berhasil dibersihkan!', 'success')

        // Update cache size display
        if (this.modal) {
          const cacheSizeEl = this.modal.querySelector('#cacheSize')
          if (cacheSizeEl) {
            cacheSizeEl.textContent = '0 Bytes'
          }
        }
      } catch (error) {
        console.error('Error clearing cache:', error)
        this.showNotification('Gagal membersihkan cache', 'error')
      }
    }
  }

  /**
   * Create modal elements
   */
  private createModal(): void {
    // Check if modal already exists
    this.modal = document.getElementById('settingsModal')
    if (this.modal) {
      return
    }

    // Create modal
    this.modal = document.createElement('div')
    this.modal.id = 'settingsModal'
    this.modal.className = 'modal'
    this.modal.style.display = 'none'
    this.modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Pengaturan</h2>
          <button class="close-modal" onclick="settingsModal.close()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="settings-section">
            <h3>Aplikasi</h3>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-title">Versi Aplikasi</div>
                <div class="setting-description">${APP_VERSION}</div>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-title">Cache Storage</div>
                <div class="setting-description" id="cacheSize">Menghitung...</div>
              </div>
              <div class="setting-action" onclick="settingsModal.clearCache()" style="cursor: pointer;" title="Bersihkan Cache">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-title">Platform</div>
                <div class="setting-description" id="platformInfo">-</div>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-title">Mode Offline</div>
                <div class="setting-description">Aplikasi dapat digunakan tanpa internet</div>
              </div>
              <div class="setting-badge">
                <span class="badge badge-success">Aktif</span>
              </div>
            </div>

            ${this.getInstallButton()}
          </div>

          <div class="settings-divider"></div>

          <div class="settings-section">
            <h3>Akun</h3>

            ${this.getUserInfo()}
          </div>

          <div class="settings-divider"></div>

          <div class="settings-section">
            <h3>Tentang</h3>

            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-title">Catat Uang</div>
                <div class="setting-description">Aplikasi pencatatan keuangan sederhana</div>
              </div>
            </div>

            <div class="setting-item setting-item-action" onclick="window.open('https://github.com', '_blank')">
              <div class="setting-info">
                <div class="setting-title">Bantuan & Dukungan</div>
                <div class="setting-description">Dapatkan bantuan atau laporkan masalah</div>
              </div>
              <div class="setting-action">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </div>
            </div>

            <div class="setting-item setting-item-action" onclick="settingsModal.showPrivacyPolicy()">
              <div class="setting-info">
                <div class="setting-title">Kebijakan Privasi</div>
                <div class="setting-description">Pelajari bagaimana kami melindungi data Anda</div>
              </div>
              <div class="setting-action">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    `

    // Add backdrop click handler
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close()
      }
    })

    document.body.appendChild(this.modal)
  }

  /**
   * Get user info HTML
   */
  private getUserInfo(): string {
    const user = authStore.getUser()
    if (!user) {
      return `
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-title">Status</div>
            <div class="setting-description">Belum login</div>
          </div>
          <button class="btn-small" onclick="settingsModal.close(); authButton.handleLogin();">Login</button>
        </div>
      `
    }

    return `
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-title">Email</div>
          <div class="setting-description">${user.email}</div>
        </div>
      </div>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-title">Nama</div>
          <div class="setting-description">${user.name}</div>
        </div>
      </div>
    `
  }

  /**
   * Show modal
   */
  async show(): Promise<void> {
    if (this.modal) {
      // Update user info before showing
      const settingsSection = this.modal.querySelector('.settings-section:nth-child(2)')
      if (settingsSection) {
        settingsSection.innerHTML = `
          <h3>Akun</h3>
          ${this.getUserInfo()}
        `
      }

      // Update cache size
      const cacheSizeEl = this.modal.querySelector('#cacheSize')
      if (cacheSizeEl) {
        const size = await this.estimateCacheSize()
        cacheSizeEl.textContent = size
      }

      // Update platform info
      const platformEl = this.modal.querySelector('#platformInfo')
      if (platformEl) {
        const deviceInfo = pwaService.getDeviceInfo()
        platformEl.textContent = `${deviceInfo.platform}${deviceInfo.isMobile ? ' (Mobile)' : ''}`
      }

      // Update install button status
      const appSettingsSection = this.modal.querySelector('.settings-section:first-child')
      if (appSettingsSection) {
        const installButtonContainer = appSettingsSection.querySelector('.setting-item:last-child')
        if (installButtonContainer && installButtonContainer.classList.contains('setting-item-action')) {
          installButtonContainer.remove()
        }

        // Check if we need to add or update install button
        const hasInstallStatus = Array.from(appSettingsSection.children).some(child =>
          child.textContent && child.textContent.includes('Status Instalasi')
        )

        if (!hasInstallStatus) {
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = this.getInstallButton()
          const newInstallButton = tempDiv.firstElementChild
          if (newInstallButton) {
            appSettingsSection.appendChild(newInstallButton)
          }
        }
      }

      this.modal.style.display = 'flex'
      document.body.style.overflow = 'hidden'
    }
  }

  /**
   * Close modal
   */
  close(): void {
    if (this.modal) {
      this.modal.style.display = 'none'
      document.body.style.overflow = ''
    }
  }

  /**
   * Handle install button click
   */
  async handleInstall(): Promise<void> {
    if (pwaService.isAppInstalled()) {
      alert('Aplikasi sudah terinstal!')
      return
    }

    if (pwaService.canInstall()) {
      // Show the native install prompt
      const installed = await pwaService.promptInstall()
      if (installed) {
        // Show success message
        this.showNotification('Aplikasi berhasil diinstal!', 'success')
        this.close()
      }
    } else {
      // Show install instructions
      pwaService.showInstallInstructions()
    }
  }

  /**
   * Show privacy policy
   */
  showPrivacyPolicy(): void {
    const modal = document.createElement('div')
    modal.className = 'modal'
    modal.style.display = 'flex'
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Kebijakan Privasi</h2>
          <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="privacy-policy">
            <h3>Data Pribadi</h3>
            <p>Kami menghargai privasi Anda. Data yang Anda masukkan disimpan secara lokal dan hanya dapat diakses oleh Anda.</p>

            <h3>Informasi yang Kami Kumpulkan</h3>
            <ul>
              <li>Data pengeluaran dan perencanaan keuangan Anda</li>
              <li>Informasi akun (nama dan email) untuk autentikasi</li>
              <li>Data project yang Anda buat</li>
            </ul>

            <h3>Keamanan Data</h3>
            <p>Semua data Anda dilindungi dengan enkripsi dan hanya dapat diakses oleh Anda. Kami tidak menjual data Anda kepada pihak ketiga.</p>

            <h3>Kontak</h3>
            <p>Jika Anda memiliki pertanyaan tentang kebijakan privasi kami, silakan hubungi kami melalui fitur Bantuan & Dukungan.</p>
          </div>
        </div>
      </div>
    `

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove()
      }
    })

    document.body.appendChild(modal)
  }

  /**
   * Show notification
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div')
    notification.className = `notification notification-${type}`
    notification.innerHTML = `
      <div class="notification-content">
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">✕</button>
      </div>
    `

    document.body.appendChild(notification)

    // Auto remove after 3 seconds
    setTimeout(() => {
      notification.remove()
    }, 3000)
  }
}

// Global function for onclick handlers
declare global {
  interface Window {
    settingsModal: SettingsModal
  }
}

// Export singleton instance
export const settingsModal = new SettingsModal()
