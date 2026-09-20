import { NativeSelect } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'

const displayNames = new Intl.DisplayNames([navigator.language], { type: 'language' })

const LanguageSwitcher = () => {
  const { i18n } = useTranslation()
  // Supported languages come from the loaded i18next resources, not a hard-coded list.
  const supportedLanguages = Object.keys(i18n.options.resources ?? {})

  return (
    <NativeSelect.Root size="sm" width="auto">
      <NativeSelect.Field
        value={i18n.resolvedLanguage}
        onChange={(event) => void i18n.changeLanguage(event.target.value)}
        aria-label="Language"
      >
        {supportedLanguages.map((language) => (
          <option key={language} value={language}>
            {displayNames.of(language) ?? language}
          </option>
        ))}
      </NativeSelect.Field>
      <NativeSelect.Indicator />
    </NativeSelect.Root>
  )
}

export default LanguageSwitcher
