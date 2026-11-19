import { Alert, Box, Button, Field, Flex, Grid, Heading, Input, Text } from '@chakra-ui/react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { useAuth } from '../../auth/context'
import { paths } from '../../navigation/paths'

export function LoginPage() {
  const { t } = useTranslation()
  const { login, isLoading, bootstrapError } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${t('auth.login.title')} · Athlify`
  }, [t])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoginError(null)
    try {
      await login(username.trim(), password)
      navigate(paths.dashboard, { replace: true })
    } catch {
      setLoginError(t('auth.login.failed'))
    }
  }

  return (
    <Box
      as="main"
      minH="100dvh"
      display="grid"
      placeItems="center"
      bg="bg"
      bgImage="headlight"
      bgRepeat="no-repeat"
      colorPalette="brand"
      px="4"
      py="8"
    >
      <Grid width="full" maxW="md" gap="6">
        <Flex align="center" justify="center" gap="2" fontWeight="bold" fontSize="1.25rem">
          <BrandMark boxSize="8" />
          <Text>Athlify</Text>
        </Flex>

        <Box borderWidth="1px" borderColor="border" borderRadius="l3" bg="bg.panel" p="6">
          <Grid gap="6">
            <Grid gap="2">
              <Heading as="h1" fontSize="2rem" lineHeight="1.1">
                {t('auth.login.title')}
              </Heading>
              <Text color="fg.muted">{t('auth.login.description')}</Text>
            </Grid>

            {bootstrapError && (
              <Alert.Root status="error" role="alert">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{t('auth.login.sessionRestoreFailed')}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

            {loginError && (
              <Alert.Root status="error" role="alert">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{loginError}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            )}

            <form onSubmit={handleSubmit}>
              <Grid gap="4">
                <Field.Root required>
                  <Field.Label>{t('auth.login.username')}</Field.Label>
                  <Input
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </Field.Root>

                <Field.Root required>
                  <Field.Label>{t('auth.login.password')}</Field.Label>
                  <Input
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field.Root>

                <Button type="submit" width="full" loading={isLoading}>
                  {t('auth.login.submit')}
                </Button>
              </Grid>
            </form>
          </Grid>
        </Box>
      </Grid>
    </Box>
  )
}
