import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RelayEnvironmentProvider } from 'react-relay'
import { authUrl, readAccessTokenResponse } from './api'
import { AuthContext, type AuthContextValue } from './context'
import { authEvents } from './events'
import { clearRefreshFailure, invalidateRefreshRequests, refreshAccessToken } from './refresh'
import {
  getSessionGeneration,
  invalidateSessionRequests,
  isSessionGenerationCurrent,
  runSessionRequest,
  SessionRequestInvalidatedError,
} from './sessionRequests'
import { tokenStore } from './tokenStore'
import { useAccountLanguage } from './useAccountLanguage'
import { useSessionRefresh } from './useSessionRefresh'
import { createRelayEnvironment } from '../relay/environment'
import { toaster } from '../components/ui/toaster'

function FullPageSpinner() {
  const { t } = useTranslation()
  return (
    <main className="app-loading" role="status" aria-live="polite">
      <span className="loading-indicator" aria-hidden="true" />
      <p>{t('auth.restoringSession')}</p>
    </main>
  )
}

export function AuthAndRelayProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [environment, setEnvironment] = useState(createRelayEnvironment)
  const [sessionKey, setSessionKey] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [roles, setRoles] = useState<readonly string[]>([])
  const [userName, setUserName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const refreshFailureNotified = useRef(false)

  const resetRelaySession = useCallback(() => {
    setEnvironment(createRelayEnvironment())
    setSessionKey((key) => key + 1)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await refreshAccessToken()
        if (active) {
          setIsLoggedIn(token !== null)
          setRoles(token ? tokenStore.getRoles() : [])
          setUserName(token ? tokenStore.getUserName() : null)
        }
      } catch (error: unknown) {
        if (active && !(error instanceof SessionRequestInvalidatedError)) {
          setBootstrapError(
            error instanceof Error
              ? `Could not restore your session: ${error.message}`
              : 'Could not restore your session.',
          )
        }
      } finally {
        if (active) setIsBootstrapping(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  useAccountLanguage(isLoggedIn, environment)

  const handleSessionExpired = useCallback(() => {
    invalidateSessionRequests()
    invalidateRefreshRequests()
    tokenStore.clear()
    setIsLoggedIn(false)
    setRoles([])
    setUserName(null)
    setBootstrapError(null)
    refreshFailureNotified.current = false
    resetRelaySession()
  }, [resetRelaySession])

  const handleTokenUpdated = useCallback(() => {
    setBootstrapError(null)
    refreshFailureNotified.current = false
    setRoles(tokenStore.getRoles())
    setUserName(tokenStore.getUserName())
  }, [])

  const handleRefreshRejected = useCallback(() => {
    setBootstrapError('Your session has expired. Please sign in again.')
  }, [])

  const handleRefreshFailed = useCallback(
    (error: unknown) => {
      setBootstrapError(
        error instanceof Error
          ? `Could not refresh your session: ${error.message}`
          : 'Could not refresh your session.',
      )
      if (!refreshFailureNotified.current) {
        refreshFailureNotified.current = true
        toaster.create({ type: 'error', title: t('auth.sessionRefreshFailed') })
      }
    },
    [t],
  )

  useSessionRefresh({
    onSessionExpired: handleSessionExpired,
    onTokenUpdated: handleTokenUpdated,
    onRefreshRejected: handleRefreshRejected,
    onRefreshFailed: handleRefreshFailed,
  })

  const login = useCallback(
    async (username: string, password: string) => {
      invalidateSessionRequests()
      const generation = getSessionGeneration()
      invalidateRefreshRequests(false)
      setIsLoading(true)
      setBootstrapError(null)
      try {
        await runSessionRequest(async () => {
          if (!isSessionGenerationCurrent(generation)) {
            throw new SessionRequestInvalidatedError()
          }

          const response = await fetch(authUrl('login'), {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })

          if (!response.ok) {
            throw new Error(
              response.status === 401
                ? 'Invalid username or password.'
                : `Sign-in failed (HTTP ${response.status}).`,
            )
          }

          const data = await readAccessTokenResponse(response)
          if (!isSessionGenerationCurrent(generation)) {
            throw new SessionRequestInvalidatedError()
          }

          tokenStore.set(data.token, data.expiresAt)
          clearRefreshFailure()
          setIsLoggedIn(true)
          setRoles(tokenStore.getRoles())
          setUserName(tokenStore.getUserName())
          authEvents.dispatchEvent(new Event('token-updated'))
          resetRelaySession()
        })
      } finally {
        setIsLoading(false)
      }
    },
    [resetRelaySession],
  )

  const logout = useCallback(async () => {
    authEvents.dispatchEvent(new Event('session-expired'))

    let logoutError: Error | null = null
    try {
      const response = await runSessionRequest(() =>
        fetch(authUrl('logout'), {
          method: 'POST',
          credentials: 'include',
        }),
      )
      if (!response.ok) {
        logoutError = new Error(`Sign-out failed (HTTP ${response.status}).`)
      }
    } catch (error) {
      logoutError = error instanceof Error ? error : new Error('Sign-out failed.')
    }

    if (logoutError) throw logoutError
  }, [])

  const authValue = useMemo<AuthContextValue>(
    () => ({
      isLoggedIn,
      login,
      logout,
      isLoading,
      bootstrapError,
      hasRole: (role) => roles.includes(role),
      userName,
    }),
    [isLoggedIn, login, logout, isLoading, bootstrapError, roles, userName],
  )

  if (isBootstrapping) {
    return <FullPageSpinner />
  }

  return (
    <AuthContext.Provider value={authValue}>
      <RelayEnvironmentProvider key={sessionKey} environment={environment}>
        {children}
      </RelayEnvironmentProvider>
    </AuthContext.Provider>
  )
}
