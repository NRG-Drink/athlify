import { LuSettings } from 'react-icons/lu'
import { Navigate, type RouteObject } from 'react-router-dom'
import { NotFoundPage } from './app/NotFoundPage'
import { PlaceholderPage } from './app/PlaceholderPage'
import { RouteErrorPage } from './app/RouteErrorPage'
import { BodyStatsPage } from './features/body-stats/BodyStatsPage'
import { AppLayout } from './layouts/AppLayout'
import { primaryNavItems, type NavItemId } from './navigation/navItems'
import { paths } from './navigation/paths'

function areaPlaceholder(id: NavItemId) {
  const item = primaryNavItems.find((navItem) => navItem.id === id)
  return (
    <PlaceholderPage
      titleKey={`nav.${id}`}
      messageKey={`placeholder.${id}`}
      icon={item?.icon ?? LuSettings}
    />
  )
}

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to={paths.dashboard} replace /> },
      { path: paths.dashboard, element: areaPlaceholder('dashboard') },
      { path: paths.activities, element: areaPlaceholder('activities') },
      { path: paths.garage, element: areaPlaceholder('garage') },
      { path: paths.bodyStats, element: <BodyStatsPage /> },
      { path: paths.events, element: areaPlaceholder('events') },
      {
        path: paths.settings,
        element: (
          <PlaceholderPage
            titleKey="nav.settings"
            messageKey="placeholder.settings"
            icon={LuSettings}
          />
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
