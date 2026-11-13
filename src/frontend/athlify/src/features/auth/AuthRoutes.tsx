import { Navigate } from 'react-router-dom'
import { useAuth } from '../../auth/context'
import { AppLayout } from '../../layouts/AppLayout'
import { paths } from '../../navigation/paths'
import { LoginPage } from './LoginPage'

export function LoginRoute() {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <Navigate to={paths.dashboard} replace /> : <LoginPage />
}

export function AuthenticatedAppLayout() {
  const { isLoggedIn } = useAuth()
  return isLoggedIn ? <AppLayout /> : <Navigate to={paths.login} replace />
}
