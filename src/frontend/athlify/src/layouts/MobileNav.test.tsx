import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { paths } from '../navigation/paths'
import { renderRoute } from '../test/renderRoute'

describe('MobileNav', () => {
  test('opens a drawer with the areas and closes after navigating', async () => {
    const { router, user } = renderRoute(paths.dashboard)
    await screen.findByRole('heading', { level: 1 })

    await user.click(screen.getByRole('button', { name: 'Menü öffnen' }))
    const dialog = await screen.findByRole('dialog')
    const nav = within(dialog).getByRole('navigation', { name: 'Hauptnavigation' })
    expect(within(nav).getAllByRole('link')).toHaveLength(5)

    await user.click(within(nav).getByRole('link', { name: 'Garage' }))
    expect(router.state.location.pathname).toBe(paths.garage)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  test('Escape closes the drawer and returns focus to the trigger', async () => {
    const { user } = renderRoute(paths.dashboard)
    await screen.findByRole('heading', { level: 1 })
    const trigger = screen.getByRole('button', { name: 'Menü öffnen' })

    await user.click(trigger)
    await screen.findByRole('dialog')
    await user.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(trigger).toHaveFocus())
  })
})
