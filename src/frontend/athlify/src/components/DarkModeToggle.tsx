'use client'

import { ClientOnly, IconButton, Skeleton } from '@chakra-ui/react'
import { useColorMode } from '../components/ui/color-mode'
import { useTranslation } from 'react-i18next'
import { LuMoon, LuSun } from 'react-icons/lu'

const DarkModeToggle = () => {
  const { t } = useTranslation()
  const { toggleColorMode, colorMode } = useColorMode()
  return (
    <ClientOnly fallback={<Skeleton boxSize="8" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="outline"
        size="sm"
        aria-label={t('layout.colorMode')}
      >
        {colorMode === 'light' ? <LuSun /> : <LuMoon />}
      </IconButton>
    </ClientOnly>
  )
}

export default DarkModeToggle
