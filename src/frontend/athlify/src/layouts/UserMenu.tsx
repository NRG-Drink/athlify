import { Button, Flex, IconButton, Popover, Portal, Separator, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuCircleUser, LuSettings } from 'react-icons/lu'
import { Link as RouterLink } from 'react-router-dom'
import DarkModeToggle from '../components/DarkModeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { paths } from '../navigation/paths'

export function UserMenu() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      positioning={{ placement: 'bottom-end' }}
    >
      <Popover.Trigger asChild>
        <IconButton variant="ghost" size="sm" aria-label={t('layout.userMenu')}>
          <LuCircleUser />
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content width="64" aria-label={t('layout.userMenu')}>
            <Popover.Body p="2">
              <Stack gap="1">
                <Button asChild variant="ghost" justifyContent="flex-start" size="sm">
                  <RouterLink to={paths.settings} onClick={() => setOpen(false)}>
                    <LuSettings aria-hidden />
                    {t('nav.settings')}
                  </RouterLink>
                </Button>
                <Separator my="1" />
                <Flex align="center" justify="space-between" gap="3" px="3" py="1">
                  <Text textStyle="sm">{t('layout.language')}</Text>
                  <LanguageSwitcher />
                </Flex>
                <Flex align="center" justify="space-between" gap="3" px="3" py="1">
                  <Text textStyle="sm">{t('layout.colorMode')}</Text>
                  <DarkModeToggle />
                </Flex>
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
