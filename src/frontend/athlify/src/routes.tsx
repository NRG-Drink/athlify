import { Navigate, type RouteObject } from 'react-router-dom'
import BodyStats from './app/BodyStats'
import { NotFoundPage } from './app/NotFoundPage'
import { PlaceholderPage } from './app/PlaceholderPage'
import { RouteErrorPage } from './app/RouteErrorPage'
import { AppLayout } from './layouts/AppLayout'
import { paths } from './navigation/paths'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <Navigate to={paths.dashboard} replace /> },
      { path: paths.dashboard, element: <PlaceholderPage titleKey="nav.dashboard" /> },
      { path: paths.activities, element: <PlaceholderPage titleKey="nav.activities" /> },
      { path: paths.garage, element: <PlaceholderPage titleKey="nav.garage" /> },
      { path: paths.bodyStats, element: <BodyStats /> },
      { path: paths.events, element: <PlaceholderPage titleKey="nav.events" /> },
      { path: paths.settings, element: <PlaceholderPage titleKey="nav.settings" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
