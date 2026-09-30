import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import de from './locales/de.json'
import en from './locales/en.json'

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})

i18n.use(initReactI18next).init({
  resources: {
    de: {
      translation: de.translation,
    },
    en: {
      translation: en.translation,
    },
  },
  lng: 'de',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
