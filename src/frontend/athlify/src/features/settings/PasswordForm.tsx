import { Button, Field, Input, Stack, Text } from '@chakra-ui/react'
import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingsPanel } from './SettingsPanel'
import {
  confirmationMismatch,
  emptyPasswordValues,
  validatePassword,
  type PasswordErrors,
  type PasswordValues,
} from './passwordValues'
import { useFocusFirstInvalid } from './useFocusFirstInvalid'
import { useUpdateMe } from './useUpdateMe'

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  error?: string
}

function PasswordField({ label, value, onChange, autoComplete, error }: PasswordFieldProps) {
  return (
    <Field.Root required invalid={!!error}>
      <Field.Label>{label}</Field.Label>
      <Input
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  )
}

export function PasswordForm() {
  const { t } = useTranslation()
  const { changePassword, isSaving } = useUpdateMe()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<PasswordValues>(emptyPasswordValues)
  const [errors, setErrors] = useState<PasswordErrors>({})
  useFocusFirstInvalid(formRef, errors)

  // Checked while typing, in both password fields, so a typo shows up before the user submits.
  const mismatch = confirmationMismatch(values)
  const complete =
    values.currentPassword !== '' &&
    values.newPassword !== '' &&
    values.confirmation !== '' &&
    !mismatch

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validatePassword(values, t)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    changePassword(values, {
      onFieldErrors: (fieldErrors) =>
        setErrors({
          currentPassword: fieldErrors.currentPassword && t(fieldErrors.currentPassword),
          newPassword: fieldErrors.newPassword && t(fieldErrors.newPassword),
        }),
      onSuccess: () => {
        setErrors({})
        setValues(emptyPasswordValues)
      },
    })
  }

  return (
    <SettingsPanel title={t('settings.password.title')}>
      <form ref={formRef} onSubmit={submit} noValidate>
        <Stack gap="4" maxW="md">
          <PasswordField
            label={t('settings.password.current')}
            autoComplete="current-password"
            value={values.currentPassword}
            onChange={(currentPassword) => setValues((v) => ({ ...v, currentPassword }))}
            error={errors.currentPassword}
          />
          <PasswordField
            label={t('settings.password.new')}
            autoComplete="new-password"
            value={values.newPassword}
            onChange={(newPassword) => setValues((v) => ({ ...v, newPassword }))}
            error={errors.newPassword}
          />
          <PasswordField
            label={t('settings.password.confirm')}
            autoComplete="new-password"
            value={values.confirmation}
            onChange={(confirmation) => setValues((v) => ({ ...v, confirmation }))}
            error={mismatch ? t('settings.errors.confirmationMismatch') : errors.confirmation}
          />
          <Text textStyle="sm" color="fg.muted">
            {t('settings.password.note')}
          </Text>
          <Button
            type="submit"
            colorPalette="brand"
            loading={isSaving}
            disabled={!complete}
            width={{ base: 'full', md: 'auto' }}
            alignSelf="start"
          >
            {t('settings.password.submit')}
          </Button>
        </Stack>
      </form>
    </SettingsPanel>
  )
}
