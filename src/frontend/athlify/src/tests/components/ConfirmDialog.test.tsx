import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Provider } from '../../components/ui/provider'

const renderDialog = (props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) =>
  render(
    <Provider>
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Messung löschen?"
        description="Wird endgültig gelöscht."
        confirmLabel="Löschen"
        busy={false}
        onConfirm={() => {}}
        {...props}
      />
    </Provider>,
  )

describe('ConfirmDialog', () => {
  it('is an alert dialog with the description, and focuses Cancel first', async () => {
    renderDialog()

    const dialog = await screen.findByRole('alertdialog', { name: 'Messung löschen?' })
    expect(dialog).toHaveTextContent('Wird endgültig gelöscht.')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Abbrechen' })).toHaveFocus())
  })

  it('confirms only through the confirm button', async () => {
    const onConfirm = vi.fn()
    renderDialog({ onConfirm })

    await userEvent.click(await screen.findByRole('button', { name: 'Löschen' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('disables Cancel and cannot be dismissed while busy', async () => {
    const onOpenChange = vi.fn()
    renderDialog({ busy: true, onOpenChange })

    expect(await screen.findByRole('button', { name: 'Abbrechen' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
