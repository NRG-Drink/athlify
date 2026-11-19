import { useTranslation } from 'react-i18next'
import { Page } from '../../components/Page'
import { MyEventsGrid } from './MyEventsGrid'
import { MyEventsPageControls } from './MyEventsPageControls'
import { useMyEventsPageState } from './useMyEventsPageState'

export const MyEventsPage = () => {
  const { t } = useTranslation()
  const state = useMyEventsPageState()

  return (
    <>
      <Page title={t('nav.myEvents')} />
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
    </>
  )
}
