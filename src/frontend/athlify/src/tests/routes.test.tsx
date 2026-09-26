import { screen, within } from '@testing-library/react'
import type { RouteObject } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { paths } from '../navigation/paths'
import { routes } from '../routes'
import { renderRoute } from './utils/renderRoute'

function primaryNav() {
  return screen.getByRole('navigation', { name: 'Hauptnavigation' })
}

describe('routes', () => {
  test('redirects / to the Dashboard', async () => {
    const { router } = renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(paths.dashboard)
  })

  test.each([
    [paths.dashboard, 'Dashboard'],
    [paths.activities, 'Aktivitäten'],
    [paths.garage, 'Garage'],
    [paths.events, 'Events'],
    [paths.settings, 'Einstellungen'],
  ])('%s renders a coming-soon placeholder titled %s', async (path, title) => {
    renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByText(/Demnächst verfügbar/)).toBeInTheDocument()
  })

  test('unknown URL shows Not Found inside the layout without an active nav item', async () => {
    renderRoute('/does-not-exist')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Seite nicht gefunden' }),
    ).toBeInTheDocument()
    const links = within(primaryNav()).getAllByRole('link')
    links.forEach((link) => expect(link).not.toHaveAttribute('aria-current'))
    expect(screen.getByRole('link', { name: 'Zurück zum Dashboard' })).toHaveAttribute(
      'href',
      paths.dashboard,
    )
  })

  test('a crashing route shows an error inside the layout', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Boom = () => {
      throw new Error('boom')
    }
    const layout = routes[0] as Omit<RouteObject, 'index'>
    const routesWithCrash: RouteObject[] = [
      { ...layout, children: [{ path: '/boom', element: <Boom /> }, ...(layout.children ?? [])] },
    ]
    renderRoute('/boom', routesWithCrash)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Diese Seite konnte nicht angezeigt werden',
    )
    expect(primaryNav()).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
