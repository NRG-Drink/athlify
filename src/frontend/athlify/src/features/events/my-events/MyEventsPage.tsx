import { useTranslation } from 'react-i18next'
import { Box } from '@chakra-ui/react'
import { Page } from '../../../components/Page'
import { MyEventsGrid } from './MyEventsGrid'
import { MyEventsPageControls } from './MyEventsPageControls'
import { useMyEventsPageState } from './useMyEventsPageState'

export const MyEventsPage = () => {
  const { t } = useTranslation()
  const state = useMyEventsPageState()

  return (
    <Page title={t('nav.myEvents')}>
      <Box display="grid" gap="6">
        <MyEventsPageControls filters={state.filters} views={state.views} />
        <MyEventsGrid
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
