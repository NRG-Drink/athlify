import { useEffect } from 'react'
import { authEvents } from './events'
import { refreshAccessToken } from './refresh'
import { SessionRequestInvalidatedError } from './sessionRequests'
import { tokenStore } from './tokenStore'

const SCHEDULED_REFRESH_BUFFER_MS = 60_000

interface SessionRefreshHandlers {
  /** The session ended: clear the token and the state that depends on it. */
  onSessionExpired: () => void
  /** A new token arrived: update the state that depends on it. */
  onTokenUpdated: () => void
  /** The refresh was rejected, so the user has to sign in again. */
  onRefreshRejected: () => void
  onRefreshFailed: (error: unknown) => void
}

/**
 * Refreshes the access token shortly before it expires while the page is visible, and when the page
 * becomes visible again. The handlers must not change between renders.
 */
export function useSessionRefresh({
  onSessionExpired,
  onTokenUpdated,
  onRefreshRejected,
  onRefreshFailed,
}: SessionRefreshHandlers) {
  useEffect(() => {
    let active = true
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null

    const clearRefreshTimeout = () => {
      if (refreshTimeout !== null) {
        clearTimeout(refreshTimeout)
        refreshTimeout = null
      }
    }

    const scheduleRefresh = () => {
      clearRefreshTimeout()

      if (document.visibilityState !== 'visible') return

      const expiry = tokenStore.getExpiry()
      if (expiry === null || tokenStore.get() === null) return

      const timeUntilExpiry = expiry - Date.now()
      if (timeUntilExpiry <= 0) return

      const refreshBuffer = Math.min(SCHEDULED_REFRESH_BUFFER_MS, timeUntilExpiry / 10)
      const delay = timeUntilExpiry - refreshBuffer
      refreshTimeout = setTimeout(() => {
        refreshTimeout = null
        if (document.visibilityState === 'visible') refreshInBackground()
      }, delay)
    }

    const refreshInBackground = () => {
      clearRefreshTimeout()
      void refreshAccessToken()
        .then((token) => {
          if (!active || token !== null) return
          onRefreshRejected()
          authEvents.dispatchEvent(new Event('session-expired'))
        })
        .catch((error: unknown) => {
          if (!active || error instanceof SessionRequestInvalidatedError) return
          onRefreshFailed(error)
        })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        clearRefreshTimeout()
        return
      }

      const expiry = tokenStore.getExpiry()
      if (
        expiry !== null &&
        tokenStore.get() !== null &&
        expiry - Date.now() <= SCHEDULED_REFRESH_BUFFER_MS
      ) {
        refreshInBackground()
      } else {
        scheduleRefresh()
      }
    }

    const handleSessionExpired = () => {
      clearRefreshTimeout()
      onSessionExpired()
    }

    const handleTokenUpdated = () => {
      onTokenUpdated()
      scheduleRefresh()
    }

    authEvents.addEventListener('session-expired', handleSessionExpired)
    authEvents.addEventListener('token-updated', handleTokenUpdated)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    handleVisibilityChange()
    return () => {
      active = false
      clearRefreshTimeout()
      authEvents.removeEventListener('session-expired', handleSessionExpired)
      authEvents.removeEventListener('token-updated', handleTokenUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [onRefreshFailed, onRefreshRejected, onSessionExpired, onTokenUpdated])
}
