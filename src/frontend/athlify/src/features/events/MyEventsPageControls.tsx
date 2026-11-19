import { Box, Button, Input, NativeSelect, Popover, Portal, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  MyEventsPageFilterControls,
  MyEventsSavedViewControls,
} from './useMyEventsPageState'

type MyEventsPageControlsProps = {
  filters: MyEventsPageFilterControls
  views: MyEventsSavedViewControls
}

export function MyEventsPageControls({ filters, views }: MyEventsPageControlsProps) {
  const { t } = useTranslation()
  const [saveViewOpen, setSaveViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const duplicateViewName = views.items.some(
    (view) =>
      view.name.toLocaleLowerCase() === newViewName.trim().toLocaleLowerCase(),
  )

  const saveView = () => {
    views.onSave(newViewName)
    setNewViewName('')
    setSaveViewOpen(false)
  }

  return (
    <>
      <Box display="flex" justifyContent="space-between" margin="10px 0">
        <Button onClick={filters.onFilterYearToDate}>{t('events.filterYtd')}</Button>
        <Button variant="outline" onClick={filters.onResetTable}>
          {t('events.resetTable')}
        </Button>
      </Box>
      <Box display="grid" gridTemplateColumns="1fr 1fr 1fr auto" gap="2" margin="10px 0">
        <Input
          aria-label={t('events.quickFilter')}
          placeholder={t('events.quickFilter')}
          value={filters.quickFilter}
          onChange={(event) => filters.onQuickFilterChange(event.target.value)}
        />
        <Input
          type="date"
          aria-label={t('events.fromFilter')}
          placeholder={t('events.fromFilter')}
          value={filters.fromFilter}
          onChange={(event) => filters.onFromFilterChange(event.target.value)}
        />
        <Input
          type="date"
          aria-label={t('events.toFilter')}
          placeholder={t('events.toFilter')}
          value={filters.toFilter}
          onChange={(event) => filters.onToFilterChange(event.target.value)}
        />
        <Button onClick={filters.onResetFilters}>{t('events.resetFilters')}</Button>
      </Box>
      <Box
        display="grid"
        gridTemplateColumns={{
          base: '1fr 1fr',
          md: 'minmax(12rem, 1fr) auto auto',
        }}
        alignItems="center"
        gap="2"
      >
        <NativeSelect.Root>
          <NativeSelect.Field
            aria-label={t('events.views.select')}
            value={views.selectedId}
            onChange={(event) => views.onApply(event.target.value)}
          >
            <option value="">{t('events.views.choose')}</option>
            {views.items.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        <Popover.Root
          open={saveViewOpen}
          onOpenChange={(details) => setSaveViewOpen(details.open)}
          positioning={{ placement: 'bottom-start', gutter: 8 }}
          lazyMount
          unmountOnExit
        >
          <Popover.Trigger asChild>
            <Button size="sm" variant="outline">
              {t('events.views.saveCurrent')}
            </Button>
          </Popover.Trigger>
          <Portal>
            <Popover.Positioner>
              <Popover.Content
                aria-label={t('events.views.saveCurrent')}
                colorPalette="brand"
                width="min(20rem, calc(100vw - 2rem))"
                bg="bg.panel"
                borderWidth="1px"
                borderRadius="l3"
                _dark={{ shadow: 'none' }}
              >
                <Popover.Header fontWeight="semibold">
                  {t('events.views.saveCurrent')}
                </Popover.Header>
                <Popover.Body>
                  <Stack gap="3">
                    <Input
                      aria-label={t('events.views.name')}
                      maxLength={80}
                      value={newViewName}
                      onChange={(event) => setNewViewName(event.target.value)}
                    />
                    {newViewName.trim() && duplicateViewName && (
                      <Text role="alert" color="fg.error">
                        {t('events.views.duplicateName')}
                      </Text>
                    )}
                    <Button
                      size="sm"
                      onClick={saveView}
                      disabled={!newViewName.trim() || duplicateViewName || !views.canSave}
                    >
                      {t('events.views.save')}
                    </Button>
                  </Stack>
                </Popover.Body>
              </Popover.Content>
            </Popover.Positioner>
          </Portal>
        </Popover.Root>
        <Button
          size="sm"
          variant="outline"
          onClick={views.onDelete}
          disabled={!views.selectedId}
        >
          {t('events.views.delete')}
        </Button>
      </Box>
      {views.storageFailed && (
        <Text role="alert" color="fg.error">
          {t('events.views.storageFailed')}
        </Text>
      )}
    </>
  )
}
