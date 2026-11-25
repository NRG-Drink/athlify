import type { ReactNode } from 'react'
import { NoAccessPage } from '../../app/NoAccessPage'
import { useAuth } from '../../auth/context'

/**
 * Shows its children to administrators and the "no access" page to everyone else, before the children
 * (and their queries) mount. This is a convenience: the server enforces the role on every request.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { hasRole } = useAuth()
  return hasRole('Admin') ? children : <NoAccessPage />
}
