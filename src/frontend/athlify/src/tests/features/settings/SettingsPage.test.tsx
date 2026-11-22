import { screen, waitFor } from '@testing-library/react'
import i18n from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../../auth/context'
import { SettingsPage } from '../../../features/settings/SettingsPage'
import { defaultAuth } from '../../utils/renderRoute'
import { renderWithRelay } from '../../utils/relay'

const UPDATE = 'useUpdateMeMutation'

const me = {
  id: 'user-1',
  username: 'luca',
  firstName: 'Luca',
  lastName: 'Muster',
  language: 'DE',
}

const okQuery = () => ({ data: { me } })

type Handler = (operation: string, variables: Record<string, unknown>) => unknown

const auth = (logout = vi.fn().mockResolvedValue(undefined)): AuthContextValue => ({
  ...defaultAuth,
  logout,
  userName: 'luca',
})

function renderPage(handler: Handler, logout = vi.fn().mockResolvedValue(undefined)) {
  const rendered = renderWithRelay(
    <AuthContext.Provider value={auth(logout)}>
      <SettingsPage />
    </AuthContext.Provider>,
    handler,
    { path: '/settings', routePath: '/settings' },
  )
  return { ...rendered, logout }
}

const updateError = (code: string, field?: string) => ({
  data: null,
  errors: [{ message: 'server text', extensions: { code, ...(field ? { field } : {}) } }],
})

