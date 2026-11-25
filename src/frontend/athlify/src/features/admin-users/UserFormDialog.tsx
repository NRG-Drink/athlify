import { Field, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormDialog } from '../../components/FormDialog'
import { SelectField } from '../../components/SelectField'
import { LANGUAGE_OPTIONS, toI18nLanguage } from '../../i18n/languages'
import { MAX_NAME_LENGTH } from '../settings/profileValues'
import { useFocusFirstInvalid } from '../settings/useFocusFirstInvalid'
import {
  API_ROLES,
  emptyUserValues,
  MAX_USERNAME_LENGTH,
  toCreateInput,
  toUpdateInput,
  validateUser,
  type UserFormErrors,
  type UserFormValues,
} from './userForm'
import { useUserMutations } from './useUserMutations'

export type UserDialog =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; id: string; username: string; isSelf: boolean; values: UserFormValues }

interface UserFormDialogProps {
  dialog: UserDialog
  /** Dismissed or saved: the dialog closes either way. */
  onClose: () => void
}

/** Create and edit form of a user. The username and password only exist on create. */
export function UserFormDialog({ dialog, onClose }: UserFormDialogProps) {
  const { t, i18n } = useTranslation()
  const mutations = useUserMutations()
  const open = dialog.kind !== 'closed'
  const editing = dialog.kind === 'edit' ? dialog : null

  const initial = (): UserFormValues => (editing ? editing.values : emptyUserValues)
  const [values, setValues] = useState<UserFormValues>(initial)
  const [errors, setErrors] = useState<UserFormErrors>({})
  const bodyRef = useRef<HTMLDivElement>(null)
  useFocusFirstInvalid(bodyRef, errors)

  // Reset the form every time the dialog opens; the mode is kept, so the title does not change while it fades out.
  const [wasOpen, setWasOpen] = useState(open)
  const [shownEditing, setShownEditing] = useState(editing !== null)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setShownEditing(editing !== null)
      setValues(initial())
      setErrors({})
    }
  }

  const roleChanged = editing !== null && values.role !== editing.values.role

  const submit = () => {
    const found = validateUser(values, !editing, t)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    const callbacks = {
      onFieldErrors: setErrors,
      onSuccess: () => {
        // Same as the Settings page: the saved language applies to the UI at once.
        if (editing?.isSelf) void i18n.changeLanguage(toI18nLanguage(values.language))
        onClose()
      },
    }
    if (editing) mutations.update(editing.id, toUpdateInput(values), callbacks)
    else mutations.create(toCreateInput(values), callbacks)
  }

  const text = (
    field: 'username' | 'firstName' | 'lastName',
    maxLength: number,
    autoComplete: string,
  ) => (
    <Field.Root required invalid={!!errors[field]}>
      <Field.Label>{t(`adminUsers.fields.${field}`)}</Field.Label>
      {/* The input allows twice the validated length, so an over-long value shows the message instead of being cut off. */}
      <Input
        autoComplete={autoComplete}
        maxLength={maxLength * 2}
        value={values[field]}
        onChange={(event) => setValues((v) => ({ ...v, [field]: event.target.value }))}
      />
      <Field.ErrorText>{errors[field]}</Field.ErrorText>
    </Field.Root>
  )

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={t(shownEditing ? 'adminUsers.edit.title' : 'adminUsers.create.title')}
      submitLabel={t('form.save')}
      busy={mutations.isSaving}
      onSubmit={submit}
    >
      <Stack ref={bodyRef} gap="4">
        {editing ? (
          <Stack gap="1">
            <Text textStyle="sm" color="fg.muted">
              {t('adminUsers.fields.username')}
            </Text>
            <Text>{editing.username}</Text>
          </Stack>
        ) : (
          text('username', MAX_USERNAME_LENGTH, 'off')
        )}

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
          {text('firstName', MAX_NAME_LENGTH, 'off')}
          {text('lastName', MAX_NAME_LENGTH, 'off')}
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, sm: 2 }} gap="4">
          <SelectField
            label={t('adminUsers.fields.language')}
            value={values.language}
            onChange={(language) => language && setValues((v) => ({ ...v, language }))}
            options={LANGUAGE_OPTIONS}
          />
          <Stack gap="1">
            <SelectField
              label={t('adminUsers.fields.role')}
              value={values.role}
              onChange={(role) => role && setValues((v) => ({ ...v, role }))}
              options={API_ROLES.map((role) => ({
                id: role,
                label: t(`adminUsers.roles.${role}`),
              }))}
              error={errors.role}
              disabled={editing?.isSelf}
            />
            {editing?.isSelf && (
              <Text textStyle="sm" color="fg.muted">
                {t('adminUsers.ownRoleNote')}
              </Text>
            )}
          </Stack>
        </SimpleGrid>

        {!editing && (
          <Field.Root required invalid={!!errors.password}>
            <Field.Label>{t('adminUsers.fields.password')}</Field.Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={(event) => setValues((v) => ({ ...v, password: event.target.value }))}
            />
            <Field.ErrorText>{errors.password}</Field.ErrorText>
            <Text textStyle="sm" color="fg.muted">
              {t('adminUsers.create.passwordNote')}
            </Text>
          </Field.Root>
        )}

        {roleChanged && (
          <Text textStyle="sm" color="fg.muted">
            {t('adminUsers.edit.roleChangeNote')}
          </Text>
        )}
      </Stack>
    </FormDialog>
  )
}
