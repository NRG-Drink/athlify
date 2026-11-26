import {
  Box,
  Button,
  Center,
  Collapsible,
  Flex,
  Heading,
  Skeleton,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LuChevronRight } from 'react-icons/lu'

/** The chart area is this tall while loading, on error and when drawn, so the page does not jump. */
export const DASHBOARD_CHART_HEIGHT = 240

export interface MetricOption {
  key: string
  label: string
}

interface DashboardMetricCardProps {
  title: string
  status: 'loading' | 'failed' | 'ready'
  open: boolean
  onOpenChange: (open: boolean) => void
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
  open,
  onOpenChange,
  onRetry,
  metrics,
  metric,
  onMetricChange,
  note,
  children,
}: DashboardMetricCardProps) {
  const { t } = useTranslation()
  // The chart is expensive to draw. Opening paints the panel with a skeleton of the chart's
  // height first and draws the chart after that frame; closing drops the chart at once.
  const [chartDrawn, setChartDrawn] = useState(false)

  useEffect(() => {
    if (!open) return
    let timer: number | undefined
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => setChartDrawn(true), 0)
    })
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(timer)
    }
  }, [open])

  const changeOpen = (next: boolean) => {
    if (!next) setChartDrawn(false)
    onOpenChange(next)
  }

  return (
    <Collapsible.Root open={open} onOpenChange={(details) => changeOpen(details.open)}>
      <Box
        bg="bg.panel"
        borderWidth="1px"
        borderRadius="l3"
        p={{ base: '4', md: '6' }}
        display="grid"
        gap="4"
      >
        <Heading as="h2" size="lg">
          <Collapsible.Trigger display="flex" gap="2" alignItems="center" textAlign="start">
            <Collapsible.Indicator
              transition="transform 0.2s"
              _open={{ transform: 'rotate(90deg)' }}
            >
              <LuChevronRight aria-hidden />
            </Collapsible.Indicator>
            {title}
          </Collapsible.Trigger>
        </Heading>
        <Collapsible.Content _open={{ animation: 'none' }} _closed={{ animation: 'none' }}>
          <Stack gap="4">
            {note && (
              <Text fontSize="sm" color="fg.muted">
                {note}
              </Text>
            )}
            {metrics && (
              <Flex
                role="group"
                aria-label={t('dashboard.metricGroup', { title })}
                wrap="wrap"
                gap="2"
              >
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

            {(status === 'loading' || (status === 'ready' && !chartDrawn)) && (
              <Skeleton
                h={`${DASHBOARD_CHART_HEIGHT}px`}
                borderRadius="l2"
                role="status"
                aria-busy="true"
                aria-label={t('page.loading')}
              />
            )}

            {status === 'ready' && chartDrawn && children}
          </Stack>
        </Collapsible.Content>
      </Box>
    </Collapsible.Root>
  )
}
