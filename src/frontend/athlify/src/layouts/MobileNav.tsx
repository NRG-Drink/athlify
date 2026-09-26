import { Box, CloseButton, Drawer, IconButton, Portal } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuMenu } from 'react-icons/lu'
import { NavLinks } from './PrimaryNav'

export function MobileNav() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Box hideFrom="md">
      <Drawer.Root open={open} onOpenChange={(details) => setOpen(details.open)} placement="start">
        <Drawer.Trigger asChild>
          <IconButton variant="ghost" size="sm" aria-label={t('layout.openMenu')}>
            <LuMenu />
          </IconButton>
        </Drawer.Trigger>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Athlify</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <Box as="nav" aria-label={t('nav.primaryLabel')}>
                  <NavLinks direction="column" onNavigate={() => setOpen(false)} />
                </Box>
              </Drawer.Body>
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" aria-label={t('layout.closeMenu')} />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Box>
  )
}
