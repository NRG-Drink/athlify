import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { paths } from '../navigation/paths'
import { renderRoute } from '../test/renderRoute'

async function openUserMenu() {
  const rendered = renderRoute(paths.dashboard)
  await screen.findByRole('heading', { level: 1 })
  const trigger = screen.getByRole('button', { name: 'Benutzermenü' })
  expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
  trigger.focus()
  await rendered.user.keyboard('{Enter}')
  const panel = await screen.findByRole('dialog', { name: 'Benutzermenü' })
  return { ...rendered, panel }
}

describe('UserMenu', () => {
  test('opens by keyboard and offers settings, language and color mode', async () => {
    const { panel } = await openUserMenu()
    const menu = within(panel)
    expect(menu.getByRole('link', { name: 'Einstellungen' })).toHaveAttribute(
      'href',
      paths.settings,
    )
    expect(menu.getByRole('combobox', { name: 'Sprache' })).toBeInTheDocument()
    expect(menu.getByRole('button', { name: 'Farbmodus wechseln' })).toBeInTheDocument()
  })

  test('settings link navigates and closes the menu', async () => {
    const { panel, router, user } = await openUserMenu()
    await user.click(within(panel).getByRole('link', { name: 'Einstellungen' }))
    expect(router.state.location.pathname).toBe(paths.settings)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Einstellungen' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Benutzermenü' })).not.toBeInTheDocument(),
    )
  })

  test('switching the language updates labels, html lang and title', async () => {
    const { panel, user } = await openUserMenu()
    await user.selectOptions(within(panel).getByRole('combobox', { name: 'Sprache' }), 'en')

    const nav = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(within(nav).getByRole('link', { name: 'Activities' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('en')
    await waitFor(() => expect(document.title).toBe('Dashboard · Athlify'))
    expect(screen.getByRole('link', { name: 'Skip to content' })).toBeInTheDocument()
  })
})
