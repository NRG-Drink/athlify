import { Button, CloseButton, Dialog, Portal } from '@chakra-ui/react'
import type { FormEventHandler, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  submitLabel: string
  /** A save is in flight: the dialog cannot be submitted again or dismissed. */
  busy: boolean
  onSubmit: () => void
  children: ReactNode
}

/** Dialog shell for create/edit forms: title, submit/cancel footer, busy handling. A bottom sheet on phones. */
export function FormDialog({
  open,
  onOpenChange,
  title,
  submitLabel,
  busy,
  onSubmit,
  children,
}: FormDialogProps) {
  const { t } = useTranslation()

  const submit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()
    if (!busy) onSubmit()
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => {
        if (!busy) onOpenChange(details.open)
      }}
      placement={{ base: 'bottom', sm: 'center' }}
      motionPreset="slide-in-bottom"
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          {/* Portals leave the app's brand palette, so the dialog sets it again. */}
          <Dialog.Content colorPalette="brand">
            <form onSubmit={submit} noValidate>
              <Dialog.Header>
                <Dialog.Title>{title}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>{children}</Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" disabled={busy}>
                    {t('form.cancel')}
                  </Button>
                </Dialog.ActionTrigger>
                <Button type="submit" loading={busy}>
                  {submitLabel}
                </Button>
              </Dialog.Footer>
            </form>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" aria-label={t('form.cancel')} disabled={busy} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
