import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchQuery, graphql } from 'react-relay'
import type { Environment } from 'relay-runtime'
import { toI18nLanguage } from '../i18n/languages'
import type { useAccountLanguageQuery } from './__generated__/useAccountLanguageQuery.graphql'

const accountLanguageQuery = graphql`
  query useAccountLanguageQuery {
    me {
      id
      language
    }
  }
`

/**
 * The language of the account wins at the start of a session (after sign-in and after a reload). A
 * failing request keeps the current language: the preference is a convenience, not a requirement.
 */
export function useAccountLanguage(isLoggedIn: boolean, environment: Environment) {
  const { i18n } = useTranslation()

  useEffect(() => {
    if (!isLoggedIn) return
    let active = true
    fetchQuery<useAccountLanguageQuery>(environment, accountLanguageQuery, {})
      .toPromise()
      .then((data) => {
        if (active && data) void i18n.changeLanguage(toI18nLanguage(data.me.language))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isLoggedIn, environment, i18n])
}
