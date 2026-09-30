import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RelayEnvironmentProvider } from 'react-relay'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './theme/fonts'
import './index.css'
import './i18n'
import { Provider } from './components/ui/provider'
import RelayEnvironment from './RelayEnvironment.ts'
import { routes } from './routes.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const router = createBrowserRouter(routes)

createRoot(rootElement).render(
  <StrictMode>
    <RelayEnvironmentProvider environment={RelayEnvironment}>
      <Provider>
        <RouterProvider router={router} />
      </Provider>
    </RelayEnvironmentProvider>
  </StrictMode>,
)
