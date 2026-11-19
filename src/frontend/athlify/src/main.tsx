import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './theme/fonts'
import './index.css'
import './i18n'
import { ChakraProviderAthlify } from './components/ui/ChakraProviderAthlify.tsx'
import { routes } from './routes.tsx'
import { AuthAndRelayProvider } from './auth/AuthAndRelayProvider.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const router = createBrowserRouter(routes)

createRoot(rootElement).render(
  <StrictMode>
    <AuthAndRelayProvider>
      <ChakraProviderAthlify>
        <RouterProvider router={router} />
      </ChakraProviderAthlify>
    </AuthAndRelayProvider>
  </StrictMode>,
)
