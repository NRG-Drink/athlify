import { screen, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { paths } from '../../navigation/paths'
import { renderRoute } from '../utils/renderRoute'

function primaryNav() {
  return screen.getByRole('navigation', { name: 'Hauptnavigation' })
}

describe('AppLayout', () => {
  test('primary navigation lists the seven areas in order', async () => {
    renderRoute(paths.dashboard)
    await screen.findByRole('heading', { level: 1 })
    const links = within(primaryNav()).getAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      'Dashboard',
      'Aktivitäten',
      'Garage',
      'Body-Stats',
      'Events',
      'Meine Events',
      'AG-Events',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      paths.dashboard,
      paths.activities,
      paths.garage,
      paths.bodyStats,
      paths.events,
      paths.myEvents,
      paths.agEvents,
    ])
  })

  test('marks only the current area as active', async () => {
    renderRoute(paths.garage)
    await screen.findByRole('heading', { level: 1, name: 'Garage' })
    const nav = within(primaryNav())
    expect(nav.getByRole('link', { name: 'Garage' })).toHaveAttribute('aria-current', 'page')
    for (const name of [
      'Dashboard',
      'Aktivitäten',
      'Body-Stats',
      'Events',
      'Meine Events',
      'AG-Events',
    ]) {
      expect(nav.getByRole('link', { name })).not.toHaveAttribute('aria-current')
    }
  })

  test('AG-Events navigation opens the AG Grid events page', async () => {
    const { router, user } = renderRoute(paths.dashboard)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    await user.click(within(primaryNav()).getByRole('link', { name: 'AG-Events' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'AG-Events' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(paths.agEvents)
  })

  test('My Events navigation opens the My Events page', async () => {
    const { router, user } = renderRoute(paths.dashboard)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    await user.click(within(primaryNav()).getByRole('link', { name: 'Meine Events' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Meine Events' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(paths.myEvents)
  })

  test('clicking a nav link navigates and updates heading and document title', async () => {
    const { router, user } = renderRoute(paths.dashboard)
    await screen.findByRole('heading', { level: 1, name: 'Dashboard' })
    await user.click(within(primaryNav()).getByRole('link', { name: 'Events' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(paths.events)
    expect(document.title).toBe('Events · Athlify')
  })

  test('brand link is named only by its wordmark and leads to the Dashboard', async () => {
    renderRoute(paths.garage)
    await screen.findByRole('heading', { level: 1 })
    const brandLink = screen.getByRole('link', { name: 'Athlify' })
    expect(brandLink).toHaveAccessibleName('Athlify')
    expect(brandLink).toHaveAttribute('href', paths.dashboard)
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
