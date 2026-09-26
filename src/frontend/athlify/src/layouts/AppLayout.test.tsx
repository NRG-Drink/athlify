import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { paths } from '../navigation/paths'
import { renderRoute } from '../test/renderRoute'

function primaryNav() {
  return screen.getByRole('navigation', { name: 'Hauptnavigation' })
}

describe('AppLayout', () => {
  test('primary navigation lists the five areas in order', async () => {
    renderRoute(paths.dashboard)
    await screen.findByRole('heading', { level: 1 })
    const links = within(primaryNav()).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Dashboard',
      'Aktivitäten',
      'Garage',
      'Body-Stats',
      'Events',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      paths.dashboard,
      paths.activities,
      paths.garage,
      paths.bodyStats,
      paths.events,
    ])
  })

  test('marks only the current area as active', async () => {
    renderRoute(paths.garage)
    await screen.findByRole('heading', { level: 1, name: 'Garage' })
    const nav = within(primaryNav())
    expect(nav.getByRole('link', { name: 'Garage' })).toHaveAttribute('aria-current', 'page')
    for (const name of ['Dashboard', 'Aktivitäten', 'Body-Stats', 'Events']) {
      expect(nav.getByRole('link', { name })).not.toHaveAttribute('aria-current')
    }
  })

  test('clicking a nav link navigates and updates heading and document title', async () => {
    const { router, user } = renderRoute(paths.dashboard)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    await user.click(within(primaryNav()).getByRole('link', { name: 'Events' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(paths.events)
    expect(document.title).toBe('Events · Athlify')
  })

  test('skip link is the first focusable element and targets main', async () => {
    const { user } = renderRoute(paths.dashboard)
    await screen.findByRole('heading', { level: 1 })
    await user.tab()
    const skipLink = screen.getByRole('link', { name: 'Zum Inhalt springen' })
    expect(skipLink).toHaveFocus()
    expect(skipLink).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })
})
