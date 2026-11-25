import { Button, Field, Input, Stack, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { SelectField } from '../../components/SelectField'
import { LANGUAGE_OPTIONS } from '../../i18n/languages'
import { SettingsPanel } from './SettingsPanel'
import {
  isProfileDirty,
  MAX_NAME_LENGTH,
  validateProfile,
  type ProfileValues,
} from './profileValues'
import { useSettingsForm } from './useSettingsForm'
import { useUpdateMe } from './useUpdateMe'

interface ProfileFormProps {
  username: string
  /** The saved profile; Relay updates it after a successful save. */
  saved: ProfileValues
}

export function ProfileForm({ username, saved }: ProfileFormProps) {
  const { t } = useTranslation()
  const { saveProfile, isSaving } = useUpdateMe()
  const { formRef, values, setValues, errors, setErrors, handleSubmit } = useSettingsForm(
    saved,
    (draft) => validateProfile(draft, t),
  )

  const submit = handleSubmit((draft) =>
    saveProfile(draft, {
      onFieldErrors: (fieldErrors) =>
        setErrors({
          firstName: fieldErrors.firstName,
          lastName: fieldErrors.lastName,
        }),
      onSuccess: () => setErrors({}),
    }),
  )

  return (
    <SettingsPanel title={t('settings.profile.title')}>
      <form ref={formRef} onSubmit={submit} noValidate>
        <Stack gap="4" maxW="md">
          <Stack gap="1">
            <Text textStyle="sm" color="fg.muted">
              {t('settings.profile.username')}
            </Text>
            <Text>{username}</Text>
          </Stack>

          {/* The input allows twice the validated length, so an over-long name shows the validation message instead of being cut off. */}
          <Field.Root required invalid={!!errors.firstName}>
            <Field.Label>{t('settings.profile.firstName')}</Field.Label>
            <Input
              autoComplete="given-name"
              maxLength={MAX_NAME_LENGTH * 2}
              value={values.firstName}
              onChange={(event) => setValues((v) => ({ ...v, firstName: event.target.value }))}
            />
            <Field.ErrorText>{errors.firstName}</Field.ErrorText>
          </Field.Root>

          <Field.Root required invalid={!!errors.lastName}>
            <Field.Label>{t('settings.profile.lastName')}</Field.Label>
            <Input
              autoComplete="family-name"
              maxLength={MAX_NAME_LENGTH * 2}
              value={values.lastName}
              onChange={(event) => setValues((v) => ({ ...v, lastName: event.target.value }))}
            />
            <Field.ErrorText>{errors.lastName}</Field.ErrorText>
          </Field.Root>

          <SelectField
            label={t('settings.profile.language')}
            value={values.language}
            onChange={(language) => language && setValues((v) => ({ ...v, language }))}
            options={LANGUAGE_OPTIONS}
          />

          <Button
            type="submit"
            colorPalette="brand"
            loading={isSaving}
            disabled={!isProfileDirty(values, saved)}
            width={{ base: 'full', md: 'auto' }}
            alignSelf="start"
          >
            {t('settings.profile.save')}
          </Button>
        </Stack>
      </form>
    </SettingsPanel>
  )
}
