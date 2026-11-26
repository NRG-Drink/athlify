import { Button, Center, Flex, Heading, Skeleton, Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** The chart area is this tall while loading, on error and when drawn, so the page does not jump. */
export const DASHBOARD_CHART_HEIGHT = 240

export interface MetricOption {
  key: string
  label: string
}

interface DashboardMetricCardProps {
  title: string
  status: 'loading' | 'failed' | 'ready'
  onRetry: () => void
  /** Selectable metrics; omitted when the card shows a fixed set of series. */
  metrics?: readonly MetricOption[]
  metric?: string
  onMetricChange?: (key: string) => void
  /** Short explanation shown under the title, for example which filters apply. */
  note?: string
  children: ReactNode
}

/** A titled panel around one chart, with an optional metric selector and loading and error states. */
export function DashboardMetricCard({
  title,
  status,
  onRetry,
  metrics,
  metric,
  onMetricChange,
  note,
  children,
}: DashboardMetricCardProps) {
  const { t } = useTranslation()

  return (
    <Stack gap="4" bg="bg.panel" borderWidth="1px" borderRadius="l3" p={{ base: '4', md: '6' }}>
      <Stack gap="1">
        <Heading as="h2" size="lg">
          {title}
        </Heading>
        {note && (
          <Text fontSize="sm" color="fg.muted">
            {note}
          </Text>
        )}
      </Stack>
      {metrics && (
        <Flex role="group" aria-label={t('dashboard.metricGroup', { title })} wrap="wrap" gap="2">
          {metrics.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={key === metric ? 'solid' : 'outline'}
              aria-pressed={key === metric}
              onClick={() => onMetricChange?.(key)}
            >
              {label}
            </Button>
          ))}
        </Flex>
      )}

      {status === 'failed' && (
        <Center h={`${DASHBOARD_CHART_HEIGHT}px`} role="alert">
          <Stack align="center" gap="3">
            <Text color="fg.error">{t('dashboard.loadFailed')}</Text>
            <Button size="sm" variant="outline" onClick={onRetry}>
              {t('page.retry')}
            </Button>
          </Stack>
        </Center>
      )}

      {status === 'loading' && (
        <Skeleton
          h={`${DASHBOARD_CHART_HEIGHT}px`}
          borderRadius="l2"
          role="status"
          aria-busy="true"
          aria-label={t('page.loading')}
        />
      )}

      {status === 'ready' && children}
    </Stack>
  )
}
