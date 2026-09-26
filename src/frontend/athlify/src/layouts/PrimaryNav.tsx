import { Box, Link, Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { primaryNavItems } from '../navigation/navItems'

interface NavLinksProps {
  direction?: 'row' | 'column'
  onNavigate?: () => void
}

export function NavLinks({ direction = 'row', onNavigate }: NavLinksProps) {
  const { t } = useTranslation()
  const isRow = direction === 'row'

  return (
    <Stack as="ul" direction={direction} gap="1" listStyleType="none" m="0" p="0">
      {primaryNavItems.map((item) => (
        <li key={item.id}>
          <Link
            asChild
            display="flex"
            alignItems="center"
            gap="2"
            px="3"
            py="2"
            w={isRow ? undefined : 'full'}
            borderRadius="l2"
            whiteSpace="nowrap"
            fontWeight="medium"
            color="fg.muted"
            textDecoration="none"
            focusRing="outside"
            _hover={{ bg: 'bg.muted', color: 'fg', textDecoration: 'none' }}
            _currentPage={{ bg: 'colorPalette.subtle', color: 'colorPalette.fg' }}
          >
            <NavLink to={item.path} onClick={onNavigate}>
              <Box as="span" display={isRow ? { base: 'none', lg: 'inline-flex' } : 'inline-flex'}>
                <item.icon aria-hidden />
              </Box>
              {t(item.labelKey)}
            </NavLink>
          </Link>
        </li>
      ))}
    </Stack>
  )
}

export function PrimaryNav() {
  const { t } = useTranslation()
  return (
    <Box as="nav" aria-label={t('nav.primaryLabel')} hideBelow="md">
      <NavLinks />
    </Box>
  )
}
