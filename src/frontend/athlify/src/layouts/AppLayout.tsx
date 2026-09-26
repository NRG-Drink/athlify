import { Box, Container, SkipNavContent, SkipNavLink } from '@chakra-ui/react'
import { Suspense, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { LoadingIndicator } from '../components/Page'
import { AppHeader } from './AppHeader'

const mainContentId = 'main-content'

export function AppLayout({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()

  return (
    <Box
      minH="100dvh"
      bg="bg"
      colorPalette="brand"
      _dark={{
        bgImage: 'radial-gradient(40rem circle at 0 0, rgba(0, 220, 220, 0.06), transparent 70%)',
        bgRepeat: 'no-repeat',
      }}
    >
      <SkipNavLink id={mainContentId}>{t('layout.skipToContent')}</SkipNavLink>
      <AppHeader />
      <SkipNavContent as="main" id={mainContentId}>
        <Container maxW="7xl" py={{ base: '6', md: '10' }}>
          <Suspense fallback={<LoadingIndicator />}>{children ?? <Outlet />}</Suspense>
        </Container>
      </SkipNavContent>
    </Box>
  )
}
