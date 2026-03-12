// Custom Google Identity Services type definitions

export interface CredentialResponse {
  credential: string
  select_by?: string
}

export interface PromptMomentNotification {
  isNotDisplayed(): boolean
  isSkipped(): boolean
  getDismissedReason(): 'credential_returned' | 'cancel_called' | 'flow_restarted'
  getSkippedReason(): () => string
}

export interface IdConfiguration {
  client_id: string
  callback: (response: CredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
  context?: 'signin' | 'signup' | 'use'
  ux_mode?: 'popup' | 'redirect'
  login_uri?: string
  native_callback?: () => void
  allowed_parent_origin?: string | string[]
  itp_support?: boolean
  intermediate_iframe_close_callback?: () => void
}

export interface PromptOptions {
  promptMomentNotification?: (notification: PromptMomentNotification) => void
}

export interface GoogleAccountsId {
  initialize(config: IdConfiguration): void
  prompt(callback?: (notification: PromptMomentNotification) => void): void
  renderButton(
    parent: HTMLElement | string,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black'
      size?: 'large' | 'medium' | 'small'
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
      shape?: 'rectangular' | 'pill' | 'circle' | 'square'
      logo_alignment?: 'left' | 'center'
      width?: number | string
      locale?: string
      type?: 'standard'
      click_listener?: () => void
    }
  ): void
  disableAutoSelect(): void
  storeCredential(callback: () => void, opt?: { id: string }): void
  cancel(): void
  revoke(id: string, callback: () => void): void
}

export interface GoogleAccounts {
  id: GoogleAccountsId
}

declare global {
  interface Window {
    google?: {
      accounts: GoogleAccounts
    }
  }
}

export {}
