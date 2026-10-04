import {
  Alert,
  Button,
  EmptyState,
  Flex,
  Heading,
  Spinner,
  Stack,
  Text,
  VisuallyHidden,
} from '@chakra-ui/react'
import { useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { IconType } from 'react-icons'
import { LuInbox } from 'react-icons/lu'

export type PageStatus = 'ready' | 'loading' | 'empty' | 'error'

export interface PageProps {
  title: string
  description?: string
  actions?: ReactNode
  status?: PageStatus
  emptyMessage?: string
  /** Decorative icon of the empty state; defaults to an inbox. */
  emptyIcon?: IconType
  errorMessage?: string
  onRetry?: () => void
  children?: ReactNode
}

export function LoadingIndicator() {
  const { t } = useTranslation()
  return (
    <Flex role="status" justify="center" py="16">
      <Spinner size="lg" color="colorPalette.solid" />
      <VisuallyHidden>{t('page.loading')}</VisuallyHidden>
    </Flex>
  )
}

export interface PageEmptyStateProps {
  message?: string
  /** Decorative icon; defaults to an inbox. */
  icon?: IconType
  title?: string
  /** The page's primary action, repeated where the user would otherwise be stuck. */
  action?: ReactNode
}

export function PageEmptyState({
  message,
  icon: Icon = LuInbox,
  title,
  action,
}: PageEmptyStateProps) {
  const { t } = useTranslation()
  return (
    <EmptyState.Root borderWidth="1px" borderStyle="dashed" borderRadius="l3">
      <EmptyState.Content>
        <EmptyState.Indicator
          bg="colorPalette.subtle"
          color="colorPalette.fg"
          borderRadius="l3"
          p="3"
        >
          <Icon aria-hidden />
        </EmptyState.Indicator>
        {title && <EmptyState.Title>{title}</EmptyState.Title>}
        <EmptyState.Description>{message ?? t('page.empty')}</EmptyState.Description>
        {action}
      </EmptyState.Content>
    </EmptyState.Root>
  )
}

export interface PageErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function PageErrorState({ message, onRetry }: PageErrorStateProps) {
  const { t } = useTranslation()
  return (
    <Alert.Root status="error" role="alert" alignItems="center">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{message ?? t('page.error')}</Alert.Description>
      </Alert.Content>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('page.retry')}
        </Button>
      )}
    </Alert.Root>
  )
}

export function Page({
  title,
  description,
  actions,
  status = 'ready',
  emptyMessage,
  emptyIcon: EmptyIcon = LuInbox,
  errorMessage,
  onRetry,
  children,
}: PageProps) {
  useEffect(() => {
    document.title = `${title} · Athlify`
  }, [title])

  return (
    <Stack gap="8">
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        align={{ base: 'stretch', sm: 'flex-end' }}
        justify="space-between"
        gap="4"
      >
        <Stack gap="2">
          <Heading as="h1" fontSize={{ base: '2rem', md: '2.5rem' }} lineHeight="1.1">
            {title}
          </Heading>
          {description && (
            <Text color="fg.muted" maxW="65ch">
              {description}
            </Text>
          )}
        </Stack>
        {actions && (
          <Flex gap="2" wrap="wrap">
            {actions}
          </Flex>
        )}
      </Flex>

      {status === 'loading' && <LoadingIndicator />}

      {status === 'empty' && <PageEmptyState message={emptyMessage} icon={EmptyIcon} />}

      {status === 'error' && <PageErrorState message={errorMessage} onRetry={onRetry} />}

      {status === 'ready' && children}
    </Stack>
  )
}
