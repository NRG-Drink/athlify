import { screen, waitFor, within } from '@testing-library/react'
import i18n from 'i18next'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../../auth/context'
import { AdminRoute } from '../../../features/admin-users/AdminRoute'
import { AdminUsersPage } from '../../../features/admin-users/AdminUsersPage'
import { mockGridViewport } from '../../utils/gridViewport'
import { defaultAuth } from '../../utils/renderRoute'
import { graphqlError, renderWithRelay, type Handler } from '../../utils/relay'

beforeEach(() => mockGridViewport())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const QUERY = 'AdminUsersPageQuery'
const CREATE = 'useUserMutationsCreateMutation'
const UPDATE = 'useUserMutationsUpdateMutation'
const RESET = 'useUserMutationsResetMutation'
const DELETE = 'useUserMutationsDeleteMutation'

const admin = {
  id: 'u-admin',
  username: 'admin',
  firstName: 'Anna',
  lastName: 'Admin',
  language: 'DE',
  role: 'ADMIN',
}
const luca = {
  id: 'u-luca',
  username: 'luca',
  firstName: 'Luca',
  lastName: 'Muster',
  language: 'DE',
  role: 'USER',
}

const okQuery = () => ({ data: { me: { id: admin.id }, users: [admin, luca] } })

const adminAuth: AuthContextValue = { ...defaultAuth, hasRole: (role) => role === 'Admin' }

function renderPage(handler: Handler, auth: AuthContextValue = adminAuth) {
  return renderWithRelay(
    <AuthContext.Provider value={auth}>
      <AdminRoute>
        <AdminUsersPage />
      </AdminRoute>
    </AuthContext.Provider>,
    handler,
    { path: '/admin/users', routePath: '/admin/users' },
  )
}

