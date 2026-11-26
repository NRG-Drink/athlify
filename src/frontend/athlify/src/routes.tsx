import { LuSettings } from 'react-icons/lu'
import { Navigate, type RouteObject } from 'react-router-dom'
import { NotFoundPage } from './app/NotFoundPage'
import { RouteErrorPage } from './app/RouteErrorPage'
import { PlaceholderPage } from './app/PlaceholderPage'
import { AuthenticatedAppLayout, LoginRoute } from './features/auth/AuthRoutes'
import { ActivitiesPage } from './features/activities/ActivitiesPage'
import { AdminRoute } from './features/admin-users/AdminRoute'
import { AdminUsersPage } from './features/admin-users/AdminUsersPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { BodyStatsPage } from './features/body-stats/BodyStatsPage'
import { EventsPage } from './features/events/EventsPage'
import { SettingsPage } from './features/settings/SettingsPage'
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

// https://reactrouter.com/start/data/route-object
export const routes: RouteObject[] = [
  { path: paths.login, element: <LoginRoute /> },
  {
    path: paths.root,
    element: <AuthenticatedAppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to={paths.dashboard} replace /> },
      { path: paths.dashboard, element: <DashboardPage /> },
      { path: paths.activities, element: <ActivitiesPage /> },
      { path: paths.garage, element: areaPlaceholder('garage') },
      { path: paths.bodyStats, element: <BodyStatsPage /> },
      { path: paths.events, element: <EventsPage /> },
      { path: paths.settings, element: <SettingsPage /> },
      {
        path: paths.adminUsers,
        element: (
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
