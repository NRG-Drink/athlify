import { StrictMode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { RelayEnvironmentProvider } from 'react-relay'
import './index.css'
import './i18n'
import MyApp from './MyApp.tsx'
import RelayEnvironment from './RelayEnvironment.ts'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <RelayEnvironmentProvider environment={RelayEnvironment}>
      <BrowserRouter>
        <MyApp />
      </BrowserRouter>
    </RelayEnvironmentProvider>
  </StrictMode>,
)