describe('AdminUsersPage', () => {
  it('shows a no-access state to a regular user without asking the server for users', async () => {
    const { calls } = renderPage(() => okQuery(), { ...defaultAuth, hasRole: () => false })

    expect(await screen.findByRole('heading', { level: 1, name: 'Kein Zugriff' })).toBeVisible()
    expect(screen.getByText('Dieser Bereich ist nur für Administratoren.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Zurück zum Dashboard' })).toBeVisible()
    expect(calls(QUERY)).toHaveLength(0)
  })

  it('lists name, username and role, and marks the signed-in administrator', async () => {
    renderPage(() => okQuery())

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Benutzerverwaltung' }),
    ).toBeVisible()
    const admin = await screen.findByRole('button', { name: /Anna Admin bearbeiten/ })
    expect(within(admin).getByText('(du)')).toBeVisible()
    expect(screen.getByText('Administrator')).toBeVisible()
    const lucas = screen.getByRole('button', { name: /Luca Muster bearbeiten/ })
    expect(within(lucas).queryByText('(du)')).not.toBeInTheDocument()
    expect(screen.getByText('Benutzer')).toBeVisible()
    expect(screen.getByText('2 Benutzer')).toBeVisible()
  })

  it('shows an error with retry when the users cannot be loaded', async () => {
    renderPage(() => ({ data: null, errors: [{ message: 'boom' }] }))

    expect(await screen.findByText('Die Benutzer konnten nicht geladen werden.')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible()
  })

  describe('create', () => {
    const created = {
      id: 'u-mia',
      username: 'mia',
      firstName: 'Mia',
      lastName: 'Meier',
      language: 'EN',
      role: 'USER',
    }

    it('sends the form, closes the dialog and shows the new user in the list', async () => {
      const { user, calls } = renderPage((operation) =>
        operation === CREATE ? { data: { createUser: created } } : okQuery(),
      )

      await user.click(await screen.findByRole('button', { name: 'Benutzer anlegen' }))
      const dialog = await screen.findByRole('dialog', { name: 'Benutzer anlegen' })
      await user.type(within(dialog).getByLabelText(/Benutzername/), ' mia ')
      await user.type(within(dialog).getByLabelText(/Vorname/), 'Mia')
      await user.type(within(dialog).getByLabelText(/Nachname/), 'Meier')
      await user.selectOptions(within(dialog).getByLabelText('Sprache'), 'EN')
      await user.type(within(dialog).getByLabelText(/Passwort/), 'secret-pass')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(await screen.findByText('Benutzer angelegt.')).toBeVisible()
      expect(calls(CREATE)).toEqual([
        {
          input: {
            username: 'mia',
            firstName: 'Mia',
            lastName: 'Meier',
            language: 'EN',
            role: 'USER',
            password: 'secret-pass',
          },
        },
      ])
      expect(await screen.findByRole('button', { name: /Mia Meier bearbeiten/ })).toBeVisible()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('blocks missing fields without sending a request', async () => {
      const { user, calls } = renderPage(() => okQuery())

      await user.click(await screen.findByRole('button', { name: 'Benutzer anlegen' }))
      const dialog = await screen.findByRole('dialog', { name: 'Benutzer anlegen' })
      await user.type(within(dialog).getByLabelText(/Passwort/), 'short')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(await within(dialog).findAllByText('Pflichtfeld.')).toHaveLength(3)
      expect(within(dialog).getByLabelText(/Benutzername/)).toHaveFocus()
      expect(calls(CREATE)).toHaveLength(0)
    })

    it('shows a taken username under the field, in German', async () => {
      const { user } = renderPage((operation) =>
        operation === CREATE ? graphqlError('USERNAME_TAKEN', 'username') : okQuery(),
      )

      await user.click(await screen.findByRole('button', { name: 'Benutzer anlegen' }))
      const dialog = await screen.findByRole('dialog', { name: 'Benutzer anlegen' })
      await user.type(within(dialog).getByLabelText(/Benutzername/), 'luca')
      await user.type(within(dialog).getByLabelText(/Vorname/), 'Luca')
      await user.type(within(dialog).getByLabelText(/Nachname/), 'Zwei')
      await user.type(within(dialog).getByLabelText(/Passwort/), 'secret-pass')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(
        await within(dialog).findByText('Dieser Benutzername ist schon vergeben.'),
      ).toBeVisible()
      expect(screen.queryByText('server text')).not.toBeInTheDocument()
    })
  })

  describe('edit', () => {
    it('opens from the row, saves name, language and role, and updates the list', async () => {
      const { user, calls } = renderPage((operation) =>
        operation === UPDATE
          ? { data: { updateUser: { ...luca, firstName: 'Lucas', role: 'ADMIN' } } }
          : okQuery(),
      )

      await user.click(
        await screen.findByRole('button', { name: 'Benutzer Luca Muster bearbeiten' }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Benutzer bearbeiten' })
      expect(within(dialog).getByText('luca')).toBeVisible()
      expect(within(dialog).queryByLabelText(/Passwort/)).not.toBeInTheDocument()
      const first = within(dialog).getByLabelText(/Vorname/)
      await user.clear(first)
      await user.type(first, 'Lucas')
      await user.selectOptions(within(dialog).getByLabelText('Rolle'), 'ADMIN')
      expect(
        within(dialog).getByText('Nach der Änderung muss sich die Person neu anmelden.'),
      ).toBeVisible()
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(await screen.findByText('Änderungen gespeichert.')).toBeVisible()
      expect(calls(UPDATE)).toEqual([
        {
          id: 'u-luca',
          input: { firstName: 'Lucas', lastName: 'Muster', language: 'DE', role: 'ADMIN' },
        },
      ])
      expect(await screen.findByRole('button', { name: /Lucas Muster bearbeiten/ })).toBeVisible()
    })

    it('does not let administrators change their own role', async () => {
      const { user } = renderPage(() => okQuery())

      await user.click(await screen.findByRole('button', { name: /Anna Admin bearbeiten/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Benutzer bearbeiten' })

      expect(within(dialog).getByLabelText('Rolle')).toBeDisabled()
      expect(within(dialog).getByText('Du kannst deine eigene Rolle nicht ändern.')).toBeVisible()
    })

    it('switches the UI language when administrators save their own language', async () => {
      const { user } = renderPage((operation) =>
        operation === UPDATE ? { data: { updateUser: { ...admin, language: 'EN' } } } : okQuery(),
      )

      await user.click(await screen.findByRole('button', { name: /Anna Admin bearbeiten/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Benutzer bearbeiten' })
      await user.selectOptions(within(dialog).getByLabelText('Sprache'), 'EN')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      await waitFor(() => expect(i18n.resolvedLanguage).toBe('en'))
      expect(
        await screen.findByRole('heading', { level: 1, name: 'User management' }),
      ).toBeVisible()
      await i18n.changeLanguage('de')
    })

    it('keeps the UI language when the language of another user is saved', async () => {
      const { user } = renderPage((operation) =>
        operation === UPDATE ? { data: { updateUser: { ...luca, language: 'EN' } } } : okQuery(),
      )

      await user.click(await screen.findByRole('button', { name: /Luca Muster bearbeiten/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Benutzer bearbeiten' })
      await user.selectOptions(within(dialog).getByLabelText('Sprache'), 'EN')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(await screen.findByText('Änderungen gespeichert.')).toBeVisible()
      expect(i18n.resolvedLanguage).toBe('de')
    })

    it('shows the last-administrator rule under the role field', async () => {
      const { user } = renderPage((operation) =>
        operation === UPDATE ? graphqlError('LAST_ADMIN', 'role') : okQuery(),
      )

      await user.click(await screen.findByRole('button', { name: /Luca Muster bearbeiten/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Benutzer bearbeiten' })
      await user.selectOptions(within(dialog).getByLabelText('Rolle'), 'ADMIN')
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(
        await within(dialog).findByText('Es muss mindestens ein Administrator bleiben.'),
      ).toBeVisible()
    })

    it('shows a generic error toast for an unknown failure and keeps the dialog open', async () => {
      const { user } = renderPage((operation) =>
        operation === UPDATE ? graphqlError('FORBIDDEN') : okQuery(),
      )

      await user.click(await screen.findByRole('button', { name: /Luca Muster bearbeiten/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Benutzer bearbeiten' })
      await user.click(within(dialog).getByRole('button', { name: 'Speichern' }))

      expect(
        await screen.findByText('Speichern fehlgeschlagen. Bitte versuche es nochmals.'),
      ).toBeVisible()
      expect(screen.getByRole('dialog', { name: 'Benutzer bearbeiten' })).toBeVisible()
    })
  })

  describe('reset password', () => {
    async function openReset(user: ReturnType<typeof renderPage>['user']) {
      await user.click(await screen.findByRole('button', { name: 'Aktionen für Luca Muster' }))
      await user.click(await screen.findByRole('menuitem', { name: 'Passwort zurücksetzen' }))
      return screen.findByRole('dialog', { name: 'Passwort für Luca Muster zurücksetzen' })
    }

    it('warns administrators resetting their own password and signs them out afterwards', async () => {
      const logout = vi.fn().mockResolvedValue(undefined)
      const { user, calls } = renderPage(
        (operation) =>
          operation === RESET ? { data: { resetUserPassword: { id: admin.id } } } : okQuery(),
        { ...adminAuth, logout },
      )

      await user.click(await screen.findByRole('button', { name: 'Aktionen für Anna Admin' }))
      await user.click(await screen.findByRole('menuitem', { name: 'Passwort zurücksetzen' }))
      const dialog = await screen.findByRole('dialog', {
        name: 'Passwort für Anna Admin zurücksetzen',
      })
      expect(within(dialog).getByText(/Du setzt dein eigenes Passwort zurück./)).toBeVisible()
      await user.type(within(dialog).getByLabelText(/Neues Passwort/), 'brand-new-pass')
      await user.click(within(dialog).getByRole('button', { name: 'Zurücksetzen' }))

      expect(await screen.findByText('Passwort zurückgesetzt.')).toBeVisible()
      expect(calls(RESET)).toEqual([{ id: 'u-admin', input: { newPassword: 'brand-new-pass' } }])
      await waitFor(() => expect(logout).toHaveBeenCalledOnce())
    })

    it('does not sign out when resetting the password of another user', async () => {
      const logout = vi.fn().mockResolvedValue(undefined)
      const { user } = renderPage(
        (operation) =>
          operation === RESET ? { data: { resetUserPassword: { id: luca.id } } } : okQuery(),
        { ...adminAuth, logout },
      )

      const dialog = await openReset(user)
      await user.type(within(dialog).getByLabelText(/Neues Passwort/), 'brand-new-pass')
      await user.click(within(dialog).getByRole('button', { name: 'Zurücksetzen' }))

      expect(await screen.findByText('Passwort zurückgesetzt.')).toBeVisible()
      expect(logout).not.toHaveBeenCalled()
    })

    it('sets the new password and says before the click that the person is signed out', async () => {
      const { user, calls } = renderPage((operation) =>
        operation === RESET ? { data: { resetUserPassword: { id: luca.id } } } : okQuery(),
      )

      const dialog = await openReset(user)
      expect(
        within(dialog).getByText(/Die Person wird auf allen Geräten abgemeldet\./),
      ).toBeVisible()
      await user.type(within(dialog).getByLabelText(/Neues Passwort/), 'brand-new-pass')
      await user.click(within(dialog).getByRole('button', { name: 'Zurücksetzen' }))

      expect(await screen.findByText('Passwort zurückgesetzt.')).toBeVisible()
      expect(calls(RESET)).toEqual([{ id: 'u-luca', input: { newPassword: 'brand-new-pass' } }])
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('shows the length limit the server names for a short password', async () => {
      const { user } = renderPage((operation) =>
        operation === RESET
          ? {
              data: null,
              errors: [
                {
                  message: 'server text',
                  extensions: {
                    code: 'VALIDATION_ERROR',
                    field: 'newPassword',
                    rule: 'PASSWORD_TOO_SHORT',
                    minLength: 12,
                  },
                },
              ],
            }
          : okQuery(),
      )

      const dialog = await openReset(user)
      await user.type(within(dialog).getByLabelText(/Neues Passwort/), 'short')
      await user.click(within(dialog).getByRole('button', { name: 'Zurücksetzen' }))

      expect(
        await within(dialog).findByText('Das Passwort braucht mindestens 12 Zeichen.'),
      ).toBeVisible()
    })
  })

  describe('delete', () => {
    const openMenu = async (user: ReturnType<typeof renderPage>['user'], name: string) => {
      await user.click(await screen.findByRole('button', { name: `Aktionen für ${name}` }))
      return screen.findByRole('menu')
    }

    it('asks first, names the consequences, then deletes the user and removes the row', async () => {
      const { user, calls } = renderPage((operation) =>
        operation === DELETE ? { data: { deleteUser: luca.id } } : okQuery(),
      )

      const menu = await openMenu(user, 'Luca Muster')
      await user.click(within(menu).getByRole('menuitem', { name: 'Benutzer löschen' }))
      const dialog = await screen.findByRole('alertdialog', { name: 'Benutzer löschen?' })
      expect(within(dialog).getByText(/Luca Muster \(luca\)/)).toBeVisible()
      expect(within(dialog).getByText(/Body-Stats endgültig gelöscht/)).toBeVisible()
      expect(within(dialog).getByRole('button', { name: 'Abbrechen' })).toHaveFocus()
      expect(calls(DELETE)).toHaveLength(0)
      await user.click(within(dialog).getByRole('button', { name: 'Löschen' }))

      expect(await screen.findByText('Benutzer gelöscht.')).toBeVisible()
      expect(calls(DELETE)).toEqual([{ id: 'u-luca' }])
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: /Luca Muster bearbeiten/ }),
        ).not.toBeInTheDocument(),
      )
      expect(screen.getByText('1 Benutzer')).toBeVisible()
    })

    it('keeps the user when the deletion is cancelled', async () => {
      const { user, calls } = renderPage(() => okQuery())

      const menu = await openMenu(user, 'Luca Muster')
      await user.click(within(menu).getByRole('menuitem', { name: 'Benutzer löschen' }))
      const dialog = await screen.findByRole('alertdialog')
      await user.click(within(dialog).getByRole('button', { name: 'Abbrechen' }))

      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
      expect(screen.getByRole('button', { name: /Luca Muster bearbeiten/ })).toBeVisible()
      expect(calls(DELETE)).toHaveLength(0)
    })

    it('does not offer deleting your own account', async () => {
      const { user } = renderPage(() => okQuery())

      const menu = await openMenu(user, 'Anna Admin')

      expect(within(menu).getByRole('menuitem', { name: 'Passwort zurücksetzen' })).toBeVisible()
      expect(
        within(menu).queryByRole('menuitem', { name: 'Benutzer löschen' }),
      ).not.toBeInTheDocument()
    })

    it('shows an error toast and keeps the dialog open for a retry when the server refuses', async () => {
      const { user } = renderPage((operation) =>
        operation === DELETE ? graphqlError('CANNOT_DELETE_SELF') : okQuery(),
      )

      const menu = await openMenu(user, 'Luca Muster')
      await user.click(within(menu).getByRole('menuitem', { name: 'Benutzer löschen' }))
      const dialog = await screen.findByRole('alertdialog')
      await user.click(within(dialog).getByRole('button', { name: 'Löschen' }))

      expect(
        await screen.findByText('Speichern fehlgeschlagen. Bitte versuche es nochmals.'),
      ).toBeVisible()
      const open = screen.getByRole('alertdialog', { name: 'Benutzer löschen?' })
      expect(open).toBeVisible()
      await user.click(within(open).getByRole('button', { name: 'Abbrechen' }))
      expect(await screen.findByRole('button', { name: /Luca Muster bearbeiten/ })).toBeVisible()
    })
  })
})
