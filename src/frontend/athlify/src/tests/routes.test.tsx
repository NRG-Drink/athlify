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
    [paths.dashboard, 'Dashboard', /Distanz, Zeit, Höhenmeter/],
    [paths.garage, 'Garage', /deine Velos und Gadgets/],
    [paths.settings, 'Einstellungen', /dein Konto/],
  ])('%s renders a coming-soon placeholder titled %s', async (path, title, areaMessage) => {
    renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    expect(screen.getByText(/Demnächst verfügbar/)).toHaveTextContent(areaMessage)
  })

  test.each([
    [paths.events, undefined],
    [paths.eventsAgGrid, 'AG Grid'],
  ])('%s renders the Events page', async (path, implementation) => {
    const { router } = renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument()
    expect(await screen.findByText('Noch keine Events')).toBeInTheDocument()
    if (implementation) {
      expect(screen.getByRole('link', { name: implementation })).toHaveAttribute(
        'aria-current',
        'page',
      )
    } else {
      expect(screen.queryByRole('group', { name: 'Tabellenimplementierung' })).not.toBeInTheDocument()
    }
    expect(router.state.location.pathname).toBe(path)
  })

  test('renders AG-Events as a primary navigation showcase route', async () => {
    const { router } = renderRoute(paths.agEvents)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'AG-Events' }),
    ).toBeInTheDocument()
    expect(within(primaryNav()).getByRole('link', { name: 'AG-Events' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(router.state.location.pathname).toBe(paths.agEvents)
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
    const layout = routes.find((route) => route.children) as Omit<RouteObject, 'index'>
    const routesWithCrash: RouteObject[] = [
      { ...layout, children: [{ path: '/boom', element: <Boom /> }, ...(layout.children ?? [])] },
    ]
    renderRoute('/boom', routesWithCrash)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Diese Seite konnte nicht angezeigt werden',
    )
    expect(primaryNav()).toBeInTheDocument()
  })
})