describe('SettingsPage', () => {
  it('shows the current profile values to a signed-in user without admin role', async () => {
    renderPage(() => okQuery())

    expect(await screen.findByRole('heading', { level: 1, name: 'Einstellungen' })).toBeVisible()
    expect(await screen.findByLabelText(/Vorname/)).toHaveValue('Luca')
    expect(screen.getByLabelText(/Nachname/)).toHaveValue('Muster')
    expect(screen.getByLabelText('Sprache')).toHaveValue('DE')
    expect(screen.getByText('luca')).toBeVisible()
  })

  it('shows an error with retry when the profile cannot be loaded', async () => {
    renderPage(() => ({ data: null, errors: [{ message: 'boom' }] }))

    expect(await screen.findByText('Die Einstellungen konnten nicht geladen werden.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible()
  })

  describe('profile', () => {
    it('keeps Speichern disabled until something changed', async () => {
      const { user } = renderPage(() => okQuery())
      const save = await screen.findByRole('button', { name: 'Speichern' })
      expect(save).toBeDisabled()

      await user.type(await screen.findByLabelText(/Vorname/), 'a')
      expect(save).toBeEnabled()
    })

    it('sends only the profile fields, and switches the UI language immediately', async () => {
      const { user, calls } = renderPage((operation) =>
        operation === UPDATE ? { data: { updateMe: { ...me, language: 'EN' } } } : okQuery(),
      )

      await user.selectOptions(await screen.findByLabelText('Sprache'), 'EN')
      await user.click(screen.getByRole('button', { name: 'Speichern' }))

      await waitFor(() => expect(i18n.resolvedLanguage).toBe('en'))
      expect(calls(UPDATE)).toEqual([
        { input: { firstName: 'Luca', lastName: 'Muster', language: 'EN' } },
      ])
      expect(await screen.findByRole('heading', { level: 1, name: 'Settings' })).toBeVisible()
      expect(await screen.findByText('Profile saved.')).toBeVisible()
    })

    it('shows the saved name after a successful save', async () => {
      const { user } = renderPage((operation, variables) =>
        operation === UPDATE
          ? {
              data: {
                updateMe: {
                  ...me,
                  firstName: (variables.input as { firstName: string }).firstName,
                },
              },
            }
          : okQuery(),
      )

      const first = await screen.findByLabelText(/Vorname/)
      await user.clear(first)
      await user.type(first, 'Lucas')
      await user.click(screen.getByRole('button', { name: 'Speichern' }))

      expect(await screen.findByText('Profil gespeichert.')).toBeVisible()
      expect(screen.getByLabelText(/Vorname/)).toHaveValue('Lucas')
      expect(screen.getByRole('button', { name: 'Speichern' })).toBeDisabled()
    })

    it('blocks a blank name without sending a request', async () => {
      const { user, calls } = renderPage(() => okQuery())

      await user.clear(await screen.findByLabelText(/Vorname/))
      await user.click(screen.getByRole('button', { name: 'Speichern' }))

      expect(await screen.findByText('Pflichtfeld.')).toBeVisible()
      expect(screen.getByLabelText(/Vorname/)).toHaveFocus()
      expect(calls(UPDATE)).toEqual([])
    })

    it('shows a generic error and keeps the values when saving fails', async () => {
      const { user } = renderPage((operation) =>
        operation === UPDATE ? { data: null, errors: [{ message: 'boom' }] } : okQuery(),
      )

      await user.type(await screen.findByLabelText(/Vorname/), 'a')
      await user.click(screen.getByRole('button', { name: 'Speichern' }))

      expect(
        await screen.findByText('Speichern fehlgeschlagen. Bitte versuche es nochmals.'),
      ).toBeVisible()
      expect(screen.getByLabelText(/Vorname/)).toHaveValue('Lucaa')
    })

    it('disables the button while saving', async () => {
      const { user } = renderPage((operation) =>
        operation === UPDATE ? new Promise(() => {}) : okQuery(),
      )

      await user.type(await screen.findByLabelText(/Vorname/), 'a')
      await user.click(screen.getByRole('button', { name: 'Speichern' }))

      await waitFor(() =>
        expect(document.querySelector('button[type="submit"][data-loading]')).toBeDisabled(),
      )
    })
  })

  describe('password', () => {
    const fill = async (
      user: ReturnType<typeof renderPage>['user'],
      current: string,
      next: string,
      confirmation: string,
    ) => {
      await user.type(await screen.findByLabelText(/Aktuelles Passwort/), current)
      await user.type(screen.getByLabelText(/^Neues Passwort(?! bestätigen)/), next)
      await user.type(screen.getByLabelText(/Neues Passwort bestätigen/), confirmation)
    }

    it('keeps the button disabled until all three fields have text', async () => {
      const { user } = renderPage(() => okQuery())
      const submit = await screen.findByRole('button', { name: 'Passwort ändern' })
      expect(submit).toBeDisabled()

      await fill(user, 'alt', 'neu', 'neu')
      expect(submit).toBeEnabled()
    })

    it('reports a mismatching confirmation while typing and blocks the submit', async () => {
      const { user, calls } = renderPage(() => okQuery())

      await fill(user, 'alt', 'neu', 'ne')

      expect(await screen.findByText('Die Passwörter stimmen nicht überein.')).toBeVisible()
      expect(screen.getByRole('button', { name: 'Passwort ändern' })).toBeDisabled()
      expect(calls(UPDATE)).toEqual([])
    })

    it('clears the mismatch once both new passwords match, whichever field is edited', async () => {
      const { user } = renderPage(() => okQuery())

      await fill(user, 'alt', 'neu', 'neu')
      expect(screen.queryByText('Die Passwörter stimmen nicht überein.')).not.toBeInTheDocument()

      await user.type(screen.getByLabelText(/^Neues Passwort(?! bestätigen)/), 'x')
      expect(await screen.findByText('Die Passwörter stimmen nicht überein.')).toBeVisible()

      await user.type(screen.getByLabelText(/Neues Passwort bestätigen/), 'x')
      await waitFor(() =>
        expect(screen.queryByText('Die Passwörter stimmen nicht überein.')).not.toBeInTheDocument(),
      )
      expect(screen.getByRole('button', { name: 'Passwort ändern' })).toBeEnabled()
    })

    it('reports a wrong current password and keeps the session', async () => {
      const { user, logout } = renderPage((operation) =>
        operation === UPDATE
          ? updateError('CURRENT_PASSWORD_INCORRECT', 'currentPassword')
          : okQuery(),
      )

      await fill(user, 'falsch', 'neu', 'neu')
      await user.click(screen.getByRole('button', { name: 'Passwort ändern' }))

      expect(await screen.findByText('Das aktuelle Passwort stimmt nicht.')).toBeVisible()
      expect(screen.getByLabelText(/Aktuelles Passwort/)).toHaveFocus()
      expect(logout).not.toHaveBeenCalled()
      expect(screen.getByLabelText(/^Neues Passwort(?! bestätigen)/)).toHaveValue('neu')
    })

    it('sends only the password change, never the confirmation, and signs out on success', async () => {
      const { user, calls, logout } = renderPage((operation) =>
        operation === UPDATE ? { data: { updateMe: me } } : okQuery(),
      )

      await fill(user, 'alt', 'neu', 'neu')
      await user.click(screen.getByRole('button', { name: 'Passwort ändern' }))

      expect(await screen.findByText('Passwort geändert. Bitte melde dich neu an.')).toBeVisible()
      expect(calls(UPDATE)).toEqual([
        { input: { passwordChange: { currentPassword: 'alt', newPassword: 'neu' } } },
      ])
      expect(logout).toHaveBeenCalledTimes(1)
    })

    it('still reports success when the sign-out request fails', async () => {
      const { user, logout } = renderPage(
        (operation) => (operation === UPDATE ? { data: { updateMe: me } } : okQuery()),
        vi.fn().mockRejectedValue(new Error('offline')),
      )

      await fill(user, 'alt', 'neu', 'neu')
      await user.click(screen.getByRole('button', { name: 'Passwort ändern' }))

      expect(await screen.findByText('Passwort geändert. Bitte melde dich neu an.')).toBeVisible()
      await waitFor(() => expect(logout).toHaveBeenCalled())
      expect(
        screen.queryByText('Speichern fehlgeschlagen. Bitte versuche es nochmals.'),
      ).not.toBeInTheDocument()
    })
  })
})
