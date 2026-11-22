import { Button, Field, Input, NativeSelect, Stack, Text } from '@chakra-ui/react'
import { useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  API_LANGUAGES,
  languageLabel,
  toI18nLanguage,
  type ApiLanguage,
} from '../../i18n/languages'
import { SettingsPanel } from './SettingsPanel'
import {
  isProfileDirty,
  MAX_NAME_LENGTH,
  validateProfile,
  type ProfileErrors,
  type ProfileValues,
} from './profileValues'
import { useFocusFirstInvalid } from './useFocusFirstInvalid'
import { useUpdateMe } from './useUpdateMe'

interface ProfileFormProps {
  username: string
  /** The saved profile; Relay updates it after a successful save. */
  saved: ProfileValues
}

export function ProfileForm({ username, saved }: ProfileFormProps) {
  const { t } = useTranslation()
  const { saveProfile, isSaving } = useUpdateMe()
  const formRef = useRef<HTMLFormElement>(null)
  const [values, setValues] = useState<ProfileValues>(saved)
  const [errors, setErrors] = useState<ProfileErrors>({})
  useFocusFirstInvalid(formRef, errors)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateProfile(values, t)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    saveProfile(values, {
      onFieldErrors: (fieldErrors) =>
        setErrors({
          firstName: fieldErrors.firstName && t(fieldErrors.firstName),
          lastName: fieldErrors.lastName && t(fieldErrors.lastName),
        }),
      onSuccess: () => setErrors({}),
    })
  }

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

          <Field.Root>
            <Field.Label>{t('settings.profile.language')}</Field.Label>
            <NativeSelect.Root>
              <NativeSelect.Field
                value={values.language}
                onChange={(event) =>
                  setValues((v) => ({ ...v, language: event.target.value as ApiLanguage }))
                }
              >
                {API_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {languageLabel(toI18nLanguage(language))}
                  </option>
                ))}
              </NativeSelect.Field>
              <NativeSelect.Indicator />
            </NativeSelect.Root>
          </Field.Root>

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
