import { Box, Link, Stack } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { primaryNavItems } from '../navigation/navItems'

interface NavLinksProps {
  direction?: 'row' | 'column'
  onNavigate?: () => void
}

// The active item is marked by a bar in the "indicator" gradient: in the
// header row it sits skewed on the header's bottom edge (like the logo's
// 20° lean), in the drawer column it runs vertically along the left edge.
const rowLinkStyles = {
  h: 'full',
  px: { base: '3', lg: '4' },
  color: 'fg.muted',
  _after: {
    content: '""',
    position: 'absolute',
    insetX: '2',
    bottom: '-1px',
    h: '1',
    bgImage: 'indicator',
    transform: 'skewX(-20deg)',
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '150ms',
    transitionTimingFunction: 'ease-out',
    _motionReduce: { transition: 'none' },
  },
  _hover: { color: 'fg', textDecoration: 'none', _after: { opacity: 0.3 } },
  _currentPage: { color: 'colorPalette.fg', fontWeight: 'semibold', _after: { opacity: 1 } },
} as const

const columnLinkStyles = {
  h: '12',
  w: 'full',
  px: '4',
  borderRadius: 'l2',
  overflow: 'hidden',
  color: 'fg.muted',
  _after: {
    content: '""',
    position: 'absolute',
    insetY: '0',
    left: '0',
    w: '1',
    bgImage: 'indicatorDown',
    opacity: 0,
  },
  _hover: { bg: 'bg.muted', color: 'fg', textDecoration: 'none' },
  _currentPage: {
    bg: 'colorPalette.subtle',
    color: 'colorPalette.fg',
    fontWeight: 'semibold',
    _after: { opacity: 1 },
  },
} as const

export function NavLinks({ direction = 'row', onNavigate }: NavLinksProps) {
  const { t } = useTranslation()
  const isRow = direction === 'row'

  return (
    <Stack
      as="ul"
      direction={direction}
      gap={isRow ? '0' : '1'}
      h={isRow ? 'full' : undefined}
      listStyleType="none"
      m="0"
      p="0"
    >
      {primaryNavItems.map((item) => (
        <li key={item.id}>
          <Link
            asChild
            position="relative"
            display="flex"
            alignItems="center"
            gap="2"
            whiteSpace="nowrap"
            fontWeight="medium"
            textDecoration="none"
            focusRing="outside"
            {...(isRow ? rowLinkStyles : columnLinkStyles)}
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
    <Box as="nav" aria-label={t('nav.primaryLabel')} hideBelow="md" h="full">
      <NavLinks />
    </Box>
  )
}
