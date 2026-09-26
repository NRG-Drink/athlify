import type { IconType } from 'react-icons'
import { LuActivity, LuBike, LuCalendarDays, LuLayoutDashboard, LuWarehouse } from 'react-icons/lu'
import { paths } from './paths'

export type NavItemId = 'dashboard' | 'activities' | 'garage' | 'bodyStats' | 'events'

export interface NavItem {
  id: NavItemId
  path: (typeof paths)[NavItemId]
  labelKey: `nav.${NavItemId}`
  icon: IconType
}

export const primaryNavItems: readonly NavItem[] = [
  { id: 'dashboard', path: paths.dashboard, labelKey: 'nav.dashboard', icon: LuLayoutDashboard },
  { id: 'activities', path: paths.activities, labelKey: 'nav.activities', icon: LuBike },
  { id: 'garage', path: paths.garage, labelKey: 'nav.garage', icon: LuWarehouse },
  { id: 'bodyStats', path: paths.bodyStats, labelKey: 'nav.bodyStats', icon: LuActivity },
  { id: 'events', path: paths.events, labelKey: 'nav.events', icon: LuCalendarDays },
]
