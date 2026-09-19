'use client'

import { Link, Route, Routes } from 'react-router-dom'
import App from './App'
import BodyStats from './app/BodyStats'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import ColorModeToggle from './components/DarkModeToggle'
import { ColorModeProvider } from './components/ui/color-mode'
import { Provider } from './components/ui/provider'
import DemoChakra from './components/DemoChakra'

function MyApp() {
  console.log('Rendering MyApp component')
  return (
    <>
      <Provider>
        <ColorModeToggle />
        <nav>
          <Link to="/">Home</Link>
          <Link to="/bodystats">Body Stats</Link>
        </nav>

        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/bodystats" element={<BodyStats />} />
        </Routes>
      </Provider>
    </>
  )
}

export default MyApp
