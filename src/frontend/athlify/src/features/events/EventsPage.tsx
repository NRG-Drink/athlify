import { useTranslation } from 'react-i18next'
import { Box } from '@chakra-ui/react'
import { Page } from '../../components/Page'
import { EventsGrid } from './EventsGrid'
import { EventsPageControls } from './EventsPageControls'
import { useEventsPageState } from './useEventsPageState'

export const EventsPage = () => {
  const { t } = useTranslation()
  const state = useEventsPageState()

  return (
    <Page title={t('nav.events')}>
      <Box display="grid" gap="6">
        <EventsPageControls filters={state.filters} views={state.views} />
        <EventsGrid
          where={state.where}
          filterModel={state.filterModel}
          sortModel={state.sortModel}
          columnState={state.columnState}
          resetTableVersion={state.resetTableVersion}
          onColumnStateChange={state.onColumnStateChange}
          onGridStateChange={state.onGridStateChange}
        />
      </Box>
    </Page>
  )
}
