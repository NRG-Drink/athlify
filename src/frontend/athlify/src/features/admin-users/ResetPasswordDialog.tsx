import { Field, Input, Stack, Text } from '@chakra-ui/react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/context'
import { FormDialog } from '../../components/FormDialog'
import { useFocusFirstInvalid } from '../settings/useFocusFirstInvalid'
import { useUserMutations } from './useUserMutations'
import { newPasswordError } from '../settings/passwordValues'

interface ResetPasswordDialogProps {
  /** The user whose password is set; `null` while the dialog is closed. */
  target: { id: string; name: string; isSelf: boolean } | null
  onClose: () => void
}

/** Sets a new password for a user. The user is signed out on every device, which the note says before the click. */
export function ResetPasswordDialog({ target, onClose }: ResetPasswordDialogProps) {
  const { t } = useTranslation()
  const { logout } = useAuth()
  const { resetPassword, isSaving } = useUserMutations()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | undefined>()
  const bodyRef = useRef<HTMLDivElement>(null)
  // Memoized: the focus hook re-runs whenever its errors object changes, not on every keystroke.
  const errors = useMemo(() => ({ password: error }), [error])
  useFocusFirstInvalid(bodyRef, errors)

  // Reset the form every time the dialog opens; keep the name and the note while it fades out.
  const open = target !== null
  const [wasOpen, setWasOpen] = useState(open)
  const [shown, setShown] = useState({ name: target?.name ?? '', isSelf: target?.isSelf ?? false })
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setPassword('')
      setError(undefined)
      setShown({ name: target.name, isSelf: target.isSelf })
    }
  }

  const submit = () => {
    const found = newPasswordError(password, t)
    setError(found)
    if (found || !target) return
    resetPassword(target.id, password, {
      onFieldErrors: (fieldErrors) => setError(fieldErrors.newPassword),
      onSuccess: () => {
        onClose()
        // Like changing the password in the Settings: the server revoked every session, so sign out here as well.
        if (target.isSelf) void logout().catch(() => {})
      },
    })
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t('adminUsers.reset.title', { name: shown.name })}
      submitLabel={t('adminUsers.reset.submit')}
      busy={isSaving}
      onSubmit={submit}
    >
      <Stack ref={bodyRef} gap="4">
        <Field.Root required invalid={!!error}>
          <Field.Label>{t('adminUsers.reset.newPassword')}</Field.Label>
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Field.ErrorText>{error}</Field.ErrorText>
        </Field.Root>
        <Text textStyle="sm" color="fg.muted">
          {t(shown.isSelf ? 'adminUsers.reset.selfNote' : 'adminUsers.reset.note')}
        </Text>
      </Stack>
    </FormDialog>
  )
}
